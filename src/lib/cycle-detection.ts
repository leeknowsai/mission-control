/**
 * Cycle detection for task dependency DAG.
 * Uses DFS to detect if adding a new edge would create a cycle.
 */

interface Edge {
  source: string;
  target: string;
}

/**
 * Returns true if adding an edge from newSource -> newTarget would create a cycle.
 * Self-references are also rejected.
 */
export function wouldCreateCycle(
  edges: Edge[],
  newSource: string,
  newTarget: string
): boolean {
  // Self-reference check
  if (newSource === newTarget) return true;

  // Build adjacency list from existing edges
  const adj = new Map<string, string[]>();
  for (const { source, target } of edges) {
    if (!adj.has(source)) adj.set(source, []);
    adj.get(source)!.push(target);
  }

  // DFS from newTarget following existing edges
  // If we can reach newSource, adding newSource->newTarget creates a cycle
  const visited = new Set<string>();
  const stack = [newTarget];

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === newSource) return true;
    if (visited.has(node)) continue;
    visited.add(node);

    const neighbors = adj.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return false;
}
