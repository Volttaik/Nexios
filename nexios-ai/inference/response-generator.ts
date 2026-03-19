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

const MODEL_VERSION = '1.0.0';
const MODEL_BUILD_DATE = new Date().toISOString().split('T')[0];

const FALLBACK_RESPONSES: Record<KnowledgeCategory, string> = {
  programming: "I can help with coding! Could you be more specific about what you'd like to know? For example, you can ask about JavaScript, TypeScript, React, Python, algorithms, or any specific programming concept.",
  design: "I'm here to assist with design! You can ask me about UI/UX principles, color theory, typography, responsive design, wireframing, or design systems.",
  science: "Great science question! For the best answer, try asking more specifically — like about physics, chemistry, biology, or a particular concept you're studying.",
  mathematics: "Happy to help with maths! Try asking about algebra, calculus, geometry, statistics, probability, or a specific theorem or equation.",
  conversation: "I'm Nexios AI, always happy to chat! Ask me anything — programming, design, science, maths, or general knowledge.",
  documentation: "I can help with documentation and writing. Try asking about structuring content, writing guides, API documentation, or technical writing best practices.",
  web_content: "I can help you understand or discuss web content. Try asking something more specific and I'll do my best to assist.",
  dataset: "I can help with data-related questions. Ask me about datasets, data processing, analysis approaches, or related programming topics.",
  general: "I'm Nexios AI, ready to help! Ask me about programming, design, science, mathematics, or general knowledge. What would you like to explore?",
};

function generateContextualFallback(input: string, category: KnowledgeCategory): string {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes('?') || lowerInput.split(' ').length < 4) {
    return FALLBACK_RESPONSES[category];
  }

  return `I understand you're asking about "${input.slice(0, 60)}${input.length > 60 ? '...' : ''}". ${FALLBACK_RESPONSES[category]}`;
}

function blendResponses(results: Array<{ entry: { response: string; input: string }; score: number }>, userInput: string): { content: string; confidence: number } {
  if (results.length === 0) {
    return { content: '', confidence: 0 };
  }

  const topResult = results[0];
  const confidence = Math.min(topResult.score * 1.2, 1.0);

  if (confidence >= 0.3) {
    return { content: topResult.entry.response, confidence };
  }

  if (confidence >= 0.15 && results.length >= 2) {
    const secondResult = results[1];
    const blendedConfidence = (topResult.score + secondResult.score) / 2;
    return { content: topResult.entry.response, confidence: Math.min(blendedConfidence, 0.7) };
  }

  return { content: '', confidence };
}

export function generateResponse(userInput: string): GeneratedResponse {
  const t0 = Date.now();
  const trimmed = userInput.trim();

  const category = getCategory(trimmed);
  const results = query(trimmed, 5);

  const { content, confidence } = blendResponses(results, trimmed);

  const finalContent = content && confidence > 0.1
    ? content
    : generateContextualFallback(trimmed, category);

  const finalConfidence = content ? confidence : 0.4;

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
    architecture: 'deployment-trained inference engine',
    trainingPhases: ['basic-interactions', 'programming', 'design', 'mathematics', 'science'],
  };
}
