'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  type OnConnect,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useSWR from 'swr';
import { TaskNode, type TaskNodeData } from './task-node';
import { DependencyEdge, type DependencyEdgeData } from './dependency-edge';
import { DagToolbar } from './dag-toolbar';
import { layoutDag } from '@/lib/dag-layout';
import { findCriticalPath } from '@/lib/dag-critical-path';
import type { Task, TaskDependency } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const nodeTypes = { task: TaskNode };
const edgeTypes = { dependency: DependencyEdge };

interface TaskDagViewInnerProps {
  tasks: Task[];
  workspaceId: string;
}

function TaskDagViewInner({ tasks, workspaceId }: TaskDagViewInnerProps) {
  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { data: deps, mutate } = useSWR<TaskDependency[]>(
    `/api/dependencies?workspaceId=${workspaceId}`,
    fetcher,
    { refreshInterval: 0 }
  );

  // Delete dependency handler passed into edge data
  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      // edgeId is formatted as dep-{id}
      const numId = edgeId.replace('dep-', '');
      await fetch(`/api/dependencies/${numId}`, { method: 'DELETE' });
      mutate();
    },
    [mutate]
  );

  // Build nodes and edges whenever tasks/deps/direction change
  useEffect(() => {
    if (!deps) return;

    // Build raw edges first so critical path can be computed
    const rawEdges: Edge[] = deps.map((d) => ({
      id: `dep-${d.id}`,
      source: d.task_id,
      target: d.depends_on_id,
      type: 'dependency',
      data: {
        depType: d.dep_type,
        onDelete: handleDeleteEdge,
      } satisfies DependencyEdgeData,
    }));

    // Build raw nodes (no positions yet)
    const rawNodes: Node[] = tasks.map((t) => ({
      id: t.id,
      type: 'task',
      position: { x: 0, y: 0 },
      data: {
        label: t.title,
        status: t.status,
        agentName: t.assigned_agent?.name,
      } satisfies TaskNodeData,
    }));

    // Layout
    const laid = layoutDag(rawNodes, rawEdges, direction);

    // Critical path
    const critical = findCriticalPath(laid, rawEdges);

    // Mark critical nodes
    const finalNodes = laid.map((n) => ({
      ...n,
      data: { ...n.data, isCritical: critical.has(n.id) },
    }));

    setNodes(finalNodes);
    setEdges(rawEdges);
  }, [tasks, deps, direction, handleDeleteEdge, setNodes, setEdges]);

  // Connect handler: POST new dependency
  const onConnect: OnConnect = useCallback(
    async (connection) => {
      if (!connection.source || !connection.target) return;
      try {
        const res = await fetch('/api/dependencies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: connection.source,
            dependsOnId: connection.target,
            depType: 'blocks',
          }),
        });
        if (res.ok) {
          mutate();
        } else {
          const err = await res.json();
          console.warn('[DAG] Cannot add dependency:', err.error);
        }
      } catch (e) {
        console.error('[DAG] onConnect error:', e);
      }
    },
    [mutate]
  );

  const nodeCount = nodes.length;

  return (
    <div className="relative w-full h-full bg-[#0d1117]" style={{ minHeight: 500 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
      >
        <DagToolbar
          direction={direction}
          onToggleDirection={() => setDirection((d) => (d === 'TB' ? 'LR' : 'TB'))}
          nodeCount={nodeCount}
        />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as TaskNodeData;
            if (d.isCritical) return '#f85149';
            const map: Record<string, string> = {
              done: '#3fb950',
              in_progress: '#58a6ff',
              blocked: '#f85149',
            };
            return map[d.status as string] ?? '#8b949e';
          }}
          className="!bg-[#161b22] !border-[#30363d]"
        />
        <Controls className="!bg-[#161b22] !border-[#30363d] [&>button]:!bg-[#161b22] [&>button]:!border-[#30363d] [&>button]:!text-[#c9d1d9] [&>button:hover]:!bg-[#21262d]" />
      </ReactFlow>
    </div>
  );
}

interface TaskDagViewProps {
  tasks: Task[];
  workspaceId: string;
}

export default function TaskDagView({ tasks, workspaceId }: TaskDagViewProps) {
  return (
    <ReactFlowProvider>
      <TaskDagViewInner tasks={tasks} workspaceId={workspaceId} />
    </ReactFlowProvider>
  );
}
