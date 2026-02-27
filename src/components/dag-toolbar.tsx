'use client';

import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Maximize2, LayoutTemplate } from 'lucide-react';

interface DagToolbarProps {
  direction: 'TB' | 'LR';
  onToggleDirection: () => void;
  nodeCount: number;
}

export function DagToolbar({ direction, onToggleDirection, nodeCount }: DagToolbarProps) {
  const { fitView } = useReactFlow();

  return (
    <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
      {/* Layout direction toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleDirection}
        className="h-7 px-2 text-xs bg-[#161b22] border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d] hover:text-white"
        title={`Switch to ${direction === 'TB' ? 'left-right' : 'top-bottom'} layout`}
      >
        <LayoutTemplate className="w-3 h-3 mr-1" />
        {direction === 'TB' ? 'TB' : 'LR'}
      </Button>

      {/* Fit view button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => fitView({ padding: 0.1 })}
        className="h-7 px-2 text-xs bg-[#161b22] border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d] hover:text-white"
        title="Fit all nodes in view"
      >
        <Maximize2 className="w-3 h-3" />
      </Button>

      {/* Node count */}
      <span className="text-xs text-[#8b949e] px-2 py-1 bg-[#161b22] border border-[#30363d] rounded">
        {nodeCount} {nodeCount === 1 ? 'task' : 'tasks'}
      </span>
    </div>
  );
}
