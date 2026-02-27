'use client';

/**
 * Displays details for a selected lifecycle phase with action controls.
 * Shows status, agent, timestamps, artifacts, and advance/rollback/skip actions.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LifecyclePhase, PhaseStatus } from '@/lib/types';

function statusVariant(status: PhaseStatus) {
  switch (status) {
    case 'complete': return 'success';
    case 'active':   return 'info';
    case 'blocked':  return 'destructive';
    default:         return 'secondary';
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

interface PhaseDetailPanelProps {
  phase: LifecyclePhase | null;
  onAction: (action: 'advance' | 'rollback' | 'skip') => void;
  isLoading?: boolean;
}

export function PhaseDetailPanel({ phase, onAction, isLoading }: PhaseDetailPanelProps) {
  if (!phase) {
    return (
      <Card className="border-mc-border bg-mc-bg-secondary">
        <CardContent className="p-6 text-mc-text-secondary text-sm text-center">
          Select a phase above to view details.
        </CardContent>
      </Card>
    );
  }

  const label = phase.phase.charAt(0).toUpperCase() + phase.phase.slice(1);

  return (
    <Card className="border-mc-border bg-mc-bg-secondary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-mc-text text-base font-semibold">
            Phase: {label}
          </CardTitle>
          <Badge variant={statusVariant(phase.status)} className="capitalize text-xs">
            {phase.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-mc-text-secondary">Phase ID</span>
            <p className="text-mc-text font-mono">{phase.id}</p>
          </div>
          <div>
            <span className="text-mc-text-secondary">Agent</span>
            <p className={cn('font-mono', phase.agent_id ? 'text-mc-text' : 'text-mc-text-secondary')}>
              {phase.agent_id ?? '—'}
            </p>
          </div>
          <div>
            <span className="text-mc-text-secondary">Started</span>
            <p className="text-mc-text">{formatDate(phase.started_at)}</p>
          </div>
          <div>
            <span className="text-mc-text-secondary">Completed</span>
            <p className="text-mc-text">{formatDate(phase.completed_at)}</p>
          </div>
        </div>

        {/* Artifacts */}
        {phase.plan_file_path && (
          <div className="text-sm">
            <span className="text-mc-text-secondary block mb-1">Plan File</span>
            <a
              href={`/api/files/preview?path=${encodeURIComponent(phase.plan_file_path)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-mc-accent hover:underline font-mono break-all"
            >
              {phase.plan_file_path}
            </a>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            disabled={isLoading || phase.status === 'complete'}
            onClick={() => onAction('advance')}
          >
            Advance
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isLoading || phase.status === 'pending'}
            onClick={() => onAction('rollback')}
          >
            Rollback
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isLoading || phase.status === 'skipped'}
            onClick={() => onAction('skip')}
            className="text-mc-text-secondary hover:text-mc-text"
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
