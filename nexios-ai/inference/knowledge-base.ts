import type { KnowledgeCategory } from '../types/index';

interface KnowledgeEntry {
  input: string;
  response: string;
  category: KnowledgeCategory;
  tokens: string[];
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [];

let initialised = false;

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function cosineSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const union = new Set([...setA, ...setB]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const term of union) {
    const ia = setA.has(term) ? 1 : 0;
    const ib = setB.has(term) ? 1 : 0;
    dot += ia * ib;
    magA += ia * ia;
    magB += ib * ib;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function detectCategory(tokens: string[]): KnowledgeCategory {
  const codingKeywords = ['javascript', 'typescript', 'python', 'react', 'node', 'code', 'function', 'api', 'css', 'html', 'algorithm', 'async', 'promise', 'git', 'sql', 'component', 'hook', 'class', 'array', 'object', 'variable'];
  const designKeywords = ['design', 'ui', 'ux', 'color', 'typography', 'layout', 'wireframe', 'button', 'font', 'spacing', 'responsive', 'figma', 'whitespace', 'visual'];
  const mathKeywords = ['math', 'algebra', 'calculus', 'equation', 'derivative', 'integral', 'matrix', 'prime', 'binary', 'probability', 'statistics', 'geometry', 'theorem'];
  const scienceKeywords = ['science', 'physics', 'chemistry', 'biology', 'gravity', 'atom', 'dna', 'evolution', 'photosynthesis', 'light', 'energy', 'molecule', 'cell'];

  const scores: Record<KnowledgeCategory, number> = { programming: 0, design: 0, science: 0, documentation: 0, general: 0 };

  for (const token of tokens) {
    if (codingKeywords.includes(token)) scores.programming += 2;
    if (designKeywords.includes(token)) scores.design += 2;
    if (mathKeywords.includes(token)) scores.science += 1.5;
    if (scienceKeywords.includes(token)) scores.science += 2;
  }

  let best: KnowledgeCategory = 'general';
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; best = cat as KnowledgeCategory; }
  }
  return best;
}

export function initialiseKnowledgeBase(data: Record<string, Array<{ input: string; response: string }>>) {
  if (initialised) return;
  KNOWLEDGE_BASE.length = 0;

  const categoryMap: Record<string, KnowledgeCategory> = {
    general: 'general',
    programming: 'programming',
    design: 'design',
    mathematics: 'science',
    science: 'science',
  };

  for (const [cat, entries] of Object.entries(data)) {
    for (const entry of entries) {
      KNOWLEDGE_BASE.push({
        input: entry.input,
        response: entry.response,
        category: categoryMap[cat] ?? 'general',
        tokens: tokenise(entry.input),
      });
    }
  }

  initialised = true;
  console.log(`[KnowledgeBase] Initialised with ${KNOWLEDGE_BASE.length} entries`);
}

export function query(userInput: string, limit = 5): Array<{ entry: KnowledgeEntry; score: number }> {
  const inputTokens = tokenise(userInput);

  const scored = KNOWLEDGE_BASE.map(entry => ({
    entry,
    score: cosineSimilarity(inputTokens, entry.tokens),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter(r => r.score > 0);
}

export function getCategory(userInput: string): KnowledgeCategory {
  return detectCategory(tokenise(userInput));
}

export function getCount(): number {
  return KNOWLEDGE_BASE.length;
}

export function isReady(): boolean {
  return initialised && KNOWLEDGE_BASE.length > 0;
}
