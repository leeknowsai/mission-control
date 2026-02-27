import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';
import type { ActivityEvent } from '@/lib/types';

// GET /api/activity — paginated activity events with optional time range filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const agentId = searchParams.get('agentId');
    const eventType = searchParams.get('type');
    const after = searchParams.get('after');
    const before = searchParams.get('before');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = 'SELECT * FROM activity_events WHERE 1=1';
    const params: unknown[] = [];

    if (agentId) {
      sql += ' AND agent_id = ?';
      params.push(agentId);
    }
    if (eventType) {
      sql += ' AND event_type = ?';
      params.push(eventType);
    }
    if (after) {
      sql += ' AND timestamp > ?';
      params.push(after);
    }
    if (before) {
      sql += ' AND timestamp < ?';
      params.push(before);
    }

    // Count total matching rows for pagination metadata
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countRow = queryOne<{ count: number }>(countSql, params);
    const total = countRow?.count ?? 0;

    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const events = queryAll<ActivityEvent>(sql, params);
    return NextResponse.json({
      events,
      total,
      hasMore: offset + events.length < total,
    });
  } catch (error) {
    console.error('[API] GET /api/activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
