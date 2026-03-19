import type { TaskCategory, KnowledgeResult, ConversationContext } from '../types/index';

const CONFIDENCE_THRESHOLD = 0.22;

const SCHEMA_HEADER_RE = /^\[SCHEMA:[^\]]*\](\[SRC:[^\]]*\])?(\[CAT:[^\]]*\])?(\[CONF:[^\]]*\])?(\[TS:[^\]]*\])?\s*/;

function cleanContent(raw: string): string {
  return raw
    .replace(SCHEMA_HEADER_RE, '')
    .replace(/\[SCHEMA:[^\]]*\]/g, '')
    .replace(/\[SRC:[^\]]*\]/g, '')
    .replace(/\[CAT:[^\]]*\]/g, '')
    .replace(/\[CONF:[^\]]*\]/g, '')
    .replace(/\[TS:[^\]]*\]/g, '')
    .trim();
}

function topContent(results: KnowledgeResult[], max: number): string[] {
  return results
    .slice(0, max)
    .map(r => cleanContent(r.entry.content).slice(0, 700).trim())
    .filter(c => c.length > 20);
}

function prose(chunks: string[]): string {
  return chunks.join('\n\n');
}

function detectMath(input: string): number | null {
  const expr = input
    .replace(/what(?:'s| is)\s+/i, '')
    .replace(/calculate\s+/i, '')
    .replace(/compute\s+/i, '')
    .replace(/[^0-9+\-*/().%\s]/g, '')
    .trim();

  if (!expr || expr.length > 60) return null;
  if (!/\d/.test(expr)) return null;

  try {
    const result = Function(`"use strict"; return (${expr})`)();
    if (typeof result === 'number' && isFinite(result)) return result;
  } catch { /* not evaluable */ }
  return null;
}

function greetingResponse(input: string): string | null {
  const l = input.toLowerCase().trim();
  if (l.match(/^(hi|hello|hey|howdy|hiya|sup|what'?s up|yo)\b/)) {
    return "Hello! How can I help you today?";
  }
  if (l.match(/\bgood\s*(morning|afternoon|evening|day|night)\b/)) {
    const part = l.includes('morning') ? 'morning' :
                 l.includes('afternoon') ? 'afternoon' :
                 l.includes('evening') ? 'evening' :
                 l.includes('night') ? 'night' : 'day';
    return `Good ${part}! How can I assist you?`;
  }
  if (l.match(/\b(thank(?:s| you)|cheers|appreciate)\b/)) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  if (l.match(/\b(bye|goodbye|see you|take care|later)\b/)) {
    return "Goodbye! Feel free to come back any time.";
  }
  return null;
}

function identityResponse(input: string): string | null {
  const l = input.toLowerCase();
  if (l.match(/\b(who|what)\s+(are|r)\s+you\b/) || l.match(/\bintroduce yourself\b/)) {
    return "I am Nexios AI — the built-in intelligence system of the Nexios platform.\n\nI can help you with coding questions, document writing, design advice, maths, science, and general conversation. I learn continuously from public knowledge sources, so the more time I have to train, the better my answers become.";
  }
  if (l.match(/\bwhat can you do\b/) || l.match(/\bwhat do you (do|know)\b/)) {
    return "I can help you with:\n\n- **Coding** — explain code, debug errors, and describe algorithms\n- **Mathematics** — solve and explain maths problems\n- **Science** — biology, physics, chemistry, and general science\n- **Writing** — drafting, editing, and formatting documents\n- **Design** — colour theory, layout, typography, and UX advice\n- **General questions** — facts, definitions, and explanations\n\nMy knowledge grows continuously as I learn from public resources.";
  }
  if (l.match(/\bare you (an? )?(ai|artificial intelligence|bot|robot|human|real)\b/)) {
    return "I am an AI — the Nexios AI system. I am not human, but I am designed to communicate naturally and helpfully. I run entirely on this server and learn from public knowledge sources rather than relying on external APIs.";
  }
  return null;
}

function dateTimeResponse(input: string): string | null {
  const l = input.toLowerCase();
  const now = new Date();

  if (l.match(/\b(what(?:'s| is) (?:the )?(?:date|today)|today(?:'s)? date|what day is (it|today))\b/)) {
    return `Today is ${now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }
  if (l.match(/\b(what(?:'s| is) (?:the )?time|current time|time is it)\b/)) {
    return `The current time is ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} (server time).`;
  }
  if (l.match(/\b(what(?:'s| is) (?:the )?year|current year|what year)\b/)) {
    return `The current year is ${now.getFullYear()}.`;
  }
  return null;
}

function mathResponse(input: string): string | null {
  const result = detectMath(input);
  if (result === null) return null;

  const expr = input
    .replace(/what(?:'s| is)\s+/i, '')
    .replace(/calculate\s+/i, '')
    .replace(/compute\s+/i, '')
    .replace(/[^0-9+\-*/().%\s]/g, '')
    .trim();

  const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, '');
  return `${expr} = **${formatted}**`;
}

function synthesise(input: string, results: KnowledgeResult[], max: number): string {
  const chunks = topContent(results, max);
  if (!chunks.length) return '';
  return prose(chunks);
}

function codingResponse(input: string, knowledge: KnowledgeResult[]): string {
  const body = synthesise(input, knowledge, 4);
  if (body) return body;
  return "I don't know this information as of right now — I am still learning. Try asking me about a specific programming concept, language feature, or algorithm, and I will share what I know.";
}

function documentResponse(input: string, knowledge: KnowledgeResult[]): string {
  const body = synthesise(input, knowledge, 3);
  if (body) return body;
  return "I don't know this information as of right now — I am still learning. I will be better at writing and documentation assistance as my knowledge grows.";
}

function designResponse(input: string, knowledge: KnowledgeResult[]): string {
  const body = synthesise(input, knowledge, 3);
  if (body) return body;
  return "I don't know this information as of right now — I am still learning. My design knowledge will improve as I learn more from design resources and guidelines.";
}

function chatResponse(input: string, knowledge: KnowledgeResult[], ctx?: ConversationContext): string {
  const greeting = greetingResponse(input);
  if (greeting) return greeting;

  const identity = identityResponse(input);
  if (identity) return identity;

  const datetime = dateTimeResponse(input);
  if (datetime) return datetime;

  const math = mathResponse(input);
  if (math) return math;

  const body = synthesise(input, knowledge, 3);
  if (body) return body;

  return "I don't know this information as of right now — I am still learning. As my knowledge base grows, I will be able to answer more questions accurately.";
}

export class ReasoningEngine {
  generateResponse(params: {
    input: string;
    category: TaskCategory;
    knowledge: KnowledgeResult[];
    context?: ConversationContext;
  }): { content: string; confidence: number; sources: string[] } {
    const { input, category, knowledge, context } = params;

    let content: string;
    switch (category) {
      case 'coding':   content = codingResponse(input, knowledge);          break;
      case 'document': content = documentResponse(input, knowledge);        break;
      case 'design':   content = designResponse(input, knowledge);          break;
      default:         content = chatResponse(input, knowledge, context);   break;
    }

    const hasInstantAnswer = (
      greetingResponse(input) !== null ||
      identityResponse(input) !== null ||
      dateTimeResponse(input) !== null ||
      mathResponse(input) !== null
    );

    const confidence = hasInstantAnswer
      ? 1.0
      : knowledge.length > 0
        ? Math.min(0.95, 0.35 + (knowledge[0]?.score ?? 0) * 0.6)
        : 0.15;

    const sources = [...new Set(knowledge.slice(0, 5).map(r => r.entry.source))];

    return { content, confidence, sources };
  }
}

let engine: ReasoningEngine | null = null;
export function getReasoning(): ReasoningEngine {
  if (!engine) engine = new ReasoningEngine();
  return engine;
}
