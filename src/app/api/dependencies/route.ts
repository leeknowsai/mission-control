import { NextRequest, NextResponse } from 'next/server';
import { getDependencies, addDependency } from '@/lib/dependency-service';
import { wouldCreateCycle } from '@/lib/cycle-detection';
import type { DependencyType, TaskDependency } from '@/lib/types';

// GET /api/dependencies?workspaceId=X — list task dependencies
export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspaceId') ?? undefined;
    const deps = getDependencies(workspaceId);
    return NextResponse.json(deps);
  } catch (error) {
    console.error('[API] GET /api/dependencies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/dependencies — create a task dependency
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, dependsOnId, depType = 'blocks' } = body as {
      taskId: string;
      dependsOnId: string;
      depType?: DependencyType;
    };

    if (!taskId || !dependsOnId) {
      return NextResponse.json(
        { error: 'taskId and dependsOnId are required' },
        { status: 400 }
      );
    }

    // Self-reference check
    if (taskId === dependsOnId) {
      return NextResponse.json(
        { error: 'A task cannot depend on itself' },
        { status: 400 }
      );
    }

    // Fetch existing edges to run cycle detection
    const existing = getDependencies();
    const edges = existing.map((d: TaskDependency) => ({
      source: d.task_id,
      target: d.depends_on_id,
    }));

    if (wouldCreateCycle(edges, taskId, dependsOnId)) {
      return NextResponse.json(
        { error: 'Adding this dependency would create a cycle' },
        { status: 409 }
      );
    }

    const dep = addDependency(taskId, dependsOnId, depType);
    return NextResponse.json(dep, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API] POST /api/dependencies error:', error);
    // Duplicate dependency = conflict
    if (message.includes('already exists')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
