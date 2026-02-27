import { NextResponse } from 'next/server';
import { getSyncEngine } from '@/lib/sync-engine';

// GET /api/sync — get sync engine status
export async function GET() {
  try {
    const engine = getSyncEngine();
    if (!engine) {
      return NextResponse.json({ status: 'synced', lastSync: null, conflicts: 0 });
    }
    return NextResponse.json(engine.getStatus());
  } catch (error) {
    console.error('[API] GET /api/sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
