/**
 * Pure functions for detecting sync conflicts between DB and filesystem state.
 * A conflict occurs when both sides changed independently since last sync.
 */

export interface FieldConflict {
  field: string;
  dbValue: string;
  fileValue: string;
  lastSyncValue?: string;
}

/**
 * Compares DB state vs file state field-by-field.
 *
 * Conflict rule: both sides changed independently (neither matches lastSync).
 * Non-conflict: only one side changed — the changed side wins (no conflict reported).
 *
 * @param dbState    Current values stored in the database
 * @param fileState  Current values read from the filesystem
 * @param lastSyncState  Values at the time of last successful sync (optional baseline)
 * @returns Array of fields where a true conflict exists
 */
export function detectConflicts(
  dbState: Record<string, string>,
  fileState: Record<string, string>,
  lastSyncState?: Record<string, string>
): FieldConflict[] {
  const conflicts: FieldConflict[] = [];

  // Union of all field keys from both sides
  const allFields = new Set([...Object.keys(dbState), ...Object.keys(fileState)]);

  for (const field of allFields) {
    const dbValue = dbState[field] ?? '';
    const fileValue = fileState[field] ?? '';

    // No difference — nothing to do
    if (dbValue === fileValue) continue;

    if (!lastSyncState) {
      // No baseline: treat any divergence as a conflict
      conflicts.push({ field, dbValue, fileValue });
      continue;
    }

    const lastSync = lastSyncState[field] ?? '';

    const dbChanged = dbValue !== lastSync;
    const fileChanged = fileValue !== lastSync;

    // Both sides changed independently → conflict
    if (dbChanged && fileChanged) {
      conflicts.push({ field, dbValue, fileValue, lastSyncValue: lastSync });
    }
    // Only one side changed → that side wins, no conflict
  }

  return conflicts;
}
