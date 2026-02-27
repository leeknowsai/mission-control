'use client';

import { useState } from 'react';
import { Wrench, FileEdit, MessageSquare, RefreshCw, AlertTriangle, Server } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ActivityEvent, ActivityEventType } from '@/lib/types';

interface ActivityEventCardProps {
  event: ActivityEvent;
}

// Icon per event type
function EventIcon({ type }: { type: ActivityEventType }) {
  const cls = 'w-3.5 h-3.5 flex-shrink-0';
  switch (type) {
    case 'tool_call':     return <Wrench className={cls} />;
    case 'file_edit':     return <FileEdit className={cls} />;
    case 'message':       return <MessageSquare className={cls} />;
    case 'status_change': return <RefreshCw className={cls} />;
    case 'error':         return <AlertTriangle className={cls} />;
    default:              return <Server className={cls} />;
  }
}

// Left border + icon color per event type
const typeStyles: Record<ActivityEventType, { border: string; icon: string }> = {
  tool_call:     { border: 'border-blue-500',   icon: 'text-blue-400' },
  file_edit:     { border: 'border-green-500',  icon: 'text-green-400' },
  message:       { border: 'border-purple-500', icon: 'text-purple-400' },
  status_change: { border: 'border-orange-500', icon: 'text-orange-400' },
  error:         { border: 'border-red-500',    icon: 'text-red-400' },
  system:        { border: 'border-gray-500',   icon: 'text-gray-400' },
};

export function ActivityEventCard({ event }: ActivityEventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const styles = typeStyles[event.event_type] ?? typeStyles.system;

  let parsedPayload: Record<string, unknown> | null = null;
  if (event.payload) {
    try { parsedPayload = JSON.parse(event.payload) as Record<string, unknown>; } catch { /* keep null */ }
  }

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });
    } catch {
      return event.timestamp;
    }
  })();

  return (
    <div
      onClick={() => parsedPayload && setExpanded((v) => !v)}
      className={cn(
        'p-2 rounded border-l-2 bg-mc-bg-tertiary/50 hover:bg-mc-bg-tertiary transition-colors',
        styles.border,
        parsedPayload ? 'cursor-pointer' : ''
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <span className={cn('mt-0.5', styles.icon)}>
          <EventIcon type={event.event_type} />
        </span>

        <div className="flex-1 min-w-0">
          {/* Summary */}
          <p className="text-sm text-mc-text leading-snug truncate">
            {event.summary || event.event_type}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-0.5 text-xs text-mc-text-secondary">
            <span className="truncate max-w-[80px]">{event.agent_id}</span>
            <span>·</span>
            <span title={event.timestamp}>{timeAgo}</span>
            <span className="ml-auto uppercase tracking-wide opacity-60">
              {event.event_type.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded payload */}
      {expanded && parsedPayload && (
        <pre className="mt-2 p-2 rounded bg-mc-bg text-xs text-mc-text-secondary overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
          {JSON.stringify(parsedPayload, null, 2)}
        </pre>
      )}
    </div>
  );
}
