import { NextRequest, NextResponse } from 'next/server';
import { getPhases, createProject, initPhases } from '@/lib/lifecycle-service';

// GET /api/lifecycle?projectId=X — list lifecycle phases for a project
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const phases = getPhases(projectId);
    return NextResponse.json(phases);
  } catch (error) {
    console.error('[API] GET /api/lifecycle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/lifecycle — create project + initialize its 7 lifecycle phases
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, planDir, workspaceId } = body as {
      name?: string;
      planDir?: string;
      workspaceId?: string;
    };

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const project = createProject(name, planDir, workspaceId);
    initPhases(project.id);
    const phases = getPhases(project.id);

    return NextResponse.json({ project, phases }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/lifecycle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
