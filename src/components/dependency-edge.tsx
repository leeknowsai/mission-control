'use client';

import { useState } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DependencyEdgeData {
  depType?: 'blocks' | 'soft';
  onDelete?: (id: string) => void;
  [key: string]: unknown;
}

export function DependencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const edgeData = (data ?? {}) as DependencyEdgeData;
  const isBlocking = edgeData.depType !== 'soft';

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeColor = isBlocking ? '#f85149' : '#8b949e';
  const strokeDash = isBlocking ? undefined : '5,5';
  const animClass = isBlocking ? 'animated' : '';

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={cn(animClass)}
        style={{
          stroke: strokeColor,
          strokeDasharray: strokeDash,
          strokeWidth: 1.5,
        }}
      />

      {/* Wider invisible hit area for hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />

      {/* Delete button on hover */}
      {hovered && edgeData.onDelete && (
        <foreignObject
          x={labelX - 10}
          y={labelY - 10}
          width={20}
          height={20}
          style={{ overflow: 'visible' }}
        >
          <button
            onClick={() => edgeData.onDelete!(id)}
            className="flex items-center justify-center w-5 h-5 rounded-full bg-[#21262d] border border-[#f85149] text-[#f85149] hover:bg-[#f85149] hover:text-white transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </foreignObject>
      )}
    </g>
  );
}
