import { NextRequest, NextResponse } from 'next/server';
import { getInferenceEngine } from '../../../../nexios-ai/inference/engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, prompt } = body as { message?: string; prompt?: string };
    const input = (message ?? prompt ?? '').trim();

    if (!input) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const engine = getInferenceEngine();
    const response = await engine.process(input);

    return NextResponse.json({
      id: response.id,
      content: response.content,
      category: response.category,
      confidence: response.confidence,
      processingMs: response.processingMs,
      modelVersion: response.modelVersion,
      model: 'nexios-ai-v1',
      timestamp: response.timestamp,
      status: 'operational',
    });
  } catch (e) {
    console.error('[/api/nexios-ai/chat]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  const engine = getInferenceEngine();
  const stats = engine.getStats();
  return NextResponse.json({
    ...stats,
    status: 'operational',
    model: 'nexios-ai-v1',
  });
}
