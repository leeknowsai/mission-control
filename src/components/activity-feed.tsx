'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { ChevronRight, ArrowDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActivityEventCard } from '@/components/activity-event-card';
import { ActivityFiltersBar, type ActivityFilters, type TimeRange } from '@/components/activity-filters';
import { useMissionControl } from '@/lib/store';
import type { ActivityEvent } from '@/lib/types';

interface ActivityFeedProps {
  workspaceId?: string;
}

const PAGE_SIZE = 30;

// Convert TimeRange to an ISO timestamp for the `after` query param
function timeRangeToAfter(range: TimeRange): string | undefined {
  if (range === 'all') return undefined;
  const ms = { '1h': 3600000, '24h': 86400000, '7d': 604800000 }[range];
  return new Date(Date.now() - ms).toISOString();
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildUrl(filters: ActivityFilters, offset: number): string {
  const params = new URLSearchParams();
  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.eventTypes.length === 1) params.set('type', filters.eventTypes[0]);
  const after = timeRangeToAfter(filters.timeRange);
  if (after) params.set('after', after);
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(offset));
  return `/api/activity?${params.toString()}`;
}

export function ActivityFeed({ workspaceId }: ActivityFeedProps) {
  const { agents } = useMissionControl();

  const [filters, setFilters] = useState<ActivityFilters>({
    agentId: '',
    eventTypes: [],
    timeRange: 'all',
  });
  const [offset, setOffset] = useState(0);
  const [allEvents, setAllEvents] = useState<ActivityEvent[]>([]);
  const [liveQueue, setLiveQueue] = useState<ActivityEvent[]>([]);
  const [atBottom, setAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // SWR fetch for paginated/filtered events
  const url = buildUrl(filters, offset);
  const { data, isLoading } = useSWR<{ events: ActivityEvent[]; total: number; hasMore: boolean }>(
    url,
    fetcher,
    { revalidateOnFocus: false }
  );

  // When filters change, reset to first page and clear merged list
  const handleFiltersChange = useCallback((next: ActivityFilters) => {
    setFilters(next);
    setOffset(0);
    setAllEvents([]);
    setLiveQueue([]);
  }, []);

  // Merge fetched page into allEvents (deduplicate by id)
  useEffect(() => {
    if (!data?.events) return;
    setAllEvents((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const fresh = data.events.filter((e) => !existingIds.has(e.id));
      return offset === 0 ? data.events : [...prev, ...fresh];
    });
  }, [data, offset]);

  // SSE connection for real-time events
  useEffect(() => {
    const es = new EventSource('/api/activity/stream');
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'activity_event' && msg.event) {
          const incoming = msg.event as ActivityEvent;
          // Apply client-side filter matching
          if (filters.agentId && incoming.agent_id !== filters.agentId) return;
          if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(incoming.event_type)) return;
          if (atBottom) {
            setAllEvents((prev) => [incoming, ...prev]);
          } else {
            setLiveQueue((prev) => [incoming, ...prev]);
          }
        }
      } catch { /* ignore parse errors */ }
    };

    return () => es.close();
  }, [filters, atBottom]);

  // Scroll detection
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distFromBottom < 40);
  }, []);

  // Flush live queue when user scrolls back to bottom
  useEffect(() => {
    if (atBottom && liveQueue.length > 0) {
      setAllEvents((prev) => [...liveQueue, ...prev]);
      setLiveQueue([]);
    }
  }, [atBottom, liveQueue]);

  const agentList = agents.map((a) => ({ id: a.id, name: a.name }));
  const hasMore = data?.hasMore ?? false;

  return (
    <aside className="w-80 bg-mc-bg-secondary border-l border-mc-border flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-mc-border">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-mc-text-secondary" />
          <span className="text-sm font-medium uppercase tracking-wider">Activity</span>
          {data?.total != null && (
            <span className="bg-mc-bg-tertiary text-mc-text-secondary text-xs px-2 py-0.5 rounded ml-auto">
              {data.total}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <ActivityFiltersBar agents={agentList} filters={filters} onChange={handleFiltersChange} />

      {/* Events list */}
      <div className="relative flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto p-2 space-y-1"
          >
            {isLoading && allEvents.length === 0 ? (
              <div className="text-center py-8 text-mc-text-secondary text-sm">Loading...</div>
            ) : allEvents.length === 0 ? (
              <div className="text-center py-8 text-mc-text-secondary text-sm">No activity yet</div>
            ) : (
              allEvents.map((event) => (
                <ActivityEventCard key={event.id} event={event} />
              ))
            )}

            {/* Load more */}
            {hasMore && !isLoading && (
              <button
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                className="w-full text-xs text-mc-text-secondary hover:text-mc-text py-2 text-center"
              >
                Load more
              </button>
            )}
          </div>
        </ScrollArea>

        {/* New events badge */}
        {liveQueue.length > 0 && (
          <button
            onClick={() => {
              setAllEvents((prev) => [...liveQueue, ...prev]);
              setLiveQueue([]);
              setAtBottom(true);
              scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 bg-mc-accent text-mc-bg text-xs rounded-full shadow-lg font-medium"
          >
            <ArrowDown className="w-3 h-3" />
            {liveQueue.length} new
          </button>
        )}
      </div>
    </aside>
  );
}
