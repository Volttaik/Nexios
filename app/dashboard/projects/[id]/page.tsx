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
  HiFolder, HiMenu, HiOutlineFolder, HiCode, HiPaperAirplane, HiX
} from 'react-icons/hi';
import { SiFigma } from 'react-icons/si';
import Link from 'next/link';
import { useAI } from '@/app/context/AIContext';
import { callAI } from '@/app/lib/ai';

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
function addFileByPath(nodes: FileNode[], path: string, content: string): FileNode[] {
  const parts = path.split('/');
  if (parts.length === 1) {
    const exists = nodes.findIndex(n => n.name === parts[0]);
    const newNode = createFileNode(parts[0], content);
    if (exists >= 0) { const r = [...nodes]; r[exists] = { ...r[exists], content }; return r; }
    return [...nodes, newNode];
  }
  const folderName = parts[0];
  const rest = parts.slice(1).join('/');
  const folderIdx = nodes.findIndex(n => n.name === folderName && n.type === 'folder');
  if (folderIdx >= 0) {
    const updated = [...nodes];
    updated[folderIdx] = { ...updated[folderIdx], children: addFileByPath(updated[folderIdx].children || [], rest, content) };
    return updated;
  }
  const newFolder = createFolderNode(folderName);
  newFolder.children = addFileByPath([], rest, content);
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
    { type: 'success', text: '✓ Environment ready at /workspace' },
    { type: 'output', text: '' },
  ]);
  const [termInput, setTermInput] = useState('');
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

  // ── Copy file path ──
  const copyPath = () => {
    if (selectedPath) {
      navigator.clipboard.writeText(selectedPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // ── Run file / project ──
  const runFile = () => {
    const ext = selectedPath.split('.').pop()?.toLowerCase();
    if (ext === 'html') {
      const node = findNodeByPath(files, selectedPath);
      if (!node?.content) return;
      // Find linked CSS and JS files and inline them
      let html = node.content;
      const allNodes = getAllFileNodes(files);
      // Inline CSS
      allNodes.filter(f => f.path.endsWith('.css')).forEach(css => {
        html = html.replace(/<link[^>]*href=["']([^"']*\.css)["'][^>]*>/gi, (match, href) => {
          if (css.path.endsWith(href) || href === css.path) {
            return `<style>${css.content}</style>`;
          }
          return match;
        });
      });
      // Inline JS
      allNodes.filter(f => f.path.endsWith('.js')).forEach(js => {
        html = html.replace(/<script[^>]*src=["']([^"']*)["'][^>]*><\/script>/gi, (match, src) => {
          if (js.path.endsWith(src) || src === js.path) {
            return `<script>${js.content}</script>`;
          }
          return match;
        });
      });
      setRunOutput({ html, title: selectedPath });
    } else {
      // For non-HTML files, show a simple output window
      const node = findNodeByPath(files, selectedPath);
      const ext2 = selectedPath.split('.').pop()?.toLowerCase();
      const simulated = `<html><head><title>Run: ${selectedPath}</title><style>body{background:#0d1117;color:#c9d1d9;font-family:monospace;padding:24px;margin:0;}pre{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;overflow-x:auto;font-size:13px;line-height:1.6;}h2{color:#58a6ff;font-size:14px;margin:0 0 12px;}span.comment{color:#8b949e;}span.ok{color:#3fb950;}span.warn{color:#d29922;}</style></head><body>
        <h2>▶ ${selectedPath}</h2>
        <pre>${ext2 === 'py' ? `<span class="comment"># Python runtime not available in browser</span>\n<span class="comment"># Your code:</span>\n\n${node?.content?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || ''}\n\n<span class="warn">→ To run Python, copy this code to your local terminal.</span>` : ext2 === 'js' || ext2 === 'ts' ? `<span class="comment">// Nexios Sandbox Output</span>\n<span class="ok">✓ File loaded: ${selectedPath}</span>\n<span class="comment">→ Executing in sandbox...</span>\n\n${ext2 === 'ts' ? '<span class="warn">TypeScript files require compilation first. Ask AI to help run this.</span>' : `<script-output>${node?.content?.slice(0, 200).replace(/</g, '&lt;') || ''}...</script-output>`}` : `<span class="ok">✓ File: ${selectedPath}</span>\n${node?.content?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || ''}`}</pre>
      </body></html>`;
      setRunOutput({ html: simulated, title: `Run: ${selectedPath}` });
    }
  };

  const runProject = () => {
    const allNodes = getAllFileNodes(files);
    const htmlFiles = allNodes.filter(f => f.path.endsWith('.html') || f.path.endsWith('.htm'));
    const indexFile = htmlFiles.find(f => f.path.includes('index')) || htmlFiles[0];

    if (!indexFile) {
      // Build a file listing page
      const listing = `<html><head><title>${project?.name} — Nexios</title><style>body{background:#0d1117;color:#c9d1d9;font-family:system-ui;padding:24px;}.file{padding:8px 12px;border-radius:6px;border:1px solid #30363d;margin:4px 0;cursor:pointer;background:#161b22;font-family:monospace;font-size:13px;}.file:hover{border-color:#58a6ff;color:#58a6ff;}h2{color:#fff;font-size:16px;}p{color:#8b949e;font-size:13px;}</style></head>
      <body><h2>📁 ${project?.name}</h2><p>${allNodes.length} files — no index.html found. Create one to preview your project.</p>
      ${allNodes.map(f => `<div class="file">${f.path}</div>`).join('')}</body></html>`;
      setRunOutput({ html: listing, title: project?.name || 'Project' });
      return;
    }

    // Bundle HTML with inline CSS and JS
    let html = indexFile.content;
    allNodes.filter(f => f.path.endsWith('.css')).forEach(css => {
      const fileName = css.path.split('/').pop();
      html = html.replace(new RegExp(`<link[^>]*href=["'][./]*${fileName}["'][^>]*>`, 'gi'), `<style>${css.content}</style>`);
    });
    allNodes.filter(f => f.path.endsWith('.js') && !f.path.endsWith('.min.js')).forEach(js => {
      const fileName = js.path.split('/').pop();
      html = html.replace(new RegExp(`<script[^>]*src=["'][./]*${fileName}["'][^>]*></script>`, 'gi'), `<script>${js.content}</script>`);
    });
    setRunOutput({ html, title: project?.name || 'Project' });
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
    if (!termInput.trim()) return;
    const cmd = termInput.trim();
    setTermLines(p => [...p, { type: 'input', text: `$ ${cmd}` }]);
    setTermInput('');
    const parts = cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const command = parts[0];
    const args = parts.slice(1).map(a => a.replace(/^['"]|['"]$/g, ''));

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
    } else if (command === 'clear') {
      setTermLines([]);
    } else if (command === 'run') {
      runProject();
      setTermLines(p => [...p, { type: 'success', text: 'Opening project preview...' }]);
    } else if (command === 'help') {
      ['ls              list files', 'cat <file>      show file contents', 'touch <file>    create file',
        'rm <file>       delete file', 'pwd             print working directory', 'echo <text>     print text',
        'run             run project preview', 'git clone <url> import GitHub repository', 'clear           clear terminal'
      ].forEach(line => setTermLines(p => [...p, { type: 'output', text: line }]));
    } else if (command === 'git' && args[0] === 'clone' && args[1]) {
      const repoUrl = args[1];
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/\s.]+)/);
      if (!match) {
        setTermLines(p => [...p, { type: 'error', text: 'git clone: only GitHub URLs are supported (https://github.com/owner/repo)' }]);
        return;
      }
      const [, owner, repo] = match;
      setTermLines(p => [...p, { type: 'output', text: `Cloning into '${repo}'…` }]);
      setTermLines(p => [...p, { type: 'output', text: 'remote: Enumerating objects…' }]);
      try {
        const treeResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
        if (!treeResp.ok) {
          const errData = await treeResp.json().catch(() => ({}));
          setTermLines(p => [...p, { type: 'error', text: `fatal: ${errData.message || 'repository not found or is private'}` }]);
          return;
        }
        const treeData = await treeResp.json();
        const fileItems = (treeData.tree as any[]).filter(item => item.type === 'blob' && item.size < 500000);
        setTermLines(p => [...p, { type: 'output', text: `remote: Total ${fileItems.length} files, fetching…` }]);

        let fetched = 0;
        let newFiles = [...files];
        const BATCH = 6;
        for (let i = 0; i < fileItems.length; i += BATCH) {
          const batch = fileItems.slice(i, i + BATCH);
          await Promise.all(batch.map(async (item: any) => {
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
          setTermLines(p => [...p, { type: 'output', text: `  ${Math.min(i + BATCH, fileItems.length)}/${fileItems.length} files fetched…` }]);
        }
        setFiles(newFiles);
        const paths = getAllFilePaths(newFiles);
        if (paths.length) setSelectedPath(paths[0]);
        setTermLines(p => [...p, { type: 'success', text: `✓ Cloned ${repo}: ${fetched} files imported into workspace` }]);
      } catch (err) {
        setTermLines(p => [...p, { type: 'error', text: `fatal: ${err instanceof Error ? err.message : 'network error'}` }]);
      }
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

      const systemPrompt = `You are Nexios AI — a senior full-stack engineer and coding assistant embedded in an IDE with direct file system access. You think before you act, write production-quality code, and always complete the full implementation.

## PROJECT CONTEXT
Name: "${project?.name || 'Untitled'}"
Language/Stack: ${project?.language || 'Unknown'}
Files (${allPaths.length}): ${allPaths.slice(0, 20).join(', ') || 'none'}${fileContext}${autonomousContext}

## FILE OPERATIONS
You MUST use <nexios_ops> to create or edit files. Never paste code in chat — it goes directly into the file system:

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
3. Think step-by-step: understand the full requirement → plan files → write all of them in one ops block
4. For multi-file projects, create ALL necessary files in a single response (HTML + CSS + JS, or all components)
5. Use modern best practices for the detected language/framework
6. If the user asks a question without requesting code, answer conversationally — no ops needed
7. After applying ops, briefly explain what you built and how to use it
8. When editing existing files, always include the COMPLETE new file content — not just the changed section

## LANGUAGE GUIDELINES
- HTML/CSS/JS: proper DOCTYPE, semantic HTML5, CSS custom properties, ES6+ modules
- React/Next.js: functional components, TypeScript, proper imports, hooks
- Python: PEP-8, type hints, docstrings
- Node.js: ES modules or CommonJS (match existing style), async/await

## QUALITY STANDARDS
- Production-ready: error handling, loading states, responsive design
- Accessible: ARIA labels, semantic elements, keyboard navigation
- Clean: consistent naming, no dead code, logical file structure`;


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
                    <button onClick={() => setCreatingIn(null)} className="w-full text-[9px] text-white/30 hover:text-white/60 py-1">Cancel</button>
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

          {/* DESIGN VIEW */}
          {contentTab === 'design' && (
            <div className="flex-1 flex flex-col overflow-auto p-6 gap-5">
              <div className="flex flex-col items-center text-center mb-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.2)' }}>
                  <SiFigma size={22} className="text-pink-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Design Canvas</h3>
                <p className="text-sm text-white/40 max-w-xs">Import a Figma design or describe your UI — the AI generates components directly in your workspace.</p>
              </div>

              {/* Figma community templates */}
              <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(244,114,182,0.2)', background: 'rgba(244,114,182,0.04)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#f472b6' }}>Figma Community Templates</p>
                <div className="space-y-2">
                  {[
                    { label: 'Material Design 3', url: 'https://www.figma.com/community/file/1035203688168086460', desc: 'Google\'s design system' },
                    { label: 'Apple iOS 17 UI Kit', url: 'https://www.figma.com/community/file/1247950726448004999', desc: 'Official Apple components' },
                    { label: 'Tailwind CSS UI Kit', url: 'https://www.figma.com/community/file/768809027799962739', desc: '200+ Tailwind components' },
                    { label: 'Shadcn/UI Design Kit', url: 'https://www.figma.com/community/file/1203061493325953101', desc: 'Radix-based UI components' },
                    { label: 'Ant Design System', url: 'https://www.figma.com/community/file/831698976089873405', desc: 'Enterprise UI framework' },
                    { label: 'Bootstrap 5 UI Kit', url: 'https://www.figma.com/community/file/1042763499833335979', desc: 'Bootstrap components' },
                  ].map(t => (
                    <a key={t.url} href={t.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group"
                      style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(244,114,182,0.1)' }}
                      onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(244,114,182,0.3)')}
                      onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(244,114,182,0.1)')}>
                      <SiFigma size={14} className="text-pink-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white group-hover:text-pink-300 transition-colors">{t.label}</p>
                        <p className="text-[10px] text-white/40">{t.desc}</p>
                      </div>
                      <span className="text-[10px] text-pink-400/60 group-hover:text-pink-400 transition-colors">Open →</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/30 transition-colors" onClick={() => {
                  const url = prompt('Paste your Figma file URL:');
                  if (url) {
                    const content = `# Figma Design Import\n\nSource: ${url}\nImported: ${new Date().toISOString()}\n\nAsk Nexios AI to convert this design to code:\n- "Convert this Figma design to React components"\n- "Generate the full HTML/CSS for this design"\n`;
                    setFiles(prev => [...prev, createFileNode('figma-import.md', content)]);
                    setSelectedPath('figma-import.md');
                    setContentTab('code');
                  }
                }}>
                  <BsGlobe size={13} /> Import Figma URL
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white font-medium transition-colors" style={{ background: '#6366f1' }} onClick={() => setPanelTab('chat')}>
                  <BsStars size={13} /> Ask AI to design
                </button>
              </div>
            </div>
          )}

          {/* DOCUMENT VIEW */}
          {contentTab === 'document' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-7 flex items-center justify-between px-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="text-[10px] text-white/40">Document Editor</span>
                <span className="text-[9px] text-white/20">{docContent.split(/\s+/).filter(Boolean).length} words · {docContent.split('\n').length} lines</span>
              </div>
              <textarea value={docContent} onChange={e => setDocContent(e.target.value)}
                placeholder={`Start writing your document here...\n\nMarkdown supported:\n# Heading 1\n## Heading 2\n**Bold** and *italic*\n- Bullet points\n\nAsk AI in chat to draft, edit, or expand your content.`}
                className="flex-1 p-5 bg-transparent text-[13px] text-white/80 resize-none outline-none leading-relaxed" />
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="flex flex-col shrink-0 border-l" style={{ width: 310, borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="h-8 flex items-center border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            {(['chat', 'terminal'] as PanelTab[]).map(tab => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className={`h-8 flex-1 text-[10px] capitalize font-medium border-b-2 transition-colors ${panelTab === tab ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/30 hover:text-white/60'}`}>
                {tab === 'chat' ? '✦ Chat' : 'Terminal'}
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
                <div className="text-[9px] text-white/20 mb-1">ls · cat · touch · rm · pwd · echo · run · git clone &lt;url&gt; · help · clear</div>
              </div>
              <div className="p-2 flex gap-2 shrink-0">
                <span className="text-green-400 font-mono text-[11px] mt-1.5">$</span>
                <input value={termInput} onChange={e => setTermInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runTerminalCommand()}
                  placeholder="Enter command…"
                  className="flex-1 bg-transparent outline-none text-[11px] font-mono text-white/80" />
              </div>
            </div>
          )}
        </div>
      </div>

      {showModelSelector && <div className="fixed inset-0 z-40" onClick={() => setShowModelSelector(false)} />}
    </div>
  );
}
