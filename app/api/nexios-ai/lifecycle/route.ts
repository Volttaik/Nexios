import { NextRequest, NextResponse } from 'next/server';
import { getLifecycle } from '@/nexios-ai/lifecycle/manager';
import { getOrchestrator } from '@/nexios-ai/agents/orchestrator';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET() {
  const lifecycle = getLifecycle();
  return json(lifecycle.getStatus());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { action?: string };
  const { action } = body;
  const lifecycle = getLifecycle();
  const orchestrator = getOrchestrator();

  if (action === 'start') {
    const result = await lifecycle.start();
    if (result.success) {
      /* Start the learning orchestrator when AI goes Running */
      orchestrator.start();
    }
    return json({ ...result, status: lifecycle.getStatus() });
  }

  if (action === 'stop') {
    const result = lifecycle.stop();
    orchestrator.stop();
    return json({ ...result, status: lifecycle.getStatus() });
  }

  if (action === 'toggleLearning') {
    const result = lifecycle.toggleLearning();
    /* If learning just resumed, restart orchestrator */
    if (result.learningEnabled && lifecycle.isRunning()) {
      orchestrator.start();
    }
    return json({ ...result, status: lifecycle.getStatus() });
  }

  return json({ error: 'Unknown action. Valid: start | stop | toggleLearning' }, 400);
}
