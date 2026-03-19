import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '../../../../nexios-ai/core/engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId } = body as { message?: string; sessionId?: string };

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const engine = getEngine();
    const response = await engine.process(message.trim(), sessionId ?? 'default');

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
    });
  } catch (e) {
    console.error('[/api/nexios-ai/chat]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Nexios AI chat endpoint active', model: 'nexios-ai' });
}
