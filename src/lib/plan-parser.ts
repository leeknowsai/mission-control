/**
 * Parses plan.md and phase-*.md files from a plan directory.
 * Uses gray-matter for YAML frontmatter extraction.
 */
import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';
import type { PhaseType, PhaseStatus } from '@/lib/types';

// Maps phase file index (01-07) to PhaseType
const PHASE_INDEX_MAP: Record<string, PhaseType> = {
  '01': 'requirements',
  '02': 'planning',
  '03': 'research',
  '04': 'implementation',
  '05': 'testing',
  '06': 'review',
  '07': 'deploy',
};

// Valid phase status values from frontmatter
const VALID_STATUSES: PhaseStatus[] = ['pending', 'active', 'blocked', 'complete', 'skipped'];

function safeReadMatter(filePath: string): matter.GrayMatterFile<string> | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return matter(content);
  } catch {
    return null;
  }
}

function parseStatus(raw: unknown): PhaseStatus {
  if (typeof raw === 'string' && VALID_STATUSES.includes(raw as PhaseStatus)) {
    return raw as PhaseStatus;
  }
  return 'pending';
}

export interface ParsedPhaseFile {
  phase: PhaseType;
  status: PhaseStatus;
  title?: string;
  description?: string;
  filePath: string;
  fileName: string;
}

export interface ParsedPlan {
  title?: string;
  description?: string;
  status?: string;
  phases: ParsedPhaseFile[];
}

/**
 * Parses a plan directory: reads plan.md frontmatter + all phase-*.md files.
 * Returns structured data; handles missing/malformed files gracefully.
 */
export function parsePlanDir(planDir: string): ParsedPlan {
  const result: ParsedPlan = { phases: [] };

  // Parse plan.md overview
  const planMdPath = path.join(planDir, 'plan.md');
  const planFile = safeReadMatter(planMdPath);
  if (planFile) {
    result.title = planFile.data?.title as string | undefined;
    result.description = planFile.data?.description as string | undefined;
    result.status = planFile.data?.status as string | undefined;
  }

  // Glob phase-*.md files
  let files: string[] = [];
  try {
    files = fs.readdirSync(planDir).filter((f) => /^phase-\d{2}.*\.md$/.test(f)).sort();
  } catch {
    return result;
  }

  for (const fileName of files) {
    // Extract two-digit index from filename (e.g. phase-01-setup.md → "01")
    const match = fileName.match(/^phase-(\d{2})/);
    if (!match) continue;

    const idx = match[1];
    const phaseType = PHASE_INDEX_MAP[idx];
    if (!phaseType) continue;

    const filePath = path.join(planDir, fileName);
    const parsed = safeReadMatter(filePath);

    result.phases.push({
      phase: phaseType,
      status: parseStatus(parsed?.data?.status),
      title: parsed?.data?.title as string | undefined,
      description: parsed?.data?.description as string | undefined,
      filePath,
      fileName,
    });
  }

  return result;
}
