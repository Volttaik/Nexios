import { GoogleGenAI } from '@google/genai';

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
  provider: string,
  model: string,
  messages: ChatMessage[],
  apiKey: string
): Promise<string> {
  switch (provider) {
    case 'gemini':    return callGemini(model, messages, apiKey);
    case 'groq':      return callGroq(model, messages, apiKey);
    case 'openai':    return callOpenAI(model, messages, apiKey);
    case 'anthropic': return callAnthropic(model, messages, apiKey);
    case 'mistral':   return callMistral(model, messages, apiKey);
    default:          return callGemini(model, messages, apiKey);
  }
}

async function callGemini(model: string, messages: ChatMessage[], apiKey: string): Promise<string> {
  if (!apiKey) return '⚠️ **No API key** — Add your Gemini key in Settings → AI Providers, or switch to Groq (free).';
  try {
    const ai = new GoogleGenAI({ apiKey });
    const lastMsg = messages[messages.length - 1];
    const parts: Array<Record<string, unknown>> = [];

    if (lastMsg.content.trim()) parts.push({ text: lastMsg.content });

    if (lastMsg.imageBase64List?.length) {
      for (const src of lastMsg.imageBase64List) {
        try {
          let base64Data: string;
          let mimeType = 'image/jpeg';
          if (src.startsWith('data:')) {
            const match = src.match(/^data:([^;]+);base64,(.+)$/);
            if (match) { mimeType = match[1]; base64Data = match[2]; }
            else base64Data = src.split(',')[1];
          } else {
            const resp = await fetch(src);
            const blob = await resp.blob();
            base64Data = await blobToBase64(blob);
          }
          parts.push({ inlineData: { mimeType, data: base64Data } });
        } catch { /* skip bad images */ }
      }
    }

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model,
      contents: [...history, { role: 'user', parts }],
    });

    return response.text || 'Empty response received.';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key')) return '⚠️ **Invalid Gemini API key.** Check your key in Settings → AI Providers.';
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('429')) {
      return '⚠️ **Gemini quota exceeded.** You can switch to **Groq** (free) in the model selector — it has generous free limits with Llama 3.3, Mixtral, and more.';
    }
    if (msg.includes('model')) return `⚠️ Model "${model}" unavailable. Try a different Gemini model.`;
    return `⚠️ Gemini error: ${msg}`;
  }
}

async function callGroq(model: string, messages: ChatMessage[], apiKey: string): Promise<string> {
  if (!apiKey) return '⚠️ **Groq API key needed.** Get your free key at [console.groq.com](https://console.groq.com) — it\'s 100% free with generous limits!';
  try {
    const formattedMessages = messages.map(m => {
      if (m.role === 'user' && m.imageBase64List?.length && model.includes('vision')) {
        return {
          role: 'user',
          content: [
            { type: 'text', text: m.content || 'Describe this image.' },
            ...m.imageBase64List.map(img => ({
              type: 'image_url',
              image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` },
            })),
          ],
        };
      }
      return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
    });

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errMsg = err.error?.message || `HTTP ${res.status}`;
      if (res.status === 401) return '⚠️ **Invalid Groq API key.** Get your free key at console.groq.com';
      if (res.status === 429) return '⚠️ **Groq rate limit hit.** Wait a moment and try again, or switch to a different Groq model.';
      throw new Error(errMsg);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Failed to fetch') || msg.includes('network')) return '⚠️ **Network error** connecting to Groq. Check your internet connection.';
    return `⚠️ Groq error: ${msg}`;
  }
}

async function callOpenAI(model: string, messages: ChatMessage[], apiKey: string): Promise<string> {
  if (!apiKey) return '⚠️ **OpenAI API key required.** Add your key in Settings → AI Providers, or use Groq for a free alternative.';
  try {
    const body: Record<string, unknown> = {
      model,
      messages: messages.map(m => {
        if (m.role === 'user' && m.imageBase64List?.length) {
          return {
            role: 'user',
            content: [
              { type: 'text', text: m.content || 'Describe this image.' },
              ...m.imageBase64List.map(img => ({
                type: 'image_url',
                image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` },
              })),
            ],
          };
        }
        return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
      }),
      max_tokens: 2048,
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401') || msg.includes('Incorrect API key')) return '⚠️ **Invalid OpenAI API key.** Check your key in Settings → AI Providers.';
    if (msg.includes('429') || msg.includes('quota') || msg.includes('insufficient_quota')) {
      return '⚠️ **OpenAI quota exceeded.** Switch to **Groq** (free) for Llama 3.3, Mixtral, and more with no cost.';
    }
    return `⚠️ OpenAI error: ${msg}`;
  }
}

async function callAnthropic(model: string, messages: ChatMessage[], apiKey: string): Promise<string> {
  if (!apiKey) return '⚠️ **Anthropic API key required.** Add your key in Settings → AI Providers, or use Groq for a free alternative.';
  try {
    const anthropicMessages = messages.map(m => {
      if (m.role === 'user' && m.imageBase64List?.length) {
        return {
          role: 'user',
          content: [
            ...m.imageBase64List.map(img => {
              const match = img.match(/^data:([^;]+);base64,(.+)$/);
              return {
                type: 'image',
                source: { type: 'base64', media_type: match ? match[1] : 'image/jpeg', data: match ? match[2] : img },
              };
            }),
            { type: 'text', text: m.content || 'Describe this image.' },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, messages: anthropicMessages, max_tokens: 2048 }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || 'No response generated.';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401')) return '⚠️ **Invalid Anthropic API key.** Check your key in Settings → AI Providers.';
    if (msg.includes('429') || msg.includes('overloaded')) return '⚠️ **Anthropic rate limit exceeded.** Try again in a moment or switch to Groq (free).';
    return `⚠️ Anthropic error: ${msg}`;
  }
}

async function callMistral(model: string, messages: ChatMessage[], apiKey: string): Promise<string> {
  if (!apiKey) return '⚠️ **Mistral API key required.** Add your key in Settings → AI Providers, or use Groq for a free alternative.';
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401')) return '⚠️ **Invalid Mistral API key.** Check your key in Settings → AI Providers.';
    if (msg.includes('429')) return '⚠️ **Mistral rate limit exceeded.** Try Groq (free) as an alternative.';
    return `⚠️ Mistral error: ${msg}`;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve((reader.result as string).split(',')[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
