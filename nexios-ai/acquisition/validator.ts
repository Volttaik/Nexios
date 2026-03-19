import type { ValidationResult, KnowledgeCategory } from '../types/index';

const MIN_WORD_COUNT = 30;
const MAX_WORD_COUNT = 5000;
const MIN_QUALITY_SCORE = 0.3;

const SPAM_PATTERNS = [
  /click here/gi, /subscribe now/gi, /buy now/gi, /limited offer/gi,
  /\$\$\$/g, /xxx/gi, /casino/gi, /gambling/gi,
];

const QUALITY_SIGNALS = [
  /function\s+\w+/,       // code functions
  /class\s+\w+/,          // classes
  /const\s+\w+/,          // const declarations
  /\w+:\s+\w+/,           // key: value pairs
  /\d+\.\s+\w+/,          // numbered lists
  /#{1,6}\s+\w+/,         // markdown headings
  /`[^`]+`/,              // inline code
  /https?:\/\/\w+/,       // URLs (signal of documentation)
];

const TECH_KEYWORDS = [
  'javascript','typescript','python','react','node','api','function','algorithm',
  'database','server','client','component','interface','module','library',
  'documentation','tutorial','guide','example','reference','specification',
  'design','color','layout','typography','css','html','svg',
  'mathematics','formula','equation','theorem','proof','definition',
];

export function validateContent(text: string, _source: string): ValidationResult {
  const reasons: string[] = [];
  let score = 0.5;

  if (!text || text.trim().length < 50) {
    return { valid: false, score: 0, reasons: ['Content too short'] };
  }

  const words = text.trim().split(/\s+/);
  const wordCount = words.length;

  if (wordCount < MIN_WORD_COUNT) {
    return { valid: false, score: 0, reasons: [`Too few words: ${wordCount}`] };
  }
  if (wordCount > MAX_WORD_COUNT) {
    reasons.push(`Truncated from ${wordCount} words`);
    score -= 0.05;
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return { valid: false, score: 0, reasons: ['Spam pattern detected'] };
    }
  }

  let qualityHits = 0;
  for (const sig of QUALITY_SIGNALS) {
    if (sig.test(text)) qualityHits++;
  }
  score += qualityHits * 0.05;
  if (qualityHits > 0) reasons.push(`${qualityHits} quality signals found`);

  const lower = text.toLowerCase();
  let techHits = 0;
  for (const kw of TECH_KEYWORDS) {
    if (lower.includes(kw)) techHits++;
  }
  score += Math.min(techHits * 0.03, 0.2);
  if (techHits > 3) reasons.push(`Strong technical relevance (${techHits} keywords)`);

  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const diversity = uniqueWords.size / wordCount;
  if (diversity > 0.4) { score += 0.1; reasons.push('Good vocabulary diversity'); }
  if (diversity < 0.2) { score -= 0.15; reasons.push('Repetitive content detected'); }

  score = Math.max(0, Math.min(1, score));

  return {
    valid: score >= MIN_QUALITY_SCORE,
    score,
    reasons,
  };
}

export function categoriseContent(text: string): KnowledgeCategory {
  const lower = text.toLowerCase();
  const codeWords = ['function','const','let','var','class','import','export','return','async','await','if','else','for','while'];
  const designWords = ['color','colour','font','typography','layout','spacing','padding','margin','border','shadow','gradient'];
  const mathWords = ['theorem','equation','formula','proof','integral','derivative','matrix','vector'];
  const docWords = ['documentation','guide','reference','tutorial','readme','specification','api','endpoint'];

  const score = (words: string[]) => words.filter(w => lower.includes(w)).length;

  const scores: Record<KnowledgeCategory, number> = {
    programming:   score(codeWords),
    design:        score(designWords),
    mathematics:   score(mathWords),
    documentation: score(docWords),
    general:       0,
    conversation:  0,
    science:       0,
    web_content:   1,
    dataset:       0,
    history:       0,
    geography:     0,
    health:        0,
    finance:       0,
  };

  const top = (Object.entries(scores) as [KnowledgeCategory, number][])
    .sort((a, b) => b[1] - a[1]);

  return top[0][1] > 1 ? top[0][0] : 'web_content';
}
