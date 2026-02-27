/**
 * Gateway Event Handler
 * Parses raw WebSocket gateway events into structured ActivityEvent records,
 * persists them to the activity_events table, and emits to SSE subscribers.
 */

import { run, queryAll } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type { ActivityEvent, ActivityEventType } from '@/lib/types';

// Singleton emitter for SSE subscribers
const eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(50);

// Map gateway event prefixes/types to ActivityEventType categories
function categorizeEvent(rawType: string): ActivityEventType {
  if (!rawType) return 'system';
  const t = rawType.toLowerCase();
  if (t.startsWith('exec.') || t.includes('tool')) return 'tool_call';
  if (t.startsWith('file.') || t.includes('file_edit') || t.includes('file_change')) return 'file_edit';
  if (t === 'chat' || t === 'message' || t.startsWith('message.')) return 'message';
  if (t === 'status' || t.includes('status_change') || t.includes('state_change')) return 'status_change';
  if (t === 'error' || t.startsWith('error.') || t.includes('exception')) return 'error';
  return 'system';
}

// Extract a human-readable summary from a raw event
function extractSummary(rawType: string, rawEvent: Record<string, unknown>): string {
  if (rawEvent.summary && typeof rawEvent.summary === 'string') return rawEvent.summary;
  if (rawEvent.message && typeof rawEvent.message === 'string') return rawEvent.message;
  if (rawEvent.description && typeof rawEvent.description === 'string') return rawEvent.description;
  if (rawEvent.tool && typeof rawEvent.tool === 'string') return `Tool: ${rawEvent.tool}`;
  if (rawEvent.path && typeof rawEvent.path === 'string') return `File: ${rawEvent.path}`;
  return rawType || 'event';
}

/**
 * Parse, categorize, persist, and emit a raw gateway event.
 * Returns the created ActivityEvent or null if parsing fails.
 */
export function handleGatewayEvent(rawEvent: unknown): ActivityEvent | null {
  try {
    if (!rawEvent || typeof rawEvent !== 'object') return null;

    const ev = rawEvent as Record<string, unknown>;
    const rawType = (ev.type || ev.event || '') as string;
    const agentId = (ev.agent_id || ev.agentId || 'system') as string;
    const eventType = categorizeEvent(rawType);
    const summary = extractSummary(rawType, ev);
    const payload = JSON.stringify(ev);

    const result = run(
      `INSERT INTO activity_events (agent_id, event_type, summary, payload, timestamp)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [agentId, eventType, summary, payload]
    );

    const created: ActivityEvent = {
      id: result.lastInsertRowid as number,
      agent_id: agentId,
      event_type: eventType,
      summary,
      payload,
      timestamp: new Date().toISOString(),
    };

    eventEmitter.emit('activity', created);
    return created;
  } catch (error) {
    console.error('[GatewayEventHandler] Failed to handle event:', error);
    return null;
  }
}

/**
 * Subscribe to new activity events emitted after gateway ingestion.
 * Returns an unsubscribe function.
 */
export function subscribeToEvents(callback: (event: ActivityEvent) => void): () => void {
  eventEmitter.on('activity', callback);
  return () => eventEmitter.off('activity', callback);
}

/**
 * Get counts of activity events grouped by event_type.
 * Optionally scoped to a specific agent.
 */
export function getEventCounts(agentId?: string): Record<ActivityEventType, number> {
  const base: Record<ActivityEventType, number> = {
    tool_call: 0,
    file_edit: 0,
    message: 0,
    status_change: 0,
    error: 0,
    system: 0,
  };

  const sql = agentId
    ? `SELECT event_type, COUNT(*) as cnt FROM activity_events WHERE agent_id = ? GROUP BY event_type`
    : `SELECT event_type, COUNT(*) as cnt FROM activity_events GROUP BY event_type`;

  const rows = queryAll<{ event_type: ActivityEventType; cnt: number }>(
    sql,
    agentId ? [agentId] : []
  );

  for (const row of rows) {
    if (row.event_type in base) {
      base[row.event_type] = row.cnt;
    }
  }

  return base;
}

/**
 * Delete activity events older than retentionDays days.
 * Returns count of deleted rows.
 */
export function pruneOldEvents(retentionDays: number): number {
  const result = run(
    `DELETE FROM activity_events WHERE timestamp < datetime('now', ?)`,
    [`-${retentionDays} days`]
  );
  return result.changes;
}
