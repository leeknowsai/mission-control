'use client';

/**
 * Modal dialog for reviewing and resolving bidirectional sync conflicts.
 * Fetches conflicts from /api/sync/conflicts and lets the user pick
 * "Use Dashboard" or "Use File" per conflict, then resolves all at once.
 */
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FieldConflict {
  field: string;
  dbValue: string;
  fileValue: string;
  lastSyncValue?: string;
  phaseId: number;
  filePath: string;
}

type Resolution = 'use_dashboard' | 'use_file';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MergeConflictDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MergeConflictDialog({ open, onClose }: MergeConflictDialogProps) {
  const { mutate } = useSWRConfig();
  const { data: conflicts = [], isLoading } = useSWR<FieldConflict[]>(
    open ? '/api/sync/conflicts' : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Track per-conflict resolution choice; defaults to 'use_dashboard'
  const [resolutions, setResolutions] = useState<Record<number, Resolution>>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!open) return null;

  function setResolution(index: number, res: Resolution) {
    setResolutions((prev) => ({ ...prev, [index]: res }));
  }

  async function resolveAll() {
    setSaving(true);
    try {
      await Promise.all(
        conflicts.map((_, idx) =>
          fetch('/api/sync/conflicts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: idx, resolution: resolutions[idx] ?? 'use_dashboard' }),
          })
        )
      );
      // Revalidate both endpoints
      await mutate('/api/sync/conflicts');
      await mutate('/api/sync');
      setSuccessMsg(`${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} resolved.`);
      setTimeout(() => { setSuccessMsg(''); onClose(); }, 1500);
    } catch (err) {
      console.error('[MergeConflictDialog] resolveAll error:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-2xl mx-4 bg-mc-bg-secondary border border-mc-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-mc-text text-base font-semibold">
            Sync Conflicts
            <Badge className="ml-2 bg-red-600 text-white text-xs">
              {isLoading ? '…' : conflicts.length}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-mc-text-secondary">
            ✕
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <p className="text-mc-text-secondary text-sm py-4 text-center">Loading conflicts…</p>
          )}

          {!isLoading && conflicts.length === 0 && (
            <p className="text-mc-text-secondary text-sm py-4 text-center">No conflicts.</p>
          )}

          {successMsg && (
            <p className="text-green-400 text-sm py-2 text-center">{successMsg}</p>
          )}

          {!isLoading && conflicts.length > 0 && (
            <>
              <ScrollArea className="max-h-80 pr-2">
                <div className="space-y-4">
                  {conflicts.map((conflict, idx) => (
                    <div key={idx} className="border border-mc-border rounded p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-mc-accent/20 text-mc-accent text-xs">
                          {conflict.field}
                        </Badge>
                        <span className="text-mc-text-secondary text-xs truncate max-w-xs">
                          {conflict.filePath.split('/').slice(-1)[0]}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Dashboard value */}
                        <label className={`cursor-pointer rounded p-2 border transition-colors ${
                          (resolutions[idx] ?? 'use_dashboard') === 'use_dashboard'
                            ? 'border-mc-accent bg-mc-accent/10'
                            : 'border-mc-border'
                        }`}>
                          <input
                            type="radio"
                            className="sr-only"
                            name={`conflict-${idx}`}
                            value="use_dashboard"
                            checked={(resolutions[idx] ?? 'use_dashboard') === 'use_dashboard'}
                            onChange={() => setResolution(idx, 'use_dashboard')}
                          />
                          <span className="block font-medium text-mc-text mb-1">Dashboard</span>
                          <span className="text-mc-text-secondary font-mono break-all">
                            {conflict.dbValue || <em className="opacity-50">empty</em>}
                          </span>
                        </label>

                        {/* File value */}
                        <label className={`cursor-pointer rounded p-2 border transition-colors ${
                          resolutions[idx] === 'use_file'
                            ? 'border-mc-accent bg-mc-accent/10'
                            : 'border-mc-border'
                        }`}>
                          <input
                            type="radio"
                            className="sr-only"
                            name={`conflict-${idx}`}
                            value="use_file"
                            checked={resolutions[idx] === 'use_file'}
                            onChange={() => setResolution(idx, 'use_file')}
                          />
                          <span className="block font-medium text-mc-text mb-1">File</span>
                          <span className="text-mc-text-secondary font-mono break-all">
                            {conflict.fileValue || <em className="opacity-50">empty</em>}
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={resolveAll}
                  disabled={saving}
                  className="bg-mc-accent hover:bg-mc-accent/80 text-black"
                >
                  {saving ? 'Resolving…' : 'Resolve All'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
