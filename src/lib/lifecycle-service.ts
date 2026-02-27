/**
 * Business logic for lifecycle pipeline operations.
 * Handles project creation, phase initialization, status transitions.
 */
import { queryAll, queryOne, run, transaction } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { LifecyclePhase, Project, PhaseType, PhaseStatus } from '@/lib/types';

// Canonical ordering of pipeline phases
export const PHASE_ORDER: PhaseType[] = [
  'requirements',
  'planning',
  'research',
  'implementation',
  'testing',
  'review',
  'deploy',
];

// Status progression forward / backward
const STATUS_FORWARD: Record<PhaseStatus, PhaseStatus | null> = {
  pending: 'active',
  active: 'complete',
  complete: null,
  blocked: 'active',
  skipped: 'active',
};

const STATUS_BACK: Record<PhaseStatus, PhaseStatus | null> = {
  active: 'pending',
  complete: 'active',
  pending: null,
  blocked: 'pending',
  skipped: 'pending',
};

// --- Project operations ---

export function getProjects(): Project[] {
  return queryAll<Project>('SELECT * FROM projects ORDER BY created_at DESC', []);
}

export function createProject(
  name: string,
  planDir?: string,
  workspaceId?: string
): Project {
  const id = uuidv4();
  const now = new Date().toISOString();
  const wid = workspaceId || 'default';

  run(
    `INSERT INTO projects (id, name, plan_dir, workspace_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, planDir || null, wid, now, now]
  );

  return queryOne<Project>('SELECT * FROM projects WHERE id = ?', [id])!;
}

// --- Phase operations ---

export function getPhases(projectId: string): LifecyclePhase[] {
  return queryAll<LifecyclePhase>(
    'SELECT * FROM lifecycle_phases WHERE project_id = ? ORDER BY id',
    [projectId]
  );
}

export function initPhases(projectId: string): void {
  const now = new Date().toISOString();
  transaction(() => {
    for (const phase of PHASE_ORDER) {
      run(
        `INSERT INTO lifecycle_phases (project_id, phase, status, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, ?)`,
        [projectId, phase, now, now]
      );
    }
  });
}

export function updatePhase(
  id: number,
  data: Partial<Pick<LifecyclePhase, 'status' | 'agent_id' | 'plan_file_path' | 'metadata' | 'started_at' | 'completed_at'>>
): LifecyclePhase | undefined {
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.agent_id !== undefined) { fields.push('agent_id = ?'); values.push(data.agent_id); }
  if (data.plan_file_path !== undefined) { fields.push('plan_file_path = ?'); values.push(data.plan_file_path); }
  if (data.metadata !== undefined) { fields.push('metadata = ?'); values.push(data.metadata); }
  if (data.started_at !== undefined) { fields.push('started_at = ?'); values.push(data.started_at); }
  if (data.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(data.completed_at); }

  values.push(id);
  run(`UPDATE lifecycle_phases SET ${fields.join(', ')} WHERE id = ?`, values);
  return queryOne<LifecyclePhase>('SELECT * FROM lifecycle_phases WHERE id = ?', [id]);
}

export function advancePhase(id: number): PhaseStatus {
  const phase = queryOne<LifecyclePhase>('SELECT * FROM lifecycle_phases WHERE id = ?', [id]);
  if (!phase) throw new Error(`Phase ${id} not found`);

  const next = STATUS_FORWARD[phase.status];
  if (!next) return phase.status; // already at terminal state

  const now = new Date().toISOString();
  const extra: Partial<LifecyclePhase> = {};
  if (next === 'active') extra.started_at = now;
  if (next === 'complete') extra.completed_at = now;

  updatePhase(id, { status: next, ...extra });
  return next;
}

export function rollbackPhase(id: number): PhaseStatus {
  const phase = queryOne<LifecyclePhase>('SELECT * FROM lifecycle_phases WHERE id = ?', [id]);
  if (!phase) throw new Error(`Phase ${id} not found`);

  const prev = STATUS_BACK[phase.status];
  if (!prev) return phase.status;

  updatePhase(id, { status: prev });
  return prev;
}
