import type { KnowledgeCategory } from '../types/index';
import { query, getCategory } from './knowledge-base';

interface GeneratedResponse {
  content: string;
  confidence: number;
  category: KnowledgeCategory;
  processingMs: number;
  modelVersion: string;
  matchedEntries: number;
}

const MODEL_VERSION = '2.0.0';
const MODEL_BUILD_DATE = new Date().toISOString().split('T')[0];

const FALLBACK_RESPONSES: Record<KnowledgeCategory, string> = {
  programming: "I can help with coding! Try asking about a specific language (JavaScript, Python, TypeScript, Java, Go, Rust), a concept (algorithms, data structures, async patterns), or a tool (React, Node.js, Git, SQL, Docker).",
  design: "I'm here to assist with design! Ask me about UI/UX principles, color theory, typography, responsive layouts, wireframing, accessibility, or design systems.",
  science: "Great science question! Ask more specifically — for example, about physics (forces, energy, relativity), chemistry (atoms, reactions, elements), biology (DNA, cells, evolution), or earth science.",
  mathematics: "Happy to help with maths! Try asking about algebra, calculus, geometry, statistics, probability, prime numbers, linear algebra, or a specific theorem or formula.",
  conversation: "I'm Nexios AI, always happy to chat! Ask me anything — programming, design, science, maths, history, geography, health, finance, or general knowledge.",
  documentation: "I can help with documentation and writing. Ask about structuring content, technical writing, README files, API documentation, or writing best practices.",
  web_content: "I can help you understand web-related content. Ask something more specific and I'll do my best to assist.",
  dataset: "I can help with data-related questions. Ask about datasets, data processing, analysis approaches, or related programming topics.",
  general: "I'm Nexios AI, ready to help! You can ask me about programming, design, science, mathematics, history, geography, health, finance, or just have a conversation. What would you like to explore?",
  history: "Interesting history question! Ask me about ancient civilisations, world wars, empires, revolutions, historical figures, or specific time periods — and I'll share what I know.",
  geography: "Great geography question! Ask about countries, capitals, continents, natural wonders, oceans, mountain ranges, or world populations.",
  health: "I can help with health knowledge. Ask about the human body, nutrition, exercise, sleep, mental health, common diseases, or how body systems work — though always consult a doctor for personal medical advice.",
  finance: "I can help with financial concepts. Ask about investing, budgeting, inflation, interest rates, stocks, cryptocurrency, GDP, or personal finance basics.",
};

function generateContextualFallback(input: string, category: KnowledgeCategory): string {
  const lower = input.toLowerCase().trim();
  const short = lower.split(' ').length <= 3;

  if (lower.startsWith('what is ') || lower.startsWith('what are ')) {
    const subject = input.replace(/^what (is|are) /i, '').replace(/\?$/, '').trim();
    if (subject.length > 0 && subject.length < 50) {
      return `I don't have a specific entry for "${subject}" yet, but I'm continuously learning. ${FALLBACK_RESPONSES[category]}`;
    }
  }

  if (short) {
    return FALLBACK_RESPONSES[category];
  }

  return `I understand you're asking about "${input.slice(0, 60)}${input.length > 60 ? '...' : ''}". ${FALLBACK_RESPONSES[category]}`;
}

function selectBestResponse(results: Array<{ entry: { response: string; input: string }; score: number }>, userInput: string): { content: string; confidence: number } {
  if (results.length === 0) return { content: '', confidence: 0 };

  const top = results[0];
  const confidence = Math.min(top.score * 1.1, 1.0);

  if (confidence >= 0.25) {
    return { content: top.entry.response, confidence };
  }

  if (confidence >= 0.12 && results.length >= 2) {
    const blended = (top.score + results[1].score) / 2;
    return { content: top.entry.response, confidence: Math.min(blended, 0.7) };
  }

  return { content: '', confidence };
}

export function generateResponse(userInput: string): GeneratedResponse {
  const t0 = Date.now();
  const trimmed = userInput.trim();

  const category = getCategory(trimmed);
  const results = query(trimmed, 5);

  const { content, confidence } = selectBestResponse(results, trimmed);

  const finalContent = content && confidence > 0.08
    ? content
    : generateContextualFallback(trimmed, category);

  const finalConfidence = content ? confidence : 0.35;

  return {
    content: finalContent,
    confidence: Math.round(finalConfidence * 100) / 100,
    category,
    processingMs: Date.now() - t0,
    modelVersion: MODEL_VERSION,
    matchedEntries: results.length,
  };
}

export function getModelInfo() {
  return {
    version: MODEL_VERSION,
    buildDate: MODEL_BUILD_DATE,
    status: 'operational',
    architecture: 'hybrid cosine-jaccard inference engine',
    trainingPhases: [
      'general-conversation',
      'programming',
      'design',
      'mathematics',
      'science',
      'history',
      'geography',
      'health',
      'finance',
    ],
  };
}
