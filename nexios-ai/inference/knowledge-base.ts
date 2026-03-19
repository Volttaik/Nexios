import type { KnowledgeCategory } from '../types/index';

interface KnowledgeEntry {
  input: string;
  response: string;
  category: KnowledgeCategory;
  tokens: string[];
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [];
const STOP_WORDS = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'as', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'me', 'my', 'your', 'how', 'and', 'or', 'but', 'so', 'if', 'up', 'out', 'about', 'into', 'than', 'then', 'from']);

let initialised = false;

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function cosineSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const union = new Set([...setA, ...setB]);
  let dot = 0, magA = 0, magB = 0;
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

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

function hybridScore(inputTokens: string[], entryTokens: string[], rawInput: string, rawEntry: string): number {
  if (rawInput.toLowerCase().trim() === rawEntry.toLowerCase().trim()) return 1.0;

  if (inputTokens.length === 0 || entryTokens.length === 0) return 0;

  const cosine = cosineSimilarity(inputTokens, entryTokens);
  const jaccard = jaccardSimilarity(inputTokens, entryTokens);

  const weight = inputTokens.length <= 3 ? 0.65 : 0.4;
  let score = jaccard * weight + cosine * (1 - weight);

  const entrySet = new Set(entryTokens);
  const matchCount = inputTokens.filter(t => entrySet.has(t)).length;
  if (matchCount > 0 && inputTokens.length > 0) {
    const coverage = matchCount / inputTokens.length;
    score = Math.min(1.0, score + coverage * 0.15);
  }

  return score;
}

function detectCategory(tokens: string[]): KnowledgeCategory {
  const codingKeywords = ['javascript', 'typescript', 'python', 'react', 'node', 'nodejs', 'code', 'function', 'api', 'css', 'html', 'algorithm', 'async', 'promise', 'git', 'sql', 'component', 'hook', 'class', 'array', 'object', 'variable', 'java', 'rust', 'go', 'golang', 'php', 'ruby', 'swift', 'kotlin', 'database', 'backend', 'frontend', 'framework', 'library', 'npm', 'docker', 'graphql', 'rest', 'recursion', 'debugging', 'loop', 'string', 'integer', 'boolean', 'compiler', 'runtime', 'syntax', 'programming'];
  const designKeywords = ['design', 'ui', 'ux', 'color', 'colour', 'typography', 'layout', 'wireframe', 'button', 'font', 'spacing', 'responsive', 'figma', 'whitespace', 'visual', 'accessibility', 'animation', 'icon', 'gradient', 'mockup', 'prototype', 'grid', 'gestalt', 'contrast', 'branding', 'logo'];
  const mathKeywords = ['math', 'mathematics', 'algebra', 'calculus', 'equation', 'derivative', 'integral', 'matrix', 'prime', 'binary', 'probability', 'statistics', 'geometry', 'theorem', 'logarithm', 'trigonometry', 'vector', 'angle', 'triangle', 'polynomial', 'factorial', 'sequence', 'series', 'complex', 'number', 'formula', 'graph', 'function', 'calculation', 'arithmetic'];
  const scienceKeywords = ['science', 'physics', 'chemistry', 'biology', 'gravity', 'atom', 'dna', 'evolution', 'photosynthesis', 'light', 'energy', 'molecule', 'cell', 'element', 'compound', 'reaction', 'force', 'wave', 'electricity', 'magnetism', 'quantum', 'relativity', 'thermodynamics', 'entropy', 'gene', 'chromosome', 'organism', 'ecosystem', 'climate', 'planet', 'solar', 'black', 'hole', 'neutron', 'proton', 'electron', 'nucleus'];
  const historyKeywords = ['history', 'historical', 'ancient', 'war', 'civilization', 'civilisation', 'empire', 'revolution', 'century', 'medieval', 'renaissance', 'enlightenment', 'industrial', 'world', 'roman', 'greek', 'egypt', 'egyptian', 'napoleon', 'columbus', 'war', 'monarchy', 'democracy', 'republic', 'colonial', 'independence', 'slavery', 'holocaust', 'cold'];
  const geographyKeywords = ['country', 'capital', 'continent', 'ocean', 'mountain', 'river', 'geography', 'population', 'climate', 'nation', 'city', 'island', 'lake', 'desert', 'forest', 'europe', 'asia', 'africa', 'america', 'australia', 'pacific', 'atlantic', 'arctic', 'amazon', 'sahara', 'everest', 'nile'];
  const healthKeywords = ['health', 'disease', 'medicine', 'body', 'nutrition', 'exercise', 'mental', 'symptom', 'vitamin', 'immune', 'heart', 'brain', 'blood', 'muscle', 'bone', 'organ', 'diet', 'sleep', 'stress', 'anxiety', 'depression', 'cancer', 'virus', 'bacteria', 'vaccine', 'antibiotic', 'protein', 'carbohydrate', 'fat', 'calorie', 'metabolism'];
  const financeKeywords = ['money', 'finance', 'financial', 'investment', 'invest', 'stock', 'economy', 'economic', 'budget', 'tax', 'interest', 'inflation', 'bank', 'banking', 'currency', 'dollar', 'pound', 'euro', 'credit', 'debt', 'savings', 'mortgage', 'insurance', 'pension', 'retirement', 'gdp', 'recession', 'cryptocurrency', 'bitcoin', 'market', 'portfolio', 'dividend'];

  const scores: Record<KnowledgeCategory, number> = {
    programming: 0, design: 0, science: 0, documentation: 0, general: 0,
    conversation: 0, mathematics: 0, web_content: 0, dataset: 0,
    history: 0, geography: 0, health: 0, finance: 0,
  };

  for (const token of tokens) {
    if (codingKeywords.includes(token)) scores.programming += 2;
    if (designKeywords.includes(token)) scores.design += 2;
    if (mathKeywords.includes(token)) scores.mathematics += 2;
    if (scienceKeywords.includes(token)) scores.science += 2;
    if (historyKeywords.includes(token)) scores.history += 2;
    if (geographyKeywords.includes(token)) scores.geography += 2;
    if (healthKeywords.includes(token)) scores.health += 2;
    if (financeKeywords.includes(token)) scores.finance += 2;
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
    mathematics: 'mathematics',
    science: 'science',
    history: 'history',
    geography: 'geography',
    health: 'health',
    finance: 'finance',
    conversation: 'conversation',
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
  console.log(`[KnowledgeBase] Initialised with ${KNOWLEDGE_BASE.length} entries across ${Object.keys(data).length} domains`);
}

export function query(userInput: string, limit = 5): Array<{ entry: KnowledgeEntry; score: number }> {
  const inputTokens = tokenise(userInput);
  const rawInput = userInput.toLowerCase().trim();

  const scored = KNOWLEDGE_BASE.map(entry => ({
    entry,
    score: hybridScore(inputTokens, entry.tokens, rawInput, entry.input),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter(r => r.score > 0.05);
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
