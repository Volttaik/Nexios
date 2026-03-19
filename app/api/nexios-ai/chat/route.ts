import { NextRequest, NextResponse } from 'next/server';

/**
 * Nexios AI Chat — powered by OpenClaw gateway
 *
 * Proxies chat requests to OpenClaw's OpenAI-compatible /v1/chat/completions
 * endpoint on the local gateway. All the intelligence comes from real models
 * (Claude, GPT, Gemini, etc.) — branded as "Nexios AI".
 */

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18790';
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

const NEXIOS_SYSTEM_PROMPT = `You are Nexios AI, a powerful intelligent assistant built into the Nexios platform. You help users with coding, design, science, mathematics, history, writing, and general knowledge.

Guidelines:
- Be helpful, concise, and accurate
- Use markdown formatting for code blocks, lists, and emphasis
- When writing code, always specify the language in fenced code blocks
- Be conversational but professional
- If you don't know something, say so honestly
- You are running locally within the Nexios platform — no external API keys are needed from the user's perspective`;

// Map Nexios model IDs to real OpenClaw model identifiers
const MODEL_MAP: Record<string, string> = {
  'nexios-core': 'anthropic/claude-sonnet-4-6',
  'nexios-ultra': 'anthropic/claude-opus-4-6',
  'nexios-flash': 'anthropic/claude-haiku-4-5',
  'nexios-gpt': 'openai/gpt-5.2',
  'nexios-gpt-pro': 'openai/gpt-5.2-pro',
  'nexios-gemini': 'google-ai-studio/gemini-3.1-pro-preview',
  'nexios-grok': 'grok/grok-4',
  'nexios-deepseek': 'deepseek/deepseek-v3.2',
  'nexios-reasoning': 'openai/o4-mini',
};

export async function POST(req: NextRequest) {
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
      const upstreamRes = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
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
    const upstreamRes = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
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
  // Health check — verify OpenClaw gateway is reachable
  let gatewayStatus = 'unknown';
  try {
    const res = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: MODEL_MAP['nexios-core'],
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      }),
    });
    gatewayStatus = res.ok ? 'connected' : `error-${res.status}`;
  } catch {
    gatewayStatus = 'unreachable';
  }

  return NextResponse.json({
    status: 'operational',
    model: 'nexios-ai-v2',
    engine: 'openclaw-gateway',
    gateway: gatewayStatus,
    availableModels: Object.keys(MODEL_MAP),
  });
}
