'use client';

/**
 * Dropdown to pick the active project for the lifecycle pipeline view.
 * Persists selection to localStorage. Includes inline "New Project" form.
 */
import { useState, useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types';

const STORAGE_KEY = 'lao-active-project';
const PROJECTS_URL = '/api/projects';

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

interface ProjectSelectorProps {
  onProjectChange: (project: Project | null) => void;
}

export function ProjectSelector({ onProjectChange }: ProjectSelectorProps) {
  const { data: projects = [], isLoading } = useSWR<Project[]>(PROJECTS_URL, fetcher);

  const [isOpen, setIsOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlanDir, setNewPlanDir] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Restore persisted selection
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setActiveId(saved);
  }, []);

  // Notify parent when projects load and active id resolves
  useEffect(() => {
    if (!projects.length) return;
    const found = projects.find((p) => p.id === activeId) ?? null;
    onProjectChange(found);
  }, [activeId, projects, onProjectChange]);

  const activeProject = projects.find((p) => p.id === activeId) ?? null;

  function selectProject(project: Project) {
    setActiveId(project.id);
    localStorage.setItem(STORAGE_KEY, project.id);
    onProjectChange(project);
    setIsOpen(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), planDir: newPlanDir.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const { project } = await res.json() as { project: Project };
      await globalMutate(PROJECTS_URL);
      selectProject(project);
      setNewName('');
      setNewPlanDir('');
      setShowNewForm(false);
    } catch (err) {
      console.error('[ProjectSelector] create error:', err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md border border-mc-border bg-mc-bg-secondary',
          'text-sm text-mc-text hover:bg-mc-bg-tertiary transition-colors min-w-[200px]'
        )}
      >
        <span className="flex-1 text-left truncate">
          {isLoading ? 'Loading...' : activeProject?.name ?? 'Select project…'}
        </span>
        <ChevronDown className="w-4 h-4 text-mc-text-secondary shrink-0" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          'absolute left-0 top-full mt-1 z-50 min-w-[260px]',
          'border border-mc-border rounded-md bg-mc-bg-secondary shadow-lg'
        )}>
          {/* Project list */}
          <ul className="py-1 max-h-56 overflow-y-auto">
            {projects.length === 0 && (
              <li className="px-3 py-2 text-mc-text-secondary text-sm">No projects yet.</li>
            )}
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => selectProject(p)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-mc-bg-tertiary transition-colors',
                    p.id === activeId ? 'text-mc-accent' : 'text-mc-text'
                  )}
                >
                  {p.name}
                  {p.plan_dir && (
                    <span className="block text-[11px] text-mc-text-secondary truncate">{p.plan_dir}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Divider + new project toggle */}
          <div className="border-t border-mc-border">
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-mc-accent hover:bg-mc-bg-tertiary transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            ) : (
              <form onSubmit={handleCreate} className="p-3 space-y-2">
                <input
                  autoFocus
                  placeholder="Project name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={cn(
                    'w-full px-2 py-1.5 text-sm rounded border border-mc-border',
                    'bg-mc-bg-tertiary text-mc-text placeholder:text-mc-text-secondary',
                    'focus:outline-none focus:ring-1 focus:ring-mc-accent'
                  )}
                />
                <input
                  placeholder="Plan dir (optional)"
                  value={newPlanDir}
                  onChange={(e) => setNewPlanDir(e.target.value)}
                  className={cn(
                    'w-full px-2 py-1.5 text-sm rounded border border-mc-border',
                    'bg-mc-bg-tertiary text-mc-text placeholder:text-mc-text-secondary',
                    'focus:outline-none focus:ring-1 focus:ring-mc-accent'
                  )}
                />
                <div className="flex gap-2">
                  <Button size="sm" type="submit" disabled={creating || !newName.trim()}>
                    {creating ? 'Creating…' : 'Create'}
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => setShowNewForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Click-away */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
