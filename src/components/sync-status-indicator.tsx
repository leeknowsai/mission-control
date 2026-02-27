'use client';

/**
 * Header badge showing the bidirectional sync engine status.
 * Polls /api/sync every 5 seconds via SWR.
 */
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';

interface SyncStatusResponse {
  status: 'synced' | 'syncing' | 'conflict';
  lastSync: string | null;
  conflicts: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SyncStatusIndicatorProps {
  onConflictsClick?: () => void;
}

export function SyncStatusIndicator({ onConflictsClick }: SyncStatusIndicatorProps) {
  const { data } = useSWR<SyncStatusResponse>('/api/sync', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
  });

  if (!data) return null;

  const { status, conflicts } = data;

  if (status === 'conflict' && conflicts > 0) {
    return (
      <button onClick={onConflictsClick} className="ml-auto flex items-center">
        <Badge className="bg-red-600 hover:bg-red-700 text-white cursor-pointer gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-white opacity-80" />
          {conflicts} Conflict{conflicts !== 1 ? 's' : ''}
        </Badge>
      </button>
    );
  }

  if (status === 'syncing') {
    return (
      <span className="ml-auto flex items-center gap-1">
        <Badge className="bg-yellow-600 text-white gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-white opacity-80 animate-pulse" />
          Syncing...
        </Badge>
      </span>
    );
  }

  // synced
  return (
    <span className="ml-auto flex items-center gap-1">
      <Badge className="bg-green-700 text-white gap-1">
        <span className="inline-block w-2 h-2 rounded-full bg-green-300" />
        Synced
      </Badge>
    </span>
  );
}
