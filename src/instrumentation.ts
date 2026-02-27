/**
 * Next.js instrumentation hook — runs once on server startup.
 * Starts the bidirectional sync engine if SYNC_ENABLED=true and PLAN_DIR is set.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run in the Node.js runtime (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const planDir = process.env.PLAN_DIR;
    const syncEnabled = process.env.SYNC_ENABLED === 'true';

    if (planDir && syncEnabled) {
      const { initSyncEngine } = await import('./lib/sync-engine');
      initSyncEngine(planDir);
      console.log('[Sync] Engine started for:', planDir);
    }
  }
}
