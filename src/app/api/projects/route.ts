import { NextRequest, NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/lifecycle-service';

// GET /api/projects — list all projects
export async function GET() {
  try {
    const projects = getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('[API] GET /api/projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects — create a new project (without initializing phases)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      name?: string;
      planDir?: string;
      workspaceId?: string;
    };

    if (!body.name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const project = createProject(body.name, body.planDir, body.workspaceId);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
