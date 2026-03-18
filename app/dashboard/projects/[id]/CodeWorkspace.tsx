'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  BsRobot, BsFileCode, BsFolder, BsFolder2Open, BsPlus, BsTrash3,
  BsChevronDown, BsChevronRight, BsFileEarmarkCode, BsFileEarmark,
  BsFileEarmarkText, BsSearch, BsDownload, BsLightningChargeFill,
  BsCheckCircleFill, BsExclamationCircleFill, BsArrowRepeat,
  BsFileEarmarkPlus, BsPencilFill, BsDashCircleFill, BsTerminalFill,
  BsPlayFill, BsStopFill,
} from 'react-icons/bs';
import {
  HiArrowLeft, HiX, HiFolder, HiMenu, HiCode,
} from 'react-icons/hi';
import Link from 'next/link';
import { useAI } from '@/app/context/AIContext';
import { callAI } from '@/app/lib/ai';
import { AI_PROVIDERS } from '@/app/context/AIContext';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

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
  type: 'input' | 'output' | 'error' | 'success' | 'info';
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

const EXT_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rs: 'rust', go: 'go', html: 'html', css: 'css',
  json: 'json', md: 'markdown', sh: 'shell', yaml: 'yaml', toml: 'toml',
  sql: 'sql', rb: 'ruby', php: 'php', java: 'java', c: 'c', cpp: 'cpp',
  vue: 'html', svelte: 'html', graphql: 'graphql', xml: 'xml', txt: 'plaintext',
};

const FILE_ICONS: Record<string, React.ElementType> = {
  ts: BsFileEarmarkCode, tsx: BsFileEarmarkCode,
  js: BsFileEarmarkCode, jsx: BsFileEarmarkCode,
  py: BsFileEarmarkCode, rs: BsFileEarmarkCode,
  json: BsFileEarmarkCode, md: BsFileEarmarkText,
  css: BsFileEarmarkCode, html: BsFileEarmarkCode,
  default: BsFileEarmark,
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
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

function getLang(name: string) { return EXT_LANG[name.split('.').pop() || ''] || 'plaintext'; }
function getFileIcon(name: string): React.ElementType { const ext = name.split('.').pop() || ''; return FILE_ICONS[ext] || FILE_ICONS.default; }
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

type PanelTab = 'chat' | 'activity' | 'terminal';

interface Props {
  project: Project;
}

export default function CodeWorkspace({ project }: Props) {
  const id = project.id;
  const { activeProvider, activeModel, getApiKey } = useAI();

  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [code, setCode] = useState('');
  const [panelTab, setPanelTab] = useState<PanelTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [codeSearch, setCodeSearch] = useState('');
  const [creatingIn, setCreatingIn] = useState<{ path: string; type: 'file' | 'folder' } | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);

  const [agentPhase, setAgentPhase] = useState<'idle' | 'thinking' | 'coding' | 'done'>('idle');
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Welcome to your Nexios AI workspace. I can create, edit, and delete files. Tell me what to build!', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [termLines, setTermLines] = useState<TerminalLine[]>([
    { type: 'info', text: '  Nexios Shell — Replit-style terminal' },
    { type: 'info', text: '─────────────────────────────────────' },
    { type: 'success', text: '  Node.js, Python, git available' },
    { type: 'output', text: '  Type any command below, or press ▶ Run' },
    { type: 'output', text: '' },
  ]);
  const [termInput, setTermInput] = useState('');
  const [termHistory, setTermHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const termEndRef = useRef<HTMLDivElement>(null);
  const activityEndRef = useRef<HTMLDivElement>(null);
  const termInputRef = useRef<HTMLInputElement>(null);

  const addActivity = useCallback((kind: ActivityEntry['kind'], message: string, path?: string) => {
    setActivityLog(p => [...p.slice(-100), { id: generateId(), kind, message, path, timestamp: Date.now() }]);
  }, []);

  useEffect(() => {
    const savedChat = localStorage.getItem(`nexios_chat_${id}`);
    if (savedChat) { try { setMessages(JSON.parse(savedChat)); } catch { /* ignore */ } }
  }, [id]);

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
          addActivity('info', `Loaded ${paths.length} file(s)`);
        }
      })
      .catch(() => { /* empty workspace */ });
  }, [id, addActivity]);

  useEffect(() => { localStorage.setItem(`nexios_chat_${id}`, JSON.stringify(messages)); }, [messages, id]);
  useEffect(() => {
    if (selectedPath) {
      const node = findNodeByPath(files, selectedPath);
      if (node?.type === 'file') setCode(node.content || '');
    }
  }, [selectedPath, files]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [termLines]);
  useEffect(() => { activityEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activityLog]);

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

  const handleRename = async (path: string, name: string) => {
    const parts = path.split('/');
    parts[parts.length - 1] = name;
    const newPath = parts.join('/');
    setFiles(prev => updateNodeByPath(prev, path, node => ({ ...node, name, path: newPath, language: getLang(name) })));
    if (selectedPath === path) setSelectedPath(newPath);
    await apiRenameFile(id, path, newPath);
  };

  const handleCreateItem = async () => {
    if (!creatingIn || !newFileName.trim()) return;
    const name = newFileName.trim();
    const parentPath = creatingIn.path;
    const fullPath = parentPath ? `${parentPath}/${name}` : name;

    if (creatingIn.type === 'file') {
      const content = `// ${name}\n`;
      const newNode: FileNode = { id: generateId(), name, type: 'file', content, language: getLang(name), path: fullPath };
      if (parentPath) {
        setFiles(prev => updateNodeByPath(prev, parentPath, node => node.type === 'folder' ? { ...node, children: [...(node.children || []), newNode] } : node));
      } else {
        setFiles(prev => [...prev, newNode]);
      }
      setSelectedPath(fullPath);
      await apiWriteFile(id, fullPath, content);
      addActivity('file_created', `Created ${fullPath}`, fullPath);
    } else {
      const newFolder: FileNode = { id: generateId(), name, type: 'folder', children: [], path: fullPath };
      if (parentPath) {
        setFiles(prev => updateNodeByPath(prev, parentPath, node => node.type === 'folder' ? { ...node, children: [...(node.children || []), newFolder] } : node));
      } else {
        setFiles(prev => [...prev, newFolder]);
      }
    }
    setExpandedFolders(p => ({ ...p, [creatingIn.path]: true }));
    setCreatingIn(null); setNewFileName('');
  };

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
        setSelectedPath(op.path);
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
      { type: 'success', text: `[Agent] Applied ${ops.length} file op(s):` },
      ...ops.map(op => ({ type: 'output' as const, text: `  · ${op.type}: ${op.path}` })),
    ]);
  }, [files, id, addActivity]);

  const exportProject = () => {
    const blob = new Blob([JSON.stringify({ project, files, chat: messages }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${project.name}-export.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const runTerminalCommand = async () => {
    if (!termInput.trim()) return;
    const cmd = termInput.trim();
    setTermLines(p => [...p, { type: 'input', text: `$ ${cmd}` }]);
    setTermHistory(h => [cmd, ...h.slice(0, 49)]);
    setHistoryIdx(-1);
    setTermInput('');
    addActivity('terminal', `$ ${cmd}`);

    const result = await apiRunCommand(id, cmd);
    if (result.stdout) result.stdout.split('\n').filter(Boolean).forEach(line => setTermLines(p => [...p, { type: 'output', text: line }]));
    if (result.stderr) result.stderr.split('\n').filter(Boolean).forEach(line => setTermLines(p => [...p, { type: result.code === 0 ? 'output' : 'error', text: line }]));
    if (result.code === 0 && !result.stdout && !result.stderr) setTermLines(p => [...p, { type: 'success', text: 'Done (exit 0)' }]);

    if (['npm', 'pip', 'git', 'node', 'python', 'touch', 'mkdir', 'cp', 'mv'].some(c => cmd.startsWith(c))) {
      fetch(`/api/workspace/${id}/files`).then(r => r.json()).then(data => {
        if (data.files && Object.keys(data.files).length > 0) setFiles(flatToTree(data.files));
      }).catch(() => {});
    }
  };

  const handleRunProject = async () => {
    setIsRunning(true);
    setPanelTab('terminal');
    setTermLines(p => [...p, { type: 'info', text: '─── Running project ───' }]);
    addActivity('terminal', 'Running project...');

    try {
      const res = await fetch(`/api/workspace/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryPoint: selectedPath || undefined }),
      });
      const data = await res.json();
      const runtime = data.runtime || 'Unknown';
      setTermLines(p => [
        ...p,
        { type: 'success', text: `[${runtime}] ${data.command || ''}` },
      ]);
      if (data.output) {
        data.output.split('\n').filter(Boolean).forEach((line: string) =>
          setTermLines(p => [...p, { type: data.code === 0 ? 'output' : 'error', text: line }])
        );
      }
      setTermLines(p => [...p, { type: data.code === 0 ? 'success' : 'error', text: `─── Exited (${data.code}) ───` }]);
    } catch {
      setTermLines(p => [...p, { type: 'error', text: 'Run failed: network error' }]);
    } finally {
      setIsRunning(false);
    }
  };

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

      const systemPrompt = `You are Nexios AI, an expert software engineer inside a code workspace.

## HOW TO CREATE / EDIT FILES
---FILE:path/to/filename.ext---
[complete file content]
---ENDFILE---

## HOW TO DELETE FILES
---DELETE:path/to/file.ext---

## RULES
- Write COMPLETE files — never partial
- Multiple files: repeat FILE blocks
- After writing files, briefly explain what you created
- Suggest shell commands to run after changes (npm install, python -m pip install, etc.)

## PROJECT
Name: ${project.name} | Language: ${project.language} | Type: code

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
        addActivity('coding', `Writing ${ops.length} file(s)...`);
        await applyFileOps(ops);
        addActivity('done', `Done — ${ops.length} file(s) written`);
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

  const isWorking = agentPhase === 'thinking' || agentPhase === 'coding';

  return (
    <div className="h-screen flex flex-col" style={{ background: '#080c14', color: '#fff' }}>

      {/* ── Top Bar ── */}
      <div className="h-10 flex items-center gap-2 px-3 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
        <Link href="/dashboard/projects" className="text-white/40 hover:text-white/80 transition-colors">
          <HiArrowLeft size={14} />
        </Link>
        <div className="w-px h-4 bg-white/10" />
        <HiCode size={13} className="text-indigo-400" />
        <span className="text-[12px] font-semibold text-white/90">{project.name}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
          {project.language || 'code'}
        </span>
        <div className="flex-1" />

        {/* Run button */}
        <button
          onClick={handleRunProject}
          disabled={isRunning}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-md font-medium transition-all"
          style={{ background: isRunning ? 'rgba(52,211,153,0.1)' : '#059669', color: isRunning ? '#34d399' : '#fff' }}
        >
          {isRunning ? <BsStopFill size={12} /> : <BsPlayFill size={12} />}
          {isRunning ? 'Running…' : '▶ Run'}
        </button>

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
        <div className="relative">
          <button onClick={() => setShowModelSelector(!showModelSelector)} className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors text-white/60">
            {activeModel.name.split(' ')[0]} ▾
          </button>
          {showModelSelector && (
            <div className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-2xl border overflow-hidden" style={{ background: '#1a1e28', borderColor: 'rgba(255,255,255,0.1)', width: 260 }}>
              {AI_PROVIDERS.map(provider => (
                <div key={provider.id}>
                  <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white/25">{provider.name}</div>
                  {provider.models.map(m => (
                    <button key={m.id} onClick={() => { setShowModelSelector(false); }}
                      className="w-full text-left px-4 py-1.5 text-[11px] hover:bg-white/5 transition-colors text-white/55 hover:text-white/90">
                      {m.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: File Explorer ── */}
        {sidebarOpen && (
          <div className="flex flex-col shrink-0 border-r" style={{ width: 180, borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="h-8 flex items-center justify-between px-2.5 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
              <span className="text-[9px] font-bold tracking-widest text-white/25 uppercase">Explorer</span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="text-white/25 hover:text-white/80 p-0.5" title="New file"><BsPlus size={14} /></button>
                <button onClick={() => setCreatingIn({ path: '', type: 'folder' })} className="text-white/25 hover:text-white/80 p-0.5" title="New folder"><HiFolder size={12} /></button>
                <button onClick={() => setSidebarOpen(false)} className="text-white/25 hover:text-white/80 p-0.5"><HiMenu size={12} /></button>
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
                <button onClick={() => setCreatingIn(null)} className="px-1.5 py-0.5 bg-white/10 text-white/50 text-[9px] rounded">✕</button>
              </div>
            )}
            <div className="flex-1 overflow-auto py-1 px-0.5">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/15">
                  <HiFolder size={24} />
                  <p className="text-[10px] text-center px-3">No files yet.<br />Ask AI to create some.</p>
                </div>
              ) : (
                <FileTree nodes={files} onSelect={p => setSelectedPath(p)} selectedPath={selectedPath}
                  onDelete={handleDeleteFile} onRename={handleRename}
                  onAdd={(path, type) => setCreatingIn({ path, type })}
                  expanded={expandedFolders} setExpanded={setExpandedFolders} />
              )}
            </div>
            <div className="px-2 py-1.5 border-t shrink-0 flex items-center gap-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span className="text-[9px] text-white/20">{getAllFilePaths(files).length} files</span>
              {isWorking && <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse ml-auto" />}
            </div>
          </div>
        )}

        {/* ── Center: Code Editor + Terminal ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Editor area */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
            <div className="h-7 flex items-center gap-0 border-b shrink-0 px-1" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
              {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="mr-2 text-white/30 hover:text-white/80"><HiMenu size={13} /></button>
              )}
              {selectedPath && <span className="text-[10px] text-white/30 font-mono px-3">{selectedPath}</span>}
              <div className="flex-1" />
              <button onClick={() => setCodeSearch(s => s ? '' : ' ')} className="text-white/20 hover:text-white/60 transition-colors px-2" title="Search"><BsSearch size={10} /></button>
            </div>

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

            <div className="flex-1 overflow-hidden">
              {selectedPath ? (
                <MonacoEditor value={code} language={getLang(selectedPath)} theme="vs-dark" onChange={handleCodeChange}
                  options={{ fontSize: 13, minimap: { enabled: false }, lineNumbers: 'on', padding: { top: 10, bottom: 10 }, scrollBeyondLastLine: false, wordWrap: 'on', smoothScrolling: true }} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
                  <BsFileCode size={36} />
                  <div className="text-center"><p className="text-sm font-medium mb-1">No file open</p><p className="text-[11px]">Select a file or ask the AI to create one</p></div>
                  <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 hover:border-indigo-400/50 hover:text-indigo-300 transition-colors">+ New File</button>
                </div>
              )}
            </div>
          </div>

          {/* Terminal panel */}
          <div className="border-t shrink-0" style={{ height: 200, borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="h-7 flex items-center gap-1 px-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0a0d15' }}>
              <BsTerminalFill size={11} className="text-white/30" />
              <span className="text-[9px] font-bold text-white/25 uppercase tracking-widest">Terminal</span>
              <div className="flex-1" />
              <button onClick={() => setTermLines([{ type: 'info', text: 'Cleared' }])} className="text-[9px] text-white/20 hover:text-white/50 transition-colors">Clear</button>
            </div>
            <div
              className="h-full overflow-auto font-mono text-[11px] px-3 py-2 cursor-text"
              style={{ background: '#0a0d15', height: 'calc(100% - 28px)' }}
              onClick={() => termInputRef.current?.focus()}
            >
              {termLines.map((line, i) => (
                <div key={i} className="leading-relaxed whitespace-pre-wrap" style={{
                  color: line.type === 'error' ? '#f87171' : line.type === 'success' ? '#34d399' : line.type === 'input' ? '#818cf8' : line.type === 'info' ? '#94a3b8' : '#c8c8c8'
                }}>
                  {line.text}
                </div>
              ))}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-emerald-400">$</span>
                <input
                  ref={termInputRef}
                  value={termInput}
                  onChange={e => setTermInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') runTerminalCommand();
                    if (e.key === 'ArrowUp') { const idx = Math.min(historyIdx + 1, termHistory.length - 1); setHistoryIdx(idx); setTermInput(termHistory[idx] || ''); }
                    if (e.key === 'ArrowDown') { const idx = Math.max(historyIdx - 1, -1); setHistoryIdx(idx); setTermInput(idx === -1 ? '' : termHistory[idx] || ''); }
                  }}
                  className="flex-1 bg-transparent outline-none text-[11px] font-mono"
                  style={{ color: '#e2e8f0', caretColor: '#34d399' }}
                  placeholder="type a command..."
                  spellCheck={false}
                />
              </div>
              <div ref={termEndRef} />
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex flex-col shrink-0 border-l" style={{ width: 310, borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="h-8 flex items-center border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            {(['chat', 'activity', 'terminal'] as PanelTab[]).map(tab => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className={`h-8 flex-1 text-[10px] capitalize font-medium border-b-2 transition-colors relative ${panelTab === tab ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/30 hover:text-white/60'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'activity' && activityLog.length > 0 && <span className="absolute top-1.5 right-2 w-1 h-1 rounded-full bg-indigo-400" />}
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
                      {msg.role === 'assistant' ? 'AI' : 'U'}
                    </div>
                    <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed whitespace-pre-wrap break-words ${msg.role === 'assistant' ? 'bg-white/4 text-white/75' : 'bg-indigo-600/25 text-indigo-200'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex gap-1.5">
                    <div className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[8px] font-bold shrink-0">AI</div>
                    <div className="px-2.5 py-1.5 bg-white/4 rounded-xl flex gap-1 items-center">
                      {[0, 1, 2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex gap-1.5 items-end rounded-xl border px-2 py-1.5" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                  <textarea
                    value={input} onChange={e => setInput(e.target.value)}
                    placeholder="Ask AI to build something..."
                    rows={2}
                    className="flex-1 bg-transparent text-[11px] resize-none outline-none text-white/70 placeholder-white/20"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <button onClick={sendMessage} disabled={aiLoading || !input.trim()}
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: aiLoading || !input.trim() ? 'rgba(255,255,255,0.05)' : '#6366f1', color: aiLoading || !input.trim() ? 'rgba(255,255,255,0.2)' : '#fff' }}>
                    <BsRobot size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVITY */}
          {panelTab === 'activity' && (
            <div className="flex-1 overflow-auto p-2 space-y-0.5">
              {activityLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/15 gap-2">
                  <BsCheckCircleFill size={24} />
                  <p className="text-[11px]">No activity yet</p>
                </div>
              ) : activityLog.map(entry => {
                const Icon = ACTIVITY_ICONS[entry.kind] || BsRobot;
                const color = ACTIVITY_COLORS[entry.kind] || '#94a3b8';
                return (
                  <div key={entry.id} className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white/3 transition-colors">
                    <div className="shrink-0 mt-0.5"><Icon size={11} style={{ color }} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/60 truncate">{entry.message}</p>
                      {entry.path && <p className="text-[9px] text-white/25 font-mono truncate">{entry.path}</p>}
                    </div>
                    <span className="text-[8px] text-white/15 shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                );
              })}
              <div ref={activityEndRef} />
            </div>
          )}

          {/* TERMINAL (right panel) */}
          {panelTab === 'terminal' && (
            <div className="flex-1 flex flex-col overflow-hidden font-mono text-[11px]" style={{ background: '#0a0d15' }}>
              <div className="flex-1 overflow-auto p-2">
                {termLines.map((line, i) => (
                  <div key={i} className="leading-relaxed whitespace-pre-wrap" style={{
                    color: line.type === 'error' ? '#f87171' : line.type === 'success' ? '#34d399' : line.type === 'input' ? '#818cf8' : line.type === 'info' ? '#94a3b8' : '#c8c8c8'
                  }}>
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
