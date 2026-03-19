import type { TrainingDataset, KnowledgeCategory } from '../types/index';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../utils/paths';

const DATASETS_FILE = path.join(DATA_DIR, 'datasets.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load(): TrainingDataset[] {
  ensureDir();
  if (!fs.existsSync(DATASETS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DATASETS_FILE, 'utf-8')); } catch { return []; }
}

function save(datasets: TrainingDataset[]) {
  ensureDir();
  fs.writeFileSync(DATASETS_FILE, JSON.stringify(datasets, null, 2));
}

export const BUILTIN_DATASETS: Array<{
  name: string;
  category: KnowledgeCategory;
  entries: Array<{ content: string; confidence: number }>;
}> = [
  {
    name: 'JavaScript Fundamentals',
    category: 'programming',
    entries: [
      { confidence: 0.95, content: 'In JavaScript, a closure is a function that retains access to its lexical scope even when the function is executed outside that scope. Closures are commonly used for data encapsulation, factory functions, and callback patterns. Example: function counter() { let count = 0; return function() { return ++count; }; }' },
      { confidence: 0.95, content: 'Promises in JavaScript represent the eventual completion or failure of an asynchronous operation. A Promise is in one of three states: pending, fulfilled, or rejected. Use .then() for fulfilled, .catch() for rejected, and .finally() for cleanup. async/await syntax provides a cleaner way to work with promises.' },
      { confidence: 0.90, content: 'Array methods in JavaScript: map() transforms elements and returns a new array. filter() returns elements matching a predicate. reduce() accumulates a single value. forEach() iterates without returning. find() returns the first matching element. some() and every() return booleans. flat() and flatMap() work with nested arrays.' },
      { confidence: 0.90, content: 'JavaScript event loop: The call stack executes synchronous code. The microtask queue (Promises, queueMicrotask) runs after each task. The macrotask queue (setTimeout, setInterval, I/O) runs after microtasks are empty. This ensures non-blocking I/O while maintaining a single-threaded execution model.' },
      { confidence: 0.88, content: 'Destructuring in JavaScript allows extracting values from arrays and objects into distinct variables. Object destructuring: const { name, age } = person. Array destructuring: const [first, second] = arr. Supports default values, renaming, and rest patterns. Useful in function parameters for named arguments.' },
      { confidence: 0.92, content: 'TypeScript interfaces define the shape of objects. Use interface when you need declaration merging or extending. Use type alias for unions, intersections, and primitives. Generic types <T> allow reusable components. Utility types: Partial<T>, Required<T>, Readonly<T>, Pick<T,K>, Omit<T,K>, Record<K,V>.' },
      { confidence: 0.85, content: 'Node.js fs module for file operations: fs.readFileSync(path, encoding) reads synchronously. fs.writeFileSync(path, data) writes synchronously. fs.existsSync(path) checks existence. fs.mkdirSync(path, {recursive:true}) creates directories. Async versions use callbacks or fs.promises API for non-blocking I/O.' },
      { confidence: 0.88, content: 'React hooks: useState for component state, useEffect for side effects and lifecycle, useContext for consuming context, useRef for mutable refs and DOM access, useMemo for memoized computations, useCallback for memoized callbacks, useReducer for complex state logic, custom hooks for reusable stateful logic.' },
      { confidence: 0.90, content: 'REST API design principles: Use nouns not verbs for endpoints (/users not /getUsers). HTTP methods: GET retrieves, POST creates, PUT/PATCH updates, DELETE removes. Status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error. Use JSON for request/response bodies.' },
      { confidence: 0.87, content: 'SQL fundamentals: SELECT retrieves data, INSERT adds rows, UPDATE modifies rows, DELETE removes rows. JOIN types: INNER JOIN matches both tables, LEFT JOIN includes all left rows, RIGHT JOIN includes all right rows, FULL OUTER JOIN includes all rows. GROUP BY aggregates, HAVING filters aggregates, ORDER BY sorts results.' },
    ],
  },
  {
    name: 'Design Principles',
    category: 'design',
    entries: [
      { confidence: 0.92, content: 'Color theory fundamentals: Primary colors (red, yellow, blue) combine to form secondary colors. Complementary colors sit opposite on the color wheel and create high contrast. Analogous colors sit adjacent and create harmony. Monochromatic schemes use tints and shades of a single hue. In UI design use HSL format for better control: hue (0-360), saturation (0-100%), lightness (0-100%).' },
      { confidence: 0.90, content: 'Typography scale in UI design: Display (48-96px) for hero headings, H1 (32-48px), H2 (24-32px), H3 (20-24px), body text (16px base), small (14px), caption (12px). Line height: 1.2-1.4 for headings, 1.5-1.7 for body. Letter spacing: tighter for large headings, looser for small uppercase text. Use a maximum of 2-3 typefaces.' },
      { confidence: 0.88, content: 'UI spacing system: Use a base unit (4px or 8px) and multiply consistently. Common scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px. Apply consistent padding inside components. Use larger spacing between sections than between related elements. Whitespace is not empty — it creates focus, hierarchy, and breathing room.' },
      { confidence: 0.91, content: 'Accessibility in UI: Minimum contrast ratio 4.5:1 for normal text, 3:1 for large text (WCAG AA). Never rely on color alone to convey information. Provide text alternatives for images. Ensure keyboard navigation works. Use semantic HTML elements. Touch targets minimum 44x44px. Focus indicators must be visible. ARIA labels for interactive elements without visible labels.' },
      { confidence: 0.89, content: 'Dark mode design: Use true dark (#000) sparingly — prefer dark navy or grey (#0f0f0f, #1a1a2e, #080c14). Avoid pure white text on dark — use off-white (#e2e8f0, #f1f5f9). Reduce saturation of colours in dark mode. Elevate surfaces with lighter backgrounds not shadows. Use transparent overlays for modals (rgba). Indigo and violet accent colours work well in dark themes.' },
      { confidence: 0.87, content: 'Grid systems in web design: 12-column grid for flexibility. Gutters typically 16-32px. Container max-width: 1280px or 1440px for large screens. CSS Grid: grid-template-columns: repeat(12, 1fr). Flexbox for one-dimensional layouts. Use gap property for consistent spacing. Responsive breakpoints: mobile <640px, tablet 640-1024px, desktop >1024px.' },
    ],
  },
  {
    name: 'Document Writing',
    category: 'documentation',
    entries: [
      { confidence: 0.88, content: 'Technical documentation structure: Start with an overview explaining what the system does and who it is for. Follow with a quick-start guide. Then provide detailed reference documentation. Include examples for every feature. Add a troubleshooting section. Good documentation answers: What is it? Why does it exist? How do I use it? What are the options?' },
      { confidence: 0.85, content: 'README file best practices: Project name and one-line description at the top. Badges for build status, version, license. Short description of what the project does. Installation instructions (copy-paste ready). Usage examples. Configuration options table. Contributing guidelines. License section. Keep it concise — link to full docs rather than duplicating.' },
      { confidence: 0.87, content: 'API documentation: Document every endpoint with method, URL, description, request parameters (type, required, description), request body schema, response schema, example request and response, and possible error codes. Use OpenAPI/Swagger format for machine-readable specs. Group endpoints by resource. Version your API in the URL (/v1/users).' },
      { confidence: 0.84, content: 'Writing style for technical content: Use active voice. Write short sentences (max 20-25 words). Use second person (you). Define acronyms on first use. Use numbered lists for sequential steps. Use bullet lists for non-sequential items. Use code blocks for all code. Avoid jargon — if unavoidable, link to a glossary. One idea per paragraph.' },
    ],
  },
  {
    name: 'General Knowledge',
    category: 'general',
    entries: [
      { confidence: 0.80, content: 'Nexios AI is the native intelligence system of the Nexios platform. It runs entirely on the server without requiring any external API keys. It learns continuously from public datasets and internet resources through its Ultra Mode autonomous learning engine. It can assist with coding, document writing, design advice, and general conversation.' },
      { confidence: 0.82, content: 'Machine learning fundamentals: Supervised learning trains on labelled data to predict outputs. Unsupervised learning finds patterns in unlabelled data. Reinforcement learning learns through rewards and penalties. Neural networks consist of layers of interconnected nodes (neurons). Deep learning uses many layers. Key metrics: accuracy, precision, recall, F1 score, loss.' },
      { confidence: 0.78, content: 'Software engineering principles: SOLID — Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion. DRY — Do not Repeat Yourself. KISS — Keep It Simple. YAGNI — You Are Not Gonna Need It. Separation of concerns. Composition over inheritance. Fail fast. Write tests first (TDD).' },
    ],
  },
];

export function registerDataset(dataset: TrainingDataset) {
  const list = load();
  const existing = list.findIndex(d => d.id === dataset.id);
  if (existing >= 0) list[existing] = dataset;
  else list.push(dataset);
  save(list);
}

export function updateDatasetStatus(id: string, status: TrainingDataset['status'], entryCount?: number) {
  const list = load();
  const ds = list.find(d => d.id === id);
  if (ds) {
    ds.status = status;
    if (status === 'completed') { ds.processedAt = Date.now(); if (entryCount) ds.entryCount = entryCount; }
    save(list);
  }
}

export function getDatasets(): TrainingDataset[] { return load(); }
export function getCompletedCount(): number { return load().filter(d => d.status === 'completed').length; }
