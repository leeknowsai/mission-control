'use client';

/**
 * Horizontal stepper displaying the 7 lifecycle phases with status indicators.
 * Active phase is highlighted; completed phases show a checkmark.
 */
import { ClipboardList, Map as MapIcon, Search, Code2, TestTube2, Eye, Rocket, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LifecyclePhase, PhaseType, PhaseStatus } from '@/lib/types';

const PHASE_META: { type: PhaseType; label: string; icon: React.ReactNode }[] = [
  { type: 'requirements', label: 'Requirements', icon: <ClipboardList className="w-4 h-4" /> },
  { type: 'planning',     label: 'Planning',     icon: <MapIcon      className="w-4 h-4" /> },
  { type: 'research',     label: 'Research',     icon: <Search       className="w-4 h-4" /> },
  { type: 'implementation', label: 'Implementation', icon: <Code2    className="w-4 h-4" /> },
  { type: 'testing',      label: 'Testing',      icon: <TestTube2    className="w-4 h-4" /> },
  { type: 'review',       label: 'Review',       icon: <Eye          className="w-4 h-4" /> },
  { type: 'deploy',       label: 'Deploy',       icon: <Rocket       className="w-4 h-4" /> },
];

function statusBadgeVariant(status: PhaseStatus) {
  switch (status) {
    case 'complete': return 'success';
    case 'active':   return 'info';
    case 'blocked':  return 'destructive';
    default:         return 'secondary';
  }
}

function stepRingClass(status: PhaseStatus) {
  switch (status) {
    case 'complete': return 'ring-2 ring-mc-accent-green bg-mc-accent-green/10';
    case 'active':   return 'ring-2 ring-mc-accent bg-mc-accent/10';
    case 'blocked':  return 'ring-2 ring-mc-accent-red bg-mc-accent-red/10';
    default:         return 'ring-1 ring-mc-border bg-mc-bg-tertiary';
  }
}

interface LifecyclePipelineProps {
  phases: LifecyclePhase[];
  selectedPhaseId?: number;
  onPhaseSelect: (phase: LifecyclePhase) => void;
}

export function LifecyclePipeline({ phases, selectedPhaseId, onPhaseSelect }: LifecyclePipelineProps) {
  // Build a lookup by PhaseType for quick access
  const phaseByType: Partial<Record<PhaseType, LifecyclePhase>> = Object.fromEntries(
    phases.map((p) => [p.phase, p])
  );

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-mc-bg-secondary rounded-lg border border-mc-border">
      {PHASE_META.map((meta, idx) => {
        const phase = phaseByType[meta.type];
        const status: PhaseStatus = phase?.status ?? 'pending';
        const isSelected = phase && phase.id === selectedPhaseId;

        return (
          <div key={meta.type} className="flex items-center gap-2">
            {/* Step node */}
            <button
              onClick={() => phase && onPhaseSelect(phase)}
              disabled={!phase}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-all min-w-[80px]',
                stepRingClass(status),
                isSelected && 'outline outline-2 outline-offset-2 outline-mc-accent',
                !phase && 'opacity-40 cursor-not-allowed',
                phase && 'hover:opacity-80 cursor-pointer'
              )}
              title={`${meta.label}: ${status}`}
            >
              <div className="flex items-center gap-1">
                {status === 'complete'
                  ? <Check className="w-4 h-4 text-mc-accent-green" />
                  : <span className={cn(
                      status === 'active'  ? 'text-mc-accent' :
                      status === 'blocked' ? 'text-mc-accent-red' :
                      'text-mc-text-secondary'
                    )}>{meta.icon}</span>
                }
              </div>
              <span className={cn(
                'text-xs font-medium leading-tight text-center',
                status === 'active'   ? 'text-mc-accent' :
                status === 'complete' ? 'text-mc-accent-green' :
                status === 'blocked'  ? 'text-mc-accent-red' :
                'text-mc-text-secondary'
              )}>
                {meta.label}
              </span>
              <Badge variant={statusBadgeVariant(status)} className="text-[10px] px-1 py-0">
                {status}
              </Badge>
            </button>

            {/* Connector arrow — not after last item */}
            {idx < PHASE_META.length - 1 && (
              <span className="text-mc-border text-sm select-none">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
