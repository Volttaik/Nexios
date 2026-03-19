import { NextRequest, NextResponse } from 'next/server';

/**
 * Nexios AI Chat — calls the LLM provider directly
 *
 * Routes chat requests to the configured LLM API (e.g. llm.atxp.ai)
 * using OpenAI-compatible /v1/chat/completions format.
 *
 * Required env vars on Vercel:
 *   LLM_BASE_URL  — e.g. https://llm.atxp.ai
 *   LLM_API_KEY   — your API key for the LLM provider
 */

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://llm.atxp.ai';
const LLM_API_KEY = process.env.LLM_API_KEY || '';

const NEXIOS_SYSTEM_PROMPT = `You are Nexios AI, a powerful intelligent assistant built into the Nexios platform. You help users with coding, design, science, mathematics, history, writing, and general knowledge.

Guidelines:
- Be helpful, concise, and accurate
- Use markdown formatting for code blocks, lists, and emphasis
- When writing code, always specify the language in fenced code blocks
- Be conversational but professional
- If you don't know something, say so honestly
- You are running locally within the Nexios platform — no external API keys are needed from the user's perspective`;

// Map Nexios model IDs to the actual model IDs on the LLM provider
const MODEL_MAP: Record<string, string> = {
  'nexios-core':      'claude-sonnet-4-6',
  'nexios-ultra':     'claude-opus-4-6',
  'nexios-flash':     'claude-haiku-4-5',
  'nexios-gpt':       'gpt-5.2',
  'nexios-gpt-pro':   'gpt-5.2-pro',
  'nexios-gemini':    'gemini-3.1-pro-preview',
  'nexios-grok':      'grok-4',
  'nexios-deepseek':  'deepseek-v3.2',
  'nexios-reasoning': 'o4-mini',
};

export async function POST(req: NextRequest) {
  if (!LLM_API_KEY) {
    return NextResponse.json(
      { error: 'LLM_API_KEY not configured. Set it in your Vercel environment variables.' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { message, prompt, messages: clientMessages, model: requestedModel, stream } = body as {
      message?: string;
      prompt?: string;
      messages?: Array<{ role: string; content: string }>;
      model?: string;
      stream?: boolean;
    };

    // Build messages array
    const openaiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: NEXIOS_SYSTEM_PROMPT },
    ];

    if (clientMessages && Array.isArray(clientMessages)) {
      openaiMessages.push(...clientMessages);
    } else {
      const input = (message ?? prompt ?? '').trim();
      if (!input) {
        return NextResponse.json({ error: 'message is required' }, { status: 400 });
      }
      openaiMessages.push({ role: 'user', content: input });
    }

    // Resolve model
    const modelKey = requestedModel || 'nexios-core';
    const resolvedModel = MODEL_MAP[modelKey] || MODEL_MAP['nexios-core'];

    const t0 = Date.now();

    if (stream) {
      // Streaming response
      const upstreamRes = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: openaiMessages,
          stream: true,
          max_tokens: 8192,
        }),
      });

      if (!upstreamRes.ok) {
        const errText = await upstreamRes.text().catch(() => 'Unknown error');
        return NextResponse.json(
          { error: `Upstream error: ${upstreamRes.status}`, detail: errText },
          { status: upstreamRes.status }
        );
      }

      // Forward the SSE stream
      return new NextResponse(upstreamRes.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response
    const upstreamRes = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: openaiMessages,
        max_tokens: 8192,
      }),
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => 'Unknown error');
      console.error(`[Nexios AI] Upstream error ${upstreamRes.status}:`, errText);
      return NextResponse.json(
        { error: `AI service error (${upstreamRes.status})`, detail: errText },
        { status: 502 }
      );
    }

    const data = await upstreamRes.json();
    const content = data.choices?.[0]?.message?.content || 'No response generated.';
    const processingMs = Date.now() - t0;

    return NextResponse.json({
      id: `nexios_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content,
      category: 'general',
      confidence: 0.95,
      processingMs,
      modelVersion: `nexios-ai-v2.0 (${modelKey})`,
      model: 'nexios-ai-v2',
      timestamp: Date.now(),
      status: 'operational',
      knowledgeEntriesUsed: 0,
      usage: data.usage || null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Nexios AI] Error:', msg);
    return NextResponse.json({ error: 'Internal error', detail: msg }, { status: 500 });
  }
}

export async function GET() {
  // Health check
  let providerStatus = 'unknown';
  if (!LLM_API_KEY) {
    providerStatus = 'no-api-key';
  } else {
    try {
      const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_MAP['nexios-core'],
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });
      providerStatus = res.ok ? 'connected' : `error-${res.status}`;
    } catch {
      providerStatus = 'unreachable';
    }
  }

  return NextResponse.json({
    status: providerStatus === 'connected' ? 'operational' : 'degraded',
    model: 'nexios-ai-v2',
    engine: 'direct-llm',
    provider: providerStatus,
    availableModels: Object.keys(MODEL_MAP),
  });
}
