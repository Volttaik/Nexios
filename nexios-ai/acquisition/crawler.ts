import type { CrawledPage, KnowledgeCategory } from '../types/index';
import { validateContent, categoriseContent } from './validator';

const USER_AGENT = 'NexiosAI-Crawler/0.1 (educational knowledge acquisition)';
const TIMEOUT_MS = 12000;

const KNOWLEDGE_SOURCES: Array<{ url: string; label: string; category: KnowledgeCategory }> = [
  { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', label: 'MDN JS Guide', category: 'programming' },
  { url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API', label: 'MDN Fetch API', category: 'programming' },
  { url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout', label: 'MDN CSS Grid', category: 'design' },
  { url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color', label: 'MDN CSS Color', category: 'design' },
  { url: 'https://www.typescriptlang.org/docs/handbook/2/types-from-types.html', label: 'TS Types from Types', category: 'programming' },
  { url: 'https://react.dev/learn', label: 'React Learn', category: 'programming' },
  { url: 'https://react.dev/reference/react/useState', label: 'React useState', category: 'programming' },
  { url: 'https://nodejs.org/en/docs/guides/getting-started-guide', label: 'Node.js Getting Started', category: 'programming' },
  { url: 'https://en.wikipedia.org/wiki/Algorithm', label: 'Wikipedia: Algorithm', category: 'programming' },
  { url: 'https://en.wikipedia.org/wiki/Design_system', label: 'Wikipedia: Design System', category: 'design' },
  { url: 'https://en.wikipedia.org/wiki/Typography', label: 'Wikipedia: Typography', category: 'design' },
  { url: 'https://en.wikipedia.org/wiki/Color_theory', label: 'Wikipedia: Color Theory', category: 'design' },
  { url: 'https://en.wikipedia.org/wiki/Data_structure', label: 'Wikipedia: Data Structures', category: 'programming' },
  { url: 'https://en.wikipedia.org/wiki/Sorting_algorithm', label: 'Wikipedia: Sorting Algorithms', category: 'programming' },
  { url: 'https://en.wikipedia.org/wiki/Machine_learning', label: 'Wikipedia: Machine Learning', category: 'science' },
  { url: 'https://en.wikipedia.org/wiki/Artificial_intelligence', label: 'Wikipedia: Artificial Intelligence', category: 'science' },
  { url: 'https://en.wikipedia.org/wiki/Natural_language_processing', label: 'Wikipedia: NLP', category: 'science' },
];

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

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : 'Untitled';
}

export async function crawlPage(url: string, hint?: KnowledgeCategory): Promise<CrawledPage | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[Crawler] HTTP ${res.status} for ${url}`);
      return null;
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/')) {
      console.warn(`[Crawler] Skipping non-text content: ${contentType}`);
      return null;
    }

    const html = await res.text();
    const title = extractTitle(html);
    const text = stripHtml(html);
    const words = text.split(/\s+/).filter(Boolean);
    const { valid, score: _score } = validateContent(text, url);

    return {
      url,
      title,
      content: text.slice(0, 6000),
      extractedAt: Date.now(),
      wordCount: words.length,
      isValid: valid,
      category: hint ?? categoriseContent(text),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Crawler] Failed ${url}: ${msg}`);
    return null;
  }
}

export async function crawlBatch(count = 3): Promise<CrawledPage[]> {
  const sources = [...KNOWLEDGE_SOURCES].sort(() => Math.random() - 0.5).slice(0, count);
  const results: CrawledPage[] = [];

  for (const src of sources) {
    console.log(`[Crawler] Fetching: ${src.label}`);
    const page = await crawlPage(src.url, src.category);
    if (page && page.isValid) {
      results.push(page);
      console.log(`[Crawler] ✓ ${src.label} (${page.wordCount} words)`);
    }
  }

  return results;
}

export async function crawlSpecificUrls(
  sources: Array<{ url: string; label: string; category: KnowledgeCategory }>,
  count = 3
): Promise<CrawledPage[]> {
  const shuffled = [...sources].sort(() => Math.random() - 0.5).slice(0, count);
  const results: CrawledPage[] = [];

  for (const src of shuffled) {
    console.log(`[Crawler] Section-crawl: ${src.label}`);
    const page = await crawlPage(src.url, src.category);
    if (page && page.isValid) {
      results.push(page);
      console.log(`[Crawler] ✓ ${src.label} (${page.wordCount} words)`);
    }
  }

  return results;
}

export function getKnowledgeSources() {
  return KNOWLEDGE_SOURCES;
}
