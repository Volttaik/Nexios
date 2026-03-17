'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  BsRobot, BsTerminal, BsGithub, BsPlay, BsGlobe,
  BsFileCode, BsFolder, BsFolder2Open, BsPlus, BsTrash,
  BsX, BsChevronDown, BsChevronRight, BsArrowUpRight
} from 'react-icons/bs';
import {
  HiArrowLeft, HiSearch, HiX, HiLightningBolt,
  HiFolder
} from 'react-icons/hi';
import Link from 'next/link';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => (
  <div className="flex-1 flex items-center justify-center" style={{ background: '#0d1117' }}>
    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
  </div>
) });

// ─────────────────────────── Types ───────────────────────────
interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  language?: string;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  text: string;
}

interface ApiResult {
  name: string;
  description: string;
  url: string;
  auth: string;
  category: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  language: string;
  githubUrl?: string;
}

// ─────────────────────────── Constants ───────────────────────────
const EXT_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rs: 'rust', go: 'go', html: 'html', css: 'css',
  json: 'json', md: 'markdown', sh: 'shell', sql: 'sql', yaml: 'yaml', yml: 'yaml',
};

const DEFAULT_FILES: FileNode[] = [
  {
    name: 'src', type: 'folder', children: [
      { name: 'index.ts', type: 'file', language: 'typescript', content: `// Welcome to your Nexios AI workspace!\n// The AI agent can read and write files, run code, and search APIs.\n\nimport { createServer } from 'http';\n\nconst PORT = 3000;\n\nconst server = createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ message: 'Hello from Nexios AI!', status: 'ok' }));\n});\n\nserver.listen(PORT, () => {\n  console.log(\`Server running on http://localhost:\${PORT}\`);\n});\n` },
      { name: 'agent.ts', type: 'file', language: 'typescript', content: `// AI Agent Integration\nimport { NexiosAgent } from './types';\n\nexport class CodeAgent {\n  private model = 'gemini-pro';\n  \n  async analyze(code: string): Promise<string> {\n    // Agent analyses code and suggests improvements\n    return 'Analysis complete';\n  }\n  \n  async generate(prompt: string): Promise<string> {\n    // Generate code from natural language\n    return '';\n  }\n}\n` },
      {
        name: 'api', type: 'folder', children: [
          { name: 'routes.ts', type: 'file', language: 'typescript', content: `// API Routes\nimport { Router } from 'express';\n\nconst router = Router();\n\nrouter.get('/health', (req, res) => {\n  res.json({ status: 'ok', timestamp: new Date().toISOString() });\n});\n\nrouter.post('/chat', async (req, res) => {\n  const { message } = req.body;\n  // Handle AI chat messages\n  res.json({ reply: 'Processing...' });\n});\n\nexport default router;\n` },
        ]
      },
    ]
  },
  { name: 'package.json', type: 'file', language: 'json', content: `{\n  "name": "nexios-project",\n  "version": "1.0.0",\n  "description": "AI-powered project",\n  "main": "src/index.ts",\n  "scripts": {\n    "start": "ts-node src/index.ts",\n    "dev": "nodemon src/index.ts",\n    "build": "tsc"\n  },\n  "dependencies": {\n    "express": "^4.18.0"\n  },\n  "devDependencies": {\n    "typescript": "^5.0.0",\n    "@types/express": "^4.17.0"\n  }\n}\n` },
  { name: 'README.md', type: 'file', language: 'markdown', content: `# My Nexios AI Project\n\nBuilt with the Nexios AI workspace.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Features\n\n- AI code generation\n- Real-time sandbox execution\n- GitHub integration\n- API discovery\n` },
];

const PUBLIC_APIS: ApiResult[] = [
  { name: 'OpenAI GPT', description: 'Powerful language models for text generation and analysis', url: 'https://platform.openai.com/docs/api-reference', auth: 'API Key', category: 'AI' },
  { name: 'Stripe', description: 'Payment processing and financial infrastructure', url: 'https://stripe.com/docs/api', auth: 'API Key', category: 'Payments' },
  { name: 'Twilio', description: 'SMS, voice, and messaging APIs', url: 'https://www.twilio.com/docs/api', auth: 'API Key + Secret', category: 'Communication' },
  { name: 'GitHub REST API', description: 'Access and manage GitHub resources programmatically', url: 'https://docs.github.com/en/rest', auth: 'OAuth / Token', category: 'DevTools' },
  { name: 'Weatherapi', description: 'Real-time, forecast and historical weather data', url: 'https://www.weatherapi.com/docs', auth: 'API Key', category: 'Weather' },
  { name: 'NewsAPI', description: 'Search worldwide news and articles', url: 'https://newsapi.org/docs', auth: 'API Key', category: 'News' },
  { name: 'PokéAPI', description: 'Free RESTful API for Pokémon data — no auth required', url: 'https://pokeapi.co/docs/v2', auth: 'None', category: 'Fun' },
  { name: 'CoinGecko', description: 'Cryptocurrency data including price, market cap, volume', url: 'https://www.coingecko.com/en/api', auth: 'None', category: 'Finance' },
  { name: 'Cloudinary', description: 'Image and video upload, transformation and delivery', url: 'https://cloudinary.com/documentation', auth: 'API Key', category: 'Media' },
  { name: 'SendGrid', description: 'Reliable transactional email delivery service', url: 'https://docs.sendgrid.com/api-reference', auth: 'API Key', category: 'Email' },
  { name: 'Mapbox', description: 'Custom maps, geocoding and navigation', url: 'https://docs.mapbox.com/api', auth: 'API Key', category: 'Maps' },
  { name: 'Firebase', description: 'Backend as a service — auth, database, storage', url: 'https://firebase.google.com/docs/reference/rest', auth: 'Google OAuth', category: 'Backend' },
];

// ─────────────────────────── Helpers ───────────────────────────
function getLang(name: string) {
  const ext = name.split('.').pop() || '';
  return EXT_LANG[ext] || 'plaintext';
}

function flatFiles(nodes: FileNode[], prefix = ''): { path: string; node: FileNode }[] {
  const out: { path: string; node: FileNode }[] = [];
  for (const n of nodes) {
    const path = prefix ? `${prefix}/${n.name}` : n.name;
    out.push({ path, node: n });
    if (n.children) out.push(...flatFiles(n.children, path));
  }
  return out;
}

// ─────────────────────────── File Tree ───────────────────────────
function FileTree({
  nodes,
  depth = 0,
  onSelect,
  selectedPath,
  prefix = '',
  onDelete,
}: {
  nodes: FileNode[];
  depth?: number;
  onSelect: (path: string, node: FileNode) => void;
  selectedPath: string;
  prefix?: string;
  onDelete?: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ src: true, 'src/api': false });

  return (
    <ul>
      {nodes.map(node => {
        const path = prefix ? `${prefix}/${node.name}` : node.name;
        const isFolder = node.type === 'folder';
        const isExpanded = expanded[path];
        const isSelected = selectedPath === path;

        return (
          <li key={path}>
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer group transition-colors select-none"
              style={{
                paddingLeft: `${8 + depth * 16}px`,
                background: isSelected ? 'rgba(129,140,248,0.12)' : 'transparent',
                color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
              }}
              onMouseOver={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
              onMouseOut={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              onClick={() => {
                if (isFolder) setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
                else onSelect(path, node);
              }}
            >
              {isFolder
                ? (isExpanded ? <BsFolder2Open className="w-3.5 h-3.5 shrink-0" style={{ color: '#f59e0b' }} /> : <BsFolder className="w-3.5 h-3.5 shrink-0" style={{ color: '#f59e0b' }} />)
                : <BsFileCode className="w-3.5 h-3.5 shrink-0" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />}
              <span className="text-xs truncate flex-1">{node.name}</span>
              {!isFolder && onDelete && (
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                  onClick={e => { e.stopPropagation(); onDelete(path); }}
                  style={{ color: 'var(--text-muted)' }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <BsX className="w-3.5 h-3.5" />
                </button>
              )}
              {isFolder && (
                <span style={{ color: 'var(--text-muted)' }}>
                  {isExpanded ? <BsChevronDown className="w-2.5 h-2.5" /> : <BsChevronRight className="w-2.5 h-2.5" />}
                </span>
              )}
            </div>
            {isFolder && isExpanded && node.children && (
              <FileTree
                nodes={node.children}
                depth={depth + 1}
                onSelect={onSelect}
                selectedPath={selectedPath}
                prefix={path}
                onDelete={onDelete}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────── Main Workspace ───────────────────────────
export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [selectedPath, setSelectedPath] = useState('src/index.ts');
  const [selectedNode, setSelectedNode] = useState<FileNode>(DEFAULT_FILES[0].children![0]);
  const [code, setCode] = useState(DEFAULT_FILES[0].children![0].content || '');
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>({});

  // UI panels
  const [rightPanel, setRightPanel] = useState<'ai' | 'api' | null>('ai');
  const [bottomPanel, setBottomPanel] = useState<'terminal' | 'preview' | null>('terminal');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // AI Chat
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: "Hello! I'm your AI code agent. I can read your files, write code, search APIs, and run your sandbox. What would you like to build?", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Terminal
  const [termLines, setTermLines] = useState<TerminalLine[]>([
    { type: 'info', text: 'Nexios AI Terminal v1.0 — type "help" for commands' },
    { type: 'info', text: `Project: ${id || 'workspace'}` },
  ]);
  const [termInput, setTermInput] = useState('');
  const [termHistory, setTermHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const termEndRef = useRef<HTMLDivElement>(null);
  const termInputRef = useRef<HTMLInputElement>(null);

  // API Search
  const [apiSearch, setApiSearch] = useState('');
  const [apiCategory, setApiCategory] = useState('All');

  // GitHub import
  const [showGithubImport, setShowGithubImport] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubLoading, setGithubLoading] = useState(false);

  // New file
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  // Load project
  useEffect(() => {
    const saved = localStorage.getItem('nexios_projects');
    if (saved) {
      const projects: Project[] = JSON.parse(saved);
      const p = projects.find(p => p.id === id);
      if (p) {
        setProject(p);
        // load saved files for this project
        const savedF = localStorage.getItem(`nexios_files_${id}`);
        if (savedF) setFiles(JSON.parse(savedF));
      }
    }
  }, [id]);

  // Save code on change
  useEffect(() => {
    setSavedFiles(prev => ({ ...prev, [selectedPath]: code }));
  }, [code, selectedPath]);

  // Auto scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [termLines]);

  // Select file
  const selectFile = (path: string, node: FileNode) => {
    // Save current file
    setSavedFiles(prev => ({ ...prev, [selectedPath]: code }));
    setSelectedPath(path);
    setSelectedNode(node);
    setCode(savedFiles[path] ?? node.content ?? '');
  };

  // Save current file content into the file tree
  const saveCurrentFile = useCallback(() => {
    const updateNode = (nodes: FileNode[], parts: string[]): FileNode[] => {
      return nodes.map(n => {
        if (n.name === parts[0]) {
          if (parts.length === 1) return { ...n, content: code };
          return { ...n, children: updateNode(n.children || [], parts.slice(1)) };
        }
        return n;
      });
    };
    const parts = selectedPath.split('/');
    const updated = updateNode(files, parts);
    setFiles(updated);
    localStorage.setItem(`nexios_files_${id}`, JSON.stringify(updated));
  }, [code, files, selectedPath, id]);

  // Delete file
  const deleteFile = (path: string) => {
    const deleteNode = (nodes: FileNode[], parts: string[]): FileNode[] =>
      parts.length === 1 ? nodes.filter(n => n.name !== parts[0]) :
        nodes.map(n => n.name === parts[0] ? { ...n, children: deleteNode(n.children || [], parts.slice(1)) } : n);
    const parts = path.split('/');
    setFiles(deleteNode(files, parts));
    if (selectedPath === path) { setSelectedPath('src/index.ts'); setCode(DEFAULT_FILES[0].children![0].content || ''); }
  };

  // Add new file
  const addFile = () => {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    const newNode: FileNode = { name, type: 'file', content: `// ${name}\n`, language: getLang(name) };
    setFiles(prev => [newNode, ...prev]);
    setNewFileName(''); setShowNewFile(false);
    selectFile(name, newNode);
  };

  // GitHub import
  const importGithub = async () => {
    if (!githubUrl.trim()) return;
    setGithubLoading(true);
    try {
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) throw new Error('Invalid URL');
      const [, owner, repo] = match;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
      const data = await res.json();
      if (!data.tree) throw new Error('Could not fetch repo');
      const importedFiles: FileNode[] = [];
      const textFiles = data.tree.filter((f: { type: string; path: string }) => f.type === 'blob' && f.path.match(/\.(ts|tsx|js|jsx|py|json|md|css|html|go|rs|sh)$/) && !f.path.includes('node_modules'));
      for (const file of textFiles.slice(0, 20)) {
        const contentRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file.path}`);
        const content = await contentRes.text();
        importedFiles.push({ name: file.path, type: 'file', content, language: getLang(file.path) });
      }
      setFiles(importedFiles.length > 0 ? importedFiles : DEFAULT_FILES);
      setGithubUrl(''); setShowGithubImport(false);
      addTermLine('success', `Imported ${importedFiles.length} files from ${owner}/${repo}`);
    } catch (err) {
      addTermLine('error', `Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGithubLoading(false);
    }
  };

  // Terminal
  const addTermLine = (type: TerminalLine['type'], text: string) => {
    setTermLines(prev => [...prev, { type, text }]);
  };

  const COMMANDS: Record<string, (args: string[]) => void> = {
    help: () => {
      addTermLine('info', 'Available commands:');
      addTermLine('output', '  ls          — list files');
      addTermLine('output', '  cat <file>  — show file contents');
      addTermLine('output', '  run         — run current file (simulated)');
      addTermLine('output', '  clear       — clear terminal');
      addTermLine('output', '  install <pkg> — simulate npm install');
      addTermLine('output', '  test        — run tests (simulated)');
      addTermLine('output', '  git status  — show git status');
      addTermLine('output', '  pwd         — print working directory');
    },
    ls: () => {
      const allFiles = flatFiles(files);
      allFiles.forEach(f => addTermLine('output', `  ${f.node.type === 'folder' ? '📁' : '📄'} ${f.path}`));
    },
    pwd: () => addTermLine('output', `/workspace/${project?.name || id}`),
    clear: () => setTermLines([]),
    run: () => {
      addTermLine('info', `$ node ${selectedPath}`);
      setTimeout(() => addTermLine('success', '✓ Server started on http://localhost:3000'), 400);
      setTimeout(() => addTermLine('output', '  GET /health → 200 OK (12ms)'), 900);
    },
    test: () => {
      addTermLine('info', 'Running test suite...');
      setTimeout(() => addTermLine('output', '  ✓ API health check'), 300);
      setTimeout(() => addTermLine('output', '  ✓ Auth middleware'), 600);
      setTimeout(() => addTermLine('output', '  ✓ Rate limiter'), 900);
      setTimeout(() => addTermLine('success', '3 tests passed (1.2s)'), 1200);
    },
    cat: (args) => {
      const path = args[0];
      const all = flatFiles(files);
      const f = all.find(f => f.path === path || f.node.name === path);
      if (f?.node.content) {
        f.node.content.split('\n').slice(0, 30).forEach(l => addTermLine('output', l));
      } else {
        addTermLine('error', `cat: ${path}: No such file`);
      }
    },
    install: (args) => {
      const pkg = args[0] || 'dependencies';
      addTermLine('info', `npm install ${pkg}`);
      setTimeout(() => addTermLine('output', `  added 1 package`), 500);
      setTimeout(() => addTermLine('success', `✓ ${pkg} installed`), 800);
    },
    git: (args) => {
      if (args[0] === 'status') {
        addTermLine('output', 'On branch main');
        addTermLine('output', `Modified: ${selectedPath}`);
        addTermLine('output', 'nothing to commit (use "git add" to stage changes)');
      } else {
        addTermLine('error', `git: '${args[0]}' is not a recognized command`);
      }
    },
  };

  const runTerminalCmd = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    addTermLine('input', `$ ${trimmed}`);
    setTermHistory(prev => [trimmed, ...prev]);
    setHistIdx(-1);
    const [cmd, ...args] = trimmed.split(' ');
    if (COMMANDS[cmd]) {
      COMMANDS[cmd](args);
    } else {
      addTermLine('error', `${cmd}: command not found. Type "help" for commands.`);
    }
  };

  // AI Chat
  const sendMessage = async () => {
    if (!input.trim() || aiLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    setAiLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('no-key');

      const allFileContent = flatFiles(files)
        .filter(f => f.node.type === 'file' && f.node.content)
        .slice(0, 6)
        .map(f => `// FILE: ${f.path}\n${f.node.content}`)
        .join('\n\n---\n\n');

      const systemPrompt = `You are an expert AI code agent inside the Nexios AI workspace.
Current project: "${project?.name || 'workspace'}" (${project?.language || 'TypeScript'})
Currently open file: ${selectedPath}

File contents in workspace:
${allFileContent}

Respond helpfully with code when asked. Format code blocks with \`\`\`language ... \`\`\`.
When you write code to update the current file, prefix it with "UPDATE_FILE:${selectedPath}:".
Keep responses concise and actionable.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...messages.slice(-6).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
            { role: 'user', parts: [{ text: userMsg }] }
          ],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
        }),
      });

      const data = await res.json();
      let reply: string = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I encountered an issue. Please try again.';

      // If AI wants to update the current file
      if (reply.includes(`UPDATE_FILE:${selectedPath}:`)) {
        const match = reply.match(/UPDATE_FILE:[^:]+:```[a-z]*\n([\s\S]*?)```/);
        if (match) {
          const newCode = match[1];
          setCode(newCode);
          reply = reply.replace(/UPDATE_FILE:[^`]*```[a-z]*\n[\s\S]*?```/, '').trim();
          reply = (reply || '✓ File updated successfully.') + '\n\n*I\'ve updated `' + selectedPath + '` with the new code.*';
          addTermLine('success', `AI agent updated ${selectedPath}`);
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }]);
    } catch (err) {
      const isNoKey = err instanceof Error && err.message === 'no-key';
      const fallback = isNoKey
        ? "I'm ready to help! To enable AI responses, add your `NEXT_PUBLIC_GEMINI_API_KEY` in the environment settings. I can still help you navigate the workspace, search APIs, and use the terminal."
        : "Sorry, I couldn't connect to the AI. Please check your API key and try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: fallback, timestamp: Date.now() }]);
    } finally {
      setAiLoading(false);
    }
  };

  // API Search
  const apiCategories = ['All', ...Array.from(new Set(PUBLIC_APIS.map(a => a.category)))];
  const filteredApis = PUBLIC_APIS.filter(a =>
    (apiCategory === 'All' || a.category === apiCategory) &&
    (a.name.toLowerCase().includes(apiSearch.toLowerCase()) || a.description.toLowerCase().includes(apiSearch.toLowerCase()) || a.category.toLowerCase().includes(apiSearch.toLowerCase()))
  );

  // Format AI message with code highlighting
  const formatMessage = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const lines = part.slice(3, -3).split('\n');
        const lang = lines[0];
        const code = lines.slice(1).join('\n');
        return (
          <div key={i} className="my-2 rounded-lg overflow-hidden" style={{ background: '#0d1117', border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{lang || 'code'}</span>
              <button className="text-[10px]" style={{ color: 'var(--accent)' }}
                onClick={() => { setCode(code); addTermLine('info', 'AI code applied to editor'); }}>
                Apply to editor
              </button>
            </div>
            <pre className="text-xs p-3 overflow-x-auto font-code leading-relaxed" style={{ color: '#e2e8f0' }}>{code}</pre>
          </div>
        );
      }
      return <span key={i} className="whitespace-pre-wrap leading-relaxed">{part}</span>;
    });
  };

  if (!project && id) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <HiFolder className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm text-white mb-4">Project not found</p>
          <Link href="/dashboard/projects" className="btn-ghost text-sm">← Back to Projects</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-3 h-11 shrink-0" style={{ background: 'rgba(8,12,20,0.98)', borderBottom: '1px solid var(--glass-border)' }}>
        <Link href="/dashboard/projects" className="flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded-lg"
          style={{ color: 'var(--text-muted)' }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <HiArrowLeft className="w-3.5 h-3.5" /> Projects
        </Link>
        <div className="w-px h-4 mx-1" style={{ background: 'var(--glass-border)' }} />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <HiFolder className="w-3.5 h-3.5" />
          <span className="text-white font-medium">{project?.name || id}</span>
          {selectedPath && <><span>/</span><span style={{ color: 'var(--accent)' }}>{selectedPath.split('/').pop()}</span></>}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Save */}
          <button onClick={saveCurrentFile} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}>
            Save
          </button>
          {/* Run */}
          <button onClick={() => { setBottomPanel('terminal'); setTimeout(() => COMMANDS.run([]), 100); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
            <BsPlay className="w-3 h-3" /> Run
          </button>
          {/* GitHub */}
          <button onClick={() => setShowGithubImport(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
            <BsGithub className="w-3.5 h-3.5" /> Import
          </button>
          {/* Panel toggles */}
          <button onClick={() => setRightPanel(p => p === 'ai' ? null : 'ai')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: rightPanel === 'ai' ? 'rgba(129,140,248,0.15)' : 'var(--bg-card)', border: `1px solid ${rightPanel === 'ai' ? 'rgba(129,140,248,0.3)' : 'var(--glass-border)'}`, color: rightPanel === 'ai' ? 'var(--accent)' : 'var(--text-secondary)' }}>
            <BsRobot className="w-3.5 h-3.5" /> AI
          </button>
          <button onClick={() => setRightPanel(p => p === 'api' ? null : 'api')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: rightPanel === 'api' ? 'rgba(129,140,248,0.15)' : 'var(--bg-card)', border: `1px solid ${rightPanel === 'api' ? 'rgba(129,140,248,0.3)' : 'var(--glass-border)'}`, color: rightPanel === 'api' ? 'var(--accent)' : 'var(--text-secondary)' }}>
            <BsGlobe className="w-3.5 h-3.5" /> APIs
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* File sidebar */}
        <div className="flex flex-col shrink-0 transition-all duration-200" style={{ width: sidebarCollapsed ? 40 : 200, borderRight: '1px solid var(--glass-border)', background: 'rgba(8,12,20,0.95)' }}>
          {sidebarCollapsed ? (
            <button onClick={() => setSidebarCollapsed(false)} className="flex items-center justify-center h-full w-full" style={{ color: 'var(--text-muted)' }}>
              <HiFolder className="w-4 h-4" />
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Explorer</span>
                <div className="flex gap-1">
                  <button onClick={() => setShowNewFile(true)} className="p-1 rounded transition-colors" style={{ color: 'var(--text-muted)' }}
                    title="New file"
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                    <BsPlus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setSidebarCollapsed(true)} className="p-1 rounded transition-colors" style={{ color: 'var(--text-muted)' }}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                    <BsX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {showNewFile && (
                <div className="px-2 py-1.5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <input autoFocus value={newFileName} onChange={e => setNewFileName(e.target.value)}
                    placeholder="filename.ts" className="w-full text-xs rounded-lg px-2 py-1.5 outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border-focus)', color: 'var(--text-primary)' }}
                    onKeyDown={e => { if (e.key === 'Enter') addFile(); if (e.key === 'Escape') setShowNewFile(false); }} />
                </div>
              )}

              <div className="flex-1 overflow-y-auto py-1.5">
                <FileTree nodes={files} onSelect={selectFile} selectedPath={selectedPath} onDelete={deleteFile} />
              </div>
            </>
          )}
        </div>

        {/* Editor + bottom panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center shrink-0 px-2 gap-1 h-9" style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(13,17,23,0.95)' }}>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg text-xs font-medium" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderBottom: `2px solid var(--accent)`, color: 'var(--accent)' }}>
              <BsFileCode className="w-3 h-3" />
              {selectedPath.split('/').pop()}
            </div>
          </div>

          {/* Monaco */}
          <div className="flex-1 overflow-hidden" style={{ minHeight: bottomPanel ? 0 : 'auto' }}>
            <MonacoEditor
              value={code}
              language={selectedNode?.language || getLang(selectedPath)}
              theme="vs-dark"
              onChange={v => setCode(v || '')}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'gutter',
                padding: { top: 16 },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                tabSize: 2,
              }}
            />
          </div>

          {/* Bottom panel */}
          {bottomPanel && (
            <div className="flex flex-col shrink-0" style={{ height: 220, borderTop: '1px solid var(--glass-border)', background: 'rgba(5,8,14,0.98)' }}>
              {/* Panel tabs */}
              <div className="flex items-center gap-1 px-3 h-8 shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <button onClick={() => setBottomPanel('terminal')}
                  className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded transition-colors"
                  style={{ background: bottomPanel === 'terminal' ? 'var(--bg-card)' : 'transparent', color: bottomPanel === 'terminal' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  <BsTerminal className="w-3 h-3" /> Terminal
                </button>
                <button onClick={() => setBottomPanel('preview')}
                  className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded transition-colors"
                  style={{ background: bottomPanel === 'preview' ? 'var(--bg-card)' : 'transparent', color: bottomPanel === 'preview' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  <BsPlay className="w-3 h-3" /> Preview
                </button>
                <button onClick={() => setBottomPanel(null)} className="ml-auto p-1 rounded transition-colors" style={{ color: 'var(--text-muted)' }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <HiX className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Terminal content */}
              {bottomPanel === 'terminal' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" onClick={() => termInputRef.current?.focus()}>
                    {termLines.map((line, i) => (
                      <div key={i} className="text-xs font-code leading-relaxed" style={{
                        color: line.type === 'input' ? 'var(--accent)' : line.type === 'error' ? 'var(--danger)' : line.type === 'success' ? '#34d399' : line.type === 'info' ? '#60a5fa' : 'rgba(255,255,255,0.65)',
                      }}>
                        {line.text}
                      </div>
                    ))}
                    <div ref={termEndRef} />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-xs font-code" style={{ color: 'var(--accent)' }}>$</span>
                    <input ref={termInputRef} value={termInput} onChange={e => setTermInput(e.target.value)}
                      className="flex-1 bg-transparent text-xs font-code outline-none"
                      style={{ color: 'var(--text-primary)', caretColor: 'var(--accent)' }}
                      placeholder="Type a command..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') { runTerminalCmd(termInput); setTermInput(''); }
                        if (e.key === 'ArrowUp') { const h = termHistory[histIdx + 1]; if (h) { setTermInput(h); setHistIdx(i => i + 1); } }
                        if (e.key === 'ArrowDown') { const h = termHistory[histIdx - 1]; setTermInput(h || ''); setHistIdx(i => Math.max(-1, i - 1)); }
                        if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); setTermLines([]); }
                      }} />
                  </div>
                </div>
              )}

              {/* Preview content */}
              {bottomPanel === 'preview' && (
                <div className="flex-1 overflow-hidden">
                  <iframe
                    title="preview"
                    className="w-full h-full border-0"
                    srcDoc={`<!DOCTYPE html><html><head><style>body{background:#080c14;color:#e2e8f0;font-family:system-ui,sans-serif;padding:20px;margin:0} pre{background:#0d1117;padding:16px;border-radius:8px;overflow:auto;font-size:12px;line-height:1.6}</style></head><body><h2 style="color:#818cf8;margin-top:0">Live Preview</h2><p style="color:#94a3b8;font-size:14px">Web preview runs HTML/CSS/JS code.</p><pre>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`}
                  />
                </div>
              )}
            </div>
          )}

          {/* Bottom panel toggle when closed */}
          {!bottomPanel && (
            <div className="flex items-center gap-2 px-3 py-1 shrink-0" style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(8,12,20,0.98)' }}>
              <button onClick={() => setBottomPanel('terminal')} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                <BsTerminal className="w-3 h-3" /> Terminal
              </button>
              <button onClick={() => setBottomPanel('preview')} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                <BsPlay className="w-3 h-3" /> Preview
              </button>
            </div>
          )}
        </div>

        {/* Right panel: AI Agent */}
        {rightPanel === 'ai' && (
          <div className="flex flex-col shrink-0" style={{ width: 320, borderLeft: '1px solid var(--glass-border)', background: 'rgba(8,12,20,0.97)' }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
                  <BsRobot className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                </div>
                <span className="text-xs font-semibold text-white">AI Code Agent</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: '#34d399' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" /> Online
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5"
                    style={{ background: msg.role === 'assistant' ? 'var(--accent-glow)' : 'rgba(255,255,255,0.08)', color: msg.role === 'assistant' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {msg.role === 'assistant' ? '✦' : 'U'}
                  </div>
                  <div className="flex-1 text-xs leading-relaxed rounded-xl px-3 py-2.5 max-w-[240px]"
                    style={{ background: msg.role === 'assistant' ? 'var(--bg-card)' : 'rgba(129,140,248,0.12)', border: `1px solid ${msg.role === 'assistant' ? 'var(--glass-border)' : 'rgba(129,140,248,0.2)'}`, color: 'var(--text-primary)' }}>
                    {formatMessage(msg.content)}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>✦</div>
                  <div className="px-3 py-2.5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick actions */}
            <div className="px-3 py-2 shrink-0" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <div className="flex flex-wrap gap-1 mb-2">
                {['Explain this code', 'Add error handling', 'Write tests', 'Optimise'].map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    className="text-[10px] px-2 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(129,140,248,0.3)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)'; }}>
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask the AI agent..."
                  className="flex-1 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--input-border-focus)'}
                  onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                />
                <button onClick={sendMessage} disabled={aiLoading || !input.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
                  style={{ background: 'var(--accent)', opacity: aiLoading || !input.trim() ? 0.5 : 1 }}>
                  <HiLightningBolt className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right panel: API Search */}
        {rightPanel === 'api' && (
          <div className="flex flex-col shrink-0" style={{ width: 320, borderLeft: '1px solid var(--glass-border)', background: 'rgba(8,12,20,0.97)' }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.15)' }}>
                  <BsGlobe className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />
                </div>
                <span className="text-xs font-semibold text-white">API Search</span>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{PUBLIC_APIS.length} APIs</span>
            </div>

            <div className="px-3 pt-3 space-y-2 shrink-0">
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input value={apiSearch} onChange={e => setApiSearch(e.target.value)} placeholder="Search APIs..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl outline-none transition-all"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--input-border-focus)'}
                  onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {apiCategories.map(cat => (
                  <button key={cat} onClick={() => setApiCategory(cat)}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
                    style={{
                      background: apiCategory === cat ? 'rgba(96,165,250,0.15)' : 'var(--bg-card)',
                      border: `1px solid ${apiCategory === cat ? 'rgba(96,165,250,0.3)' : 'var(--glass-border)'}`,
                      color: apiCategory === cat ? '#60a5fa' : 'var(--text-muted)',
                    }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 mt-1">
              {filteredApis.map((api, i) => (
                <div key={i} className="rounded-xl p-3 transition-all cursor-pointer group" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border-hover)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)'; }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className="text-xs font-semibold text-white">{api.name}</span>
                      <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>{api.category}</span>
                    </div>
                    <a href={api.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded" style={{ color: 'var(--accent)' }}>
                      <BsArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] leading-snug mb-2" style={{ color: 'var(--text-secondary)' }}>{api.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: api.auth === 'None' ? '#34d399' : 'var(--text-muted)' }}>
                      🔑 {api.auth}
                    </span>
                    <button
                      className="text-[10px] px-2 py-0.5 rounded-lg font-medium transition-colors"
                      style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(129,140,248,0.2)' }}
                      onClick={() => {
                        const snippet = `// ${api.name} API\n// Docs: ${api.url}\n// Auth: ${api.auth}\n\nconst response = await fetch('${api.url.replace('docs', 'api')}', {\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY',\n    'Content-Type': 'application/json'\n  }\n});\nconst data = await response.json();\n`;
                        setCode(prev => prev + '\n\n' + snippet);
                        addTermLine('info', `Added ${api.name} code snippet to editor`);
                      }}>
                      Use API
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* GitHub Import Modal */}
      {showGithubImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>
          <div className="glass rounded-2xl p-7 w-full max-w-md animate-scaleIn">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <BsGithub className="w-5 h-5 text-white" />
                <h2 className="text-base font-bold text-white">Import GitHub Repository</h2>
              </div>
              <button onClick={() => setShowGithubImport(false)} style={{ color: 'var(--text-muted)' }}>
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Enter a public repository URL. The AI agent will analyse the codebase on import.</p>
            <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/username/repo"
              className="input-base mb-4" onKeyDown={e => e.key === 'Enter' && importGithub()} />
            <div className="glass rounded-xl p-3 mb-5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Note: Only public repos. Max 20 files imported. Large repos may be truncated.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowGithubImport(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={importGithub} disabled={githubLoading} className="btn-primary flex-1 gap-2" style={{ opacity: githubLoading ? 0.6 : 1 }}>
                {githubLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing...</> : <><BsGithub className="w-4 h-4" /> Import</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
