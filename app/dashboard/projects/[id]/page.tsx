'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  BsRobot, BsGlobe,
  BsFileCode, BsFolder, BsFolder2Open, BsPlus, BsTrash3,
  BsChevronDown, BsChevronRight,
  BsFileEarmarkCode, BsFileEarmark, BsFileEarmarkText, BsSearch,
  BsDownload, BsLightningChargeFill,
  BsFileEarmarkRichtext, BsBrush,
  BsCheckCircleFill, BsExclamationCircleFill, BsArrowRepeat,
  BsFileEarmarkPlus, BsPencilFill, BsDashCircleFill,
  BsTerminalFill,
} from 'react-icons/bs';
import {
  HiArrowLeft, HiX, HiLightningBolt,
  HiFolder, HiMenu, HiOutlineFolder, HiCode
} from 'react-icons/hi';
import Link from 'next/link';
import { useAI } from '@/app/context/AIContext';
import { callAI } from '@/app/lib/ai';
import { AI_PROVIDERS } from '@/app/context/AIContext';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ─────────────────────────── Types ───────────────────────────
interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  language?: string;
  path: string;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  fileOps?: FileOp[];
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success';
  text: string;
}

interface Project {
  id: string;
  name: string;
  language: string;
  color?: string;
  type?: 'code' | 'design' | 'document';
}

interface FileOp {
  type: 'create' | 'edit' | 'delete';
  path: string;
  content?: string;
}

interface ActivityEntry {
  id: string;
  kind: 'thinking' | 'coding' | 'file_created' | 'file_edited' | 'file_deleted' | 'done' | 'error' | 'info' | 'terminal';
  message: string;
  path?: string;
  timestamp: number;
}

// ─────────────────────────── Constants ───────────────────────────
const EXT_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rs: 'rust', go: 'go', html: 'html', css: 'css',
  json: 'json', md: 'markdown', sh: 'shell', yaml: 'yaml', toml: 'toml',
  sql: 'sql', rb: 'ruby', php: 'php', java: 'java', c: 'c', cpp: 'cpp',
  vue: 'html', svelte: 'html', graphql: 'graphql', xml: 'xml', txt: 'plaintext',
};

const FILE_ICONS: Record<string, any> = {
  ts: BsFileEarmarkCode, tsx: BsFileEarmarkCode,
  js: BsFileEarmarkCode, jsx: BsFileEarmarkCode,
  py: BsFileEarmarkCode, rs: BsFileEarmarkCode,
  json: BsFileEarmarkCode, md: BsFileEarmarkText,
  css: BsFileEarmarkCode, html: BsFileEarmarkCode,
  default: BsFileEarmark,
};

const ACTIVITY_ICONS: Record<string, any> = {
  thinking: BsArrowRepeat, coding: BsLightningChargeFill,
  file_created: BsFileEarmarkPlus, file_edited: BsPencilFill,
  file_deleted: BsDashCircleFill, done: BsCheckCircleFill,
  error: BsExclamationCircleFill, info: BsRobot, terminal: BsTerminalFill,
};

const ACTIVITY_COLORS: Record<string, string> = {
  thinking: '#f59e0b', coding: '#818cf8',
  file_created: '#34d399', file_edited: '#60a5fa',
  file_deleted: '#f87171', done: '#34d399',
  error: '#f87171', info: '#a78bfa', terminal: '#94a3b8',
};

// ─────────────────────────── File Op Parser ───────────────────────────
function parseFileOps(response: string): FileOp[] {
  const ops: FileOp[] = [];
  const fileRegex = /---FILE:([\w./\-\s]+?)---\n([\s\S]*?)---ENDFILE---/g;
  let m: RegExpExecArray | null;
  while ((m = fileRegex.exec(response)) !== null) {
    const p = m[1].trim();
    if (p) ops.push({ type: 'create', path: p, content: m[2].trimEnd() });
  }
  const fencedRegex = /```(?:\w+)?\n(?:\/\/|#|<!--|;)\s*([\w./\-]+\.\w+)\s*(?:-->)?\n([\s\S]*?)```/g;
  while ((m = fencedRegex.exec(response)) !== null) {
    const p = m[1].trim();
    if (p && !ops.find(o => o.path === p)) ops.push({ type: 'create', path: p, content: m[2].trimEnd() });
  }
  const deleteRegex = /---DELETE:([\w./\-\s]+?)---/g;
  while ((m = deleteRegex.exec(response)) !== null) {
    const p = m[1].trim();
    if (p) ops.push({ type: 'delete', path: p });
  }
  return ops;
}

// ─────────────────────────── Tree Helpers ───────────────────────────
function getLang(name: string) { return EXT_LANG[name.split('.').pop() || ''] || 'plaintext'; }
function getFileIcon(name: string) { const ext = name.split('.').pop() || ''; return FILE_ICONS[ext] || FILE_ICONS.default; }
function generateId() { return Math.random().toString(36).substring(2, 9); }

function insertOrUpdateFile(nodes: FileNode[], filePath: string, content: string, rootPath = ''): FileNode[] {
  const parts = filePath.split('/');
  const name = parts[0];
  if (parts.length === 1) {
    const idx = nodes.findIndex(n => n.name === name && n.type === 'file');
    const fullPath = rootPath ? `${rootPath}/${name}` : name;
    if (idx >= 0) {
      const u = [...nodes];
      u[idx] = { ...u[idx], content, language: getLang(name) };
      return u;
    }
    return [...nodes, { id: generateId(), name, type: 'file', content, language: getLang(name), path: fullPath }];
  }
  const rest = parts.slice(1).join('/');
  const folderIdx = nodes.findIndex(n => n.name === name && n.type === 'folder');
  const fullFolderPath = rootPath ? `${rootPath}/${name}` : name;
  if (folderIdx >= 0) {
    const u = [...nodes];
    u[folderIdx] = { ...u[folderIdx], children: insertOrUpdateFile(u[folderIdx].children || [], rest, content, fullFolderPath) };
    return u;
  }
  const newFolder: FileNode = { id: generateId(), name, type: 'folder', path: fullFolderPath, children: insertOrUpdateFile([], rest, content, fullFolderPath) };
  return [...nodes, newFolder];
}

function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  const parts = path.split('/');
  let current: FileNode | undefined = nodes.find(n => n.name === parts[0]);
  for (let i = 1; i < parts.length; i++) {
    if (!current?.children) return null;
    current = current.children.find(c => c.name === parts[i]);
  }
  return current || null;
}

function updateNodeByPath(nodes: FileNode[], path: string, updater: (n: FileNode) => FileNode): FileNode[] {
  const parts = path.split('/');
  return nodes.map(node => {
    if (node.name !== parts[0]) return node;
    if (parts.length === 1) return updater(node);
    if (node.type === 'folder' && node.children) return { ...node, children: updateNodeByPath(node.children, parts.slice(1).join('/'), updater) };
    return node;
  });
}

function deleteNodeByPath(nodes: FileNode[], path: string): FileNode[] {
  const parts = path.split('/');
  return nodes.filter(node => {
    if (node.name !== parts[0]) return true;
    if (parts.length === 1) return false;
    if (node.type === 'folder' && node.children) node.children = deleteNodeByPath(node.children, parts.slice(1).join('/'));
    return true;
  });
}

function getAllFilePaths(nodes: FileNode[]): string[] {
  let paths: string[] = [];
  for (const node of nodes) {
    if (node.type === 'file') paths.push(node.path);
    if (node.children) paths = paths.concat(getAllFilePaths(node.children));
  }
  return paths;
}

function flatToTree(flatFiles: Record<string, string>): FileNode[] {
  let nodes: FileNode[] = [];
  for (const [filePath, content] of Object.entries(flatFiles)) {
    nodes = insertOrUpdateFile(nodes, filePath, content);
  }
  return nodes;
}

// ─────────────────────────── File Tree Component ───────────────────────────
function FileTree({ nodes, onSelect, selectedPath, onDelete, onRename, onAdd, expanded, setExpanded }: {
  nodes: FileNode[]; onSelect: (p: string) => void; selectedPath: string;
  onDelete: (p: string) => void; onRename: (p: string, n: string) => void;
  onAdd: (p: string, t: 'file' | 'folder') => void;
  expanded: Record<string, boolean>; setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const renderNode = (node: FileNode, depth: number): React.ReactNode => {
    const isFolder = node.type === 'folder';
    const isExp = expanded[node.path];
    const isSel = selectedPath === node.path;
    const FileIcon = getFileIcon(node.name);

    if (renaming === node.path) {
      return (
        <div key={node.id} style={{ paddingLeft: depth * 12 + 8 }} className="flex items-center px-2 py-0.5">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onBlur={() => { if (newName.trim()) onRename(node.path, newName.trim()); setRenaming(null); }}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onRename(node.path, newName.trim()); setRenaming(null); } if (e.key === 'Escape') setRenaming(null); }}
            className="w-full text-[11px] bg-black/40 border border-white/20 rounded px-1.5 py-0.5 outline-none focus:border-indigo-400 text-white" autoFocus />
        </div>
      );
    }

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer group rounded-sm transition-colors ${isSel ? 'bg-indigo-600/25 text-indigo-300' : 'hover:bg-white/5 text-white/70'}`}
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => isFolder ? setExpanded(p => ({ ...p, [node.path]: !p[node.path] })) : onSelect(node.path)}
          onDoubleClick={() => !isFolder && (setRenaming(node.path), setNewName(node.name))}>
          {isFolder && <span className="w-3 text-white/30 shrink-0">{isExp ? <BsChevronDown size={8} /> : <BsChevronRight size={8} />}</span>}
          <span className="shrink-0">
            {isFolder ? (isExp ? <BsFolder2Open size={12} className="text-yellow-400" /> : <BsFolder size={12} className="text-yellow-400" />) : <FileIcon size={12} className="text-indigo-400" />}
          </span>
          <span className={`flex-1 text-[11px] truncate ${isSel ? 'text-indigo-300' : ''}`}>{node.name}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
            {isFolder && <button onClick={e => { e.stopPropagation(); onAdd(node.path, 'file'); }} className="text-white/30 hover:text-white/80 p-0.5" title="New file"><BsPlus size={11} /></button>}
            {!isFolder && <button onClick={e => { e.stopPropagation(); onDelete(node.path); }} className="text-white/20 hover:text-red-400 p-0.5" title="Delete"><BsTrash3 size={9} /></button>}
          </div>
        </div>
        {isFolder && isExp && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return <div>{nodes.map(node => renderNode(node, 0))}</div>;
}

// ─────────────────────────── Real API helpers ───────────────────────────
async function apiWriteFile(projectId: string, filePath: string, content: string) {
  return fetch(`/api/workspace/${projectId}/files`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, content }),
  });
}

async function apiDeleteFile(projectId: string, filePath: string) {
  return fetch(`/api/workspace/${projectId}/files`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath }),
  });
}

async function apiRenameFile(projectId: string, from: string, to: string) {
  return fetch(`/api/workspace/${projectId}/files`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to }),
  });
}

async function apiRunCommand(projectId: string, command: string): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const res = await fetch(`/api/workspace/${projectId}/terminal`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    return res.json();
  } catch {
    return { stdout: '', stderr: 'Network error', code: 1 };
  }
}

// ─────────────────────────── Main Workspace ───────────────────────────
type PanelTab = 'chat' | 'activity' | 'terminal';
type ContentTab = 'code' | 'files' | 'design' | 'document';

export default function ProjectWorkspace() {
  const params = useParams();
  const id = params?.id as string;

  const { activeProvider, activeModel, getApiKey, setActiveModel, setActiveProvider } = useAI();

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [code, setCode] = useState('');
  const [contentTab, setContentTab] = useState<ContentTab>('code');
  const [panelTab, setPanelTab] = useState<PanelTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [codeSearch, setCodeSearch] = useState('');
  const [creatingIn, setCreatingIn] = useState<{ path: string; type: 'file' | 'folder' } | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [loStatus, setLoStatus] = useState<{ available: boolean; version?: string } | null>(null);

  const [agentPhase, setAgentPhase] = useState<'idle' | 'thinking' | 'coding' | 'done'>('idle');
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);

  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Welcome to your Nexios AI workspace. This is a real Linux environment — I can create, edit, delete files, run commands, and use LibreOffice for documents. Tell me what to build.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [termLines, setTermLines] = useState<TerminalLine[]>([
    { type: 'output', text: '  Nexios Linux Workspace Terminal' },
    { type: 'output', text: '──────────────────────────────────────────' },
    { type: 'success', text: '✓ Real Linux environment — /tmp/nexios-workspaces/' },
    { type: 'success', text: '✓ LibreOffice, pandoc, git, curl, python3 available' },
    { type: 'output', text: "  Type any shell command below" },
    { type: 'output', text: '' },
  ]);
  const [termInput, setTermInput] = useState('');
  const termEndRef = useRef<HTMLDivElement>(null);
  const activityEndRef = useRef<HTMLDivElement>(null);

  const addActivity = useCallback((kind: ActivityEntry['kind'], message: string, path?: string) => {
    setActivityLog(p => [...p.slice(-100), { id: generateId(), kind, message, path, timestamp: Date.now() }]);
  }, []);

  // ─── Load project ───
  useEffect(() => {
    const saved = localStorage.getItem('nexios_projects');
    if (saved) {
      const projects: Project[] = JSON.parse(saved);
      const p = projects.find(pr => pr.id === id);
      if (p) {
        setProject(p);
        if (p.type === 'document') setContentTab('document');
        else if (p.type === 'design') setContentTab('design');
        else setContentTab('code');
      }
    }
    const savedChat = localStorage.getItem(`nexios_chat_${id}`);
    if (savedChat) { try { setMessages(JSON.parse(savedChat)); } catch { /* ignore */ } }
    const savedDoc = localStorage.getItem(`nexios_doc_${id}`);
    if (savedDoc) setDocContent(savedDoc);
  }, [id]);

  // ─── Load files from real backend ───
  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspace/${id}/files`)
      .then(r => r.json())
      .then(data => {
        if (data.files && Object.keys(data.files).length > 0) {
          const tree = flatToTree(data.files);
          setFiles(tree);
          const paths = getAllFilePaths(tree);
          if (paths.length) setSelectedPath(paths[0]);
          addActivity('info', `Loaded ${paths.length} file(s) from real workspace`);
        }
      })
      .catch(() => { /* workspace may be empty */ });

    // Check LibreOffice availability
    fetch(`/api/workspace/${id}/libreoffice`)
      .then(r => r.json())
      .then(data => setLoStatus(data))
      .catch(() => {});
  }, [id, addActivity]);

  useEffect(() => { localStorage.setItem(`nexios_chat_${id}`, JSON.stringify(messages)); }, [messages, id]);
  useEffect(() => { if (docContent) localStorage.setItem(`nexios_doc_${id}`, docContent); }, [docContent, id]);
  useEffect(() => {
    if (selectedPath) {
      const node = findNodeByPath(files, selectedPath);
      if (node?.type === 'file') setCode(node.content || '');
    }
  }, [selectedPath, files]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [termLines]);
  useEffect(() => { activityEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activityLog]);

  // ─── File operations (real API + in-memory tree) ───
  const handleCodeChange = (value: string | undefined) => {
    if (!value || !selectedPath) return;
    setCode(value);
    setFiles(prev => updateNodeByPath(prev, selectedPath, node => ({ ...node, content: value })));
    apiWriteFile(id, selectedPath, value).catch(() => {});
  };

  const handleDeleteFile = async (path: string) => {
    setFiles(prev => deleteNodeByPath(prev, path));
    addActivity('file_deleted', `Deleted ${path}`, path);
    if (path === selectedPath) {
      const paths = getAllFilePaths(files);
      setSelectedPath(paths.find(p => p !== path) || '');
    }
    await apiDeleteFile(id, path);
  };

  const handleRename = async (path: string, newName: string) => {
    const parts = path.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    setFiles(prev => updateNodeByPath(prev, path, node => ({ ...node, name: newName, path: newPath, language: getLang(newName) })));
    if (selectedPath === path) setSelectedPath(newPath);
    await apiRenameFile(id, path, newPath);
  };

  const handleCreateItem = async () => {
    if (!creatingIn || !newFileName.trim()) return;
    const name = newFileName.trim();
    const content = creatingIn.type === 'file' ? `// ${name}\n` : '';
    const parentPath = creatingIn.path;
    const fullPath = parentPath ? `${parentPath}/${name}` : name;

    if (creatingIn.type === 'file') {
      const newNode = { id: generateId(), name, type: 'file' as const, content, language: getLang(name), path: fullPath };
      if (parentPath) {
        setFiles(prev => updateNodeByPath(prev, parentPath, node => {
          if (node.type === 'folder') return { ...node, children: [...(node.children || []), newNode] };
          return node;
        }));
      } else {
        setFiles(prev => [...prev, newNode]);
      }
      setSelectedPath(fullPath); setContentTab('code');
      await apiWriteFile(id, fullPath, content);
      addActivity('file_created', `Created ${fullPath}`, fullPath);
    } else {
      const newFolder = { id: generateId(), name, type: 'folder' as const, children: [], path: fullPath };
      if (parentPath) {
        setFiles(prev => updateNodeByPath(prev, parentPath, node => {
          if (node.type === 'folder') return { ...node, children: [...(node.children || []), newFolder] };
          return node;
        }));
      } else {
        setFiles(prev => [...prev, newFolder]);
      }
    }

    setExpandedFolders(p => ({ ...p, [creatingIn.path]: true }));
    setCreatingIn(null); setNewFileName('');
  };

  // ─── Apply AI file operations to real backend + memory ───
  const applyFileOps = useCallback(async (ops: FileOp[]) => {
    if (!ops.length) return;
    let updatedFiles = files;

    for (const op of ops) {
      if (op.type === 'delete') {
        updatedFiles = deleteNodeByPath(updatedFiles, op.path);
        await apiDeleteFile(id, op.path);
        addActivity('file_deleted', `Deleted ${op.path}`, op.path);
      } else {
        const isExisting = !!findNodeByPath(updatedFiles, op.path);
        updatedFiles = insertOrUpdateFile(updatedFiles, op.path, op.content || '');
        await apiWriteFile(id, op.path, op.content || '');
        addActivity(isExisting ? 'file_edited' : 'file_created', isExisting ? `Updated ${op.path}` : `Created ${op.path}`, op.path);
        setSelectedPath(op.path); setContentTab('code');
      }
    }

    setFiles(updatedFiles);
    setExpandedFolders(prev => {
      const next = { ...prev };
      ops.forEach(op => {
        const parts = op.path.split('/');
        parts.pop();
        let p = '';
        parts.forEach(part => { p = p ? `${p}/${part}` : part; next[p] = true; });
      });
      return next;
    });

    setTermLines(p => [
      ...p,
      { type: 'success', text: `[Coding Agent] Applied ${ops.length} file operation(s):` },
      ...ops.map(op => ({ type: 'output' as const, text: `  · ${op.type}: ${op.path}` })),
    ]);
  }, [files, id, addActivity]);

  // ─── Export ───
  const exportProject = () => {
    const blob = new Blob([JSON.stringify({ project, files, chat: messages, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${project?.name || 'project'}-export.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Real Terminal ───
  const runTerminalCommand = async () => {
    if (!termInput.trim()) return;
    const cmd = termInput.trim();
    setTermLines(p => [...p, { type: 'input', text: `$ ${cmd}` }]);
    setTermInput('');
    addActivity('terminal', `$ ${cmd}`);

    const result = await apiRunCommand(id, cmd);

    if (result.stdout) {
      result.stdout.split('\n').filter(l => l).forEach(line =>
        setTermLines(p => [...p, { type: 'output', text: line }])
      );
    }
    if (result.stderr) {
      result.stderr.split('\n').filter(l => l).forEach(line =>
        setTermLines(p => [...p, { type: result.code === 0 ? 'output' : 'error', text: line }])
      );
    }
    if (result.code === 0 && !result.stdout && !result.stderr) {
      setTermLines(p => [...p, { type: 'success', text: 'Done (exit 0)' }]);
    }

    // After running a command, refresh files from real backend
    if (['npm', 'pip', 'git', 'node', 'python', 'touch', 'mkdir', 'cp', 'mv'].some(c => cmd.startsWith(c))) {
      fetch(`/api/workspace/${id}/files`).then(r => r.json()).then(data => {
        if (data.files && Object.keys(data.files).length > 0) {
          setFiles(flatToTree(data.files));
        }
      }).catch(() => {});
    }
  };

  // ─── AI SYSTEM ───
  const sendMessage = async () => {
    if (!input.trim() || aiLoading) return;
    const apiKey = getApiKey(activeProvider.id);
    if (!apiKey) {
      setMessages(p => [...p, { role: 'assistant', content: `⚠️ Please add your ${activeProvider.name} API key in Settings.`, timestamp: Date.now() }]);
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    setAiLoading(true);
    setAgentPhase('thinking');
    addActivity('thinking', `Processing: "${userMsg.slice(0, 60)}${userMsg.length > 60 ? '...' : ''}"`);

    try {
      const allFilePaths = getAllFilePaths(files);
      const currentFile = selectedPath ? findNodeByPath(files, selectedPath) : null;
      const currentFileCtx = currentFile
        ? `\nCurrently open: ${selectedPath}\n\`\`\`\n${(currentFile.content || '').slice(0, 2000)}\n\`\`\``
        : '';

      const fileSummary = allFilePaths.length
        ? allFilePaths.slice(0, 30).map(p => {
            const node = findNodeByPath(files, p);
            return `  ${p} (${(node?.content || '').split('\n').length}L)`;
          }).join('\n')
        : '  (no files yet — ask me to create them)';

      const systemPrompt = `You are Nexios AI, an expert software engineer working inside a REAL Linux workspace at /tmp/nexios-workspaces/${id}/.

This is NOT a simulation — you have a real filesystem, real terminal, LibreOffice, git, python3, npm, pandoc all installed.

## HOW TO CREATE / EDIT FILES
Use this EXACT format — always write COMPLETE file content:

---FILE:path/to/filename.ext---
[complete file content — never partial]
---ENDFILE---

## HOW TO DELETE FILES
---DELETE:path/to/file.ext---

## RULES
- Multiple files per response: repeat the FILE block
- Always write COMPLETE files — never say "add this line" without the full file
- Use correct relative paths matching the project structure
- After writing files, briefly explain what you created
- The terminal tab lets the user run REAL shell commands — mention specific commands when useful (e.g. "run: npm install")
- LibreOffice is available — mention it for .docx, .odt, .pptx conversions
${loStatus?.available ? `\nLibreOffice ${loStatus.version || ''} is INSTALLED and ready.` : ''}

## PROJECT
Name: ${project?.name || 'Untitled'} | Language: ${project?.language || 'Unknown'} | Type: ${project?.type || 'code'}

## WORKSPACE FILES
${fileSummary}
${currentFileCtx}`;

      const messagesForAI = [
        { role: 'user' as const, content: systemPrompt },
        ...messages.slice(-12).map(m => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content })),
        { role: 'user' as const, content: userMsg },
      ];

      addActivity('thinking', 'Contacting AI model...');
      const response = await callAI(activeProvider.id, activeModel.id, messagesForAI, apiKey);

      setAgentPhase('coding');
      const ops = parseFileOps(response);

      const displayResponse = response
        .replace(/---FILE:[\w./\-\s]+?---\n[\s\S]*?---ENDFILE---/g, match => {
          const pm = match.match(/---FILE:([\w./\-\s]+?)---/);
          const path = pm?.[1]?.trim() || 'file';
          const lines = match.split('\n').length - 2;
          return `\`\`\`\n📄 ${path} — ${lines} lines\n\`\`\``;
        })
        .replace(/---DELETE:[\w./\-\s]+?---/g, match => {
          const pm = match.match(/---DELETE:([\w./\-\s]+?)---/);
          return `🗑️ Deleted: ${pm?.[1]?.trim()}`;
        });

      setMessages(p => [...p, { role: 'assistant', content: displayResponse, timestamp: Date.now(), fileOps: ops.length ? ops : undefined }]);

      if (ops.length > 0) {
        addActivity('coding', `Coding Agent writing ${ops.length} file(s)...`);
        await applyFileOps(ops);
        addActivity('done', `Done — ${ops.length} file(s) written to real filesystem`);
        setPanelTab('activity');
      } else {
        addActivity('info', 'Response complete — no file changes');
        addActivity('done', 'Done');
      }

      setAgentPhase('done');
      setTimeout(() => setAgentPhase('idle'), 3000);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setAgentPhase('idle');
      addActivity('error', `Error: ${errMsg}`);
      setMessages(p => [...p, { role: 'assistant', content: `⚠️ Error: ${errMsg}`, timestamp: Date.now() }]);
    } finally {
      setAiLoading(false);
    }
  };

  const searchMatches = codeSearch ? code.split('\n').reduce((acc, line, i) => {
    if (line.toLowerCase().includes(codeSearch.toLowerCase())) acc.push({ line: i + 1, text: line.trim() });
    return acc;
  }, [] as { line: number; text: string }[]) : [];

  const projectType = project?.type || 'code';
  const isWorking = agentPhase === 'thinking' || agentPhase === 'coding';

  return (
    <div className="h-screen flex flex-col" style={{ background: '#080c14', color: '#fff' }}>

      {/* ── Top Bar ── */}
      <div className="h-10 flex items-center gap-2 px-3 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
        <Link href="/dashboard/projects" className="text-white/40 hover:text-white/80 transition-colors">
          <HiArrowLeft size={14} />
        </Link>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-1.5">
          {projectType === 'code' && <HiCode size={13} className="text-indigo-400" />}
          {projectType === 'design' && <BsBrush size={12} className="text-pink-400" />}
          {projectType === 'document' && <BsFileEarmarkRichtext size={12} className="text-emerald-400" />}
          <span className="text-[12px] font-semibold text-white/90">{project?.name || 'Loading...'}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>{projectType}</span>
        </div>
        <div className="flex-1" />

        {/* LibreOffice status */}
        {loStatus !== null && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]" style={{ background: loStatus.available ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', color: loStatus.available ? '#34d399' : '#666' }}>
            <div className={`w-1 h-1 rounded-full ${loStatus.available ? 'bg-emerald-400' : 'bg-white/20'}`} />
            LibreOffice {loStatus.available ? 'ready' : 'unavailable'}
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${agentPhase === 'thinking' ? 'bg-yellow-400 animate-pulse' : agentPhase === 'coding' ? 'bg-indigo-400 animate-pulse' : agentPhase === 'done' ? 'bg-green-400' : 'bg-white/15'}`} />
          <span className="text-[9px] font-medium" style={{ color: isWorking ? '#818cf8' : 'rgba(255,255,255,0.25)' }}>
            {agentPhase === 'thinking' ? 'Thinking...' : agentPhase === 'coding' ? 'Writing code...' : agentPhase === 'done' ? 'Done' : 'AI Ready'}
          </span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <button onClick={exportProject} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors">
          <BsDownload size={10} /> Export
        </button>
        <button onClick={() => setShowModelSelector(!showModelSelector)} className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors text-white/60">
          {activeModel.name.split(' ')[0]} ▾
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: File Explorer ── */}
        {sidebarOpen && (
          <div className="flex flex-col shrink-0 border-r" style={{ width: 180, borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="h-8 flex items-center justify-between px-2.5 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
              <span className="text-[9px] font-bold tracking-widest text-white/25 uppercase">Explorer</span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="text-white/25 hover:text-white/80 transition-colors p-0.5" title="New file"><BsPlus size={14} /></button>
                <button onClick={() => setCreatingIn({ path: '', type: 'folder' })} className="text-white/25 hover:text-white/80 transition-colors p-0.5" title="New folder"><HiFolder size={12} /></button>
                <button onClick={() => setSidebarOpen(false)} className="text-white/25 hover:text-white/80 transition-colors p-0.5"><HiMenu size={12} /></button>
              </div>
            </div>

            {creatingIn && (
              <div className="p-1.5 border-b flex gap-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <input value={newFileName} onChange={e => setNewFileName(e.target.value)}
                  placeholder={creatingIn.type === 'file' ? 'filename.ts' : 'folder-name'}
                  className="flex-1 px-2 py-0.5 text-[10px] bg-black/40 border border-white/20 rounded outline-none focus:border-indigo-400 text-white"
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateItem(); if (e.key === 'Escape') setCreatingIn(null); }}
                  autoFocus />
                <button onClick={handleCreateItem} className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] rounded hover:bg-indigo-700">✓</button>
                <button onClick={() => setCreatingIn(null)} className="px-1.5 py-0.5 bg-white/10 text-white/50 text-[9px] rounded hover:bg-white/20">✕</button>
              </div>
            )}

            <div className="flex-1 overflow-auto py-1 px-0.5">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/15">
                  <HiFolder size={24} />
                  <p className="text-[10px] text-center px-3">No files yet.<br />Ask AI to create some.</p>
                </div>
              ) : (
                <FileTree nodes={files} onSelect={p => { setSelectedPath(p); setContentTab('code'); }}
                  selectedPath={selectedPath} onDelete={handleDeleteFile} onRename={handleRename}
                  onAdd={(path, type) => setCreatingIn({ path, type })}
                  expanded={expandedFolders} setExpanded={setExpandedFolders} />
              )}
            </div>

            <div className="px-2 py-1.5 border-t shrink-0 flex items-center gap-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span className="text-[9px] text-white/20">{getAllFilePaths(files).length} file{getAllFilePaths(files).length !== 1 ? 's' : ''}</span>
              {isWorking && <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse ml-auto" />}
            </div>
          </div>
        )}

        {/* ── Center: Content ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-8 flex items-center gap-0 border-b shrink-0 px-1" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="mr-2 text-white/30 hover:text-white/80 transition-colors"><HiMenu size={13} /></button>
            )}
            {([
              { id: 'code', label: 'Code', icon: BsFileCode },
              { id: 'files', label: 'Files', icon: HiOutlineFolder },
              ...(projectType !== 'document' ? [{ id: 'design', label: 'Design', icon: BsBrush }] : []),
              { id: 'document', label: 'Document', icon: BsFileEarmarkRichtext },
            ] as { id: string; label: string; icon: any }[]).map(t => (
              <button key={t.id} onClick={() => setContentTab(t.id as ContentTab)}
                className={`h-8 flex items-center gap-1.5 px-3 text-[11px] border-b-2 transition-colors ${contentTab === t.id ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/35 hover:text-white/65'}`}>
                <t.icon size={11} /> {t.label}
              </button>
            ))}
            {selectedPath && contentTab === 'code' && (
              <div className="ml-auto flex items-center gap-1 pr-2">
                <span className="text-[9px] text-white/20 font-mono truncate max-w-xs">{selectedPath}</span>
              </div>
            )}
          </div>

          {/* ── CODE ── */}
          {contentTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {codeSearch && (
                <div className="h-7 flex items-center gap-2 px-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <BsSearch size={9} className="text-white/30" />
                  <input value={codeSearch} onChange={e => setCodeSearch(e.target.value)} placeholder="Search in file..." autoFocus
                    className="flex-1 bg-transparent text-[11px] outline-none text-white/70"
                    onKeyDown={e => e.key === 'Escape' && setCodeSearch('')} />
                  <span className="text-[9px] text-white/30">{searchMatches.length} match{searchMatches.length !== 1 ? 'es' : ''}</span>
                  <button onClick={() => setCodeSearch('')} className="text-white/25 hover:text-white/70"><HiX size={11} /></button>
                </div>
              )}
              {!codeSearch && (
                <div className="h-7 flex items-center justify-end px-3 border-b shrink-0 gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setCodeSearch(' ')} className="text-white/20 hover:text-white/60 transition-colors" title="Search"><BsSearch size={10} /></button>
                </div>
              )}
              {codeSearch && searchMatches.length > 0 && (
                <div className="absolute top-14 right-3 z-10 rounded-lg shadow-xl border overflow-auto max-h-48 w-64" style={{ background: '#1a1e28', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {searchMatches.map((m, i) => (
                    <div key={i} className="text-[9px] px-3 py-1 hover:bg-white/5 cursor-pointer truncate flex gap-2">
                      <span className="text-indigo-400 shrink-0">L{m.line}</span>
                      <span className="text-white/50 truncate">{m.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                {selectedPath ? (
                  <MonacoEditor value={code} language={getLang(selectedPath)} theme="vs-dark" onChange={handleCodeChange}
                    options={{ fontSize: 12.5, minimap: { enabled: files.length > 4 }, lineNumbers: 'on', padding: { top: 10, bottom: 10 }, scrollBeyondLastLine: false, wordWrap: 'on', smoothScrolling: true }} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
                    <BsFileCode size={36} />
                    <div className="text-center"><p className="text-sm font-medium mb-1">No file open</p><p className="text-[11px]">Select a file or ask AI to create one</p></div>
                    <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 hover:border-indigo-400/50 hover:text-indigo-300 transition-colors">+ New File</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FILES ── */}
          {contentTab === 'files' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">All Files</span>
                <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="text-[10px] px-2 py-1 rounded-lg border border-white/10 hover:border-indigo-400/50 text-white/40 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  <BsPlus size={12} /> New File
                </button>
              </div>
              {getAllFilePaths(files).length === 0 ? (
                <div className="flex flex-col items-center py-20 text-white/15 gap-3">
                  <HiFolder size={48} />
                  <p className="text-sm">No files yet</p>
                  <p className="text-[11px] text-center max-w-xs">Ask the AI to create files, or use the terminal tab to run commands.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {getAllFilePaths(files).map(path => {
                    const node = findNodeByPath(files, path);
                    const lines = (node?.content || '').split('\n').length;
                    return (
                      <div key={path} onClick={() => { setSelectedPath(path); setContentTab('code'); }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${selectedPath === path ? 'bg-indigo-600/20 border border-indigo-500/20' : 'hover:bg-white/4 border border-transparent'}`}>
                        <BsFileEarmarkCode size={12} className="text-indigo-400 shrink-0" />
                        <span className={`flex-1 text-[12px] font-mono ${selectedPath === path ? 'text-indigo-300' : 'text-white/55'}`}>{path}</span>
                        <span className="text-[9px] text-white/20">{lines}L</span>
                        <button onClick={e => { e.stopPropagation(); handleDeleteFile(path); }} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all">
                          <BsTrash3 size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── DESIGN ── */}
          {contentTab === 'design' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.15)' }}>
                <BsBrush size={26} className="text-pink-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1.5">Design Canvas</h3>
                <p className="text-sm text-white/35 max-w-xs leading-relaxed">Import a Figma design or describe your UI. The AI coding agent will write the component files directly into your workspace.</p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 transition-colors" onClick={() => {
                  const url = prompt('Paste your Figma file URL:');
                  if (url) {
                    const content = `# Figma Design Import\n\nSource: ${url}\nImported: ${new Date().toISOString()}\n\nDescribe your design requirements and ask the AI to convert it to code.\n`;
                    setFiles(prev => insertOrUpdateFile(prev, 'figma-design.md', content));
                    apiWriteFile(id, 'figma-design.md', content);
                    setSelectedPath('figma-design.md'); setContentTab('code');
                  }
                }}>
                  <BsGlobe size={12} /> Import Figma URL
                </button>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] text-white font-medium" style={{ background: '#6366f1' }} onClick={() => setPanelTab('chat')}>
                  <BsRobot size={12} /> Ask AI to design
                </button>
              </div>
            </div>
          )}

          {/* ── DOCUMENT ── */}
          {contentTab === 'document' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-8 flex items-center justify-between px-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="text-[10px] text-white/30">Markdown Document</span>
                <div className="flex items-center gap-2">
                  {loStatus?.available && (
                    <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                      <div className="w-1 h-1 bg-emerald-400 rounded-full" /> LibreOffice export ready
                    </span>
                  )}
                  <button
                    className="text-[9px] px-2 py-0.5 rounded border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
                    onClick={async () => {
                      if (!loStatus?.available) { alert('LibreOffice not available'); return; }
                      const b64 = btoa(unescape(encodeURIComponent(docContent)));
                      const res = await fetch(`/api/workspace/${id}/libreoffice`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: 'document.md', content: b64, format: 'html' }),
                      });
                      const data = await res.json();
                      if (data.content) {
                        const blob = new Blob([data.content], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                      }
                    }}>
                    Export HTML
                  </button>
                  <span className="text-[9px] text-white/20">{docContent.split('\n').length} lines</span>
                </div>
              </div>
              <textarea
                value={docContent} onChange={e => setDocContent(e.target.value)}
                placeholder={`Start writing your document...\n\n# Heading\n**Bold** and *italic*\n- Bullet points\n\nAsk the AI in the chat panel to help draft, edit, or expand your document.\nLibreOffice can convert it to .docx, .pdf, or .html via the Terminal tab.`}
                className="flex-1 p-5 bg-transparent text-[13px] text-white/75 resize-none outline-none leading-relaxed"
                style={{ fontFamily: 'ui-monospace, monospace' }}
              />
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="flex flex-col shrink-0 border-l" style={{ width: 310, borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="h-8 flex items-center border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            {(['chat', 'activity', 'terminal'] as PanelTab[]).map(tab => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className={`h-8 flex-1 text-[10px] capitalize font-medium border-b-2 transition-colors relative ${panelTab === tab ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/30 hover:text-white/60'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'activity' && activityLog.length > 0 && (<span className="absolute top-1.5 right-2 w-1 h-1 rounded-full bg-indigo-400" />)}
              </button>
            ))}
          </div>

          {/* CHAT */}
          {panelTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-2 space-y-2">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] shrink-0 font-bold mt-0.5 ${msg.role === 'assistant' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-600/50 text-slate-300'}`}>
                      {msg.role === 'assistant' ? <BsRobot size={9} /> : 'U'}
                    </div>
                    <div className={`flex-1 rounded-xl text-[11px] leading-relaxed overflow-hidden ${msg.role === 'assistant' ? 'bg-white/5 text-white/80' : 'bg-indigo-600 text-white'}`} style={{ maxWidth: '88%' }}>
                      <div className="px-2.5 py-2 whitespace-pre-wrap break-words">{msg.content}</div>
                      {msg.fileOps && msg.fileOps.length > 0 && (
                        <div className="px-2.5 pb-2 flex flex-wrap gap-1">
                          {msg.fileOps.map((op, j) => (
                            <button key={j}
                              onClick={() => { if (op.type !== 'delete') { setSelectedPath(op.path); setContentTab('code'); } }}
                              className="text-[9px] px-1.5 py-0.5 rounded font-mono truncate max-w-[140px] transition-colors"
                              style={{
                                background: op.type === 'delete' ? 'rgba(248,113,113,0.15)' : op.type === 'create' ? 'rgba(52,211,153,0.15)' : 'rgba(96,165,250,0.15)',
                                color: op.type === 'delete' ? '#f87171' : op.type === 'create' ? '#34d399' : '#60a5fa',
                                border: `1px solid ${op.type === 'delete' ? 'rgba(248,113,113,0.2)' : op.type === 'create' ? 'rgba(52,211,153,0.2)' : 'rgba(96,165,250,0.2)'}`,
                              }}>
                              {op.type === 'delete' ? '🗑 ' : op.type === 'create' ? '+ ' : '~ '}{op.path.split('/').pop()}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center shrink-0"><BsRobot size={9} className="text-indigo-300" /></div>
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5">
                      {[0, 1, 2].map(j => <div key={j} className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${j * 0.12}s` }} />)}
                      <span className="text-[10px] text-white/30 ml-1">{agentPhase === 'coding' ? 'Writing code...' : 'Thinking...'}</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-2 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex gap-1.5">
                  <textarea value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Ask AI to create, edit, run commands..."
                    rows={2}
                    className="flex-1 px-2.5 py-1.5 text-[11px] rounded-lg outline-none focus:border-indigo-400 border resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', lineHeight: '1.5' }} />
                  <button onClick={sendMessage} disabled={aiLoading || !input.trim()}
                    className="w-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 self-end"
                    style={{ background: '#6366f1', height: 32 }}>
                    <HiLightningBolt size={13} />
                  </button>
                </div>
                <p className="text-[8.5px] text-white/15 mt-1 px-0.5">Shift+Enter for newline · Enter to send</p>
              </div>
            </div>
          )}

          {/* ACTIVITY */}
          {panelTab === 'activity' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-2 space-y-0.5">
                {activityLog.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-white/15 gap-3">
                    <BsLightningChargeFill size={28} className="text-white/10" />
                    <p className="text-[11px] text-center">Activity appears here when the AI agents are working.</p>
                  </div>
                ) : (
                  activityLog.map(entry => {
                    const Icon = ACTIVITY_ICONS[entry.kind] || BsRobot;
                    const color = ACTIVITY_COLORS[entry.kind] || '#94a3b8';
                    return (
                      <div key={entry.id}
                        className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/3 transition-colors cursor-default"
                        onClick={() => entry.path && entry.kind !== 'file_deleted' && (setSelectedPath(entry.path), setContentTab('code'))}>
                        <div className="mt-0.5 shrink-0"><Icon size={10} style={{ color }} className={entry.kind === 'thinking' ? 'animate-spin' : ''} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10.5px] text-white/70 leading-snug break-words">{entry.message}</p>
                          {entry.path && <p className="text-[9px] font-mono mt-0.5 truncate" style={{ color: `${color}99` }}>{entry.path}</p>}
                          <p className="text-[8.5px] text-white/20 mt-0.5">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={activityEndRef} />
              </div>
              {activityLog.length > 0 && (
                <div className="p-2 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <button onClick={() => setActivityLog([])} className="w-full text-[9px] text-white/20 hover:text-white/50 transition-colors py-0.5">Clear activity log</button>
                </div>
              )}
            </div>
          )}

          {/* TERMINAL — REAL LINUX */}
          {panelTab === 'terminal' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-1 border-b shrink-0 flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)' }}>
                <BsTerminalFill size={9} className="text-green-400" />
                <span className="text-[9px] text-white/30 font-mono">Real Linux · /tmp/nexios-workspaces/{id}/</span>
              </div>
              <div className="flex-1 overflow-auto p-2 font-mono text-[10.5px] space-y-0.5 leading-relaxed" style={{ background: 'rgba(0,0,0,0.4)' }}>
                {termLines.map((line, i) => (
                  <div key={i} className={line.type === 'error' ? 'text-red-400' : line.type === 'input' ? 'text-green-400' : line.type === 'success' ? 'text-emerald-400' : 'text-white/55'}>
                    {line.text}
                  </div>
                ))}
                <div ref={termEndRef} />
              </div>
              <div className="p-2 border-t shrink-0 flex items-center gap-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
                <span className="text-green-400 text-[11px] font-mono shrink-0">$</span>
                <input value={termInput} onChange={e => setTermInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') runTerminalCommand(); }}
                  className="flex-1 bg-transparent text-[11px] outline-none font-mono text-white/75 placeholder-white/20"
                  placeholder="Run any shell command..." />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Selector */}
      {showModelSelector && (
        <div className="fixed top-10 right-3 z-50 rounded-xl overflow-hidden border shadow-2xl" style={{ background: '#161a22', borderColor: 'rgba(255,255,255,0.1)', width: 230, maxHeight: 320, overflowY: 'auto' }}>
          <div className="p-2.5 border-b border-white/10 flex items-center justify-between sticky top-0" style={{ background: '#161a22' }}>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Select Model</span>
            <button onClick={() => setShowModelSelector(false)} className="text-white/30 hover:text-white/70"><HiX size={12} /></button>
          </div>
          {AI_PROVIDERS.map(p => (
            <div key={p.id}>
              <div className="px-3 py-1 text-[9px] text-white/25 uppercase tracking-widest" style={{ background: 'rgba(0,0,0,0.2)' }}>{p.name}</div>
              {p.models.map(m => (
                <button key={m.id} onClick={() => { setActiveProvider(p.id); setActiveModel(m.id); setShowModelSelector(false); }}
                  className={`w-full text-left px-3 py-2 hover:bg-white/5 transition-colors ${activeProvider.id === p.id && activeModel.id === m.id ? 'bg-indigo-600/15' : ''}`}>
                  <div className="text-[11px] text-white/80">{m.name}</div>
                  <div className="text-[9px] text-white/30">{m.description}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
