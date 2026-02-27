import { NextRequest } from 'next/server';
import { subscribeToEvents } from '@/lib/gateway-event-handler';
import type { ActivityEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/activity/stream — Server-Sent Events for real-time activity events
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Subscribe to new activity events from gateway-event-handler
      const unsubscribe = subscribeToEvents((event: ActivityEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'activity_event', event })}\n\n`)
          );
        } catch {
          // Controller closed — unsubscribe will be called on abort
        }
      });

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
