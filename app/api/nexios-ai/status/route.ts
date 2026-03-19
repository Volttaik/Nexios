import { NextResponse } from 'next/server';
import { getInferenceEngine } from '../../../../nexios-ai/inference/engine';

export async function GET() {
  try {
    const engine = getInferenceEngine();
    const stats = engine.getStats();

    return NextResponse.json({
      status: 'operational',
      model: {
        version: stats.modelInfo.version,
        buildDate: stats.modelInfo.buildDate,
        architecture: stats.modelInfo.architecture,
        trainingPhases: stats.modelInfo.trainingPhases,
        status: stats.modelInfo.status,
      },
      performance: {
        requestCount: stats.requestCount,
        avgResponseMs: stats.avgResponseMs,
        uptimeMs: stats.uptimeMs,
        knowledgeEntries: stats.knowledgeEntries,
      },
      ready: engine.isReady(),
    });
  } catch (e) {
    console.error('[/api/nexios-ai/status]', e);
    return NextResponse.json({
      status: 'error',
      ready: false,
      error: 'Failed to retrieve model status',
    }, { status: 500 });
  }
}
