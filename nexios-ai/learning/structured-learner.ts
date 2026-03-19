import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../utils/paths';
import type { KnowledgeCategory } from '../types/index';

export interface LearningSection {
  id: string;
  name: string;
  description: string;
  minEntries: number;
  categories: KnowledgeCategory[];
  topics: string[];
  crawlUrls: Array<{ url: string; label: string; category: KnowledgeCategory }>;
}

export interface LearningProgress {
  currentIndex: number;
  sections: Record<string, { entriesAtStart: number; completed: boolean; completedAt?: number }>;
  lastUpdated: number;
}

export const LEARNING_SECTIONS: LearningSection[] = [
  {
    id: 'basic-interactions',
    name: 'Basic Human Interactions',
    description: 'Greetings, small talk, date/time, and conversational responses',
    minEntries: 30,
    categories: ['general'],
    topics: ['greetings', 'small talk', 'social conversation', 'etiquette', 'date time', 'polite expressions'],
    crawlUrls: [
      { url: 'https://en.wikipedia.org/wiki/Greeting', label: 'Wikipedia: Greetings', category: 'general' },
      { url: 'https://en.wikipedia.org/wiki/Small_talk', label: 'Wikipedia: Small Talk', category: 'general' },
      { url: 'https://en.wikipedia.org/wiki/Etiquette', label: 'Wikipedia: Etiquette', category: 'general' },
    ],
  },
  {
    id: 'vocabulary-spelling',
    name: 'Vocabulary & Spelling',
    description: 'Word definitions, spelling rules, grammar, and language fundamentals',
    minEntries: 60,
    categories: ['general', 'documentation'],
    topics: ['vocabulary', 'spelling', 'grammar', 'word definitions', 'language', 'punctuation', 'syntax'],
    crawlUrls: [
      { url: 'https://en.wikipedia.org/wiki/English_language', label: 'Wikipedia: English Language', category: 'general' },
      { url: 'https://en.wikipedia.org/wiki/Grammar', label: 'Wikipedia: Grammar', category: 'general' },
      { url: 'https://en.wikipedia.org/wiki/Spelling', label: 'Wikipedia: Spelling', category: 'general' },
    ],
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    description: 'Arithmetic, algebra, geometry, calculus, and mathematical reasoning',
    minEntries: 80,
    categories: ['science'],
    topics: ['arithmetic', 'algebra', 'geometry', 'calculus', 'statistics', 'mathematics', 'equations', 'fractions', 'percentages'],
    crawlUrls: [
      { url: 'https://en.wikipedia.org/wiki/Mathematics', label: 'Wikipedia: Mathematics', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Algebra', label: 'Wikipedia: Algebra', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Geometry', label: 'Wikipedia: Geometry', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Calculus', label: 'Wikipedia: Calculus', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Statistics', label: 'Wikipedia: Statistics', category: 'science' },
    ],
  },
  {
    id: 'programming',
    name: 'Programming & Coding',
    description: 'Code, algorithms, languages, frameworks, and software development',
    minEntries: 150,
    categories: ['programming'],
    topics: ['javascript', 'python', 'typescript', 'react', 'algorithms', 'data structures', 'APIs', 'databases', 'git'],
    crawlUrls: [
      { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', label: 'MDN JS Guide', category: 'programming' },
      { url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API', label: 'MDN Fetch API', category: 'programming' },
      { url: 'https://www.typescriptlang.org/docs/handbook/2/types-from-types.html', label: 'TypeScript Handbook', category: 'programming' },
      { url: 'https://react.dev/learn', label: 'React Learn', category: 'programming' },
      { url: 'https://en.wikipedia.org/wiki/Algorithm', label: 'Wikipedia: Algorithm', category: 'programming' },
      { url: 'https://en.wikipedia.org/wiki/Data_structure', label: 'Wikipedia: Data Structures', category: 'programming' },
      { url: 'https://en.wikipedia.org/wiki/Sorting_algorithm', label: 'Wikipedia: Sorting Algorithms', category: 'programming' },
    ],
  },
  {
    id: 'science',
    name: 'General Science',
    description: 'Scientific method, physics, chemistry, biology, and Earth sciences overview',
    minEntries: 100,
    categories: ['science'],
    topics: ['scientific method', 'science', 'matter', 'energy', 'forces', 'scientific discovery', 'experiments'],
    crawlUrls: [
      { url: 'https://en.wikipedia.org/wiki/Science', label: 'Wikipedia: Science', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Scientific_method', label: 'Wikipedia: Scientific Method', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Natural_science', label: 'Wikipedia: Natural Science', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Matter', label: 'Wikipedia: Matter', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Energy', label: 'Wikipedia: Energy', category: 'science' },
    ],
  },
  {
    id: 'biology',
    name: 'Biology',
    description: 'Cells, genetics, evolution, anatomy, ecosystems, and life sciences',
    minEntries: 100,
    categories: ['science'],
    topics: ['biology', 'cells', 'genetics', 'evolution', 'anatomy', 'ecosystem', 'DNA', 'proteins', 'organisms'],
    crawlUrls: [
      { url: 'https://en.wikipedia.org/wiki/Biology', label: 'Wikipedia: Biology', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Cell_(biology)', label: 'Wikipedia: Cell Biology', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Genetics', label: 'Wikipedia: Genetics', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Evolution', label: 'Wikipedia: Evolution', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Human_anatomy', label: 'Wikipedia: Human Anatomy', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/DNA', label: 'Wikipedia: DNA', category: 'science' },
    ],
  },
  {
    id: 'law',
    name: 'Law & Governance',
    description: 'Legal systems, rights, contracts, criminal and civil law, and governance',
    minEntries: 80,
    categories: ['general'],
    topics: ['law', 'legal rights', 'contracts', 'criminal law', 'civil law', 'constitution', 'justice', 'courts'],
    crawlUrls: [
      { url: 'https://en.wikipedia.org/wiki/Law', label: 'Wikipedia: Law', category: 'general' },
      { url: 'https://en.wikipedia.org/wiki/Common_law', label: 'Wikipedia: Common Law', category: 'general' },
      { url: 'https://en.wikipedia.org/wiki/Contract', label: 'Wikipedia: Contract', category: 'general' },
      { url: 'https://en.wikipedia.org/wiki/Criminal_law', label: 'Wikipedia: Criminal Law', category: 'general' },
      { url: 'https://en.wikipedia.org/wiki/Human_rights', label: 'Wikipedia: Human Rights', category: 'general' },
    ],
  },
  {
    id: 'physics',
    name: 'Physics',
    description: 'Mechanics, thermodynamics, electromagnetism, quantum physics, and relativity',
    minEntries: 100,
    categories: ['science'],
    topics: ['physics', 'mechanics', 'thermodynamics', 'electromagnetism', 'quantum mechanics', 'relativity', 'gravity', 'waves', 'optics'],
    crawlUrls: [
      { url: 'https://en.wikipedia.org/wiki/Physics', label: 'Wikipedia: Physics', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Classical_mechanics', label: 'Wikipedia: Classical Mechanics', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Thermodynamics', label: 'Wikipedia: Thermodynamics', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Electromagnetism', label: 'Wikipedia: Electromagnetism', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Quantum_mechanics', label: 'Wikipedia: Quantum Mechanics', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Theory_of_relativity', label: 'Wikipedia: Relativity', category: 'science' },
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    description: 'Elements, compounds, reactions, organic chemistry, and the periodic table',
    minEntries: 100,
    categories: ['science'],
    topics: ['chemistry', 'elements', 'compounds', 'chemical reactions', 'periodic table', 'organic chemistry', 'atoms', 'molecules', 'acids bases'],
    crawlUrls: [
      { url: 'https://en.wikipedia.org/wiki/Chemistry', label: 'Wikipedia: Chemistry', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Periodic_table', label: 'Wikipedia: Periodic Table', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Chemical_reaction', label: 'Wikipedia: Chemical Reactions', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Organic_chemistry', label: 'Wikipedia: Organic Chemistry', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Atom', label: 'Wikipedia: Atom', category: 'science' },
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced Topics',
    description: 'Artificial intelligence, medicine, economics, philosophy, and emerging fields',
    minEntries: 150,
    categories: ['science', 'general'],
    topics: ['artificial intelligence', 'machine learning', 'medicine', 'economics', 'philosophy', 'psychology', 'neuroscience', 'space', 'climate'],
    crawlUrls: [
      { url: 'https://en.wikipedia.org/wiki/Artificial_intelligence', label: 'Wikipedia: AI', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Machine_learning', label: 'Wikipedia: Machine Learning', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Medicine', label: 'Wikipedia: Medicine', category: 'science' },
      { url: 'https://en.wikipedia.org/wiki/Economics', label: 'Wikipedia: Economics', category: 'general' },
      { url: 'https://en.wikipedia.org/wiki/Philosophy', label: 'Wikipedia: Philosophy', category: 'general' },
      { url: 'https://en.wikipedia.org/wiki/Neuroscience', label: 'Wikipedia: Neuroscience', category: 'science' },
    ],
  },
];

const PROGRESS_FILE = path.join(DATA_DIR, 'learning-progress.json');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadProgress(): LearningProgress {
  ensureDir();
  if (!fs.existsSync(PROGRESS_FILE)) {
    return {
      currentIndex: 0,
      sections: {},
      lastUpdated: Date.now(),
    };
  }
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return { currentIndex: 0, sections: {}, lastUpdated: Date.now() };
  }
}

function saveProgress(p: LearningProgress): void {
  ensureDir();
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
  } catch { /* non-critical */ }
}

export class StructuredLearner {
  private progress: LearningProgress;

  constructor() {
    this.progress = loadProgress();
  }

  getCurrentSection(): LearningSection {
    const idx = Math.min(this.progress.currentIndex, LEARNING_SECTIONS.length - 1);
    return LEARNING_SECTIONS[idx];
  }

  getCurrentIndex(): number {
    return this.progress.currentIndex;
  }

  isComplete(): boolean {
    return this.progress.currentIndex >= LEARNING_SECTIONS.length;
  }

  checkAndAdvance(totalEntries: number): { advanced: boolean; from?: string; to?: string } {
    if (this.isComplete()) return { advanced: false };

    const current = this.getCurrentSection();
    const sectionData = this.progress.sections[current.id] ?? { entriesAtStart: totalEntries, completed: false };

    if (!this.progress.sections[current.id]) {
      this.progress.sections[current.id] = sectionData;
      saveProgress(this.progress);
    }

    const entriesGained = totalEntries - sectionData.entriesAtStart;

    if (entriesGained >= current.minEntries && !sectionData.completed) {
      sectionData.completed = true;
      sectionData.completedAt = Date.now();
      this.progress.sections[current.id] = sectionData;

      const nextIndex = this.progress.currentIndex + 1;
      const nextSection = LEARNING_SECTIONS[nextIndex];

      this.progress.currentIndex = nextIndex;
      this.progress.lastUpdated = Date.now();

      if (nextSection) {
        this.progress.sections[nextSection.id] = { entriesAtStart: totalEntries, completed: false };
      }

      saveProgress(this.progress);

      console.log(`[StructuredLearner] Section "${current.name}" mastered! Moving to: ${nextSection?.name ?? 'All sections complete'}`);

      return {
        advanced: true,
        from: current.name,
        to: nextSection?.name,
      };
    }

    return { advanced: false };
  }

  getProgress(): {
    currentSection: LearningSection | null;
    currentIndex: number;
    totalSections: number;
    entriesNeeded: number;
    entriesGained: number;
    percentComplete: number;
    allSections: Array<{ name: string; completed: boolean; isCurrent: boolean }>;
  } {
    const current = this.isComplete() ? null : this.getCurrentSection();
    const sectionData = current ? (this.progress.sections[current.id] ?? null) : null;
    const entriesGained = sectionData ? 0 : 0;

    return {
      currentSection: current,
      currentIndex: this.progress.currentIndex,
      totalSections: LEARNING_SECTIONS.length,
      entriesNeeded: current?.minEntries ?? 0,
      entriesGained,
      percentComplete: Math.min(100, Math.round((this.progress.currentIndex / LEARNING_SECTIONS.length) * 100)),
      allSections: LEARNING_SECTIONS.map((s, i) => ({
        name: s.name,
        completed: this.progress.sections[s.id]?.completed ?? false,
        isCurrent: i === this.progress.currentIndex,
      })),
    };
  }

  getSectionCrawlUrls(): Array<{ url: string; label: string; category: KnowledgeCategory }> {
    if (this.isComplete()) return [];
    return this.getCurrentSection().crawlUrls;
  }
}

let instance: StructuredLearner | null = null;
export function getStructuredLearner(): StructuredLearner {
  if (!instance) instance = new StructuredLearner();
  return instance;
}
