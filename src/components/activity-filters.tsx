'use client';

import { cn } from '@/lib/utils';
import type { ActivityEventType } from '@/lib/types';

export type TimeRange = '1h' | '24h' | '7d' | 'all';

export interface ActivityFilters {
  agentId: string;
  eventTypes: ActivityEventType[];
  timeRange: TimeRange;
}

interface ActivityFiltersProps {
  agents: { id: string; name: string }[];
  filters: ActivityFilters;
  onChange: (filters: ActivityFilters) => void;
}

const ALL_EVENT_TYPES: ActivityEventType[] = [
  'tool_call', 'file_edit', 'message', 'status_change', 'error', 'system',
];

const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  tool_call: 'Tool',
  file_edit: 'File',
  message: 'Msg',
  status_change: 'Status',
  error: 'Error',
  system: 'System',
};

const EVENT_TYPE_COLORS: Record<ActivityEventType, string> = {
  tool_call:     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  file_edit:     'bg-green-500/20 text-green-300 border-green-500/30',
  message:       'bg-purple-500/20 text-purple-300 border-purple-500/30',
  status_change: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  error:         'bg-red-500/20 text-red-300 border-red-500/30',
  system:        'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const TIME_RANGES: TimeRange[] = ['1h', '24h', '7d', 'all'];

export function ActivityFiltersBar({ agents, filters, onChange }: ActivityFiltersProps) {
  const toggleEventType = (type: ActivityEventType) => {
    const has = filters.eventTypes.includes(type);
    onChange({
      ...filters,
      eventTypes: has
        ? filters.eventTypes.filter((t) => t !== type)
        : [...filters.eventTypes, type],
    });
  };

  const isFiltered =
    filters.agentId !== '' ||
    filters.eventTypes.length > 0 ||
    filters.timeRange !== 'all';

  return (
    <div className="space-y-2 px-3 py-2 border-b border-mc-border">
      {/* Agent filter */}
      <select
        value={filters.agentId}
        onChange={(e) => onChange({ ...filters, agentId: e.target.value })}
        className="w-full text-xs bg-mc-bg-tertiary border border-mc-border rounded px-2 py-1 text-mc-text focus:outline-none"
      >
        <option value="">All agents</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {/* Event type toggles */}
      <div className="flex flex-wrap gap-1">
        {ALL_EVENT_TYPES.map((type) => {
          const active = filters.eventTypes.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggleEventType(type)}
              className={cn(
                'px-2 py-0.5 text-xs rounded border transition-opacity',
                EVENT_TYPE_COLORS[type],
                !active && 'opacity-40'
              )}
            >
              {EVENT_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>

      {/* Time range + clear */}
      <div className="flex items-center gap-1">
        {TIME_RANGES.map((range) => (
          <button
            key={range}
            onClick={() => onChange({ ...filters, timeRange: range })}
            className={cn(
              'px-2 py-0.5 text-xs rounded uppercase transition-colors',
              filters.timeRange === range
                ? 'bg-mc-accent text-mc-bg font-medium'
                : 'text-mc-text-secondary hover:bg-mc-bg-tertiary'
            )}
          >
            {range}
          </button>
        ))}
        {isFiltered && (
          <button
            onClick={() => onChange({ agentId: '', eventTypes: [], timeRange: 'all' })}
            className="ml-auto text-xs text-mc-text-secondary hover:text-mc-text underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
