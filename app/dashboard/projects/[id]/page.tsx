'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  BsGlobe,
  BsFileCode, BsFolder, BsFolder2Open, BsPlus, BsTrash3,
  BsChevronDown, BsChevronRight,
  BsFileEarmarkCode, BsFileEarmark, BsFileEarmarkText, BsSearch,
  BsDownload,
  BsFileEarmarkRichtext, BsBrush, BsStars
} from 'react-icons/bs';
import {
  HiArrowLeft,
  HiFolder, HiMenu, HiOutlineFolder, HiCode, HiPaperAirplane
} from 'react-icons/hi';
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
  toml: 'ini', env: 'plaintext', gitignore: 'plaintext',
};

const FILE_ICONS: Record<string, any> = {
  ts: BsFileEarmarkCode, tsx: BsFileEarmarkCode,
  js: BsFileEarmarkCode, jsx: BsFileEarmarkCode,
  py: BsFileEarmarkCode, json: BsFileEarmarkCode,
  md: BsFileEarmarkText, txt: BsFileEarmarkText,
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

// Add a file to the tree, creating intermediate folders if needed
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

// ─────────────────────────── AI Operations Parser ───────────────────────────
function parseAIResponse(raw: string): { text: string; ops: FileOp[] } {
  const opsMatch = raw.match(/<nexios_ops>([\s\S]*?)<\/nexios_ops>/i);
  const text = raw.replace(/<nexios_ops>[\s\S]*?<\/nexios_ops>/gi, '').trim();
  let ops: FileOp[] = [];
  if (opsMatch) {
    try {
      const parsed = JSON.parse(opsMatch[1].trim());
      if (Array.isArray(parsed)) ops = parsed;
    } catch { /* malformed JSON ops block — skip */ }
  }
  return { text, ops };
}

// ─────────────────────────── Thinking Animation ───────────────────────────
function ThinkingAnimation() {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.2)' }}>
        <BsStars size={12} className="text-indigo-400" />
      </div>
      <div className="flex items-center gap-1">
        <div className="thinking-bar" style={{ animationDelay: '0ms' }} />
        <div className="thinking-bar" style={{ animationDelay: '120ms' }} />
        <div className="thinking-bar" style={{ animationDelay: '240ms' }} />
        <div className="thinking-bar" style={{ animationDelay: '360ms' }} />
        <div className="thinking-bar" style={{ animationDelay: '480ms' }} />
      </div>
      <span className="text-[10px] text-white/30 ml-1">Working…</span>
    </div>
  );
}

// ─────────────────────────── File Tree ───────────────────────────
function FileTree({ nodes, onSelect, selectedPath, onDelete, onRename, onAdd, expanded, setExpanded }: {
  nodes: FileNode[];
  onSelect: (path: string) => void;
  selectedPath: string;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  onAdd: (parentPath: string, type: 'file' | 'folder') => void;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
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
            className="w-full text-[11px] bg-black/40 border border-white/20 rounded px-1.5 py-0.5 outline-none focus:border-indigo-400 text-white"
            autoFocus />
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

// ─────────────────────────── Markdown-like renderer ───────────────────────────
function MessageContent({ content }: { content: string }) {
  // Bold, code inline, newlines
  const lines = content.split('\n');
  return (
    <div className="space-y-1 text-[12px] leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('```')) return null;
        // Render inline code
        const parts = line.split(/(`[^`]+`)/g);
        return (
          <p key={i} className="whitespace-pre-wrap break-words">
            {parts.map((part, j) => {
              if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={j} className="px-1 py-0.5 rounded text-[11px] font-mono" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>{part.slice(1, -1)}</code>;
              }
              // Bold
              const bold = part.split(/(\*\*[^*]+\*\*)/g);
              return bold.map((b, k) => {
                if (b.startsWith('**') && b.endsWith('**')) return <strong key={k} className="text-white font-semibold">{b.slice(2, -2)}</strong>;
                return <span key={k}>{b}</span>;
              });
            })}
          </p>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Op Pill ───────────────────────────
function OpPill({ op }: { op: FileOp }) {
  const colors: Record<string, string> = {
    create: '#34d399', edit: '#60a5fa', delete: '#f87171', mkdir: '#fbbf24'
  };
  const labels: Record<string, string> = {
    create: 'Created', edit: 'Edited', delete: 'Deleted', mkdir: 'Created folder'
  };
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors[op.op] || '#fff' }} />
      <span className="text-[10px]" style={{ color: colors[op.op] || '#fff' }}>{labels[op.op] || op.op}</span>
      <span className="text-[10px] text-white/40 font-mono">{op.path}</span>
    </div>
  );
}

// ─────────────────────────── Main Component ───────────────────────────
type PanelTab = 'chat' | 'terminal';
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
  const [autonomousMode, setAutonomousMode] = useState(false);

  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hello! I\'m Nexios AI. I can create files, write code, edit anything in your workspace, and help you build. What would you like to make?', timestamp: Date.now() }
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

  // Load project
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
    if (savedChat) {
      try { setMessages(JSON.parse(savedChat)); } catch { /* ignore */ }
    }
    const savedAuto = localStorage.getItem('nexios_autonomous_mode');
    if (savedAuto) setAutonomousMode(savedAuto === 'true');
  }, [id]);

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

  // Apply file operations silently
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
          const folderNode = createFolderNode(op.path.split('/').pop() || op.path, op.path.includes('/') ? op.path.split('/').slice(0, -1).join('/') : '');
          current = [...current, folderNode];
          appliedOps.push(op);
          setTermLines(p => [...p, { type: 'success', text: `✓ Created folder: ${op.path}` }]);
        }
      } catch { /* ignore failed op */ }
    }

    setFiles(current);

    // Auto-select the first created/edited file
    const firstFileOp = appliedOps.find(o => o.op === 'create' || o.op === 'edit');
    if (firstFileOp && (firstFileOp.op === 'create' || firstFileOp.op === 'edit')) {
      setSelectedPath(firstFileOp.path);
      setContentTab('code');
    }

    return { current, appliedOps };
  }, []);

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
    if (creatingIn.type === 'file') setSelectedPath(newNode.path);
    setCreatingIn(null);
    setNewFileName('');
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify({ project, files, chat: messages, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${project?.name || 'project'}-export.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const runTerminalCommand = async () => {
    if (!termInput.trim()) return;
    const cmd = termInput.trim();
    setTermLines(p => [...p, { type: 'input', text: `$ ${cmd}` }]);
    setTermInput('');

    const [command, ...args] = cmd.split(' ');
    if (command === 'ls') {
      const paths = getAllFilePaths(files);
      paths.forEach(p => setTermLines(prev => [...prev, { type: 'output', text: p }]));
    } else if (command === 'cat' && args[0]) {
      const node = findNodeByPath(files, args[0]);
      if (node?.content) setTermLines(p => [...p, { type: 'output', text: node.content! }]);
      else setTermLines(p => [...p, { type: 'error', text: `cat: ${args[0]}: No such file` }]);
    } else if (command === 'touch' && args[0]) {
      const newNode = createFileNode(args[0], '');
      setFiles(prev => [...prev, newNode]);
      setTermLines(p => [...p, { type: 'success', text: `Created: ${args[0]}` }]);
    } else if (command === 'rm' && args[0]) {
      setFiles(prev => deleteNodeByPath(prev, args[0]));
      setTermLines(p => [...p, { type: 'success', text: `Deleted: ${args[0]}` }]);
    } else if (command === 'pwd') {
      setTermLines(p => [...p, { type: 'output', text: '/workspace' }]);
    } else if (command === 'clear') {
      setTermLines([]);
    } else {
      setTermLines(p => [...p, { type: 'error', text: `Command not found: ${command}` }]);
    }
  };

  // ─── Main AI Send ───
  const sendMessage = async () => {
    if (!input.trim() || aiLoading) return;

    const apiKey = getApiKey(activeProvider.id);
    if (!apiKey) {
      setMessages(p => [...p, {
        role: 'assistant',
        content: `⚠️ Please add your ${activeProvider.name} API key in Settings first.`,
        timestamp: Date.now()
      }]);
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    setAiLoading(true);

    try {
      const currentFile = selectedPath ? findNodeByPath(files, selectedPath) : null;
      const allPaths = getAllFilePaths(files);

      // Build the file context (content of open file, list of all files)
      const fileContext = currentFile
        ? `\nCurrently open file (${selectedPath}):\n\`\`\`\n${currentFile.content?.slice(0, 1200) || ''}\n\`\`\``
        : '';

      const autonomousContext = autonomousMode
        ? `\n\nAUTONOMOUS MODE ENABLED: You have full awareness of your own capabilities. You can propose improvements to how you work. To self-improve, you can create or edit files within the project that represent logic or configuration changes.`
        : '';

      const systemPrompt = `You are Nexios AI — an intelligent coding assistant with direct file system access. You work silently and efficiently. You can create, edit, and delete files instantly.

Project: "${project?.name || 'Untitled'}" (${project?.language || 'Unknown'})
Files in workspace (${allPaths.length} total): ${allPaths.slice(0, 15).join(', ') || 'none'}${fileContext}${autonomousContext}

## HOW YOU WORK
When you need to create or modify files, output a \`<nexios_ops>\` block containing a JSON array of operations. This block is NEVER shown to the user — it's executed automatically.

## FILE OPERATION FORMAT
<nexios_ops>
[
  {"op": "create", "path": "index.html", "content": "<!DOCTYPE html>\\n<html>...</html>"},
  {"op": "edit", "path": "style.css", "content": "body { margin: 0; }"},
  {"op": "delete", "path": "old-file.js"},
  {"op": "mkdir", "path": "components"}
]
</nexios_ops>

## CRITICAL RULES
1. When asked to create a file — ALWAYS use a nexios_ops block. NEVER paste the code into the chat.
2. When asked to edit a file — use nexios_ops with op:"edit" and include the COMPLETE new file content.
3. Your chat response should describe what you did/are doing. Be concise and direct.
4. Do NOT show code blocks in the chat response when you're writing to a file. Just say "I've created..." or "Done — here's what I built:"
5. For conversational questions, answer normally without any ops block.
6. Always write complete, working, production-quality code in your ops.
7. Use correct file paths (e.g. "src/components/Button.tsx" not just "Button.tsx").`;

      const messagesForAI = [
        { role: 'user' as const, content: systemPrompt },
        ...messages.slice(-10).map(m => ({
          role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
          content: m.content
        })),
        { role: 'user' as const, content: userMsg }
      ];

      const rawResponse = await callAI(activeProvider.id, activeModel.id, messagesForAI, apiKey);

      // Parse the response — split ops from conversational text
      const { text, ops } = parseAIResponse(rawResponse);

      // Apply file operations in the background
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
      setMessages(p => [...p, {
        role: 'assistant',
        content: `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      }]);
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

  return (
    <div className="h-screen flex flex-col" style={{ background: '#080c14', color: '#fff' }}>
      <style>{`
        .thinking-bar {
          width: 3px;
          height: 16px;
          border-radius: 2px;
          background: linear-gradient(180deg, #6366f1, #818cf8);
          animation: thinkingPulse 0.9s ease-in-out infinite;
          transform-origin: bottom;
        }
        @keyframes thinkingPulse {
          0%, 100% { transform: scaleY(0.35); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        .op-appear {
          animation: opSlideIn 0.3s ease-out;
        }
        @keyframes opSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Top Bar ── */}
      <div className="h-10 flex items-center gap-3 px-3 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
        <Link href="/dashboard/projects" className="text-white/40 hover:text-white/80 transition-colors">
          <HiArrowLeft size={14} />
        </Link>
        <div className="w-px h-4 bg-white/10" />

        <div className="flex items-center gap-2">
          {projectType === 'code' && <HiCode size={13} className="text-indigo-400" />}
          {projectType === 'design' && <BsBrush size={12} className="text-pink-400" />}
          {projectType === 'document' && <BsFileEarmarkRichtext size={12} className="text-emerald-400" />}
          <span className="text-[12px] font-semibold text-white/90">{project?.name || 'Loading…'}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>{projectType}</span>
        </div>

        <div className="flex-1" />

        {/* Single AI status indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${aiLoading ? 'bg-yellow-400 animate-pulse' : 'bg-indigo-400'}`} />
          <span className="text-[10px] font-medium text-indigo-300">
            {aiLoading ? 'Working…' : 'Nexios AI'}
          </span>
        </div>

        {autonomousMode && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
            ⚡ AUTONOMOUS
          </div>
        )}

        <button onClick={exportProject} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/5 transition-colors">
          <BsDownload size={11} /> Export
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

        {/* ── Left Sidebar ── */}
        {sidebarOpen && (
          <div className="flex flex-col shrink-0 border-r" style={{ width: 180, borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="h-8 flex items-center justify-between px-2 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
              <span className="text-[9px] font-bold tracking-widest text-white/30">EXPLORER</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="text-white/30 hover:text-white/80 transition-colors" title="New file"><BsPlus size={14} /></button>
                <button onClick={() => setSidebarOpen(false)} className="text-white/30 hover:text-white/80 transition-colors"><HiMenu size={13} /></button>
              </div>
            </div>

            {creatingIn && (
              <div className="p-1.5 border-b flex gap-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <input value={newFileName} onChange={e => setNewFileName(e.target.value)}
                  placeholder={creatingIn.type === 'file' ? 'file.ts' : 'folder'}
                  className="flex-1 px-2 py-0.5 text-[10px] bg-black/40 border border-white/20 rounded outline-none focus:border-indigo-400"
                  onKeyDown={e => e.key === 'Enter' && handleCreateItem()} autoFocus />
                <button onClick={handleCreateItem} className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] rounded hover:bg-indigo-700">✓</button>
                <button onClick={() => setCreatingIn(null)} className="px-1.5 py-0.5 bg-white/10 text-white/60 text-[9px] rounded hover:bg-white/20">✕</button>
              </div>
            )}

            <div className="flex-1 overflow-auto py-1">
              <FileTree nodes={files} onSelect={p => { setSelectedPath(p); setContentTab('code'); }}
                selectedPath={selectedPath} onDelete={handleDeleteFile} onRename={handleRename}
                onAdd={(path, type) => setCreatingIn({ path, type })}
                expanded={expandedFolders} setExpanded={setExpandedFolders} />
            </div>

            {/* AI working indicator in sidebar */}
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

        {/* ── Center Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-8 flex items-center gap-0 border-b shrink-0 px-1" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="mr-2 text-white/30 hover:text-white/80 transition-colors"><HiMenu size={13} /></button>
            )}
            {[
              { id: 'code', label: 'Code', icon: BsFileCode },
              { id: 'files', label: 'Files', icon: HiOutlineFolder },
              ...(projectType !== 'document' ? [{ id: 'design', label: 'Design', icon: BsBrush }] : []),
              { id: 'document', label: 'Document', icon: BsFileEarmarkRichtext },
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
              <div className="h-7 flex items-center justify-between px-2 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="text-[10px] text-white/40 font-mono">{selectedPath || 'No file selected'}</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <BsSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" size={9} />
                    <input value={codeSearch} onChange={e => setCodeSearch(e.target.value)}
                      placeholder="Search…" className="w-28 pl-5 pr-2 py-0.5 text-[10px] bg-black/40 rounded border border-white/10 focus:border-indigo-400 outline-none" />
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
                    options={{ fontSize: 12, minimap: { enabled: false }, lineNumbers: 'on', padding: { top: 8 }, scrollBeyondLastLine: false, wordWrap: 'on' }} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
                    <BsFileCode size={32} />
                    <p className="text-sm">Select a file or ask AI to create one</p>
                    <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="text-[11px] px-3 py-1.5 rounded border border-white/10 hover:border-indigo-400 hover:text-indigo-300 transition-colors">
                      + Create new file
                    </button>
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
                <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="text-[10px] px-2 py-1 rounded border border-white/10 hover:border-indigo-400 text-white/50 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  <BsPlus size={12} /> New File
                </button>
              </div>
              {getAllFilePaths(files).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/20">
                  <HiFolder size={40} />
                  <p className="text-sm mt-3">No files yet — ask AI to create some</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {getAllFilePaths(files).map(path => (
                    <div key={path} onClick={() => { setSelectedPath(path); setContentTab('code'); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedPath === path ? 'bg-indigo-600/20' : 'hover:bg-white/5'}`}>
                      <BsFileCode size={12} className="text-indigo-400 shrink-0" />
                      <span className={`text-[12px] font-mono ${selectedPath === path ? 'text-indigo-300' : 'text-white/60'}`}>{path}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DESIGN VIEW */}
          {contentTab === 'design' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.2)' }}>
                <BsBrush size={24} className="text-pink-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Design Canvas</h3>
                <p className="text-sm text-white/40 max-w-xs">Import a Figma design or describe your UI — the AI will generate your components directly.</p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/30 transition-colors" onClick={() => {
                  const url = prompt('Paste your Figma file URL:');
                  if (url) {
                    const content = `# Figma Design Import\n\nSource: ${url}\n\nImported: ${new Date().toISOString()}\n\nAsk AI to convert this Figma design to code.`;
                    setFiles(prev => [...prev, createFileNode('figma-import.md', content)]);
                    setSelectedPath('figma-import.md');
                    setContentTab('code');
                  }
                }}>
                  <BsGlobe size={13} /> Import from Figma
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
              <div className="h-7 flex items-center px-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="text-[10px] text-white/40">Document Editor</span>
              </div>
              <textarea
                value={docContent} onChange={e => setDocContent(e.target.value)}
                placeholder={`Start writing your document here...\n\nUse markdown formatting:\n# Heading 1\n## Heading 2\n**Bold** and *italic* text\n- Bullet points\n\nAsk AI in the chat to help draft, edit, or expand content.`}
                className="flex-1 p-5 bg-transparent text-[13px] text-white/80 resize-none outline-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="flex flex-col shrink-0 border-l" style={{ width: 308, borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="h-8 flex items-center border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            {(['chat', 'terminal'] as PanelTab[]).map(tab => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className={`h-8 flex-1 text-[10px] capitalize font-medium border-b-2 transition-colors ${panelTab === tab ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/30 hover:text-white/60'}`}>
                {tab === 'chat' ? '✦ Chat' : 'Terminal'}
              </button>
            ))}
          </div>

          {/* ── CHAT PANEL ── */}
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
                    <div className={`flex-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`} style={{ maxWidth: '88%' }}>
                      <div className={`px-3 py-2 rounded-2xl ${msg.role === 'assistant'
                        ? 'rounded-tl-sm text-white/85'
                        : 'rounded-tr-sm text-white ml-auto'}`}
                        style={{
                          background: msg.role === 'assistant' ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                          border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.07)' : 'none'
                        }}>
                        <MessageContent content={msg.content} />
                      </div>
                      {/* File operation pills */}
                      {msg.ops && msg.ops.length > 0 && (
                        <div className="px-1 op-appear">
                          {msg.ops.map((op, j) => <OpPill key={j} op={op} />)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {aiLoading && <ThinkingAnimation />}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-2 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                    }}
                    placeholder="Ask anything — create files, write code, fix bugs…"
                    rows={1}
                    className="flex-1 px-3 py-2 text-[12px] rounded-xl outline-none resize-none border transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderColor: input.trim() ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      maxHeight: 96,
                      overflowY: 'auto'
                    }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = 'auto';
                      t.style.height = Math.min(t.scrollHeight, 96) + 'px';
                    }}
                  />
                  <button onClick={sendMessage} disabled={aiLoading || !input.trim()}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 shrink-0"
                    style={{ background: input.trim() ? '#6366f1' : 'rgba(99,102,241,0.2)' }}>
                    <HiPaperAirplane size={14} className="rotate-90" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5 px-0.5">
                  <span className="text-[9px] text-white/20">↵ to send · Shift+↵ for new line</span>
                  <span className="text-[9px] text-white/20">{activeModel.name.split(' ')[0]}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── TERMINAL PANEL ── */}
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
              <div className="p-2 border-t flex gap-2 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="text-green-400 font-mono text-[11px] mt-1.5">$</span>
                <input value={termInput} onChange={e => setTermInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runTerminalCommand()}
                  placeholder="ls, cat, touch, rm, pwd…"
                  className="flex-1 bg-transparent outline-none text-[11px] font-mono text-white/80" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click away for model selector */}
      {showModelSelector && <div className="fixed inset-0 z-40" onClick={() => setShowModelSelector(false)} />}
    </div>
  );
}
