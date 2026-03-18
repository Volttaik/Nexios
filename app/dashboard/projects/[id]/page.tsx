'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  BsGlobe,
  BsFileCode, BsFolder, BsFolder2Open, BsPlus, BsTrash3,
  BsChevronDown, BsChevronRight,
  BsFileEarmarkCode, BsFileEarmark, BsFileEarmarkText, BsSearch,
  BsDownload, BsStars, BsPlayCircle, BsClipboard, BsFolderPlus, BsUpload
} from 'react-icons/bs';
import {
  HiArrowLeft,
  HiFolder, HiMenu, HiOutlineFolder, HiPaperAirplane, HiX, HiGlobeAlt
} from 'react-icons/hi';

import { useAI } from '@/app/context/AIContext';
import { callAI } from '@/app/lib/ai';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const DocumentEditor = dynamic(() => import('./DocumentEditor'), { ssr: false });
const DesignEditor = dynamic(() => import('./DesignEditor'), { ssr: false });

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
  ops?: FileOp[];
}

interface FileOp {
  op: 'create' | 'edit' | 'delete' | 'mkdir';
  path: string;
  content?: string;
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

// ─────────────────────────── Constants ───────────────────────────
const EXT_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rs: 'rust', go: 'go', html: 'html', css: 'css',
  json: 'json', md: 'markdown', sh: 'shell', sql: 'sql', yaml: 'yaml', yml: 'yaml',
  toml: 'ini', env: 'plaintext', gitignore: 'plaintext', txt: 'plaintext',
};

const FILE_ICONS: Record<string, any> = {
  ts: BsFileEarmarkCode, tsx: BsFileEarmarkCode, js: BsFileEarmarkCode, jsx: BsFileEarmarkCode,
  py: BsFileEarmarkCode, json: BsFileEarmarkCode, md: BsFileEarmarkText, txt: BsFileEarmarkText,
  default: BsFileEarmark
};

// ─────────────────────────── Helpers ───────────────────────────
function getLang(name: string) { return EXT_LANG[name.split('.').pop() || ''] || 'plaintext'; }
function getFileIcon(name: string) { const ext = name.split('.').pop() || ''; return FILE_ICONS[ext] || FILE_ICONS.default; }
function generateId() { return Math.random().toString(36).substring(2, 9); }
function createFileNode(name: string, content = '', parentPath = ''): FileNode {
  return { id: generateId(), name, type: 'file', content, language: getLang(name), path: parentPath ? `${parentPath}/${name}` : name };
}
function createFolderNode(name: string, parentPath = ''): FileNode {
  return { id: generateId(), name, type: 'folder', children: [], path: parentPath ? `${parentPath}/${name}` : name };
}
function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  const parts = path.split('/');
  let current: FileNode | undefined = nodes.find(n => n.name === parts[0]);
  for (let i = 1; i < parts.length; i++) {
    if (!current || current.type !== 'folder' || !current.children) return null;
    current = current.children.find(c => c.name === parts[i]);
  }
  return current || null;
}
function updateNodeByPath(nodes: FileNode[], path: string, updater: (n: FileNode) => FileNode): FileNode[] {
  const parts = path.split('/');
  return nodes.map(node => {
    if (node.name === parts[0]) {
      if (parts.length === 1) return updater(node);
      if (node.type === 'folder' && node.children) return { ...node, children: updateNodeByPath(node.children, parts.slice(1).join('/'), updater) };
    }
    return node;
  });
}
function deleteNodeByPath(nodes: FileNode[], path: string): FileNode[] {
  const parts = path.split('/');
  return nodes.filter(node => {
    if (node.name === parts[0]) {
      if (parts.length === 1) return false;
      if (node.type === 'folder' && node.children) node.children = deleteNodeByPath(node.children, parts.slice(1).join('/'));
    }
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
function getAllFileNodes(nodes: FileNode[]): { path: string; content: string }[] {
  let result: { path: string; content: string }[] = [];
  for (const node of nodes) {
    if (node.type === 'file') result.push({ path: node.path, content: node.content || '' });
    if (node.children) result = result.concat(getAllFileNodes(node.children));
  }
  return result;
}
// basePath accumulates the full prefix so every node gets its correct absolute path
function addFileByPath(nodes: FileNode[], path: string, content: string, basePath = ''): FileNode[] {
  const parts = path.split('/');
  const fullPath = basePath ? `${basePath}/${parts[0]}` : parts[0];
  if (parts.length === 1) {
    const exists = nodes.findIndex(n => n.name === parts[0]);
    const newNode: FileNode = { id: generateId(), name: parts[0], type: 'file', content, language: getLang(parts[0]), path: fullPath };
    if (exists >= 0) { const r = [...nodes]; r[exists] = { ...r[exists], content, path: fullPath }; return r; }
    return [...nodes, newNode];
  }
  const folderName = parts[0];
  const rest = parts.slice(1).join('/');
  const folderIdx = nodes.findIndex(n => n.name === folderName && n.type === 'folder');
  if (folderIdx >= 0) {
    const updated = [...nodes];
    updated[folderIdx] = { ...updated[folderIdx], children: addFileByPath(updated[folderIdx].children || [], rest, content, fullPath) };
    return updated;
  }
  const newFolder: FileNode = { id: generateId(), name: folderName, type: 'folder', children: [], path: fullPath };
  newFolder.children = addFileByPath([], rest, content, fullPath);
  return [...nodes, newFolder];
}

// ─────────────────────────── AI Ops Parser ───────────────────────────
function parseAIResponse(raw: string): { text: string; ops: FileOp[] } {
  const opsMatch = raw.match(/<nexios_ops>([\s\S]*?)<\/nexios_ops>/i);
  const text = raw.replace(/<nexios_ops>[\s\S]*?<\/nexios_ops>/gi, '').trim();
  let ops: FileOp[] = [];
  if (opsMatch) {
    try {
      const parsed = JSON.parse(opsMatch[1].trim());
      if (Array.isArray(parsed)) ops = parsed;
    } catch { /* ignore malformed */ }
  }
  return { text, ops };
}

// ─────────────────────────── Thinking Animation ───────────────────────────
const THINKING_STEPS = [
  'Reading your request…',
  'Analyzing project context…',
  'Planning file structure…',
  'Writing code…',
  'Applying changes…',
];

function ThinkingAnimation() {
  const [stepIdx, setStepIdx] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setStepIdx(i => (i + 1) % THINKING_STEPS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)' }}>
        <BsStars size={11} className="text-indigo-400" style={{ animation: 'spin 3s linear infinite' }} />
      </div>
      <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-2xl rounded-tl-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-1.5">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="thinking-bar" style={{ animationDelay: `${i * 110}ms` }} />
          ))}
        </div>
        <span className="text-[10px] text-white/35 transition-all duration-500" style={{ minWidth: 120 }}>
          {THINKING_STEPS[stepIdx]}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────── File Tree ───────────────────────────
function FileTree({ nodes, onSelect, selectedPath, onDelete, onRename, onAdd, expanded, setExpanded }: {
  nodes: FileNode[]; onSelect: (path: string) => void; selectedPath: string;
  onDelete: (path: string) => void; onRename: (path: string, newName: string) => void;
  onAdd: (parentPath: string, type: 'file' | 'folder') => void;
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
        <div key={node.id} className="flex items-center px-2 py-0.5" style={{ paddingLeft: depth * 12 + 8 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onBlur={() => { if (newName.trim()) onRename(node.path, newName.trim()); setRenaming(null); }}
            onKeyDown={e => e.key === 'Enter' && newName.trim() && (onRename(node.path, newName.trim()), setRenaming(null))}
            className="w-full text-[11px] bg-black/40 border border-white/20 rounded px-1.5 py-0.5 outline-none focus:border-indigo-400 text-white" autoFocus />
        </div>
      );
    }
    return (
      <div key={node.id}>
        <div className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer group ${isSel ? 'bg-indigo-600/20' : 'hover:bg-white/5'}`}
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => isFolder ? setExpanded(p => ({ ...p, [node.path]: !p[node.path] })) : onSelect(node.path)}
          onDoubleClick={() => !isFolder && (setRenaming(node.path), setNewName(node.name))}>
          {isFolder && <button className="w-3 text-white/40">{isExp ? <BsChevronDown size={8} /> : <BsChevronRight size={8} />}</button>}
          <span className="text-white/60">
            {isFolder ? (isExp ? <BsFolder2Open size={12} className="text-yellow-400" /> : <BsFolder size={12} className="text-yellow-400" />) : <FileIcon size={12} className="text-indigo-400" />}
          </span>
          <span className={`flex-1 text-[11px] truncate ${isSel ? 'text-indigo-300' : 'text-white/70'}`}>{node.name}</span>
          {!isFolder && <button onClick={e => { e.stopPropagation(); onDelete(node.path); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-colors"><BsTrash3 size={10} /></button>}
          {isFolder && <button onClick={e => { e.stopPropagation(); onAdd(node.path, 'file'); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/80 transition-colors"><BsPlus size={12} /></button>}
        </div>
        {isFolder && isExp && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };
  return <div className="space-y-0">{nodes.map(node => renderNode(node, 0))}</div>;
}

// ─────────────────────────── Message Renderer ───────────────────────────
function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1 text-[12px] leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('```')) return null;
        const parts = line.split(/(`[^`]+`)/g);
        return (
          <p key={i} className="whitespace-pre-wrap break-words">
            {parts.map((part, j) => {
              if (part.startsWith('`') && part.endsWith('`'))
                return <code key={j} className="px-1 py-0.5 rounded text-[11px] font-mono" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>{part.slice(1, -1)}</code>;
              const bold = part.split(/(\*\*[^*]+\*\*)/g);
              return bold.map((b, k) => b.startsWith('**') && b.endsWith('**')
                ? <strong key={k} className="text-white font-semibold">{b.slice(2, -2)}</strong>
                : <span key={k}>{b}</span>);
            })}
          </p>
        );
      })}
    </div>
  );
}

function OpPill({ op }: { op: FileOp }) {
  const colors: Record<string, string> = { create: '#34d399', edit: '#60a5fa', delete: '#f87171', mkdir: '#fbbf24' };
  const labels: Record<string, string> = { create: 'Created', edit: 'Edited', delete: 'Deleted', mkdir: 'Mkdir' };
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors[op.op] }} />
      <span className="text-[10px]" style={{ color: colors[op.op] }}>{labels[op.op] || op.op}</span>
      <span className="text-[10px] text-white/40 font-mono">{op.path}</span>
    </div>
  );
}

// ─────────────────────────── Main Component ───────────────────────────
type PanelTab = 'chat' | 'terminal';
type ContentTab = 'code' | 'files' | 'design' | 'document';
type CreateTab = 'new' | 'import';

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { activeProvider, activeModel, getApiKey, setActiveModel } = useAI();

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
  const [createTab, setCreateTab] = useState<CreateTab>('new');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [runOutput, setRunOutput] = useState<{ html: string; title: string } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const importFolderRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hello! I\'m Nexios AI. I can create files, write code, run your project, and help you build anything. What would you like to make?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [fileOpsInProgress, setFileOpsInProgress] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [termLines, setTermLines] = useState<TerminalLine[]>([
    { type: 'output', text: '── Nexios Workspace Terminal ──────────────────' },
    { type: 'success', text: '✓ Sandbox ready on NixOS Linux (x86_64)' },
    { type: 'output', text: '  Runtimes: node 20, python3 3.11, pip3, npm, npx' },
    { type: 'output', text: '  Type "help" for commands or "git clone <url>"' },
    { type: 'output', text: '' },
  ]);
  const [termInput, setTermInput] = useState('');
  const [termLoading, setTermLoading] = useState(false);
  const [cloneImportUrl, setCloneImportUrl] = useState('');
  const [showCloneInput, setShowCloneInput] = useState(false);
  const [cloneImporting, setCloneImporting] = useState(false);
  const termEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nexios_projects');
    if (saved) {
      const projects: Project[] = JSON.parse(saved);
      const p = projects.find(p => p.id === id);
      if (p) {
        setProject(p);
        if (p.type === 'document') setContentTab('document');
        else if (p.type === 'design') setContentTab('design');
        else setContentTab('code');
        const savedFiles = localStorage.getItem(`nexios_files_${id}`);
        if (savedFiles) {
          const fileData = JSON.parse(savedFiles);
          setFiles(fileData);
          const paths = getAllFilePaths(fileData);
          if (paths.length) setSelectedPath(paths[0]);
        }
        const savedDoc = localStorage.getItem(`nexios_doc_${id}`);
        if (savedDoc) setDocContent(savedDoc);
      }
    }
    const savedChat = localStorage.getItem(`nexios_chat_${id}`);
    if (savedChat) { try { setMessages(JSON.parse(savedChat)); } catch { /* ignore */ } }
    const savedAuto = localStorage.getItem('nexios_autonomous_mode');
    if (savedAuto) setAutonomousMode(savedAuto === 'true');

    // ── Mark this workspace as active ──
    localStorage.setItem('nexios_active_workspace', id);
  }, [id]);

  // Clear active workspace when explicitly going back
  const handleBack = () => {
    localStorage.removeItem('nexios_active_workspace');
    router.push('/dashboard/projects');
  };

  useEffect(() => { if (files.length) localStorage.setItem(`nexios_files_${id}`, JSON.stringify(files)); }, [files, id]);

  // ── Sync real file count back to the projects list ──
  useEffect(() => {
    if (!id) return;
    const saved = localStorage.getItem('nexios_projects');
    if (!saved) return;
    try {
      const list = JSON.parse(saved);
      const realCount = getAllFilePaths(files).length;
      const updated = list.map((p: { id: string; files: number; lastModified: string }) =>
        p.id === id ? { ...p, files: realCount, lastModified: 'just now' } : p
      );
      localStorage.setItem('nexios_projects', JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [files, id]);

  useEffect(() => { localStorage.setItem(`nexios_chat_${id}`, JSON.stringify(messages)); }, [messages, id]);
  useEffect(() => { if (docContent) localStorage.setItem(`nexios_doc_${id}`, docContent); }, [docContent, id]);
  useEffect(() => {
    if (selectedPath) {
      const node = findNodeByPath(files, selectedPath);
      if (node?.type === 'file') setCode(node.content || '');
    }
  }, [selectedPath, files]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, aiLoading]);
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [termLines]);

  // ── Apply file ops ──
  const applyOps = useCallback((ops: FileOp[], filesSnapshot: FileNode[]) => {
    let current = [...filesSnapshot];
    const appliedOps: FileOp[] = [];
    for (const op of ops) {
      try {
        if (op.op === 'create' || op.op === 'edit') {
          current = addFileByPath(current, op.path, op.content || '');
          appliedOps.push(op);
          setTermLines(p => [...p, { type: 'success', text: `✓ ${op.op === 'create' ? 'Created' : 'Updated'}: ${op.path}` }]);
        } else if (op.op === 'delete') {
          current = deleteNodeByPath(current, op.path);
          appliedOps.push(op);
          setTermLines(p => [...p, { type: 'success', text: `✓ Deleted: ${op.path}` }]);
        } else if (op.op === 'mkdir') {
          const parts = op.path.split('/');
          const folderNode = createFolderNode(parts[parts.length - 1], parts.slice(0, -1).join('/') || '');
          current = [...current, folderNode];
          appliedOps.push(op);
          setTermLines(p => [...p, { type: 'success', text: `✓ Folder: ${op.path}` }]);
        }
      } catch { /* ignore */ }
    }
    setFiles(current);
    const firstFileOp = appliedOps.find(o => o.op === 'create' || o.op === 'edit');
    if (firstFileOp) { setSelectedPath(firstFileOp.path); setContentTab('code'); }
    return { current, appliedOps };
  }, []);

  // ── File handlers ──
  const handleCodeChange = (value: string | undefined) => {
    if (!value || !selectedPath) return;
    setCode(value);
    setFiles(prev => updateNodeByPath(prev, selectedPath, node => ({ ...node, content: value })));
  };

  const handleDeleteFile = (path: string) => {
    setFiles(prev => deleteNodeByPath(prev, path));
    if (path === selectedPath) {
      const paths = getAllFilePaths(files);
      setSelectedPath(paths.find(p => p !== path) || '');
    }
  };

  const handleRename = (path: string, newName: string) => {
    setFiles(prev => updateNodeByPath(prev, path, node => ({
      ...node, name: newName,
      path: node.path.replace(new RegExp(`(^|/)${node.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), `$1${newName}`)
    })));
  };

  const handleCreateItem = () => {
    if (!creatingIn || !newFileName.trim()) return;
    const newNode = creatingIn.type === 'file'
      ? createFileNode(newFileName.trim(), '', creatingIn.path)
      : createFolderNode(newFileName.trim(), creatingIn.path);
    if (creatingIn.path) {
      setFiles(prev => updateNodeByPath(prev, creatingIn.path, node => {
        if (node.type === 'folder') return { ...node, children: [...(node.children || []), newNode] };
        return node;
      }));
    } else {
      setFiles(prev => [...prev, newNode]);
    }
    setExpandedFolders(p => ({ ...p, [creatingIn.path]: true }));
    if (creatingIn.type === 'file') { setSelectedPath(newNode.path); setContentTab('code'); }
    setCreatingIn(null); setNewFileName('');
  };

  // ── Import file from computer ──
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const content = ev.target?.result as string || '';
        const parentPath = creatingIn?.path || '';
        const newNode = createFileNode(file.name, content, parentPath);
        if (parentPath) {
          setFiles(prev => updateNodeByPath(prev, parentPath, node => {
            if (node.type === 'folder') return { ...node, children: [...(node.children || []), newNode] };
            return node;
          }));
        } else {
          setFiles(prev => [...prev, newNode]);
        }
        setSelectedPath(newNode.path);
        setContentTab('code');
        setTermLines(p => [...p, { type: 'success', text: `✓ Imported: ${file.name}` }]);
      };
      reader.readAsText(file);
    });
    setCreatingIn(null); setNewFileName('');
    e.target.value = '';
  };

  // ── Import folder ──
  const handleImportFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    let newFiles = [...files];
    const promises = Array.from(fileList).map(file => {
      return new Promise<void>(resolve => {
        const reader = new FileReader();
        reader.onload = ev => {
          const content = ev.target?.result as string || '';
          const relativePath = (file as any).webkitRelativePath || file.name;
          newFiles = addFileByPath(newFiles, relativePath, content);
          setTermLines(p => [...p, { type: 'success', text: `✓ Imported: ${relativePath}` }]);
          resolve();
        };
        reader.readAsText(file);
      });
    });
    Promise.all(promises).then(() => {
      setFiles(newFiles);
      const paths = getAllFilePaths(newFiles);
      if (paths.length) setSelectedPath(paths[0]);
    });
    e.target.value = '';
  };

  // ── Detect project type ──
  const detectProjectType = (fileList: FileNode[]): 'html' | 'nodejs' | 'python' | 'unknown' => {
    const allNodes = getAllFileNodes(fileList);
    const paths = allNodes.map(n => n.path.toLowerCase());
    const hasPkg = paths.some(p => p === 'package.json' || p.endsWith('/package.json'));
    const hasPy = paths.some(p => p.endsWith('.py'));
    const hasReqs = paths.some(p => p === 'requirements.txt' || p.endsWith('/requirements.txt'));
    const hasHtml = paths.some(p => p.endsWith('.html') || p.endsWith('.htm'));
    if (hasPkg) return 'nodejs';
    if (hasPy || hasReqs) return 'python';
    if (hasHtml) return 'html';
    return 'unknown';
  };

  // ── GitHub clone helper (used by both terminal and import button) ──
  const cloneRepoIntoWorkspace = async (repoUrl: string, existingFiles: FileNode[]) => {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/\s.]+)/);
    if (!match) throw new Error('Only GitHub URLs are supported (https://github.com/owner/repo)');
    const [, owner, repo] = match;
    setTermLines(p => [...p, { type: 'output', text: `Cloning into '${repo}'…` }]);
    setTermLines(p => [...p, { type: 'output', text: 'remote: Enumerating objects…' }]);
    const treeResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
    if (!treeResp.ok) {
      const errData = await treeResp.json().catch(() => ({}));
      throw new Error(errData.message || 'repository not found or is private');
    }
    const treeData = await treeResp.json();
    const fileItems = (treeData.tree as { type: string; path: string; size?: number }[]).filter(item => item.type === 'blob' && (item.size || 0) < 500000);
    setTermLines(p => [...p, { type: 'output', text: `remote: Total ${fileItems.length} files, fetching…` }]);
    let fetched = 0;
    let newFiles = [...existingFiles];
    const BATCH = 6;
    for (let i = 0; i < fileItems.length; i += BATCH) {
      const batch = fileItems.slice(i, i + BATCH);
      await Promise.all(batch.map(async (item) => {
        try {
          const contentResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`);
          if (!contentResp.ok) return;
          const contentData = await contentResp.json();
          if (contentData.content) {
            const decoded = atob(contentData.content.replace(/\n/g, ''));
            newFiles = addFileByPath(newFiles, item.path, decoded);
            fetched++;
          }
        } catch { /* skip binary/large files */ }
      }));
      setTermLines(p => [...p, { type: 'output', text: `  ${Math.min(i + BATCH, fileItems.length)}/${fileItems.length} files…` }]);
    }
    setFiles(newFiles);
    const paths = getAllFilePaths(newFiles);
    if (paths.length) setSelectedPath(paths[0]);
    setTermLines(p => [...p, { type: 'success', text: `✓ Cloned ${repo}: ${fetched} files imported` }]);
    return { repo, fetched, newFiles };
  };

  // ── Copy file path ──
  const copyPath = () => {
    if (selectedPath) {
      navigator.clipboard.writeText(selectedPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // ── Run file (language-aware) ──
  const runFile = async () => {
    const ext = selectedPath.split('.').pop()?.toLowerCase() || '';
    const node = findNodeByPath(files, selectedPath);
    if (!node?.content) return;

    if (ext === 'html' || ext === 'htm') {
      let html = node.content;
      const allNodes = getAllFileNodes(files);
      allNodes.filter(f => f.path.endsWith('.css')).forEach(css => {
        html = html.replace(/<link[^>]*href=["']([^"']*\.css)["'][^>]*>/gi, (match, href) => {
          if (css.path.endsWith(href) || href === css.path) return `<style>${css.content}</style>`;
          return match;
        });
      });
      allNodes.filter(f => f.path.endsWith('.js')).forEach(js => {
        html = html.replace(/<script[^>]*src=["']([^"']*)["'][^>]*><\/script>/gi, (match, src) => {
          if (js.path.endsWith(src) || src === js.path) return `<script>${js.content}</script>`;
          return match;
        });
      });
      setRunOutput({ html, title: selectedPath });
      return;
    }

    if (ext === 'py') {
      setPanelTab('terminal');
      setTermLoading(true);
      setTermLines(p => [...p, { type: 'output', text: `▶ python3 ${selectedPath}` }]);
      try {
        const resp = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `python3 ${selectedPath}`, files: getAllFileNodes(files), projectId: id }),
        });
        const data = await resp.json();
        data.output.split('\n').forEach((line: string) => setTermLines(p => [...p, { type: data.error ? 'error' : 'output', text: line }]));
        if (!data.error) setTermLines(p => [...p, { type: 'success', text: '✓ Finished' }]);
      } catch { setTermLines(p => [...p, { type: 'error', text: 'Sandbox unreachable — try again' }]); }
      setTermLoading(false);
      return;
    }

    if (ext === 'js' || ext === 'mjs') {
      setPanelTab('terminal');
      setTermLoading(true);
      setTermLines(p => [...p, { type: 'output', text: `▶ node ${selectedPath}` }]);
      try {
        const resp = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `node ${selectedPath}`, files: getAllFileNodes(files), projectId: id }),
        });
        const data = await resp.json();
        data.output.split('\n').forEach((line: string) => setTermLines(p => [...p, { type: data.error ? 'error' : 'output', text: line }]));
        if (!data.error) setTermLines(p => [...p, { type: 'success', text: '✓ Finished' }]);
      } catch { setTermLines(p => [...p, { type: 'error', text: 'Sandbox unreachable — try again' }]); }
      setTermLoading(false);
      return;
    }

    if (ext === 'ts' || ext === 'tsx') {
      setPanelTab('terminal');
      setTermLines(p => [...p,
        { type: 'output', text: `▶ Detected TypeScript: ${selectedPath}` },
        { type: 'output', text: '  Running with tsx (TypeScript executor)…' },
      ]);
      setTermLoading(true);
      try {
        const resp = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `npx tsx ${selectedPath}`, files: getAllFileNodes(files), projectId: id }),
        });
        const data = await resp.json();
        data.output.split('\n').forEach((line: string) => setTermLines(p => [...p, { type: data.error ? 'error' : 'output', text: line }]));
        if (!data.error) setTermLines(p => [...p, { type: 'success', text: '✓ Finished' }]);
      } catch { setTermLines(p => [...p, { type: 'error', text: 'Sandbox unreachable — try again' }]); }
      setTermLoading(false);
      return;
    }

    setRunOutput({
      html: `<html><head><style>body{background:#0d1117;color:#c9d1d9;font-family:monospace;padding:24px;}</style></head><body><pre>${node.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`,
      title: selectedPath,
    });
  };

  // ── Run project (language-aware) ──
  const runProject = async () => {
    const allNodes = getAllFileNodes(files);
    const type = detectProjectType(files);

    if (type === 'html') {
      const htmlFiles = allNodes.filter(f => f.path.endsWith('.html') || f.path.endsWith('.htm'));
      const indexFile = htmlFiles.find(f => f.path.includes('index')) || htmlFiles[0];
      if (!indexFile) {
        const listing = `<html><head><title>${project?.name}</title><style>body{background:#0d1117;color:#c9d1d9;font-family:system-ui;padding:24px;}.file{padding:8px 12px;border-radius:6px;border:1px solid #30363d;margin:4px 0;background:#161b22;font-family:monospace;font-size:13px;}h2{color:#fff;font-size:16px;}p{color:#8b949e;font-size:13px;}</style></head><body><h2>📁 ${project?.name}</h2><p>${allNodes.length} files — no index.html found.</p>${allNodes.map(f=>`<div class="file">${f.path}</div>`).join('')}</body></html>`;
        setRunOutput({ html: listing, title: project?.name || 'Project' });
        return;
      }
      let html = indexFile.content;
      allNodes.filter(f => f.path.endsWith('.css')).forEach(css => {
        const fn = css.path.split('/').pop();
        html = html.replace(new RegExp(`<link[^>]*href=["'][./]*${fn}["'][^>]*>`, 'gi'), `<style>${css.content}</style>`);
      });
      allNodes.filter(f => f.path.endsWith('.js') && !f.path.endsWith('.min.js')).forEach(js => {
        const fn = js.path.split('/').pop();
        html = html.replace(new RegExp(`<script[^>]*src=["'][./]*${fn}["'][^>]*></script>`, 'gi'), `<script>${js.content}</script>`);
      });
      setRunOutput({ html, title: project?.name || 'Project' });
      return;
    }

    if (type === 'nodejs') {
      setPanelTab('terminal');
      const pkgNode = allNodes.find(n => n.path === 'package.json' || n.path.endsWith('/package.json'));
      let runCmd = 'node index.js';
      if (pkgNode?.content) {
        try {
          const pkg = JSON.parse(pkgNode.content);
          if (pkg.scripts?.dev) runCmd = 'npm run dev';
          else if (pkg.scripts?.start) runCmd = 'npm start';
          else if (pkg.main) runCmd = `node ${pkg.main}`;
        } catch { /* ignore */ }
      }
      setTermLines(p => [...p,
        { type: 'output', text: '▶ Node.js project detected' },
        { type: 'output', text: '  Step 1/2 — Installing dependencies…' },
      ]);
      setTermLoading(true);
      try {
        const installResp = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'npm install', files: allNodes, projectId: id }),
        });
        const installData = await installResp.json();
        installData.output.split('\n').filter(Boolean).slice(0, 20).forEach((line: string) => setTermLines(p => [...p, { type: 'output', text: `  ${line}` }]));
        setTermLines(p => [...p, { type: 'success', text: '✓ npm install complete' }]);

        setTermLines(p => [...p, { type: 'output', text: `  Step 2/2 — Starting: ${runCmd}…` }]);
        const runResp = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: runCmd, files: allNodes, projectId: id }),
        });
        const runData = await runResp.json();
        runData.output.split('\n').filter(Boolean).forEach((line: string) => setTermLines(p => [...p, { type: 'output', text: `  ${line}` }]));
        setTermLines(p => [...p, { type: 'success', text: `✓ Project running (${runCmd})` }]);
      } catch { setTermLines(p => [...p, { type: 'error', text: 'Sandbox unreachable — try running commands manually' }]); }
      setTermLoading(false);
      return;
    }

    if (type === 'python') {
      setPanelTab('terminal');
      const entryPoints = ['main.py', 'app.py', 'run.py', 'server.py', 'index.py'];
      const entryNode = allNodes.find(n => entryPoints.includes(n.path.split('/').pop() || ''));
      const entryFile = entryNode?.path || allNodes.find(n => n.path.endsWith('.py'))?.path || 'main.py';
      setTermLines(p => [...p,
        { type: 'output', text: '▶ Python project detected' },
      ]);
      setTermLoading(true);
      const reqNode = allNodes.find(n => n.path === 'requirements.txt' || n.path.endsWith('/requirements.txt'));
      if (reqNode) {
        setTermLines(p => [...p, { type: 'output', text: '  Installing requirements.txt…' }]);
        try {
          const pipResp = await fetch('/api/terminal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'pip3 install -r requirements.txt', files: allNodes, projectId: id }),
          });
          const pipData = await pipResp.json();
          pipData.output.split('\n').filter(Boolean).slice(0, 10).forEach((line: string) => setTermLines(p => [...p, { type: 'output', text: `  ${line}` }]));
          setTermLines(p => [...p, { type: 'success', text: '✓ pip install complete' }]);
        } catch { /* ignore */ }
      }
      setTermLines(p => [...p, { type: 'output', text: `  Running: python3 ${entryFile}…` }]);
      try {
        const runResp = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `python3 ${entryFile}`, files: allNodes, projectId: id }),
        });
        const runData = await runResp.json();
        runData.output.split('\n').filter(Boolean).forEach((line: string) => setTermLines(p => [...p, { type: runData.error ? 'error' : 'output', text: line }]));
        if (!runData.error) setTermLines(p => [...p, { type: 'success', text: '✓ Finished' }]);
      } catch { setTermLines(p => [...p, { type: 'error', text: 'Sandbox unreachable' }]); }
      setTermLoading(false);
      return;
    }

    const listing = `<html><head><title>${project?.name}</title><style>body{background:#0d1117;color:#c9d1d9;font-family:system-ui;padding:24px;}.file{padding:8px 12px;border-radius:6px;border:1px solid #30363d;margin:4px 0;background:#161b22;font-family:monospace;font-size:13px;}h2{color:#fff;font-size:16px;}p{color:#8b949e;font-size:13px;}</style></head><body><h2>📁 ${project?.name}</h2><p>${allNodes.length} files</p>${allNodes.map(f=>`<div class="file">${f.path}</div>`).join('')}</body></html>`;
    setRunOutput({ html: listing, title: project?.name || 'Project' });
  };

  // ── ZIP Export ──
  const exportZip = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const allNodes = getAllFileNodes(files);
      allNodes.forEach(({ path, content }) => { zip.file(path, content); });
      if (docContent) zip.file('document.md', docContent);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${project?.name || 'project'}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  // ── Terminal ──
  const runTerminalCommand = async () => {
    if (!termInput.trim() || termLoading) return;
    const cmd = termInput.trim();
    setTermLines(p => [...p, { type: 'input', text: `$ ${cmd}` }]);
    setTermInput('');
    const parts = cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const command = parts[0] ?? '';
    const args = parts.slice(1).map((a: string) => a.replace(/^['"]|['"]$/g, ''));

    // ── Real shell commands — route to sandbox API ──
    // apt/apt-get are included so the API can intercept them and show a NixOS-correct response
    const REAL_PREFIXES = ['npm', 'npx', 'node', 'python3', 'python', 'pip3', 'pip', 'yarn', 'pnpm', 'deno', 'bun', 'apt', 'apt-get'];
    if (REAL_PREFIXES.includes(command)) {
      setTermLoading(true);
      setTermLines(p => [...p, { type: 'output', text: `⚡ Sandbox executing: ${cmd}` }]);
      try {
        const allFileNodes = getAllFileNodes(files);
        const resp = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd, files: allFileNodes, projectId: id }),
        });
        const data = await resp.json();
        const lines = (data.output || '').split('\n');
        lines.forEach((line: string) => {
          if (line !== undefined) setTermLines(p => [...p, { type: data.error ? 'error' : 'output', text: line }]);
        });
        if (!data.error) setTermLines(p => [...p, { type: 'success', text: '✓ Done' }]);
      } catch {
        setTermLines(p => [...p, { type: 'error', text: 'Sandbox unreachable — check your connection' }]);
      }
      setTermLoading(false);
      return;
    }

    if (command === 'ls') {
      const paths = getAllFilePaths(files);
      if (paths.length === 0) setTermLines(p => [...p, { type: 'output', text: '(empty workspace)' }]);
      else paths.forEach(path => setTermLines(prev => [...prev, { type: 'output', text: path }]));
    } else if (command === 'cat' && args[0]) {
      const node = findNodeByPath(files, args[0]);
      if (node?.content) setTermLines(p => [...p, { type: 'output', text: node.content! }]);
      else setTermLines(p => [...p, { type: 'error', text: `cat: ${args[0]}: No such file` }]);
    } else if (command === 'touch' && args[0]) {
      setFiles(prev => [...prev, createFileNode(args[0], '')]);
      setTermLines(p => [...p, { type: 'success', text: `Created: ${args[0]}` }]);
    } else if (command === 'rm' && args[0]) {
      setFiles(prev => deleteNodeByPath(prev, args[0]));
      setTermLines(p => [...p, { type: 'success', text: `Deleted: ${args[0]}` }]);
    } else if (command === 'pwd') {
      setTermLines(p => [...p, { type: 'output', text: `/workspace/${project?.name || id}` }]);
    } else if (command === 'echo') {
      setTermLines(p => [...p, { type: 'output', text: args.join(' ') }]);
    } else if (command === 'clear' || command === 'cls') {
      setTermLines([]);
    } else if (command === 'mkdir' && args[0]) {
      const folderPath = args[args.length - 1] || args[0];
      setFiles(prev => addFileByPath(prev, `${folderPath}/.gitkeep`, ''));
      setTermLines(p => [...p, { type: 'success', text: `mkdir: created directory '${folderPath}'` }]);
    } else if (command === 'cp' && args[0] && args[1]) {
      const src = findNodeByPath(files, args[0]);
      if (!src) { setTermLines(p => [...p, { type: 'error', text: `cp: ${args[0]}: No such file` }]); }
      else { setFiles(prev => addFileByPath(prev, args[1], src.content || '')); setTermLines(p => [...p, { type: 'success', text: `Copied ${args[0]} → ${args[1]}` }]); }
    } else if (command === 'mv' && args[0] && args[1]) {
      const src = findNodeByPath(files, args[0]);
      if (!src) { setTermLines(p => [...p, { type: 'error', text: `mv: ${args[0]}: No such file` }]); }
      else {
        setFiles(prev => { const withNew = addFileByPath(prev, args[1], src.content || ''); return deleteNodeByPath(withNew, args[0]); });
        setTermLines(p => [...p, { type: 'success', text: `Renamed: ${args[0]} → ${args[1]}` }]);
      }
    } else if (command === 'wc' && args[0]) {
      const node = findNodeByPath(files, args[0]);
      if (!node?.content) { setTermLines(p => [...p, { type: 'error', text: `wc: ${args[0]}: No such file` }]); }
      else {
        const lines = node.content.split('\n').length;
        const words = node.content.split(/\s+/).filter(Boolean).length;
        const chars = node.content.length;
        setTermLines(p => [...p, { type: 'output', text: `${lines}\t${words}\t${chars}\t${args[0]}` }]);
      }
    } else if (command === 'head' && args[0]) {
      const node = findNodeByPath(files, args[0]);
      if (!node?.content) { setTermLines(p => [...p, { type: 'error', text: `head: ${args[0]}: No such file` }]); }
      else { node.content.split('\n').slice(0, 10).forEach(line => setTermLines(p => [...p, { type: 'output', text: line }])); }
    } else if (command === 'tail' && args[0]) {
      const node = findNodeByPath(files, args[0]);
      if (!node?.content) { setTermLines(p => [...p, { type: 'error', text: `tail: ${args[0]}: No such file` }]); }
      else { node.content.split('\n').slice(-10).forEach(line => setTermLines(p => [...p, { type: 'output', text: line }])); }
    } else if (command === 'grep' && args[0] && args[1]) {
      const node = findNodeByPath(files, args[1]);
      if (!node?.content) { setTermLines(p => [...p, { type: 'error', text: `grep: ${args[1]}: No such file` }]); }
      else {
        const pat = new RegExp(args[0], 'gi');
        const matched = node.content.split('\n').filter(l => pat.test(l));
        if (matched.length === 0) setTermLines(p => [...p, { type: 'output', text: '(no matches)' }]);
        else matched.forEach(line => setTermLines(p => [...p, { type: 'output', text: line }]));
      }
    } else if (command === 'env') {
      [
        `WORKSPACE=/workspace/${project?.name || id}`,
        `PROJECT_ID=${id}`,
        `NODE_ENV=development`,
        `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
        `LANG=en_US.UTF-8`,
        `TERM=xterm-256color`,
      ].forEach(line => setTermLines(p => [...p, { type: 'output', text: line }]));
    } else if (command === 'run') {
      runProject();
      setTermLines(p => [...p, { type: 'success', text: 'Starting project…' }]);
    } else if (command === 'help') {
      [
        'Nexios Terminal — NixOS Linux (x86_64)',
        '',
        'Built-in commands:',
        '  ls [-l]              list workspace files',
        '  cat <file>           show file contents',
        '  touch <file>         create empty file',
        '  rm <file>            delete file',
        '  mkdir <dir>          create directory',
        '  cp <src> <dst>       copy file',
        '  mv <src> <dst>       rename / move file',
        '  pwd                  print working directory',
        '  echo <text>          print text',
        '  env                  show environment variables',
        '  wc <file>            word / line count',
        '  head <file>          first 10 lines',
        '  tail <file>          last 10 lines',
        '  grep <pat> <file>    search in file',
        '  run                  run project (auto-detects language)',
        '  git clone <url>      clone GitHub repository into workspace',
        '  clear / cls          clear terminal',
        '',
        'Sandbox commands (run on real NixOS Linux):',
        '  python3 <file>       run Python 3.11 script',
        '  pip3 install <pkg>   install Python package',
        '  node <file>          run Node.js 20 script',
        '  npm install          install Node.js dependencies',
        '  npm run dev          start dev server',
        '  npm run build        build for production',
        '  npx <tool>           run any npm package',
        '  bun <file>           run with Bun runtime',
      ].forEach(line => setTermLines(p => [...p, { type: 'output', text: line }]));
    } else if (command === 'git' && args[0] === 'clone' && args[1]) {
      try {
        await cloneRepoIntoWorkspace(args[1], files);
      } catch (err) {
        setTermLines(p => [...p, { type: 'error', text: `fatal: ${err instanceof Error ? err.message : 'network error'}` }]);
      }
    } else if (command === 'git') {
      setTermLines(p => [...p, { type: 'output', text: 'git: supported commands: clone <url>' }]);
    } else if (command === 'which') {
      const tools: Record<string, string> = {
        node: '/nix/store/.../nodejs-20/bin/node',
        npm: '/nix/store/.../nodejs-20/bin/npm',
        python3: '/nix/store/.../python3-3.11/bin/python3',
        python: '/nix/store/.../python3-3.11/bin/python3',
        pip3: '/nix/store/.../python3-3.11/bin/pip3',
        npx: '/nix/store/.../npx/bin/npx',
      };
      setTermLines(p => [...p, { type: 'output', text: tools[args[0]] || `${args[0]}: not found` }]);
    } else if (command === 'uname') {
      const flag = args[0] || '';
      if (flag === '-a' || flag === '--all') {
        setTermLines(p => [...p, { type: 'output', text: 'Linux nexios-sandbox 6.1.0-nixos #1 SMP NixOS x86_64 GNU/Linux' }]);
      } else if (flag === '-s') {
        setTermLines(p => [...p, { type: 'output', text: 'Linux' }]);
      } else if (flag === '-r') {
        setTermLines(p => [...p, { type: 'output', text: '6.1.0-nixos' }]);
      } else {
        setTermLines(p => [...p, { type: 'output', text: 'Linux' }]);
      }
    } else if (command === 'whoami') {
      setTermLines(p => [...p, { type: 'output', text: 'nexios' }]);
    } else if (command === 'date') {
      setTermLines(p => [...p, { type: 'output', text: new Date().toString() }]);
    } else {
      setTermLines(p => [...p, { type: 'error', text: `${command}: command not found — type 'help' for available commands` }]);
    }
  };

  // ── AI Send ──
  const sendMessage = async () => {
    if (!input.trim() || aiLoading) return;
    const apiKey = getApiKey(activeProvider.id);
    if (!apiKey) {
      setMessages(p => [...p, { role: 'assistant', content: `⚠️ Please add your ${activeProvider.name} API key in Settings first.`, timestamp: Date.now() }]);
      return;
    }
    const userMsg = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    setAiLoading(true);

    try {
      const currentFile = selectedPath ? findNodeByPath(files, selectedPath) : null;
      const allPaths = getAllFilePaths(files);
      const fileContext = currentFile ? `\nCurrently open (${selectedPath}):\n\`\`\`\n${currentFile.content?.slice(0, 1200) || ''}\n\`\`\`` : '';
      const autonomousContext = autonomousMode
        ? `\n\nAUTONOMOUS MODE: You have full awareness of your own capabilities and can propose self-improvements.` : '';

      // ── Agent Specialisation by project type ──
      const projectType = project?.type || 'code';
      const specialisation = projectType === 'document'
        ? `You are Nexios Doc — a professional writing assistant specialised in technical documentation, reports, articles, and rich-text content.

## DOCUMENT CONTEXT
Project: "${project?.name || 'Untitled'}"
Files (${allPaths.length}): ${allPaths.slice(0, 10).join(', ') || 'none'}${fileContext}${autonomousContext}

## YOUR ROLE
- Help write, edit, proofread, and improve written content
- Generate markdown files (.md), reports, READMEs, API docs, changelogs, technical specs
- Suggest structure improvements, headings, summaries, and formatting
- Use nexios_ops when the user asks you to save content to a file

## FILE OPERATIONS (for saving documents)
<nexios_ops>
[{"op": "create", "path": "report.md", "content": "# Report Title\\n\\nContent here..."}]
</nexios_ops>

## WRITING STANDARDS
- Clear, concise, well-structured prose
- Proper headings hierarchy (H1 → H2 → H3)
- Bullet points and tables where appropriate
- Technical accuracy for the subject matter
- If the user asks a question, answer directly — only use ops when saving/creating files`

        : projectType === 'design'
        ? `You are Nexios Design — a senior UI/UX engineer and design-to-code specialist.

## DESIGN CONTEXT
Project: "${project?.name || 'Untitled'}"
Files (${allPaths.length}): ${allPaths.slice(0, 10).join(', ') || 'none'}${fileContext}${autonomousContext}

## YOUR ROLE
- Convert design concepts into production-ready HTML/CSS/React components
- Generate SVG assets, CSS animations, design tokens, and component libraries
- Implement responsive layouts, colour palettes, typography scales, spacing systems
- Interpret Figma descriptions and create matching code
- Use nexios_ops to create design files

## FILE OPERATIONS
<nexios_ops>
[
  {"op": "create", "path": "tokens/colors.css", "content": ":root { --primary: #6366f1; }"},
  {"op": "create", "path": "components/Button.tsx", "content": "export function Button..."}
]
</nexios_ops>

## DESIGN STANDARDS
- Mobile-first, responsive, accessible (WCAG AA)
- Use CSS custom properties for design tokens
- Pixel-perfect layouts with precise spacing
- Smooth transitions and micro-animations
- Modern colour theory and typography`

        : `You are Nexios AI — a senior full-stack engineer embedded in an IDE with direct file system access. You think before you act, write production-quality code, and always complete the full implementation.

## PROJECT CONTEXT
Name: "${project?.name || 'Untitled'}"
Language/Stack: ${project?.language || 'Unknown'}
Files (${allPaths.length}): ${allPaths.slice(0, 20).join(', ') || 'none'}${fileContext}${autonomousContext}

## FILE OPERATIONS
You MUST use <nexios_ops> to create or edit files. Never paste code in chat:

<nexios_ops>
[
  {"op": "create", "path": "src/index.html", "content": "<!DOCTYPE html>\\n<html lang=\\"en\\">...complete file content..."},
  {"op": "edit", "path": "src/style.css", "content": "/* complete updated file */"},
  {"op": "delete", "path": "old-file.js"},
  {"op": "mkdir", "path": "src/components"}
]
</nexios_ops>

## CORE RULES
1. ALWAYS use nexios_ops for any file creation or editing — NEVER paste code blocks in chat
2. Write COMPLETE files — never truncate with "..." or "// rest of code here"
3. Think step-by-step: plan files → write all of them in one ops block
4. For multi-file projects, create ALL necessary files in a single response
5. Use modern best practices for the detected language/framework
6. If the user asks a question without requesting code, answer conversationally
7. After applying ops, briefly explain what you built and how to use it

## LANGUAGE GUIDELINES
- HTML/CSS/JS: proper DOCTYPE, semantic HTML5, CSS custom properties, ES6+ modules
- React/Next.js: functional components, TypeScript, proper imports, hooks
- Python: PEP-8, type hints, docstrings, python3 -m pip for packages
- Node.js: ES modules or CommonJS (match existing style), async/await

## QUALITY STANDARDS
- Production-ready: error handling, loading states, responsive design
- Accessible: ARIA labels, semantic elements, keyboard navigation
- Clean: consistent naming, no dead code, logical file structure`;

      const systemPrompt = specialisation;


      const messagesForAI = [
        { role: 'user' as const, content: systemPrompt },
        ...messages.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content })),
        { role: 'user' as const, content: userMsg }
      ];

      const rawResponse = await callAI(activeProvider.id, activeModel.id, messagesForAI, apiKey);
      const { text, ops } = parseAIResponse(rawResponse);
      let appliedOps: FileOp[] = [];
      if (ops.length > 0) {
        setFileOpsInProgress(true);
        const result = applyOps(ops, files);
        appliedOps = result.appliedOps;
        setFileOpsInProgress(false);
      }
      setMessages(p => [...p, {
        role: 'assistant',
        content: text || (ops.length > 0 ? 'Done.' : 'I\'m not sure how to help with that.'),
        timestamp: Date.now(),
        ops: appliedOps.length > 0 ? appliedOps : undefined
      }]);
    } catch (error) {
      setMessages(p => [...p, { role: 'assistant', content: `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`, timestamp: Date.now() }]);
    } finally {
      setAiLoading(false);
      setFileOpsInProgress(false);
    }
  };

  const searchMatches = codeSearch ? code.split('\n').reduce((acc, line, i) => {
    if (line.toLowerCase().includes(codeSearch.toLowerCase())) acc.push({ line: i + 1, text: line.trim() });
    return acc;
  }, [] as { line: number; text: string }[]) : [];

  const projectType = project?.type || 'code';
  const selectedExt = selectedPath.split('.').pop()?.toLowerCase() || '';
  const canRun = selectedPath && ['html', 'htm', 'js', 'ts', 'py'].includes(selectedExt);
  const lineCount = code.split('\n').length;
  const wordCount = code.split(/\s+/).filter(Boolean).length;

  return (
    <div className="h-screen flex flex-col" style={{ background: '#080c14', color: '#fff' }}>
      <style>{`
        .thinking-bar { width: 3px; height: 16px; border-radius: 2px; background: linear-gradient(180deg, #6366f1, #818cf8); animation: thinkingPulse 0.9s ease-in-out infinite; transform-origin: bottom; }
        @keyframes thinkingPulse { 0%, 100% { transform: scaleY(0.35); opacity: 0.4; } 50% { transform: scaleY(1); opacity: 1; } }
        .op-appear { animation: opSlideIn 0.3s ease-out; }
        @keyframes opSlideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Hidden file inputs */}
      <input ref={importFileRef} type="file" multiple className="hidden" onChange={handleImportFile} accept="*/*" />
      <input ref={importFolderRef} type="file" multiple className="hidden" onChange={handleImportFolder}
        {...({ webkitdirectory: '', directory: '' } as any)} />

      {/* ── Run Output Modal ── */}
      {runOutput && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#080c14' }}>
          <div className="h-10 flex items-center gap-3 px-3 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            <button onClick={() => setRunOutput(null)} className="text-white/40 hover:text-white/80 transition-colors"><HiX size={16} /></button>
            <div className="flex gap-1.5 ml-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500/70"/><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70"/><div className="w-2.5 h-2.5 rounded-full bg-green-500/70"/></div>
            <span className="text-[11px] text-white/60 ml-1 font-mono">{runOutput.title}</span>
            <button onClick={() => {
              const win = window.open('', '_blank');
              if (win) { win.document.write(runOutput.html); win.document.close(); }
            }} className="ml-auto text-[10px] px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
              Open in new tab
            </button>
          </div>
          <iframe srcDoc={runOutput.html} className="flex-1 w-full border-none" title="Preview" sandbox="allow-scripts allow-same-origin" />
        </div>
      )}

      {/* ── Top Bar ── */}
      <div className="h-10 flex items-center gap-2 px-3 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
        <button onClick={handleBack} className="text-white/40 hover:text-white/80 transition-colors p-1" title="Close workspace">
          <HiArrowLeft size={14} />
        </button>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-white/90">{project?.name || 'Loading…'}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>{projectType}</span>
        </div>
        <div className="flex-1" />

        {/* Run buttons */}
        {canRun && (
          <button onClick={runFile} title="Run current file"
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors"
            style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
            <BsPlayCircle size={11} /> Run File
          </button>
        )}
        <button onClick={runProject} title="Run project"
          className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
          <BsPlayCircle size={11} /> Run
        </button>

        {/* AI status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${aiLoading ? 'bg-yellow-400 animate-pulse' : 'bg-indigo-400'}`} />
          <span className="text-[10px] font-medium text-indigo-300">{aiLoading ? 'Working…' : 'Nexios AI'}</span>
        </div>

        {autonomousMode && (
          <div className="text-[9px] px-2 py-1 rounded-lg font-bold hidden md:flex" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>⚡ AUTO</div>
        )}

        <button onClick={exportZip} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/5 transition-colors" title="Export as ZIP">
          <BsDownload size={11} /> ZIP
        </button>

        <div className="relative">
          <button onClick={() => setShowModelSelector(!showModelSelector)}
            className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors">
            {activeModel.name.split(' ')[0]} ▾
          </button>
          {showModelSelector && (
            <div className="absolute top-full right-0 mt-1 z-50 rounded-xl border shadow-2xl overflow-hidden" style={{ background: '#0f1219', borderColor: 'rgba(255,255,255,0.1)', width: 220 }}>
              <div className="p-2 space-y-1 max-h-64 overflow-auto">
                {activeProvider.models.map(m => (
                  <button key={m.id} onClick={() => { setActiveModel(m.id); setShowModelSelector(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-[11px] hover:bg-white/5 transition-colors"
                    style={{ color: activeModel.id === m.id ? '#818cf8' : '#ffffff80' }}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <div className="flex flex-col shrink-0 border-r" style={{ width: 184, borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="h-8 flex items-center justify-between px-2 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
              <span className="text-[9px] font-bold tracking-widest text-white/30">EXPLORER</span>
              <div className="flex items-center gap-1">
                <button onClick={() => { setCreatingIn({ path: '', type: 'file' }); setCreateTab('new'); }} className="text-white/30 hover:text-white/80 transition-colors" title="New file"><BsPlus size={14} /></button>
                <button onClick={() => { setCreatingIn({ path: '', type: 'folder' }); setCreateTab('new'); }} className="text-white/30 hover:text-white/80 transition-colors" title="New folder"><BsFolderPlus size={12} /></button>
                <button onClick={() => importFolderRef.current?.click()} className="text-white/30 hover:text-white/80 transition-colors" title="Import folder"><BsUpload size={11} /></button>
                <button onClick={() => setSidebarOpen(false)} className="text-white/30 hover:text-white/80 transition-colors"><HiMenu size={13} /></button>
              </div>
            </div>

            {/* Create / Import panel */}
            {creatingIn && (
              <div className="border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setCreateTab('new')} className={`flex-1 text-[9px] py-1.5 font-medium transition-colors ${createTab === 'new' ? 'text-indigo-300 border-b border-indigo-500' : 'text-white/30 hover:text-white/60'}`}>New</button>
                  <button onClick={() => setCreateTab('import')} className={`flex-1 text-[9px] py-1.5 font-medium transition-colors ${createTab === 'import' ? 'text-indigo-300 border-b border-indigo-500' : 'text-white/30 hover:text-white/60'}`}>Import</button>
                </div>
                {createTab === 'new' ? (
                  <div className="p-1.5 flex gap-1">
                    <input value={newFileName} onChange={e => setNewFileName(e.target.value)}
                      placeholder={creatingIn.type === 'file' ? 'file.ts' : 'folder-name'}
                      className="flex-1 px-2 py-0.5 text-[10px] bg-black/40 border border-white/20 rounded outline-none focus:border-indigo-400"
                      onKeyDown={e => e.key === 'Enter' && handleCreateItem()} autoFocus />
                    <button onClick={handleCreateItem} className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] rounded hover:bg-indigo-700">✓</button>
                    <button onClick={() => setCreatingIn(null)} className="px-1.5 py-0.5 bg-white/10 text-white/60 text-[9px] rounded hover:bg-white/20">✕</button>
                  </div>
                ) : (
                  <div className="p-1.5 space-y-1">
                    <button onClick={() => importFileRef.current?.click()}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] text-white/60 hover:text-white hover:bg-white/5 transition-colors border border-white/10">
                      <BsUpload size={10} /> Import file(s) from computer
                    </button>
                    <button onClick={() => importFolderRef.current?.click()}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] text-white/60 hover:text-white hover:bg-white/5 transition-colors border border-white/10">
                      <BsFolderPlus size={10} /> Import entire folder
                    </button>
                    <button onClick={() => { setShowCloneInput(v => !v); setCloneImportUrl(''); }}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 transition-colors border border-indigo-500/30">
                      <HiGlobeAlt size={10} /> Clone from GitHub
                    </button>
                    {showCloneInput && (
                      <div className="space-y-1 pt-0.5">
                        <input
                          value={cloneImportUrl}
                          onChange={e => setCloneImportUrl(e.target.value)}
                          placeholder="https://github.com/owner/repo"
                          className="w-full px-2 py-1 text-[10px] bg-black/40 border border-white/20 rounded outline-none focus:border-indigo-400 text-white placeholder-white/30"
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && cloneImportUrl.trim()) {
                              setCloneImporting(true);
                              setPanelTab('terminal');
                              setCreatingIn(null);
                              setShowCloneInput(false);
                              try { await cloneRepoIntoWorkspace(cloneImportUrl.trim(), files); }
                              catch (err) { setTermLines(p => [...p, { type: 'error', text: `fatal: ${err instanceof Error ? err.message : 'clone failed'}` }]); }
                              setCloneImporting(false);
                              setCloneImportUrl('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          disabled={!cloneImportUrl.trim() || cloneImporting}
                          onClick={async () => {
                            if (!cloneImportUrl.trim()) return;
                            setCloneImporting(true);
                            setPanelTab('terminal');
                            setCreatingIn(null);
                            setShowCloneInput(false);
                            try { await cloneRepoIntoWorkspace(cloneImportUrl.trim(), files); }
                            catch (err) { setTermLines(p => [...p, { type: 'error', text: `fatal: ${err instanceof Error ? err.message : 'clone failed'}` }]); }
                            setCloneImporting(false);
                            setCloneImportUrl('');
                          }}
                          className="w-full py-1 text-[9px] rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors">
                          {cloneImporting ? 'Cloning…' : 'Clone Repository'}
                        </button>
                      </div>
                    )}
                    <button onClick={() => { setCreatingIn(null); setShowCloneInput(false); }} className="w-full text-[9px] text-white/30 hover:text-white/60 py-1">Cancel</button>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-auto py-1">
              <FileTree nodes={files} onSelect={p => { setSelectedPath(p); setContentTab('code'); }}
                selectedPath={selectedPath} onDelete={handleDeleteFile} onRename={handleRename}
                onAdd={(path, type) => { setCreatingIn({ path, type }); setCreateTab('new'); }}
                expanded={expandedFolders} setExpanded={setExpandedFolders} />
            </div>

            {(aiLoading || fileOpsInProgress) && (
              <div className="px-2 py-1.5 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-[9px] text-white/30">AI is working…</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Center ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-8 flex items-center gap-0 border-b shrink-0 px-1" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="mr-2 text-white/30 hover:text-white/80 transition-colors"><HiMenu size={13} /></button>
            )}
            {[
              { id: 'code', label: 'Code', icon: BsFileCode },
              { id: 'files', label: 'Files', icon: HiOutlineFolder },
              ...(projectType !== 'document' ? [{ id: 'design', label: 'Design', icon: BsGlobe }] : []),
              { id: 'document', label: 'Doc', icon: BsFileEarmarkText },
            ].map((t: any) => (
              <button key={t.id} onClick={() => setContentTab(t.id as ContentTab)}
                className={`h-8 flex items-center gap-1.5 px-3 text-[11px] border-b-2 transition-colors ${contentTab === t.id ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/40 hover:text-white/70'}`}>
                <t.icon size={11} /> {t.label}
              </button>
            ))}
          </div>

          {/* CODE VIEW */}
          {contentTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Editor toolbar */}
              <div className="h-7 flex items-center justify-between px-2 border-b shrink-0 gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button onClick={copyPath} title="Copy path" className="text-white/30 hover:text-white/70 transition-colors shrink-0">
                    <BsClipboard size={10} />
                  </button>
                  <span className="text-[10px] text-white/40 font-mono truncate">{copied ? '✓ Copied!' : (selectedPath || 'No file selected')}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {selectedPath && <span className="text-[9px] text-white/20">{lineCount}L · {wordCount}W</span>}
                  <div className="relative">
                    <BsSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" size={9} />
                    <input value={codeSearch} onChange={e => setCodeSearch(e.target.value)}
                      placeholder="Search…" className="w-24 pl-5 pr-2 py-0.5 text-[10px] bg-black/40 rounded border border-white/10 focus:border-indigo-400 outline-none" />
                  </div>
                </div>
              </div>
              {codeSearch && searchMatches.length > 0 && (
                <div className="absolute top-14 right-3 w-60 z-10 rounded shadow-lg p-1 max-h-40 overflow-auto border" style={{ background: '#1a1e24', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {searchMatches.map((m, i) => (
                    <div key={i} className="text-[9px] px-2 py-1 hover:bg-white/5 cursor-pointer truncate">
                      <span className="text-white/40">L{m.line}:</span> {m.text}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex-1">
                {selectedPath ? (
                  <MonacoEditor value={code} language={getLang(selectedPath)} theme="vs-dark" onChange={handleCodeChange}
                    options={{ fontSize: 12, minimap: { enabled: false }, lineNumbers: 'on', padding: { top: 8 }, scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2 }} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
                    <BsFileCode size={32} />
                    <p className="text-sm">Select a file or ask AI to create one</p>
                    <div className="flex gap-2">
                      <button onClick={() => { setCreatingIn({ path: '', type: 'file' }); setCreateTab('new'); }}
                        className="text-[11px] px-3 py-1.5 rounded border border-white/10 hover:border-indigo-400 hover:text-indigo-300 transition-colors">
                        + New file
                      </button>
                      <button onClick={() => importFileRef.current?.click()}
                        className="text-[11px] px-3 py-1.5 rounded border border-white/10 hover:border-indigo-400 hover:text-indigo-300 transition-colors">
                        ↑ Import file
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FILES VIEW */}
          {contentTab === 'files' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white/50">ALL FILES ({getAllFilePaths(files).length})</span>
                <div className="flex gap-2">
                  <button onClick={() => importFileRef.current?.click()} className="text-[10px] px-2 py-1 rounded border border-white/10 hover:border-indigo-400 text-white/50 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                    <BsUpload size={10} /> Import
                  </button>
                  <button onClick={() => { setCreatingIn({ path: '', type: 'file' }); setCreateTab('new'); }} className="text-[10px] px-2 py-1 rounded border border-white/10 hover:border-indigo-400 text-white/50 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                    <BsPlus size={12} /> New
                  </button>
                </div>
              </div>
              {getAllFilePaths(files).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/20">
                  <HiFolder size={40} />
                  <p className="text-sm mt-3">No files yet — ask AI or import from your computer</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {getAllFilePaths(files).map(path => (
                    <div key={path} onClick={() => { setSelectedPath(path); setContentTab('code'); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${selectedPath === path ? 'bg-indigo-600/20' : 'hover:bg-white/5'}`}>
                      <BsFileCode size={12} className="text-indigo-400 shrink-0" />
                      <span className={`text-[12px] font-mono flex-1 ${selectedPath === path ? 'text-indigo-300' : 'text-white/60'}`}>{path}</span>
                      {canRun && path === selectedPath && (
                        <button onClick={e => { e.stopPropagation(); runFile(); }} className="opacity-0 group-hover:opacity-100 text-green-400/70 hover:text-green-400 transition-colors">
                          <BsPlayCircle size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DESIGN VIEW — Excalidraw vector canvas */}
          {contentTab === 'design' && (
            <div className="flex-1 overflow-hidden">
              <DesignEditor projectId={id} projectName={project?.name} />
            </div>
          )}

          {/* DOCUMENT VIEW — TipTap rich text (Word-like) */}
          {contentTab === 'document' && (
            <div className="flex-1 overflow-hidden">
              <DocumentEditor
                content={docContent}
                onChange={html => setDocContent(html)}
                projectName={project?.name}
              />
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="flex flex-col shrink-0 border-l" style={{ width: 310, borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="h-8 flex items-center border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            {(['chat', 'terminal'] as PanelTab[]).map(tab => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className={`h-8 flex-1 text-[10px] capitalize font-medium border-b-2 transition-colors ${panelTab === tab ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/30 hover:text-white/60'}`}>
                {tab === 'chat' ? (project?.type === 'document' ? '✦ Nexios Doc' : project?.type === 'design' ? '✦ Nexios Design' : '✦ Nexios AI') : 'Terminal'}
              </button>
            ))}
          </div>

          {/* CHAT */}
          {panelTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-3 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                        <BsStars size={11} className="text-indigo-400" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1" style={{ maxWidth: '88%' }}>
                      <div className={`px-3 py-2 rounded-2xl ${msg.role === 'assistant' ? 'rounded-tl-sm text-white/85' : 'rounded-tr-sm text-white ml-auto'}`}
                        style={{
                          background: msg.role === 'assistant' ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                          border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.07)' : 'none'
                        }}>
                        <MessageContent content={msg.content} />
                      </div>
                      {msg.ops && msg.ops.length > 0 && (
                        <div className="px-1 op-appear">{msg.ops.map((op, j) => <OpPill key={j} op={op} />)}</div>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && <ThinkingAnimation />}
                <div ref={chatEndRef} />
              </div>

              <div className="p-2 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex gap-2 items-end">
                  <textarea value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Ask anything — create files, write code, fix bugs…"
                    rows={1}
                    className="flex-1 px-3 py-2 text-[12px] rounded-xl outline-none resize-none border transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: input.trim() ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)', color: '#fff', maxHeight: 96, overflowY: 'auto' }}
                    onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 96) + 'px'; }} />
                  <button onClick={sendMessage} disabled={aiLoading || !input.trim()}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 shrink-0"
                    style={{ background: input.trim() ? '#6366f1' : 'rgba(99,102,241,0.2)' }}>
                    <HiPaperAirplane size={14} className="rotate-90" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5 px-0.5">
                  <span className="text-[9px] text-white/20">↵ send · Shift+↵ new line</span>
                  <span className="text-[9px] text-white/20">{activeModel.name.split(' ')[0]}</span>
                </div>
              </div>
            </div>
          )}

          {/* TERMINAL */}
          {panelTab === 'terminal' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-2 font-mono text-[11px]">
                {termLines.map((line, i) => (
                  <div key={i} className={`leading-relaxed ${line.type === 'input' ? 'text-white/70' : line.type === 'error' ? 'text-red-400' : line.type === 'success' ? 'text-green-400' : 'text-white/40'}`}>
                    {line.text}
                  </div>
                ))}
                <div ref={termEndRef} />
              </div>
              <div className="px-2 pt-1 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="text-[9px] text-white/20 mb-1">
                  {termLoading
                    ? '⚡ Running in sandbox…'
                    : 'npm · node · python3 · pip3 · git clone <url> · run · help'}
                </div>
              </div>
              <div className="p-2 flex gap-2 shrink-0 items-center">
                <span className={`font-mono text-[11px] ${termLoading ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`}>$</span>
                <input value={termInput} onChange={e => setTermInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runTerminalCommand()}
                  placeholder={termLoading ? 'Running…' : 'Enter command…'}
                  disabled={termLoading}
                  className="flex-1 bg-transparent outline-none text-[11px] font-mono text-white/80 disabled:opacity-50" />
                {termLoading && (
                  <div className="w-3 h-3 border border-t-transparent border-yellow-400 rounded-full animate-spin shrink-0" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModelSelector && <div className="fixed inset-0 z-40" onClick={() => setShowModelSelector(false)} />}
    </div>
  );
}
