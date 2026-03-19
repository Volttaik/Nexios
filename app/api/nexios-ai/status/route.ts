import { NextResponse } from 'next/server';
import { getEngine } from '../../../../nexios-ai/core/engine';
import { getStorage } from '../../../../nexios-ai/knowledge/storage';
import { getCheckpoints } from '../../../../nexios-ai/checkpoint/checkpoint';
import { getDatasetNames, getDatasetCount } from '../../../../nexios-ai/datasets/fetcher';
import { getLifecycle } from '../../../../nexios-ai/lifecycle/manager';
import { getOrchestrator } from '../../../../nexios-ai/agents/orchestrator';

export async function GET() {
  try {
    const engine       = getEngine();
    const storage      = getStorage();
    const lifecycle    = getLifecycle();
    const orchestrator = getOrchestrator();
    const stats        = engine.getStats();
    const storStats    = storage.storageStats();
    const orchStatus   = orchestrator.getStatus();
    const lcStatus     = lifecycle.getStatus();

    return NextResponse.json({
      version: '0.2.0',
      model: 'nexios-ai',
      status: 'operational',
      lifecycle: {
        state: lcStatus.state,
        learningEnabled: lcStatus.learningEnabled,
        startedAt: lcStatus.startedAt,
        uptimeMs: lcStatus.startedAt ? Date.now() - lcStatus.startedAt : 0,
      },
      knowledge: {
        totalEntries: storage.count(),
        byCategory: storage.countByCategory(),
        storage: storStats,
      },
      orchestrator: {
        running: orchStatus.running,
        cycleCount: orchStatus.cycleCount,
        totalItemsProcessed: orchStatus.totalItemsProcessed,
        currentAgent: orchStatus.currentAgent,
      },
      checkpoints: getCheckpoints().length,
      datasets: {
        available: getDatasetCount(),
        names: getDatasetNames().slice(0, 10),
      },
      engine: {
        requestCount: stats.requestCount,
        uptimeMs: stats.uptimeMs,
        startedAt: stats.startedAt,
      },
      warnings: storStats.nearLimit
        ? [`Knowledge base at ${storStats.usagePercent}% capacity`]
        : [],
    });
  } catch (e) {
    console.error('[/api/nexios-ai/status]', e);
    return NextResponse.json({ error: 'Internal error', details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
