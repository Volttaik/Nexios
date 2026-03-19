/**
 * Nexios AI Client — all requests route through the OpenClaw-powered backend
 *
 * Every model is served via /api/nexios-ai/chat which proxies to OpenClaw gateway.
 * No external API keys needed from the user's perspective.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageBase64List?: string[];
}

export type AIError = 'quota' | 'key' | 'model' | 'network' | 'unknown';

export interface AIResult {
  text: string;
  errorType?: AIError;
}

export async function callAI(
  _provider: string,
  model: string,
  messages: ChatMessage[],
  _apiKey?: string,
  _sessionId?: string
): Promise<string> {
  // All providers route through Nexios backend (OpenClaw gateway)
  return callNexiosAI(model, messages);
}

async function callNexiosAI(model: string, messages: ChatMessage[]): Promise<string> {
  try {
    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    if (formattedMessages.length === 0 || !formattedMessages[formattedMessages.length - 1]?.content?.trim()) {
      return 'Please enter a message.';
    }

    const res = await fetch('/api/nexios-ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: formattedMessages, model }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const modelLabel = model.replace('nexios-', '').replace(/^\w/, c => c.toUpperCase());
    const meta = `\n\n---\n*Nexios AI · ${modelLabel} · ${data.processingMs}ms*`;

    return (data.content || 'No response.') + meta;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Failed to fetch') || msg.includes('network')) {
      return `⚠️ **Network error** — Could not reach the Nexios AI backend. Please try again.`;
    }
    return `⚠️ **Nexios AI error:** ${msg}\n\nThe AI backend may be starting up. Try again in a moment.`;
  }
}
