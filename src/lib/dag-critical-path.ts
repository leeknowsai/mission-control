/**
 * Critical path detection for a DAG of React Flow nodes and edges.
 * Finds the longest path from a root node using DFS with memoization.
 */

import type { Node, Edge } from '@xyflow/react';

/**
 * Returns the Set of node IDs that form the longest path (critical path) in the DAG.
 */
export function findCriticalPath(nodes: Node[], edges: Edge[]): Set<string> {
  if (nodes.length === 0) return new Set();

  // Build adjacency list and in-degree map
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  // DFS to find longest path length from each node
  const memo = new Map<string, number>();
  function dfs(nodeId: string): number {
    if (memo.has(nodeId)) return memo.get(nodeId)!;
    const nbrs = adj.get(nodeId) ?? [];
    const maxLen = nbrs.reduce((max, n) => Math.max(max, dfs(n)), 0);
    const result = maxLen + 1;
    memo.set(nodeId, result);
    return result;
  }
  for (const n of nodes) dfs(n.id);

  // Root nodes = no incoming edges
  const roots = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  if (roots.length === 0) return new Set();

  // Pick root with the longest path
  const bestRoot = roots.reduce((best, n) =>
    (memo.get(n.id) ?? 0) > (memo.get(best.id) ?? 0) ? n : best
  );

  // Greedily trace the critical path
  const critical = new Set<string>();
  let current: string | null = bestRoot.id;
  while (current) {
    critical.add(current);
    const nbrs: string[] = adj.get(current) ?? [];
    const next: string | null = nbrs.reduce<string | null>((best, n) => {
      if (!best) return n;
      return (memo.get(n) ?? 0) > (memo.get(best) ?? 0) ? n : best;
    }, null);
    current = next;
  }

  return critical;
}
