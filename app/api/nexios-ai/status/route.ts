import { NextResponse } from 'next/server';
import { getEngine } from '../../../../nexios-ai/core/engine';
import { getStorage } from '../../../../nexios-ai/knowledge/storage';
import { getCheckpoints } from '../../../../nexios-ai/checkpoint/checkpoint';
import { getUltra } from '../../../../nexios-ai/ultra/ultra-mode';
import { getDatasets } from '../../../../nexios-ai/learning/dataset-loader';

export async function GET() {
  try {
    const engine  = getEngine();
    const storage = getStorage();
    const ultra   = getUltra();
    const stats   = engine.getStats();

    return NextResponse.json({
      version: '0.1.0-baseline',
      model: 'nexios-ai',
      status: 'operational',
      knowledge: {
        totalEntries: storage.count(),
        byCategory: storage.countByCategory(),
      },
      checkpoints: getCheckpoints().length,
      datasets: getDatasets().length,
      datasetsCompleted: getDatasets().filter(d => d.status === 'completed').length,
      ultraMode: ultra.getStatus(),
      engine: {
        requestCount: stats.requestCount,
        uptimeMs: stats.uptimeMs,
        startedAt: stats.startedAt,
      },
    });
  } catch (e) {
    console.error('[/api/nexios-ai/status]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
