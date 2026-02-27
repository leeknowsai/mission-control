import { NextRequest, NextResponse } from 'next/server';
import { getSyncEngine } from '@/lib/sync-engine';

// GET /api/sync/conflicts — list unresolved conflicts
export async function GET() {
  try {
    const engine = getSyncEngine();
    if (!engine) {
      return NextResponse.json([]);
    }
    return NextResponse.json(engine.getConflicts());
  } catch (error) {
    console.error('[API] GET /api/sync/conflicts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sync/conflicts — resolve a conflict
// Body: { index: number, resolution: 'use_dashboard' | 'use_file' }
export async function POST(request: NextRequest) {
  try {
    const engine = getSyncEngine();
    if (!engine) {
      return NextResponse.json({ error: 'Sync engine not running' }, { status: 503 });
    }

    const body = await request.json() as {
      index: number;
      resolution: 'use_dashboard' | 'use_file';
    };

    const { index, resolution } = body;

    if (typeof index !== 'number' || !['use_dashboard', 'use_file'].includes(resolution)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    engine.resolveConflict(index, resolution);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API] POST /api/sync/conflicts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
