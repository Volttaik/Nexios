import type { KnowledgeResult, TaskCategory } from '../types/index';

const NOISE_PATTERNS: RegExp[] = [
  /^Nexios AI\s*[—–-]\s*[^\n]+\n?/im,
  /\*\*(Nexios AI|Relevant knowledge|Retrieved .+? knowledge|Conversation context|Responding to|Your .+? request|Knowledge Retrieved|Applying this)[^\n*]*\*\*:?\s*/gi,
  /^---+$/gm,
  /\*\*Responding to:\*\*\s*"[^"]*"\s*/gi,
  /Nexios AI is processing[^.]+\./gi,
  /Activate Ultra Mode[^.]+\./gi,
  /Use Ultra Mode[^.]+\./gi,
  /Start Ultra Mode[^.]+\./gi,
  /Once trained, Nexios AI[^.]+\./gi,
  /As its knowledge base grows[^.]+\./gi,
  /\n{3,}/g,
];

const LOW_CONFIDENCE_THRESHOLD = 0.22;

const DONT_KNOW_VARIATIONS = [
  "I don't know this information as of right now — I am still learning. Ask me again later as my knowledge grows.",
  "I don't have enough information on this yet — I am still learning. Try again after I've had time to expand my knowledge base.",
  "I'm not sure about that one yet — I am still learning. My knowledge will improve as I continue to train.",
];

let dontKnowIndex = 0;
function dontKnow(): string {
  const msg = DONT_KNOW_VARIATIONS[dontKnowIndex % DONT_KNOW_VARIATIONS.length];
  dontKnowIndex++;
  return msg;
}

function stripNoise(text: string): string {
  let out = text;
  for (const pattern of NOISE_PATTERNS) {
    out = out.replace(pattern, pattern.source === '\\n{3,}' ? '\n\n' : '');
  }
  return out.trim();
}

function looksLikeGibberish(text: string): boolean {
  if (text.length < 10) return true;
  const symbolCount = (text.match(/[^a-zA-Z0-9\s.,!?'"()\-:;\n*_#]/g) ?? []).length;
  const symbolRatio = symbolCount / Math.max(text.length, 1);
  const hasRawJson = /[{}\[\]]{4,}/.test(text);
  const hasLongDigitStrings = /\b\d{12,}\b/.test(text);
  return symbolRatio > 0.18 || hasRawJson || hasLongDigitStrings;
}

function synthesiseAnswer(input: string, results: KnowledgeResult[], category: TaskCategory): string {
  if (!results.length) return dontKnow();

  const top = results[0].entry;
  const content = top.content.slice(0, 800).trim();

  const intros: Record<string, string> = {
    coding:   "Here's what I know about that:",
    document: "Here's what I can tell you:",
    design:   "From a design standpoint:",
    chat:     "Here's what I know:",
    search:   "Here's what I found:",
    unknown:  "Here's what I know:",
  };

  const intro = intros[category] ?? intros.unknown;

  if (results.length > 1) {
    const second = results[1].entry.content.slice(0, 400).trim();
    if (second && second !== content) {
      return `${intro}\n\n${content}\n\n${second}`;
    }
  }

  return `${intro}\n\n${content}`;
}

export interface ClarityInput {
  rawContent: string;
  userInput: string;
  confidence: number;
  knowledge: KnowledgeResult[];
  category: TaskCategory;
}

export class ClarityAgent {
  filter(params: ClarityInput): string {
    const { rawContent, userInput, confidence, knowledge, category } = params;

    const cleaned = stripNoise(rawContent);

    if (looksLikeGibberish(cleaned)) {
      if (knowledge.length > 0 && confidence >= LOW_CONFIDENCE_THRESHOLD) {
        return synthesiseAnswer(userInput, knowledge, category);
      }
      return dontKnow();
    }

    if (confidence < LOW_CONFIDENCE_THRESHOLD && knowledge.length === 0) {
      const lower = userInput.toLowerCase();
      if (lower.match(/^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening|day))/)) {
        return cleaned;
      }
      return dontKnow();
    }

    if (cleaned.length < 15 && knowledge.length > 0) {
      return synthesiseAnswer(userInput, knowledge, category);
    }

    return cleaned
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  wrapDontKnow(): string {
    return dontKnow();
  }
}

let instance: ClarityAgent | null = null;
export function getClarityAgent(): ClarityAgent {
  if (!instance) instance = new ClarityAgent();
  return instance;
}
