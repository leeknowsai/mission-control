'use client';

/**
 * Lifecycle pipeline dashboard page.
 * Shows project selector → phase stepper → phase detail panel.
 */
import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { ProjectSelector } from '@/components/project-selector';
import { LifecyclePipeline } from '@/components/lifecycle-pipeline';
import { PhaseDetailPanel } from '@/components/phase-detail-panel';
import type { LifecyclePhase, Project } from '@/lib/types';

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default function LifecyclePage() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<LifecyclePhase | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const phasesUrl = activeProject
    ? `/api/lifecycle?projectId=${activeProject.id}`
    : null;

  const { data: phases = [], mutate } = useSWR<LifecyclePhase[]>(
    phasesUrl,
    fetcher,
    { refreshInterval: 10000 }
  );

  // Keep selected phase in sync with latest fetched data
  const selectedPhaseData = selectedPhase
    ? phases.find((p) => p.id === selectedPhase.id) ?? selectedPhase
    : null;

  const handleProjectChange = useCallback((project: Project | null) => {
    setActiveProject(project);
    setSelectedPhase(null);
  }, []);

  async function handleAction(action: 'advance' | 'rollback' | 'skip') {
    if (!selectedPhaseData) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/lifecycle/${selectedPhaseData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Action failed');
      // Optimistic revalidate
      await mutate();
    } catch (err) {
      console.error('[LifecyclePage] action error:', err);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-mc-bg p-6 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-mc-text text-xl font-semibold">Lifecycle Pipeline</h1>
          <p className="text-mc-text-secondary text-sm mt-0.5">
            Track project phases from requirements through deployment.
          </p>
        </div>
        <ProjectSelector onProjectChange={handleProjectChange} />
      </div>

      {/* Pipeline stepper */}
      {activeProject ? (
        <>
          <LifecyclePipeline
            phases={phases}
            selectedPhaseId={selectedPhaseData?.id}
            onPhaseSelect={setSelectedPhase}
          />

          {/* Detail panel */}
          <PhaseDetailPanel
            phase={selectedPhaseData}
            onAction={handleAction}
            isLoading={actionLoading}
          />
        </>
      ) : (
        <div className="rounded-lg border border-mc-border bg-mc-bg-secondary p-10 text-center text-mc-text-secondary text-sm">
          Select or create a project to view its lifecycle pipeline.
        </div>
      )}
    </div>
  );
}
