import { NextRequest, NextResponse } from 'next/server';

/**
 * Nexios AI Chat — powered by Google Gemini (free tier)
 *
 * Uses Google's Generative AI REST API directly.
 * Free tier: 15 RPM for Flash, 5 RPM for Pro.
 *
 * Required env var on Vercel:
 *   GEMINI_API_KEY — free key from aistudio.google.com/apikey
 *
 * Optional (fallback to paid LLM gateway):
 *   LLM_BASE_URL + LLM_API_KEY — for premium models
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const LLM_BASE_URL = process.env.LLM_BASE_URL || '';
const LLM_API_KEY = process.env.LLM_API_KEY || '';

const NEXIOS_SYSTEM_PROMPT = `You are Nexios AI, a powerful intelligent assistant built into the Nexios platform. You help users with coding, design, science, mathematics, history, writing, and general knowledge.

Guidelines:
- Be helpful, concise, and accurate
- Use markdown formatting for code blocks, lists, and emphasis
- When writing code, always specify the language in fenced code blocks
- Be conversational but professional
- If you don't know something, say so honestly
- You are running locally within the Nexios platform — no external API keys are needed from the user's perspective`;

// Gemini model mapping (free tier)
const GEMINI_MODELS: Record<string, string> = {
  'nexios-core':      'gemini-2.5-flash-preview-05-20',
  'nexios-ultra':     'gemini-2.5-pro-preview-05-06',
  'nexios-flash':     'gemini-2.0-flash',
  'nexios-gpt':       'gemini-2.5-flash-preview-05-20',
  'nexios-gpt-pro':   'gemini-2.5-pro-preview-05-06',
  'nexios-gemini':    'gemini-2.5-pro-preview-05-06',
  'nexios-grok':      'gemini-2.5-flash-preview-05-20',
  'nexios-deepseek':  'gemini-2.0-flash',
  'nexios-reasoning': 'gemini-2.5-flash-preview-05-20',
};

// Premium model mapping (paid LLM gateway, optional fallback)
const PREMIUM_MODELS: Record<string, string> = {
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

// ── Gemini REST API call ─────────────────────────────────────────

async function callGemini(
  model: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ content: string; usage?: Record<string, number> }> {
  // Convert OpenAI-style messages to Gemini format
  const systemParts = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
    },
  };

  if (systemParts) {
    body.systemInstruction = { parts: [{ text: systemParts }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'Unknown error');
    throw new Error(`Gemini API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
  const usage = data.usageMetadata || null;

  return { content, usage };
}

// ── Premium LLM gateway call (OpenAI-compatible) ─────────────────

async function callPremium(
  model: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ content: string; usage?: Record<string, number> }> {
  const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 8192 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`LLM gateway error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || 'No response generated.';
  return { content, usage: data.usage || null };
}

// ── Main handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY && !LLM_API_KEY) {
    return NextResponse.json(
      { error: 'No AI provider configured. Set GEMINI_API_KEY (free) or LLM_API_KEY in Vercel env vars.' },
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

    // Ignore stream param for now (Gemini REST doesn't support SSE the same way)
    void stream;

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

    const modelKey = requestedModel || 'nexios-core';
    const t0 = Date.now();

    let content: string;
    let usage: Record<string, number> | null | undefined;
    let engine: string;

    // Try Gemini first (free), fall back to premium if available
    if (GEMINI_API_KEY) {
      const geminiModel = GEMINI_MODELS[modelKey] || GEMINI_MODELS['nexios-core'];
      try {
        const result = await callGemini(geminiModel, openaiMessages);
        content = result.content;
        usage = result.usage;
        engine = `gemini/${geminiModel}`;
      } catch (geminiErr) {
        // If Gemini fails and we have a premium fallback, try that
        if (LLM_API_KEY && LLM_BASE_URL) {
          const premiumModel = PREMIUM_MODELS[modelKey] || PREMIUM_MODELS['nexios-core'];
          const result = await callPremium(premiumModel, openaiMessages);
          content = result.content;
          usage = result.usage;
          engine = `premium/${premiumModel}`;
        } else {
          throw geminiErr;
        }
      }
    } else {
      // No Gemini key, use premium
      const premiumModel = PREMIUM_MODELS[modelKey] || PREMIUM_MODELS['nexios-core'];
      const result = await callPremium(premiumModel, openaiMessages);
      content = result.content;
      usage = result.usage;
      engine = `premium/${premiumModel}`;
    }

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
      usage: usage || null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Nexios AI] Error:', msg);

    // Give a helpful error message
    if (msg.includes('429') || msg.includes('RATE_LIMIT') || msg.includes('quota')) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a moment and try again.', detail: msg },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: 'AI service error', detail: msg }, { status: 502 });
  }
}

export async function GET() {
  const hasGemini = !!GEMINI_API_KEY;
  const hasPremium = !!(LLM_API_KEY && LLM_BASE_URL);

  let providerStatus = 'no-provider';
  if (hasGemini) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });
      providerStatus = res.ok ? 'connected' : `error-${res.status}`;
    } catch {
      providerStatus = 'unreachable';
    }
  }

  return NextResponse.json({
    status: providerStatus === 'connected' ? 'operational' : hasPremium ? 'fallback-available' : 'degraded',
    model: 'nexios-ai-v2',
    engine: hasGemini ? 'gemini-free' : hasPremium ? 'premium-llm' : 'none',
    providers: { gemini: hasGemini, premium: hasPremium },
    availableModels: Object.keys(GEMINI_MODELS),
  });
}
