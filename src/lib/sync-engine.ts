/**
 * Bidirectional sync engine between filesystem plan files and the SQLite database.
 * Uses chokidar to watch plan directories and gray-matter for YAML frontmatter.
 * Singleton pattern — one instance per server process.
 */
import { watch, type FSWatcher } from 'chokidar';
import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';
import { parsePlanDir } from './plan-parser';
import { writePhaseStatus } from './plan-writer';
import { detectConflicts, type FieldConflict } from './conflict-detector';
import { getPhases, updatePhase } from './lifecycle-service';
import { queryAll, queryOne, run } from '@/lib/db/index';
import type { LifecyclePhase } from './types';

// Internal conflict record (includes entity context for resolution)
interface ActiveConflict extends FieldConflict {
  phaseId: number;
  filePath: string;
  resolvedAt?: string;
}

class SyncEngine {
  private watcher: FSWatcher | null = null;
  /** Tracks files we wrote ourselves; skip incoming watch events for 2 s after our own write */
  private writeLock: Map<string, number> = new Map();
  private conflicts: ActiveConflict[] = [];
  private status: 'synced' | 'syncing' | 'conflict' = 'synced';
  private lastSync: string | null = null;
  private planDir: string;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(planDir: string) {
    this.planDir = planDir;
  }

  start(): void {
    if (this.watcher) return; // already running

    this.watcher = watch(this.planDir, {
      ignoreInitial: true,
      depth: 2,
      persistent: true,
    });

    this.watcher.on('change', (filePath: string) => {
      // Only care about phase markdown files
      if (!filePath.endsWith('.md')) return;
      // Debounce 500 ms to avoid rapid successive events
      const existing = this.debounceTimers.get(filePath);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        this.debounceTimers.delete(filePath);
        this.handleFileChange(filePath);
      }, 500);
      this.debounceTimers.set(filePath, timer);
    });

    this.watcher.on('error', (err: unknown) => {
      console.error('[Sync] Watcher error:', err);
    });

    // Graceful shutdown hooks
    const stop = () => this.stop();
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);

    console.log('[Sync] Watching plan directory:', this.planDir);
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close().catch(() => {});
      this.watcher = null;
    }
    for (const t of this.debounceTimers.values()) clearTimeout(t);
    this.debounceTimers.clear();
    console.log('[Sync] Engine stopped');
  }

  private handleFileChange(filePath: string): void {
    // Skip if we wrote this file ourselves recently (within 2 s)
    const lockTime = this.writeLock.get(filePath);
    if (lockTime && Date.now() - lockTime < 2000) return;

    this.status = 'syncing';

    // Parse the changed file's frontmatter
    let fileData: Record<string, string> = {};
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(raw);
      // Normalise values to strings for conflict comparison
      fileData = Object.fromEntries(
        Object.entries(parsed.data).map(([k, v]) => [k, String(v ?? '')])
      );
    } catch (err) {
      console.error('[Sync] Failed to read/parse file:', filePath, err);
      this.status = 'synced';
      return;
    }

    // Identify which phase this file belongs to via plan_file_path or by matching path
    const phase = this.findPhaseByFile(filePath);
    if (!phase) {
      this.status = 'synced';
      return;
    }

    // Build DB state from the phase record
    const dbState: Record<string, string> = {
      status: phase.status ?? '',
      agent_id: phase.agent_id ?? '',
    };

    // Detect conflicts (no baseline — treat any divergence where DB already has a value)
    const fieldConflicts = detectConflicts(dbState, {
      status: fileData.status ?? '',
      agent_id: fileData.agent_id ?? '',
    });

    const now = new Date().toISOString();

    if (fieldConflicts.length > 0) {
      // Record active conflicts
      const newConflicts: ActiveConflict[] = fieldConflicts.map((fc) => ({
        ...fc,
        phaseId: phase.id,
        filePath,
      }));
      this.conflicts.push(...newConflicts);
      this.status = 'conflict';

      // Log to sync_log
      run(
        `INSERT INTO sync_log (source, entity_type, entity_id, change, conflict_resolved, timestamp)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [
          'filesystem',
          'lifecycle_phase',
          String(phase.id),
          JSON.stringify({ conflicts: fieldConflicts }),
          now,
        ]
      );
    } else {
      // No conflict — apply file changes to DB
      const updates: Partial<Pick<LifecyclePhase, 'status' | 'agent_id'>> = {};
      if (fileData.status) updates.status = fileData.status as LifecyclePhase['status'];
      if (fileData.agent_id !== undefined) updates.agent_id = fileData.agent_id || undefined;

      if (Object.keys(updates).length > 0) {
        try {
          updatePhase(phase.id, updates);
        } catch (err) {
          console.error('[Sync] DB update failed:', err);
        }
      }

      this.lastSync = now;
      this.status = this.conflicts.length > 0 ? 'conflict' : 'synced';

      run(
        `INSERT INTO sync_log (source, entity_type, entity_id, change, conflict_resolved, timestamp)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [
          'filesystem',
          'lifecycle_phase',
          String(phase.id),
          JSON.stringify({ applied: updates }),
          now,
        ]
      );
    }
  }

  /** Write DB changes back to the plan file */
  writeToFile(
    projectId: string,
    phaseType: string,
    updates: Record<string, unknown>
  ): void {
    const phases = getPhases(projectId);
    const phase = phases.find((p) => p.phase === phaseType);
    if (!phase?.plan_file_path) return;

    const filePath = phase.plan_file_path;

    // Acquire write lock so our own write event is ignored
    this.writeLock.set(filePath, Date.now());

    try {
      writePhaseStatus(filePath, updates);
    } catch (err) {
      console.error('[Sync] writeToFile failed:', filePath, err);
    }

    const now = new Date().toISOString();
    this.lastSync = now;

    run(
      `INSERT INTO sync_log (source, entity_type, entity_id, change, conflict_resolved, timestamp)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [
        'dashboard',
        'lifecycle_phase',
        String(phase.id),
        JSON.stringify({ written: updates }),
        now,
      ]
    );

    // Release lock after 2 s
    setTimeout(() => this.writeLock.delete(filePath), 2000);
  }

  getStatus(): { status: string; lastSync: string | null; conflicts: number } {
    return {
      status: this.status,
      lastSync: this.lastSync,
      conflicts: this.conflicts.filter((c) => !c.resolvedAt).length,
    };
  }

  getConflicts(): ActiveConflict[] {
    return this.conflicts.filter((c) => !c.resolvedAt);
  }

  resolveConflict(conflictIndex: number, resolution: 'use_dashboard' | 'use_file'): void {
    const unresolved = this.getConflicts();
    const conflict = unresolved[conflictIndex];
    if (!conflict) return;

    const now = new Date().toISOString();

    if (resolution === 'use_file') {
      // Apply file value to DB
      try {
        updatePhase(conflict.phaseId, {
          status: conflict.fileValue as LifecyclePhase['status'],
        });
      } catch (err) {
        console.error('[Sync] resolveConflict DB update failed:', err);
      }
    } else {
      // Apply DB value back to file
      writePhaseStatus(conflict.filePath, { [conflict.field]: conflict.dbValue });
    }

    // Mark resolved in internal list
    const globalIdx = this.conflicts.indexOf(conflict);
    if (globalIdx !== -1) this.conflicts[globalIdx].resolvedAt = now;

    run(
      `INSERT INTO sync_log (source, entity_type, entity_id, change, conflict_resolved, resolution, timestamp)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [
        'dashboard',
        'lifecycle_phase',
        String(conflict.phaseId),
        JSON.stringify({ field: conflict.field }),
        resolution,
        now,
      ]
    );

    // Update overall status
    const remaining = this.getConflicts().length;
    this.status = remaining > 0 ? 'conflict' : 'synced';
  }

  /** Find a lifecycle phase whose plan_file_path matches the given file path */
  private findPhaseByFile(filePath: string): LifecyclePhase | undefined {
    const absFile = path.resolve(filePath);
    return queryOne<LifecyclePhase>(
      `SELECT * FROM lifecycle_phases WHERE plan_file_path = ? LIMIT 1`,
      [absFile]
    ) ?? queryOne<LifecyclePhase>(
      `SELECT * FROM lifecycle_phases WHERE plan_file_path = ? LIMIT 1`,
      [filePath]
    );
  }
}

// --- Singleton ---

let instance: SyncEngine | null = null;

export function getSyncEngine(): SyncEngine | null {
  return instance;
}

export function initSyncEngine(planDir: string): SyncEngine {
  if (!instance) {
    instance = new SyncEngine(planDir);
  }
  instance.start();
  return instance;
}
