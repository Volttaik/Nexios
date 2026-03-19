import type { KnowledgeCategory } from '../types/index';

export interface FetchedDataset {
  name: string;
  source: string;
  category: KnowledgeCategory;
  entries: Array<{ content: string; confidence: number }>;
}

const TIMEOUT_MS = 15000;
const USER_AGENT = 'NexiosAI-DatasetFetcher/1.0 (educational AI, contact: nexios@nexios.ai)';

async function fetchWithTimeout(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json,text/plain,*/*' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, '\n\n')
    .trim();
}

function chunkText(text: string, chunkSize = 1500): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
}

/* ── Individual dataset fetchers ──────────────────────────────────────── */

async function fetchWikipediaArticle(title: string, _category: KnowledgeCategory): Promise<Array<{ content: string; confidence: number }>> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json() as { extract?: string; title?: string };
    if (!data.extract || data.extract.length < 100) return [];
    const chunks = chunkText(`${data.title ?? title}\n\n${data.extract}`);
    return chunks.map(c => ({ content: c, confidence: 0.85 }));
  } catch {
    return [];
  }
}

async function fetchWikipediaSearch(query: string, _category: KnowledgeCategory): Promise<Array<{ content: string; confidence: number }>> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&origin=*`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json() as { query?: { search?: Array<{ title: string; snippet: string }> } };
    const results = data.query?.search ?? [];
    const entries: Array<{ content: string; confidence: number }> = [];
    for (const r of results) {
      const clean = stripHtml(r.snippet);
      if (clean.length > 80) {
        entries.push({ content: `${r.title}\n${clean}`, confidence: 0.75 });
      }
    }
    return entries;
  } catch {
    return [];
  }
}

async function fetchMDN(path: string): Promise<Array<{ content: string; confidence: number }>> {
  const url = `https://developer.mozilla.org/en-US/docs/${path}`;
  const html = await fetchWithTimeout(url);
  if (!html) return [];
  const text = stripHtml(html).slice(0, 6000);
  if (text.length < 200) return [];
  return chunkText(text, 2000).map(c => ({ content: c, confidence: 0.9 }));
}

async function fetchGitHubReadme(repo: string): Promise<Array<{ content: string; confidence: number }>> {
  const url = `https://raw.githubusercontent.com/${repo}/main/README.md`;
  const text = await fetchWithTimeout(url);
  if (!text || text.length < 200) {
    const fallback = `https://raw.githubusercontent.com/${repo}/master/README.md`;
    const t2 = await fetchWithTimeout(fallback);
    if (!t2 || t2.length < 200) return [];
    return chunkText(t2.slice(0, 5000), 1500).map(c => ({ content: c, confidence: 0.8 }));
  }
  return chunkText(text.slice(0, 5000), 1500).map(c => ({ content: c, confidence: 0.8 }));
}

/* ── Dataset definitions ──────────────────────────────────────────────── */

interface DatasetSpec {
  name: string;
  category: KnowledgeCategory;
  fetch: () => Promise<Array<{ content: string; confidence: number }>>;
}

const DATASET_SPECS: DatasetSpec[] = [
  {
    name: 'Wikipedia — JavaScript',
    category: 'programming',
    fetch: () => fetchWikipediaArticle('JavaScript', 'programming'),
  },
  {
    name: 'Wikipedia — TypeScript',
    category: 'programming',
    fetch: () => fetchWikipediaArticle('TypeScript', 'programming'),
  },
  {
    name: 'Wikipedia — Python Programming Language',
    category: 'programming',
    fetch: () => fetchWikipediaArticle('Python_(programming_language)', 'programming'),
  },
  {
    name: 'Wikipedia — Machine Learning',
    category: 'science',
    fetch: () => fetchWikipediaArticle('Machine_learning', 'science'),
  },
  {
    name: 'Wikipedia — Artificial Intelligence',
    category: 'science',
    fetch: () => fetchWikipediaArticle('Artificial_intelligence', 'science'),
  },
  {
    name: 'Wikipedia — Neural Network',
    category: 'science',
    fetch: () => fetchWikipediaArticle('Neural_network_(machine_learning)', 'science'),
  },
  {
    name: 'Wikipedia — Natural Language Processing',
    category: 'science',
    fetch: () => fetchWikipediaArticle('Natural_language_processing', 'science'),
  },
  {
    name: 'Wikipedia — Algorithm',
    category: 'programming',
    fetch: () => fetchWikipediaArticle('Algorithm', 'programming'),
  },
  {
    name: 'Wikipedia — Data Structure',
    category: 'programming',
    fetch: () => fetchWikipediaArticle('Data_structure', 'programming'),
  },
  {
    name: 'Wikipedia — Software Design Pattern',
    category: 'programming',
    fetch: () => fetchWikipediaArticle('Software_design_pattern', 'programming'),
  },
  {
    name: 'Wikipedia — REST API',
    category: 'programming',
    fetch: () => fetchWikipediaArticle('Representational_state_transfer', 'programming'),
  },
  {
    name: 'Wikipedia — Design System',
    category: 'design',
    fetch: () => fetchWikipediaArticle('Design_system', 'design'),
  },
  {
    name: 'Wikipedia — Typography',
    category: 'design',
    fetch: () => fetchWikipediaArticle('Typography', 'design'),
  },
  {
    name: 'Wikipedia — Color Theory',
    category: 'design',
    fetch: () => fetchWikipediaArticle('Color_theory', 'design'),
  },
  {
    name: 'Wikipedia — User Interface Design',
    category: 'design',
    fetch: () => fetchWikipediaArticle('User_interface_design', 'design'),
  },
  {
    name: 'Wikipedia — Technical Writing',
    category: 'documentation',
    fetch: () => fetchWikipediaArticle('Technical_writing', 'documentation'),
  },
  {
    name: 'Wikipedia — Deep Learning',
    category: 'science',
    fetch: () => fetchWikipediaArticle('Deep_learning', 'science'),
  },
  {
    name: 'Wikipedia — Transformer Model',
    category: 'science',
    fetch: () => fetchWikipediaArticle('Transformer_(deep_learning_architecture)', 'science'),
  },
  {
    name: 'MDN — JavaScript Guide',
    category: 'programming',
    fetch: () => fetchMDN('Web/JavaScript/Guide'),
  },
  {
    name: 'MDN — CSS Grid Layout',
    category: 'design',
    fetch: () => fetchMDN('Web/CSS/CSS_grid_layout'),
  },
  {
    name: 'MDN — Fetch API',
    category: 'programming',
    fetch: () => fetchMDN('Web/API/Fetch_API'),
  },
  {
    name: 'MDN — Web APIs',
    category: 'programming',
    fetch: () => fetchMDN('Web/API'),
  },
  {
    name: 'Wikipedia Search — React Framework',
    category: 'programming',
    fetch: () => fetchWikipediaSearch('React JavaScript framework', 'programming'),
  },
  {
    name: 'Wikipedia Search — Database Design',
    category: 'programming',
    fetch: () => fetchWikipediaSearch('database design patterns', 'programming'),
  },
  {
    name: 'Wikipedia Search — Accessibility Design',
    category: 'design',
    fetch: () => fetchWikipediaSearch('web accessibility design standards', 'design'),
  },
  {
    name: 'GitHub — Next.js README',
    category: 'programming',
    fetch: () => fetchGitHubReadme('vercel/next.js'),
  },
  {
    name: 'GitHub — React README',
    category: 'programming',
    fetch: () => fetchGitHubReadme('facebook/react'),
  },
  {
    name: 'GitHub — Tailwind CSS README',
    category: 'design',
    fetch: () => fetchGitHubReadme('tailwindlabs/tailwindcss'),
  },
  {
    name: 'Wikipedia — Cloud Computing',
    category: 'science',
    fetch: () => fetchWikipediaArticle('Cloud_computing', 'science'),
  },
  {
    name: 'Wikipedia — Cybersecurity',
    category: 'science',
    fetch: () => fetchWikipediaArticle('Computer_security', 'science'),
  },
  {
    name: 'Wikipedia — Large Language Models',
    category: 'science',
    fetch: () => fetchWikipediaArticle('Large_language_model', 'science'),
  },
  {
    name: 'Wikipedia — Computer Vision',
    category: 'science',
    fetch: () => fetchWikipediaArticle('Computer_vision', 'science'),
  },
  {
    name: 'Wikipedia — Agile Software Development',
    category: 'documentation',
    fetch: () => fetchWikipediaArticle('Agile_software_development', 'documentation'),
  },
  {
    name: 'Wikipedia — DevOps',
    category: 'documentation',
    fetch: () => fetchWikipediaArticle('DevOps', 'documentation'),
  },
  {
    name: 'Wikipedia — Software Architecture',
    category: 'programming',
    fetch: () => fetchWikipediaArticle('Software_architecture', 'programming'),
  },
];

/* ── Public interface ─────────────────────────────────────────────────── */

export async function fetchDataset(index: number): Promise<FetchedDataset | null> {
  const spec = DATASET_SPECS[index % DATASET_SPECS.length];
  if (!spec) return null;
  console.log(`[DatasetFetcher] Fetching: ${spec.name}`);
  try {
    const entries = await spec.fetch();
    if (!entries.length) {
      console.warn(`[DatasetFetcher] No entries from: ${spec.name}`);
      return null;
    }
    console.log(`[DatasetFetcher] ✓ ${spec.name} — ${entries.length} entries`);
    return { name: spec.name, source: spec.name, category: spec.category, entries };
  } catch (e) {
    console.error(`[DatasetFetcher] Error fetching ${spec.name}:`, e);
    return null;
  }
}

export function getDatasetCount(): number {
  return DATASET_SPECS.length;
}

export function getDatasetNames(): string[] {
  return DATASET_SPECS.map(s => s.name);
}
