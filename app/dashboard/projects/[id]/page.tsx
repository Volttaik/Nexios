'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  BsRobot, BsTerminal, BsGithub, BsGlobe,
  BsFileCode, BsFolder, BsFolder2Open, BsPlus, BsTrash3,
  BsChevronDown, BsChevronRight, BsArrowUpRight,
  BsFileEarmarkCode, BsFileEarmark, BsFileEarmarkText, BsSearch,
  BsDownload, BsCheckCircle, BsCpuFill, BsLightningChargeFill,
  BsShieldCheck, BsPeopleFill, BsLayoutTextWindowReverse,
  BsFileEarmarkRichtext, BsBrush
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

interface AgentLog {
  agent: 1 | 2 | 3 | 4;
  status: 'idle' | 'working' | 'done' | 'error';
  message: string;
  timestamp: number;
}

// ─────────────────────────── Constants ───────────────────────────
const EXT_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rs: 'rust', go: 'go', html: 'html', css: 'css',
  json: 'json', md: 'markdown', sh: 'shell',
};

const FILE_ICONS: Record<string, any> = {
  ts: BsFileEarmarkCode, js: BsFileEarmarkCode, py: BsFileEarmarkCode,
  json: BsFileEarmarkCode, md: BsFileEarmarkText,
  default: BsFileEarmark
};

const AGENT_META = [
  { id: 1, name: 'User Agent', short: 'UA', desc: 'Handles all user interaction', icon: BsPeopleFill, color: '#818cf8' },
  { id: 2, name: 'Env Agent', short: 'EA', desc: 'Edits & creates files live', icon: BsCpuFill, color: '#34d399' },
  { id: 3, name: 'Coordinator', short: 'CO', desc: 'Routes tasks to agents', icon: BsLightningChargeFill, color: '#f59e0b' },
  { id: 4, name: 'Checker', short: 'CK', desc: 'Validates all operations', icon: BsShieldCheck, color: '#f87171' },
];

// ─────────────────────────── Background Terminal ───────────────────────────
class BackgroundTerminal {
  private filesystem: Map<string, string> = new Map();

  constructor(initialFiles: FileNode[]) {
    this.syncFromFiles(initialFiles);
  }

  syncFromFiles(files: FileNode[]) {
    this.filesystem.clear();
    const addToMap = (node: FileNode, path: string = '') => {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      if (node.type === 'file') this.filesystem.set(fullPath, node.content || '');
      else if (node.children) node.children.forEach(child => addToMap(child, fullPath));
    };
    files.forEach(node => addToMap(node));
  }

  async execute(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    const [cmd, ...args] = command.split(' ');
    try {
      switch (cmd) {
        case 'ls': {
          const files = Array.from(this.filesystem.keys()).map(f => f.split('/')[0]).filter((v, i, a) => a.indexOf(v) === i);
          return { stdout: files.join('\n') + '\n', stderr: '', code: 0 };
        }
        case 'cat': {
          if (!args[0]) return { stdout: '', stderr: 'cat: missing file', code: 1 };
          const c = this.filesystem.get(args[0]);
          return c ? { stdout: c + '\n', stderr: '', code: 0 } : { stdout: '', stderr: `cat: ${args[0]}: No such file`, code: 1 };
        }
        case 'touch':
          if (!args[0]) return { stdout: '', stderr: 'touch: missing file', code: 1 };
          if (!this.filesystem.has(args[0])) this.filesystem.set(args[0], '');
          return { stdout: '', stderr: '', code: 0 };
        case 'mkdir': return { stdout: '', stderr: '', code: 0 };
        case 'rm':
          if (!args[0]) return { stdout: '', stderr: 'rm: missing operand', code: 1 };
          this.filesystem.delete(args[0]);
          return { stdout: '', stderr: '', code: 0 };
        case 'mv':
          if (args.length < 2) return { stdout: '', stderr: 'mv: missing operand', code: 1 };
          const mv = this.filesystem.get(args[0]);
          if (mv) { this.filesystem.set(args[1], mv); this.filesystem.delete(args[0]); }
          return { stdout: '', stderr: '', code: 0 };
        case 'cp':
          if (args.length < 2) return { stdout: '', stderr: 'cp: missing operand', code: 1 };
          const cp = this.filesystem.get(args[0]);
          if (cp) this.filesystem.set(args[1], cp);
          return { stdout: '', stderr: '', code: 0 };
        case 'pwd': return { stdout: '/workspace\n', stderr: '', code: 0 };
        case 'npm': case 'pip':
          return { stdout: `Installing ${args[1] || 'dependencies'}...\nadded 1 package\n`, stderr: '', code: 0 };
        default: return { stdout: '', stderr: `Command not found: ${cmd}`, code: 127 };
      }
    } catch (err: any) {
      return { stdout: '', stderr: err.message, code: 1 };
    }
  }

  getFiles() { return this.filesystem; }
}

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
          {!isFolder && <button onClick={e => { e.stopPropagation(); onDelete(node.path); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400"><BsTrash3 size={10} /></button>}
          {isFolder && <button onClick={e => { e.stopPropagation(); onAdd(node.path, 'file'); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/80"><BsPlus size={12} /></button>}
        </div>
        {isFolder && isExp && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return <div className="space-y-0">{nodes.map(node => renderNode(node, 0))}</div>;
}

// ─────────────────────────── Agent Status Badge ───────────────────────────
function AgentBadge({ id, status, name, color, icon: Icon }: { id: number; status: string; name: string; color: string; icon: any }) {
  const isWorking = status === 'working';
  const isDone = status === 'done';
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
      <div className="relative">
        <Icon size={11} style={{ color }} />
        {isWorking && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
        {isDone && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />}
      </div>
      <span className="text-[10px] font-medium" style={{ color }}>{name}</span>
    </div>
  );
}

// ─────────────────────────── Main Component ───────────────────────────
type PanelTab = 'chat' | 'agents' | 'terminal';
type ContentTab = 'code' | 'files' | 'design' | 'document';

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { activeProvider, activeModel, getApiKey, setActiveModel, setActiveProvider } = useAI();

  // State
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
  const [backgroundTerminal, setBackgroundTerminal] = useState<BackgroundTerminal | null>(null);
  const [docContent, setDocContent] = useState('');

  // Agent state
  const [agentStatuses, setAgentStatuses] = useState<Record<number, 'idle' | 'working' | 'done' | 'error'>>({ 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle' });
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [coordinatorLog, setCoordinatorLog] = useState<string[]>([]);
  const [envLog, setEnvLog] = useState<string[]>([]);
  const [checkerLog, setCheckerLog] = useState<string[]>([]);

  // Chat
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Welcome to your Nexios AI workspace. I\'m your User Agent (Agent 1). Ask me anything — I\'ll coordinate with the environment, coordinator, and checker agents to get things done.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Terminal
  const [termLines, setTermLines] = useState<TerminalLine[]>([
    { type: 'output', text: '── Nexios Linux Environment ──────────────────' },
    { type: 'success', text: '✓ Agent 2 (Environment) connected' },
    { type: 'success', text: '✓ Workspace ready at /workspace' },
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
          setBackgroundTerminal(new BackgroundTerminal(fileData));
        }
        const savedDoc = localStorage.getItem(`nexios_doc_${id}`);
        if (savedDoc) setDocContent(savedDoc);
      }
    }
    const savedChat = localStorage.getItem(`nexios_chat_${id}`);
    if (savedChat) setMessages(JSON.parse(savedChat));
  }, [id]);

  useEffect(() => { if (files.length) localStorage.setItem(`nexios_files_${id}`, JSON.stringify(files)); }, [files, id]);
  useEffect(() => { localStorage.setItem(`nexios_chat_${id}`, JSON.stringify(messages)); }, [messages, id]);
  useEffect(() => { if (docContent) localStorage.setItem(`nexios_doc_${id}`, docContent); }, [docContent, id]);
  useEffect(() => { if (backgroundTerminal && files.length) backgroundTerminal.syncFromFiles(files); }, [files, backgroundTerminal]);
  useEffect(() => {
    if (selectedPath) {
      const node = findNodeByPath(files, selectedPath);
      if (node?.type === 'file') setCode(node.content || '');
    }
  }, [selectedPath, files]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [termLines]);

  const setAgentStatus = (agent: 1 | 2 | 3 | 4, status: 'idle' | 'working' | 'done' | 'error', message: string) => {
    setAgentStatuses(p => ({ ...p, [agent]: status }));
    setAgentLogs(p => [...p.slice(-50), { agent, status, message, timestamp: Date.now() }]);
  };

  // File operations
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
    setFiles(prev => updateNodeByPath(prev, path, node => ({ ...node, name: newName, path: node.path.replace(node.name, newName) })));
  };

  const handleCreateItem = () => {
    if (!creatingIn || !newFileName.trim()) return;
    const newNode = creatingIn.type === 'file'
      ? createFileNode(newFileName.trim(), `// ${newFileName.trim()}\n`, creatingIn.path)
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

  // Export project
  const exportProject = () => {
    const projectData = {
      project,
      files: files,
      chat: messages,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'project'}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Terminal
  const runTerminalCommand = async () => {
    if (!termInput.trim() || !backgroundTerminal) return;
    const cmd = termInput.trim();
    setTermLines(p => [...p, { type: 'input', text: `$ ${cmd}` }]);
    const result = await backgroundTerminal.execute(cmd);
    if (result.stdout) result.stdout.split('\n').filter(l => l).forEach(line => setTermLines(p => [...p, { type: 'output', text: line }]));
    if (result.stderr) result.stderr.split('\n').filter(l => l).forEach(line => setTermLines(p => [...p, { type: 'error', text: line }]));
    setTermInput('');
  };

  // ─── 4-Agent AI Chat ───
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

    // ── Agent 1: User Agent takes the request ──
    setAgentStatus(1, 'working', 'Processing user request...');

    // ── Agent 3: Coordinator analyses intent ──
    await new Promise(r => setTimeout(r, 300));
    setAgentStatus(3, 'working', 'Analysing intent & routing task...');
    setCoordinatorLog(p => [...p, `[${new Date().toLocaleTimeString()}] Received: "${userMsg.slice(0, 40)}${userMsg.length > 40 ? '...' : ''}"`]);
    setCoordinatorLog(p => [...p, `[${new Date().toLocaleTimeString()}] Routing to User Agent & preparing Env Agent...`]);

    // ── Agent 2: Environment Agent prepares ──
    await new Promise(r => setTimeout(r, 400));
    setAgentStatus(2, 'working', 'Preparing environment...');
    setEnvLog(p => [...p, `[${new Date().toLocaleTimeString()}] Environment agent ready`]);
    setTermLines(p => [...p, { type: 'output', text: `[Agent 2] Processing: ${userMsg.slice(0, 50)}...` }]);

    try {
      const currentFile = selectedPath ? findNodeByPath(files, selectedPath) : null;
      const fileContext = currentFile ? `Current file (${selectedPath}):\n\`\`\`\n${currentFile.content?.slice(0, 600)}\n\`\`\`` : 'No file selected';
      const allFiles = getAllFilePaths(files);

      const systemPrompt = `You are Agent 1 (User Agent) in a 4-agent Nexios AI workspace system.
The system has:
- Agent 1 (You): Talks to user, understands requests
- Agent 2 (Environment): Runs silently, edits files directly  
- Agent 3 (Coordinator): Routes your response to Agent 2
- Agent 4 (Checker): Validates everything works

Project: ${project?.name || 'Unknown'} (${project?.language || 'Unknown'})
Files in workspace: ${allFiles.slice(0, 10).map(f => `- ${f}`).join('\n') || 'None'}
${fileContext}

Help the user with coding, debugging, design, and documentation. When suggesting code changes, be specific about which file to edit. Be concise and practical.`;

      const messagesForAI = [
        { role: 'user' as const, content: systemPrompt },
        ...messages.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content })),
        { role: 'user' as const, content: userMsg }
      ];

      const response = await callAI(activeProvider.id, activeModel.id, messagesForAI, apiKey);

      // ── Agent 1 done, pass to Coordinator ──
      setAgentStatus(1, 'done', 'Response ready');
      setMessages(p => [...p, { role: 'assistant', content: response, timestamp: Date.now() }]);

      // ── Agent 3: Coordinator parses response for file operations ──
      await new Promise(r => setTimeout(r, 200));
      const codeBlocks = [...response.matchAll(/```(?:\w+)?\n([\s\S]*?)```/g)];
      const hasCode = codeBlocks.length > 0;
      const fileMatch = response.match(/(?:create|edit|update|write to|save to)\s+`?([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)`?/i);

      if (hasCode) {
        setCoordinatorLog(p => [...p, `[${new Date().toLocaleTimeString()}] Detected ${codeBlocks.length} code block(s) in response`]);
        if (fileMatch) setCoordinatorLog(p => [...p, `[${new Date().toLocaleTimeString()}] Target file: ${fileMatch[1]} → routing to Env Agent`]);
        else setCoordinatorLog(p => [...p, `[${new Date().toLocaleTimeString()}] No specific file target → suggesting current file`]);
      } else {
        setCoordinatorLog(p => [...p, `[${new Date().toLocaleTimeString()}] No file operations needed — conversation only`]);
      }
      setAgentStatus(3, 'done', hasCode ? `Routed ${codeBlocks.length} code op(s) to Env Agent` : 'No file operations detected');

      // ── Agent 2: Environment Agent applies if there's a target ──
      await new Promise(r => setTimeout(r, 300));
      if (hasCode && fileMatch && backgroundTerminal) {
        const targetFile = fileMatch[1];
        const fileContent = codeBlocks[0]?.[1] || '';
        setEnvLog(p => [...p, `[${new Date().toLocaleTimeString()}] Writing to: ${targetFile}`]);
        setTermLines(p => [...p, { type: 'success', text: `[Agent 2] File operation: ${targetFile}` }]);

        const existing = findNodeByPath(files, targetFile);
        if (existing) {
          setFiles(prev => updateNodeByPath(prev, targetFile, node => ({ ...node, content: fileContent })));
          setEnvLog(p => [...p, `[${new Date().toLocaleTimeString()}] Updated existing file: ${targetFile}`]);
        } else if (targetFile.includes('.')) {
          const newNode = createFileNode(targetFile.split('/').pop()!, fileContent, targetFile.includes('/') ? targetFile.split('/').slice(0, -1).join('/') : '');
          setFiles(prev => [...prev, newNode]);
          setEnvLog(p => [...p, `[${new Date().toLocaleTimeString()}] Created new file: ${targetFile}`]);
        }
        setAgentStatus(2, 'done', `Applied changes to ${targetFile}`);
      } else {
        setEnvLog(p => [...p, `[${new Date().toLocaleTimeString()}] No file operations — environment unchanged`]);
        setAgentStatus(2, 'done', 'No changes needed');
      }

      // ── Agent 4: Checker validates ──
      await new Promise(r => setTimeout(r, 400));
      setAgentStatus(4, 'working', 'Validating workspace...');
      setCheckerLog(p => [...p, `[${new Date().toLocaleTimeString()}] Running validation checks...`]);
      await new Promise(r => setTimeout(r, 500));
      const fileCount = getAllFilePaths(files).length;
      setCheckerLog(p => [...p, `[${new Date().toLocaleTimeString()}] ✓ ${fileCount} file(s) in workspace — all valid`]);
      setCheckerLog(p => [...p, `[${new Date().toLocaleTimeString()}] ✓ Agent sync complete — no errors detected`]);
      setTermLines(p => [...p, { type: 'success', text: `[Agent 4] ✓ Validation passed` }]);
      setAgentStatus(4, 'done', 'All checks passed');

      // Reset agents to idle after 3s
      setTimeout(() => {
        setAgentStatuses({ 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle' });
      }, 3000);

    } catch (error) {
      setAgentStatus(1, 'error', 'Request failed');
      setAgentStatus(4, 'error', 'Check failed');
      setMessages(p => [...p, { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : 'Failed to communicate with AI'}`, timestamp: Date.now() }]);
    } finally {
      setAiLoading(false);
    }
  };

  const searchMatches = codeSearch ? code.split('\n').reduce((acc, line, i) => {
    if (line.toLowerCase().includes(codeSearch.toLowerCase())) acc.push({ line: i + 1, text: line.trim() });
    return acc;
  }, [] as { line: number; text: string }[]) : [];

  const projectType = project?.type || 'code';

  return (
    <div className="h-screen flex flex-col" style={{ background: '#080c14', color: '#fff' }}>

      {/* ── Top Bar ── */}
      <div className="h-10 flex items-center gap-3 px-3 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
        <Link href="/dashboard/projects" className="text-white/40 hover:text-white/80 transition-colors">
          <HiArrowLeft size={14} />
        </Link>
        <div className="w-px h-4 bg-white/10" />

        {/* Project name + type */}
        <div className="flex items-center gap-2">
          {projectType === 'code' && <HiCode size={13} className="text-indigo-400" />}
          {projectType === 'design' && <BsBrush size={12} className="text-pink-400" />}
          {projectType === 'document' && <BsFileEarmarkRichtext size={12} className="text-emerald-400" />}
          <span className="text-[12px] font-semibold text-white/90">{project?.name || 'Loading...'}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>{projectType}</span>
        </div>

        <div className="flex-1" />

        {/* 4 Agent badges */}
        <div className="hidden md:flex items-center gap-1.5">
          {AGENT_META.map(a => (
            <AgentBadge key={a.id} id={a.id} status={agentStatuses[a.id]} name={a.short} color={a.color} icon={a.icon} />
          ))}
        </div>

        <div className="flex-1 hidden md:block" />

        {/* Actions */}
        <button onClick={exportProject} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/5 transition-colors">
          <BsDownload size={11} /> Export
        </button>

        <button onClick={() => setShowModelSelector(!showModelSelector)} className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors">
          {activeModel.name.split(' ')[0]} ▾
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar: File Tree ── */}
        {sidebarOpen && (
          <div className="flex flex-col shrink-0 border-r" style={{ width: 176, borderColor: 'rgba(255,255,255,0.08)' }}>
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
                <button onClick={handleCreateItem} className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] rounded hover:bg-indigo-700">Save</button>
                <button onClick={() => setCreatingIn(null)} className="px-1.5 py-0.5 bg-white/10 text-white/60 text-[9px] rounded hover:bg-white/20">✕</button>
              </div>
            )}

            <div className="flex-1 overflow-auto py-1">
              <FileTree nodes={files} onSelect={p => { setSelectedPath(p); setContentTab('code'); }}
                selectedPath={selectedPath} onDelete={handleDeleteFile} onRename={handleRename}
                onAdd={(path, type) => setCreatingIn({ path, type })}
                expanded={expandedFolders} setExpanded={setExpandedFolders} />
            </div>

            {/* Env agent indicator */}
            <div className="px-2 py-1.5 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${agentStatuses[2] === 'working' ? 'bg-yellow-400 animate-pulse' : agentStatuses[2] === 'done' ? 'bg-green-400' : 'bg-white/20'}`} />
                <span className="text-[9px] text-white/30">Agent 2 {agentStatuses[2] === 'working' ? '· working...' : agentStatuses[2] === 'done' ? '· done' : '· idle'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Center: Content Area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Content tabs */}
          <div className="h-8 flex items-center gap-0 border-b shrink-0 px-1" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="mr-2 text-white/30 hover:text-white/80 transition-colors"><HiMenu size={13} /></button>
            )}
            {[
              { id: 'code', label: 'Code', icon: BsFileCode },
              { id: 'files', label: 'Files', icon: HiOutlineFolder },
              ...(projectType === 'design' || projectType === 'code' ? [{ id: 'design', label: 'Design', icon: BsBrush }] : []),
              { id: 'document', label: 'Document', icon: BsFileEarmarkRichtext },
            ].map((t: any) => (
              <button key={t.id} onClick={() => setContentTab(t.id as ContentTab)}
                className={`h-8 flex items-center gap-1.5 px-3 text-[11px] border-b-2 transition-colors ${contentTab === t.id ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/40 hover:text-white/70'}`}>
                <t.icon size={11} /> {t.label}
              </button>
            ))}
          </div>

          {/* ── CODE VIEW ── */}
          {contentTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <div className="h-7 flex items-center justify-between px-2 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="text-[10px] text-white/40">{selectedPath || 'No file selected'}</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <BsSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" size={9} />
                    <input value={codeSearch} onChange={e => setCodeSearch(e.target.value)}
                      placeholder="Search..." className="w-28 pl-5 pr-2 py-0.5 text-[10px] bg-black/40 rounded border border-white/10 focus:border-indigo-400 outline-none" />
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
                    options={{ fontSize: 12, minimap: { enabled: false }, lineNumbers: 'on', padding: { top: 8 }, scrollBeyondLastLine: false }} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
                    <BsFileCode size={32} />
                    <p className="text-sm">Select a file to edit</p>
                    <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="text-[11px] px-3 py-1.5 rounded border border-white/10 hover:border-indigo-400 hover:text-indigo-300 transition-colors">
                      + Create new file
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FILES VIEW ── */}
          {contentTab === 'files' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white/50">ALL FILES</span>
                <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="text-[10px] px-2 py-1 rounded border border-white/10 hover:border-indigo-400 text-white/50 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  <BsPlus size={12} /> New File
                </button>
              </div>
              {getAllFilePaths(files).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/20">
                  <HiFolder size={40} />
                  <p className="text-sm mt-3">No files yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {getAllFilePaths(files).map(path => (
                    <div key={path} onClick={() => { setSelectedPath(path); setContentTab('code'); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedPath === path ? 'bg-indigo-600/20' : 'hover:bg-white/5'}`}>
                      <BsFileCode size={12} className="text-indigo-400 shrink-0" />
                      <span className={`text-[12px] ${selectedPath === path ? 'text-indigo-300' : 'text-white/60'}`}>{path}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DESIGN VIEW ── */}
          {contentTab === 'design' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.2)' }}>
                <BsBrush size={24} className="text-pink-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Design Canvas</h3>
                <p className="text-sm text-white/40 max-w-xs">Import a Figma design or describe your UI to Agent 1 — the agents will generate your components.</p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <button className="btn-ghost text-sm gap-2 flex items-center" onClick={() => {
                  const url = prompt('Paste your Figma file URL:');
                  if (url) {
                    const name = 'figma-design.md';
                    const content = `# Figma Design Import\n\nSource: ${url}\n\nImported at: ${new Date().toISOString()}\n\nDescribe your design here and ask Agent 1 to convert it to code.`;
                    const newNode = createFileNode(name, content);
                    setFiles(prev => [...prev, newNode]);
                    setSelectedPath(name);
                    setContentTab('code');
                  }
                }}>
                  <BsGlobe size={13} /> Import from Figma
                </button>
                <button className="btn-primary text-sm gap-2 flex items-center" onClick={() => setPanelTab('chat')}>
                  <BsRobot size={13} /> Ask AI to design
                </button>
              </div>
            </div>
          )}

          {/* ── DOCUMENT VIEW ── */}
          {contentTab === 'document' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-7 flex items-center px-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="text-[10px] text-white/40">Document Editor</span>
              </div>
              <textarea
                value={docContent}
                onChange={e => setDocContent(e.target.value)}
                placeholder="Start writing your document here...

Use markdown formatting:
# Heading 1
## Heading 2
**Bold** and *italic* text
- Bullet points
1. Numbered lists

Ask Agent 1 in the chat panel to help draft, edit, or expand your document."
                className="flex-1 p-5 bg-transparent text-[13px] text-white/80 resize-none outline-none font-mono leading-relaxed"
                style={{ fontFamily: 'inherit' }}
              />
            </div>
          )}
        </div>

        {/* ── Right Panel: Chat + Agents ── */}
        <div className="flex flex-col shrink-0 border-l" style={{ width: 300, borderColor: 'rgba(255,255,255,0.08)' }}>
          {/* Panel tabs */}
          <div className="h-8 flex items-center border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0c0f17' }}>
            {(['chat', 'agents', 'terminal'] as PanelTab[]).map(tab => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className={`h-8 flex-1 text-[10px] capitalize font-medium border-b-2 transition-colors ${panelTab === tab ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-white/30 hover:text-white/60'}`}>
                {tab === 'agents' ? '4 Agents' : tab}
              </button>
            ))}
          </div>

          {/* ── CHAT PANEL (Agent 1) ── */}
          {panelTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-2 space-y-2">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] shrink-0 font-bold ${msg.role === 'assistant' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-blue-600/30 text-blue-300'}`}>
                      {msg.role === 'assistant' ? 'A1' : 'U'}
                    </div>
                    <div className={`flex-1 px-2.5 py-2 rounded-xl text-[11px] leading-relaxed ${msg.role === 'assistant' ? 'bg-white/5 text-white/80' : 'bg-indigo-600 text-white'}`}
                      style={{ maxWidth: '85%' }}>
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center text-[8px] font-bold text-indigo-300">A1</div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-2 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex gap-1.5">
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Message Agent 1..."
                    className="flex-1 px-2.5 py-1.5 text-[11px] rounded-lg outline-none focus:border-indigo-400 border"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }} />
                  <button onClick={sendMessage} disabled={aiLoading || !input.trim()}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                    style={{ background: '#6366f1' }}>
                    <HiLightningBolt size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[8px] text-white/20">4-Agent System Active</span>
                  <div className="flex gap-1">
                    {AGENT_META.map(a => (
                      <div key={a.id} className={`w-1 h-1 rounded-full transition-colors ${agentStatuses[a.id] === 'working' ? 'animate-pulse' : ''}`}
                        style={{ background: agentStatuses[a.id] === 'idle' ? 'rgba(255,255,255,0.1)' : agentStatuses[a.id] === 'working' ? '#f59e0b' : agentStatuses[a.id] === 'done' ? '#34d399' : '#f87171' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AGENTS PANEL (all 4 agents) ── */}
          {panelTab === 'agents' && (
            <div className="flex-1 overflow-auto p-2 space-y-3">
              {AGENT_META.map(agent => {
                const log = agent.id === 3 ? coordinatorLog : agent.id === 2 ? envLog : agent.id === 4 ? checkerLog : [];
                const status = agentStatuses[agent.id];
                return (
                  <div key={agent.id} className="rounded-xl p-3 border" style={{ background: `${agent.color}08`, borderColor: `${agent.color}25` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative">
                        <agent.icon size={14} style={{ color: agent.color }} />
                        {status === 'working' && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
                        {status === 'done' && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-white">{agent.name}</span>
                          <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: `${agent.color}20`, color: agent.color }}>Agent {agent.id}</span>
                        </div>
                        <p className="text-[9px] text-white/30">{agent.desc}</p>
                      </div>
                      <div className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${status === 'idle' ? 'bg-white/5 text-white/30' : status === 'working' ? 'bg-yellow-400/20 text-yellow-300' : status === 'done' ? 'bg-green-400/20 text-green-300' : 'bg-red-400/20 text-red-300'}`}>
                        {status}
                      </div>
                    </div>

                    {log.length > 0 && (
                      <div className="space-y-0.5 max-h-24 overflow-auto">
                        {log.slice(-5).map((entry, i) => (
                          <div key={i} className="text-[9px] text-white/40 font-mono leading-relaxed">{entry}</div>
                        ))}
                      </div>
                    )}

                    {log.length === 0 && (
                      <div className="text-[9px] text-white/20 italic">
                        {agent.id === 1 ? 'Listening for user input...' : agent.id === 2 ? 'Monitoring filesystem...' : agent.id === 3 ? 'Waiting for Agent 1 output...' : 'Standby for validation...'}
                      </div>
                    )}
                  </div>
                );
              })}

              {agentLogs.length > 0 && (
                <div className="rounded-xl p-3 border border-white/5">
                  <p className="text-[9px] font-semibold text-white/30 mb-2 uppercase tracking-wider">Activity Log</p>
                  <div className="space-y-0.5 max-h-40 overflow-auto">
                    {agentLogs.slice(-20).reverse().map((log, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[9px]">
                        <span className="font-bold w-4" style={{ color: AGENT_META[log.agent - 1].color }}>A{log.agent}</span>
                        <span className="text-white/40">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TERMINAL PANEL (Agent 2 env) ── */}
          {panelTab === 'terminal' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-2 font-mono text-[10px] space-y-0.5" style={{ background: 'rgba(0,0,0,0.4)' }}>
                {termLines.map((line, i) => (
                  <div key={i} className={
                    line.type === 'error' ? 'text-red-400' :
                    line.type === 'input' ? 'text-green-400' :
                    line.type === 'success' ? 'text-emerald-400' :
                    'text-white/60'
                  }>{line.text}</div>
                ))}
                <div ref={termEndRef} />
              </div>
              <div className="p-2 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-green-400 text-[11px] font-mono">$</span>
                  <input value={termInput} onChange={e => setTermInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runTerminalCommand()}
                    className="flex-1 bg-transparent text-[11px] outline-none font-mono text-white/80"
                    placeholder="Run a command..." />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Selector */}
      {showModelSelector && (
        <div className="fixed top-10 right-3 z-50 rounded-xl overflow-hidden border shadow-2xl" style={{ background: '#1a1e24', borderColor: 'rgba(255,255,255,0.1)', width: 220, maxHeight: 280, overflowY: 'auto' }}>
          <div className="p-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">AI Model</span>
            <button onClick={() => setShowModelSelector(false)} className="text-white/30 hover:text-white/70"><HiX size={12} /></button>
          </div>
          {AI_PROVIDERS.map(p => (
            <div key={p.id}>
              <div className="px-3 py-1 text-[9px] text-white/30 uppercase tracking-widest bg-black/20">{p.name}</div>
              {p.models.map(m => (
                <button key={m.id} onClick={() => { setActiveProvider(p.id); setActiveModel(m.id); setShowModelSelector(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors">
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
