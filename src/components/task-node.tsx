'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/lib/types';

// Color-coded left border by status
const STATUS_BORDER: Record<string, string> = {
  planning: 'border-l-purple-500',
  inbox: 'border-l-pink-500',
  assigned: 'border-l-yellow-500',
  in_progress: 'border-l-[#58a6ff]',
  testing: 'border-l-cyan-500',
  review: 'border-l-purple-400',
  done: 'border-l-[#3fb950]',
  blocked: 'border-l-[#f85149]',
};

const STATUS_BADGE: Record<string, string> = {
  planning: 'bg-purple-500/20 text-purple-400',
  inbox: 'bg-pink-500/20 text-pink-400',
  assigned: 'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  testing: 'bg-cyan-500/20 text-cyan-400',
  review: 'bg-purple-400/20 text-purple-300',
  done: 'bg-green-500/20 text-green-400',
  blocked: 'bg-red-500/20 text-red-400',
};

export interface TaskNodeData {
  label: string;
  status: TaskStatus | 'blocked';
  agentName?: string;
  isCritical?: boolean;
  [key: string]: unknown;
}

export function TaskNode({ data, selected }: NodeProps) {
  const nodeData = data as TaskNodeData;
  const { label, status, agentName, isCritical } = nodeData;
  const borderClass = STATUS_BORDER[status] ?? 'border-l-gray-500';
  const badgeClass = STATUS_BADGE[status] ?? 'bg-gray-500/20 text-gray-400';

  return (
    <div
      className={cn(
        'bg-[#161b22] border border-[#30363d] border-l-4 rounded-lg px-3 py-2 shadow-lg',
        'w-[200px] cursor-default',
        borderClass,
        selected && 'ring-1 ring-[#58a6ff]',
        isCritical && 'ring-1 ring-[#f85149]'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#58a6ff] !w-2 !h-2" />

      {/* Title */}
      <p className="text-xs font-medium text-white leading-snug line-clamp-2 mb-1.5">
        {label}
      </p>

      {/* Status badge */}
      <span className={cn('inline-block text-[10px] px-1.5 py-0.5 rounded font-medium capitalize', badgeClass)}>
        {status.replace('_', ' ')}
      </span>

      {/* Agent name */}
      {agentName && (
        <p className="text-[10px] text-[#8b949e] mt-1 truncate">{agentName}</p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-[#58a6ff] !w-2 !h-2" />
    </div>
  );
}
