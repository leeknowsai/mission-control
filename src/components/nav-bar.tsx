'use client';

/**
 * Top navigation bar with sync status indicator and conflict resolution dialog.
 * Extracted as a client component so it can manage dialog open/close state.
 */
import { useState } from 'react';
import { SyncStatusIndicator } from './sync-status-indicator';
import { MergeConflictDialog } from './merge-conflict-dialog';

export function NavBar() {
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  return (
    <>
      <nav className="border-b border-mc-border bg-mc-bg-secondary px-4 py-2 flex items-center gap-4">
        <span className="text-mc-accent font-bold">LeeAgentsOffice</span>
        <a href="/" className="text-mc-text-secondary hover:text-mc-text text-sm">Dashboard</a>
        <a href="/lifecycle" className="text-mc-text-secondary hover:text-mc-text text-sm">Lifecycle</a>
        <SyncStatusIndicator onConflictsClick={() => setConflictDialogOpen(true)} />
      </nav>

      <MergeConflictDialog
        open={conflictDialogOpen}
        onClose={() => setConflictDialogOpen(false)}
      />
    </>
  );
}
