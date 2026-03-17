import { GoogleGenAI } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageBase64List?: string[];
}

export async function callAI(
  provider: string,
  model: string,
  messages: ChatMessage[],
  apiKey: string
): Promise<string> {
  switch (provider) {
    case 'gemini': return callGemini(model, messages, apiKey);
    case 'openai': return callOpenAI(model, messages, apiKey);
    case 'anthropic': return callAnthropic(model, messages, apiKey);
    case 'mistral': return callMistral(model, messages, apiKey);
    default: return callGemini(model, messages, apiKey);
  }
}

async function callGemini(model: string, messages: ChatMessage[], apiKey: string): Promise<string> {
  if (!apiKey) return 'Gemini API key is not configured. Add your key in the sidebar under AI Providers.';
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
        } catch { /* skip */ }
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
    if (msg.includes('API key')) return '⚠️ Invalid Gemini API key. Check your key in the AI Providers section.';
    if (msg.includes('quota')) return '⚠️ Gemini quota exceeded. Try again later or use a different model.';
    if (msg.includes('model')) return `⚠️ Model "${model}" unavailable. Try a different Gemini model.`;
    return `⚠️ Gemini error: ${msg}`;
  }
}

async function callOpenAI(model: string, messages: ChatMessage[], apiKey: string): Promise<string> {
  if (!apiKey) return 'OpenAI API key is required. Add your key in the sidebar under AI Providers.';
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
      const err = await res.json();
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401')) return '⚠️ Invalid OpenAI API key. Check your key in the AI Providers section.';
    if (msg.includes('429')) return '⚠️ OpenAI rate limit or quota exceeded.';
    return `⚠️ OpenAI error: ${msg}`;
  }
}

async function callAnthropic(model: string, messages: ChatMessage[], apiKey: string): Promise<string> {
  if (!apiKey) return 'Anthropic API key is required. Add your key in the sidebar under AI Providers.';
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
      const err = await res.json();
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || 'No response generated.';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401')) return '⚠️ Invalid Anthropic API key. Check your key in the AI Providers section.';
    if (msg.includes('429')) return '⚠️ Anthropic rate limit exceeded.';
    return `⚠️ Anthropic error: ${msg}`;
  }
}

async function callMistral(model: string, messages: ChatMessage[], apiKey: string): Promise<string> {
  if (!apiKey) return 'Mistral API key is required. Add your key in the sidebar under AI Providers.';
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: messages.map(m => ({ role: m.role, content: m.content })), max_tokens: 2048 }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return `⚠️ Mistral error: ${msg}`;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
