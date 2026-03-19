import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '../../../../nexios-ai/core/engine';
import { getLifecycle } from '../../../../nexios-ai/lifecycle/manager';

export async function POST(req: NextRequest) {
  const lifecycle = getLifecycle();

  /* Only respond in Running or Paused Learning states */
  if (!lifecycle.isRunning()) {
    return NextResponse.json(
      { error: 'Nexios AI is not running. Start the AI first.', state: lifecycle.getState() },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { message, prompt, sessionId } = body as { message?: string; prompt?: string; sessionId?: string };
    const input = (message ?? prompt ?? '').trim();

    if (!input) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const engine = getEngine();
    const response = await engine.process(input, sessionId ?? 'default');

    return NextResponse.json({
      id: response.id,
      content: response.content,
      category: response.category,
      confidence: response.confidence,
      sources: response.sources,
      knowledgeEntriesUsed: response.knowledgeEntriesUsed,
      processingMs: response.processingMs,
      model: 'nexios-ai',
      timestamp: response.timestamp,
      aiState: lifecycle.getState(),
      learningEnabled: lifecycle.getStatus().learningEnabled,
    });
  } catch (e) {
    console.error('[/api/nexios-ai/chat]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  const lifecycle = getLifecycle();
  return NextResponse.json({
    status: 'Nexios AI chat endpoint active',
    model: 'nexios-ai',
    aiState: lifecycle.getState(),
  });
}
