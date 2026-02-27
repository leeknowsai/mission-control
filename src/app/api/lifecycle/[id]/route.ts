import { NextRequest, NextResponse } from 'next/server';
import { updatePhase, advancePhase, rollbackPhase, getPhases } from '@/lib/lifecycle-service';
import { getSyncEngine } from '@/lib/sync-engine';
import { queryOne } from '@/lib/db/index';
import type { LifecyclePhase } from '@/lib/types';

// PATCH /api/lifecycle/[id] — update or transition a lifecycle phase
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json() as {
      action?: 'advance' | 'rollback' | 'skip';
      status?: string;
      agent_id?: string;
      metadata?: string;
      plan_file_path?: string;
    };

    let updated;

    if (body.action === 'advance') {
      const status = advancePhase(id);
      updated = { id, status };
    } else if (body.action === 'rollback') {
      const status = rollbackPhase(id);
      updated = { id, status };
    } else if (body.action === 'skip') {
      updated = updatePhase(id, { status: 'skipped' });
    } else {
      // Direct field update
      updated = updatePhase(id, {
        status: body.status as Parameters<typeof updatePhase>[1]['status'],
        agent_id: body.agent_id,
        metadata: body.metadata,
        plan_file_path: body.plan_file_path,
      });
    }

    // Trigger file write-back if sync engine is active
    const syncEngine = getSyncEngine();
    if (syncEngine && updated) {
      const phase = queryOne<LifecyclePhase>(
        'SELECT * FROM lifecycle_phases WHERE id = ?',
        [id]
      );
      if (phase?.project_id && phase?.plan_file_path) {
        const writeUpdates: Record<string, unknown> = {};
        if (body.status) writeUpdates.status = body.status;
        if (body.agent_id !== undefined) writeUpdates.agent_id = body.agent_id;
        if (Object.keys(writeUpdates).length > 0) {
          syncEngine.writeToFile(phase.project_id, phase.phase, writeUpdates);
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PATCH /api/lifecycle/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
