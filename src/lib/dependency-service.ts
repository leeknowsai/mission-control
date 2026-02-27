/**
 * Database operations for task dependencies.
 * Provides CRUD operations for the task_dependencies table.
 */

import { queryAll, queryOne, run } from '@/lib/db';
import type { TaskDependency, DependencyType } from '@/lib/types';

/**
 * Get all dependencies, optionally filtered by workspace via task join.
 */
export function getDependencies(workspaceId?: string): TaskDependency[] {
  if (workspaceId) {
    return queryAll<TaskDependency>(
      `SELECT td.*
       FROM task_dependencies td
       JOIN tasks t ON td.task_id = t.id
       WHERE t.workspace_id = ?
       ORDER BY td.id`,
      [workspaceId]
    );
  }
  return queryAll<TaskDependency>(
    'SELECT * FROM task_dependencies ORDER BY id',
    []
  );
}

/**
 * Add a dependency between two tasks.
 * Enforces uniqueness — duplicate (task_id, depends_on_id) pairs are rejected.
 */
export function addDependency(
  taskId: string,
  dependsOnId: string,
  depType: DependencyType
): TaskDependency {
  // Check uniqueness
  const existing = queryOne<TaskDependency>(
    'SELECT * FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?',
    [taskId, dependsOnId]
  );
  if (existing) {
    throw new Error(`Dependency already exists: ${taskId} -> ${dependsOnId}`);
  }

  run(
    'INSERT INTO task_dependencies (task_id, depends_on_id, dep_type) VALUES (?, ?, ?)',
    [taskId, dependsOnId, depType]
  );

  const created = queryOne<TaskDependency>(
    'SELECT * FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?',
    [taskId, dependsOnId]
  );
  if (!created) throw new Error('Failed to retrieve created dependency');
  return created;
}

/**
 * Remove a dependency by its ID.
 */
export function removeDependency(id: number): void {
  run('DELETE FROM task_dependencies WHERE id = ?', [id]);
}

/**
 * Get task IDs that have unresolved blocking dependencies (dep_type = 'blocks').
 * A task is blocked if at least one of its depends_on tasks is not 'done'.
 */
export function getBlockedTasks(workspaceId?: string): string[] {
  const sql = workspaceId
    ? `SELECT DISTINCT td.task_id
       FROM task_dependencies td
       JOIN tasks blocker ON td.depends_on_id = blocker.id
       JOIN tasks t ON td.task_id = t.id
       WHERE td.dep_type = 'blocks'
         AND blocker.status != 'done'
         AND t.workspace_id = ?`
    : `SELECT DISTINCT td.task_id
       FROM task_dependencies td
       JOIN tasks blocker ON td.depends_on_id = blocker.id
       WHERE td.dep_type = 'blocks'
         AND blocker.status != 'done'`;

  const rows = queryAll<{ task_id: string }>(sql, workspaceId ? [workspaceId] : []);
  return rows.map((r) => r.task_id);
}
