'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  BsRobot, BsTerminal, BsGithub, BsPlay, BsGlobe,
  BsFileCode, BsFolder, BsFolder2Open, BsPlus, BsTrash3,
  BsX, BsChevronDown, BsChevronRight, BsArrowUpRight, BsKey,
  BsFileEarmarkCode, BsFileEarmark, BsFileEarmarkText, BsSearch,
  BsHddStack
} from 'react-icons/bs';
import {
  HiArrowLeft, HiX, HiLightningBolt,
  HiFolder, HiMenu, HiOutlineFolder
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
  type: 'input' | 'output' | 'error';
  text: string;
}

interface Project {
  id: string;
  name: string;
  language: string;
  color?: string;
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

// ─────────────────────────── Background Terminal System ───────────────────────────
class BackgroundTerminal {
  private filesystem: Map<string, string> = new Map();
  private logs: string[] = [];

  constructor(initialFiles: FileNode[]) {
    this.syncFromFiles(initialFiles);
  }

  syncFromFiles(files: FileNode[]) {
    this.filesystem.clear();
    const addToMap = (node: FileNode, path: string = '') => {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      if (node.type === 'file') {
        this.filesystem.set(fullPath, node.content || '');
      } else if (node.children) {
        node.children.forEach(child => addToMap(child, fullPath));
      }
    };
    files.forEach(node => addToMap(node));
  }

  async execute(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    this.logs.push(`$ ${command}`);
    const [cmd, ...args] = command.split(' ');

    try {
      switch(cmd) {
        case 'ls':
          return this.ls(args);
        case 'cat':
          return this.cat(args);
        case 'touch':
          return this.touch(args);
        case 'mkdir':
          return this.mkdir(args);
        case 'rm':
          return this.rm(args);
        case 'mv':
          return this.mv(args);
        case 'cp':
          return this.cp(args);
        case 'pwd':
          return { stdout: '/workspace\n', stderr: '', code: 0 };
        case 'npm':
        case 'pip':
          return this.installPackage(cmd, args);
        default:
          return { stdout: '', stderr: `Command not found: ${cmd}`, code: 127 };
      }
    } catch (err: any) {
      return { stdout: '', stderr: err.message, code: 1 };
    }
  }

  private ls(args: string[]): { stdout: string; stderr: string; code: number } {
    const files = Array.from(this.filesystem.keys())
      .map(f => f.split('/')[0])
      .filter((v, i, a) => a.indexOf(v) === i);
    return { stdout: files.join('\n') + '\n', stderr: '', code: 0 };
  }

  private cat(args: string[]): { stdout: string; stderr: string; code: number } {
    if (!args[0]) return { stdout: '', stderr: 'cat: missing file operand', code: 1 };
    const content = this.filesystem.get(args[0]);
    return content 
      ? { stdout: content + '\n', stderr: '', code: 0 }
      : { stdout: '', stderr: `cat: ${args[0]}: No such file`, code: 1 };
  }

  private touch(args: string[]): { stdout: string; stderr: string; code: number } {
    if (!args[0]) return { stdout: '', stderr: 'touch: missing file operand', code: 1 };
    if (!this.filesystem.has(args[0])) {
      this.filesystem.set(args[0], '');
    }
    return { stdout: '', stderr: '', code: 0 };
  }

  private mkdir(args: string[]): { stdout: string; stderr: string; code: number } {
    if (!args[0]) return { stdout: '', stderr: 'mkdir: missing operand', code: 1 };
    return { stdout: '', stderr: '', code: 0 };
  }

  private rm(args: string[]): { stdout: string; stderr: string; code: number } {
    if (!args[0]) return { stdout: '', stderr: 'rm: missing operand', code: 1 };
    this.filesystem.delete(args[0]);
    return { stdout: '', stderr: '', code: 0 };
  }

  private mv(args: string[]): { stdout: string; stderr: string; code: number } {
    if (args.length < 2) return { stdout: '', stderr: 'mv: missing file operand', code: 1 };
    const content = this.filesystem.get(args[0]);
    if (content) {
      this.filesystem.set(args[1], content);
      this.filesystem.delete(args[0]);
    }
    return { stdout: '', stderr: '', code: 0 };
  }

  private cp(args: string[]): { stdout: string; stderr: string; code: number } {
    if (args.length < 2) return { stdout: '', stderr: 'cp: missing file operand', code: 1 };
    const content = this.filesystem.get(args[0]);
    if (content) this.filesystem.set(args[1], content);
    return { stdout: '', stderr: '', code: 0 };
  }

  private installPackage(cmd: string, args: string[]): { stdout: string; stderr: string; code: number } {
    if (args[0] === 'install') {
      return {
        stdout: `Installing ${args[1] || 'dependencies'}...\nadded 1 package\n`,
        stderr: '',
        code: 0
      };
    }
    return { stdout: '', stderr: 'Unknown command', code: 1 };
  }

  getFiles(): Map<string, string> {
    return this.filesystem;
  }
}

// ─────────────────────────── Helper Functions ───────────────────────────
function getLang(name: string) {
  const ext = name.split('.').pop() || '';
  return EXT_LANG[ext] || 'plaintext';
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop() || '';
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function createFileNode(name: string, content: string = '', parentPath: string = ''): FileNode {
  return {
    id: generateId(),
    name,
    type: 'file',
    content,
    language: getLang(name),
    path: parentPath ? `${parentPath}/${name}` : name
  };
}

function createFolderNode(name: string, parentPath: string = ''): FileNode {
  return {
    id: generateId(),
    name,
    type: 'folder',
    children: [],
    path: parentPath ? `${parentPath}/${name}` : name
  };
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

function updateNodeByPath(nodes: FileNode[], path: string, updater: (node: FileNode) => FileNode): FileNode[] {
  const parts = path.split('/');
  return nodes.map(node => {
    if (node.name === parts[0]) {
      if (parts.length === 1) return updater(node);
      if (node.type === 'folder' && node.children) {
        return { ...node, children: updateNodeByPath(node.children, parts.slice(1).join('/'), updater) };
      }
    }
    return node;
  });
}

function deleteNodeByPath(nodes: FileNode[], path: string): FileNode[] {
  const parts = path.split('/');
  return nodes.filter(node => {
    if (node.name === parts[0]) {
      if (parts.length === 1) return false;
      if (node.type === 'folder' && node.children) {
        node.children = deleteNodeByPath(node.children, parts.slice(1).join('/'));
      }
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

// ─────────────────────────── File Tree Component ───────────────────────────
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

  const renderNode = (node: FileNode, depth: number) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expanded[node.path];
    const isSelected = selectedPath === node.path;
    const FileIcon = getFileIcon(node.name);

    if (renaming === node.path) {
      return (
        <div key={node.id} className="flex items-center px-2 py-0.5" style={{ paddingLeft: depth * 12 + 8 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={() => {
              if (newName.trim()) onRename(node.path, newName.trim());
              setRenaming(null);
            }}
            onKeyDown={e => e.key === 'Enter' && newName.trim() && (onRename(node.path, newName.trim()), setRenaming(null))}
            className="w-full text-[11px] bg-black/40 border border-white/20 rounded px-1.5 py-0.5 outline-none focus:border-blue-400 text-white"
            autoFocus
          />
        </div>
      );
    }

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer group ${isSelected ? 'bg-blue-600/20' : 'hover:bg-white/5'}`}
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => isFolder ? setExpanded(p => ({ ...p, [node.path]: !p[node.path] })) : onSelect(node.path)}
          onDoubleClick={() => !isFolder && (setRenaming(node.path), setNewName(node.name))}
        >
          {isFolder && (
            <button className="w-3 text-white/40">
              {isExpanded ? <BsChevronDown size={8} /> : <BsChevronRight size={8} />}
            </button>
          )}
          <span className="text-white/60">
            {isFolder ? 
              (isExpanded ? <BsFolder2Open size={12} className="text-yellow-500" /> : <BsFolder size={12} className="text-yellow-500" />) : 
              <FileIcon size={12} className="text-blue-400" />
            }
          </span>
          <span className={`flex-1 text-[11px] truncate ${isSelected ? 'text-blue-400' : 'text-white/70'}`}>
            {node.name}
          </span>
          {!isFolder && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(node.path); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400">
              <BsTrash3 size={10} />
            </button>
          )}
          {isFolder && (
            <button onClick={(e) => { e.stopPropagation(); onAdd(node.path, 'file'); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/80">
              <BsPlus size={12} />
            </button>
          )}
        </div>
        {isFolder && isExpanded && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return <div className="space-y-0.5">{nodes.map(node => renderNode(node, 0))}</div>;
}

// ─────────────────────────── Main Component ───────────────────────────
type ViewMode = 'code' | 'files' | 'ai' | 'term';

export default function ProjectWorkspace() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // AI Context
  const { activeProvider, activeModel, getApiKey, setActiveModel, setActiveProvider, updateProviderConfig, settings } = useAI();

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [code, setCode] = useState('');

  // UI state
  const [currentView, setCurrentView] = useState<ViewMode>('code');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [codeSearch, setCodeSearch] = useState('');

  // File creation
  const [creatingIn, setCreatingIn] = useState<{ path: string; type: 'file' | 'folder' } | null>(null);
  const [newFileName, setNewFileName] = useState('');

  // Background Terminal (hidden)
  const [backgroundTerminal, setBackgroundTerminal] = useState<BackgroundTerminal | null>(null);
  
  // AI Chat - NORMAL CHAT
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hi! I can help you code. Your files are managed in the background.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Terminal (visible for debugging)
  const [termLines, setTermLines] = useState<TerminalLine[]>([
    { type: 'output', text: 'Background terminal ready (commands run silently)' }
  ]);
  const [termInput, setTermInput] = useState('');
  const termEndRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem('nexios_projects');
    if (saved) {
      const projects: Project[] = JSON.parse(saved);
      const p = projects.find(p => p.id === id);
      if (p) {
        setProject(p);
        const savedFiles = localStorage.getItem(`nexios_files_${id}`);
        if (savedFiles) {
          const fileData = JSON.parse(savedFiles);
          setFiles(fileData);
          const paths = getAllFilePaths(fileData);
          if (paths.length) setSelectedPath(paths[0]);
          
          // Initialize background terminal
          const term = new BackgroundTerminal(fileData);
          setBackgroundTerminal(term);
        }
      }
    }
    const savedChat = localStorage.getItem(`nexios_chat_${id}`);
    if (savedChat) setMessages(JSON.parse(savedChat));
  }, [id]);

  // Save
  useEffect(() => { if (files.length) localStorage.setItem(`nexios_files_${id}`, JSON.stringify(files)); }, [files, id]);
  useEffect(() => { localStorage.setItem(`nexios_chat_${id}`, JSON.stringify(messages)); }, [messages, id]);

  // Sync background terminal with files
  useEffect(() => {
    if (backgroundTerminal && files.length) {
      backgroundTerminal.syncFromFiles(files);
    }
  }, [files, backgroundTerminal]);

  // Current file
  useEffect(() => {
    if (selectedPath) {
      const node = findNodeByPath(files, selectedPath);
      if (node?.type === 'file') setCode(node.content || '');
    }
  }, [selectedPath, files]);

  // Auto scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Live code update
  const handleCodeChange = (value: string | undefined) => {
    if (!value || !selectedPath) return;
    setCode(value);
    setFiles(prev => updateNodeByPath(prev, selectedPath, node => ({ ...node, content: value })));
  };

  // File operations with background terminal sync
  const handleSelectFile = (path: string) => setSelectedPath(path);
  
  const handleDeleteFile = (path: string) => {
    setFiles(prev => deleteNodeByPath(prev, path));
    if (path === selectedPath) {
      const paths = getAllFilePaths(files);
      setSelectedPath(paths.find(p => p !== path) || '');
    }
    // Background terminal sync
    if (backgroundTerminal) {
      backgroundTerminal.execute(`rm ${path}`).catch(console.error);
    }
  };
  
  const handleRename = (path: string, newName: string) => {
    setFiles(prev => updateNodeByPath(prev, path, node => ({ ...node, name: newName, path: node.path.replace(node.name, newName) })));
    if (backgroundTerminal) {
      backgroundTerminal.execute(`mv ${path} ${path.replace(path.split('/').pop()!, newName)}`).catch(console.error);
    }
  };
  
  const handleCreateItem = () => {
    if (!creatingIn || !newFileName.trim()) return;
    
    const fullPath = creatingIn.path ? `${creatingIn.path}/${newFileName.trim()}` : newFileName.trim();
    
    const newNode = creatingIn.type === 'file' 
      ? createFileNode(newFileName.trim(), `// ${newFileName.trim()}\n`, creatingIn.path)
      : createFolderNode(newFileName.trim(), creatingIn.path);
    
    setFiles(prev => updateNodeByPath(prev, creatingIn.path, node => {
      if (node.type === 'folder') return { ...node, children: [...(node.children || []), newNode] };
      return node;
    }));
    
    // Background terminal sync
    if (backgroundTerminal) {
      if (creatingIn.type === 'file') {
        backgroundTerminal.execute(`touch ${fullPath}`).catch(console.error);
        backgroundTerminal.execute(`echo "// ${newFileName.trim()}" > ${fullPath}`).catch(console.error);
      } else {
        backgroundTerminal.execute(`mkdir -p ${fullPath}`).catch(console.error);
      }
    }
    
    setExpandedFolders(p => ({ ...p, [creatingIn.path]: true }));
    if (creatingIn.type === 'file') setSelectedPath(newNode.path);
    setCreatingIn(null);
    setNewFileName('');
  };

  // Visible terminal commands (for debugging)
  const runTerminalCommand = async () => {
    if (!termInput.trim() || !backgroundTerminal) return;
    
    const cmd = termInput.trim();
    setTermLines(p => [...p, { type: 'input', text: `$ ${cmd}` }]);
    
    const result = await backgroundTerminal.execute(cmd);
    
    if (result.stdout) {
      result.stdout.split('\n').filter(l => l).forEach(line => {
        setTermLines(p => [...p, { type: 'output', text: line }]);
      });
    }
    if (result.stderr) {
      result.stderr.split('\n').filter(l => l).forEach(line => {
        setTermLines(p => [...p, { type: 'error', text: line }]);
      });
    }
    
    setTermInput('');
  };

  // NORMAL AI CHAT - WORKS EVERY TIME
  const sendMessage = async () => {
    if (!input.trim() || aiLoading) return;
    
    const apiKey = getApiKey(activeProvider.id);
    if (!apiKey) {
      setMessages(p => [...p, { 
        role: 'assistant', 
        content: `⚠️ Please add your ${activeProvider.name} API key in settings.`,
        timestamp: Date.now()
      }]);
      return;
    }
    
    const userMsg = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    setAiLoading(true);

    try {
      // Get current file context
      const currentFile = selectedPath ? findNodeByPath(files, selectedPath) : null;
      const fileContext = currentFile 
        ? `Current file (${selectedPath}):\n\`\`\`\n${currentFile.content?.slice(0, 500)}\n\`\`\``
        : 'No file open';

      // Build system prompt
      const systemPrompt = `You are a helpful coding assistant. The user has a project with these files:
${getAllFilePaths(files).slice(0, 10).map(p => `- ${p}`).join('\n')}

${fileContext}

Help with coding questions, debugging, and suggestions. Be concise and practical.`;

      // Prepare messages for AI
      const messagesForAI = [
        { role: 'user' as const, content: systemPrompt },
        ...messages.slice(-6).map(m => ({ 
          role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, 
          content: m.content 
        })),
        { role: 'user' as const, content: userMsg }
      ];

      // Call AI
      const response = await callAI(activeProvider.id, activeModel.id, messagesForAI, apiKey);
      
      // Add response to chat
      setMessages(p => [...p, { role: 'assistant', content: response, timestamp: Date.now() }]);

      // BACKGROUND PROCESS: Check if AI wants to run terminal commands
      // This happens silently - user doesn't see it
      if (backgroundTerminal && response.includes('`')) {
        // Look for terminal commands in code blocks
        const cmdMatch = response.match(/```(?:bash|sh|terminal)\n([\s\S]*?)```/);
        if (cmdMatch) {
          const cmd = cmdMatch[1].trim();
          // Run silently in background
          backgroundTerminal.execute(cmd).then(result => {
            // If command modified files, sync them
            if (cmd.startsWith('touch') || cmd.startsWith('mkdir') || cmd.startsWith('rm') || cmd.startsWith('mv')) {
              // Refresh files from terminal
              const terminalFiles = backgroundTerminal.getFiles();
              // This would need proper sync logic
              console.log('Background terminal updated files');
            }
          }).catch(console.error);
        }
      }

    } catch (error) {
      setMessages(p => [...p, { 
        role: 'assistant', 
        content: `Error: ${error instanceof Error ? error.message : 'Failed to communicate with AI'}`,
        timestamp: Date.now()
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Search in code
  const searchMatches = codeSearch ? code.split('\n').reduce((acc, line, i) => {
    if (line.toLowerCase().includes(codeSearch.toLowerCase())) acc.push({ line: i + 1, text: line.trim() });
    return acc;
  }, [] as { line: number; text: string }[]) : [];

  return (
    <div className="h-screen flex bg-[#0a0c10] text-white">
      {/* Ultra compact sidebar */}
      <div style={{ width: sidebarCollapsed ? 40 : 180, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="h-8 flex items-center justify-between px-2 border-b border-white/10">
          {!sidebarCollapsed && <Link href="/dashboard/projects" className="text-white/40 hover:text-white/80"><HiArrowLeft size={14} /></Link>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-white/40 hover:text-white/80"><HiMenu size={14} /></button>
        </div>
        
        <div className="p-1 space-y-0.5">
          {[
            { id: 'code', icon: BsFileCode, label: 'Code' },
            { id: 'files', icon: HiOutlineFolder, label: 'Files' },
            { id: 'ai', icon: BsRobot, label: 'AI Chat' },
            { id: 'term', icon: BsTerminal, label: 'Terminal' },
          ].map(item => (
            <button key={item.id} onClick={() => setCurrentView(item.id as ViewMode)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded ${currentView === item.id ? 'bg-blue-600/20 text-blue-400' : 'text-white/40 hover:bg-white/5'}`}>
              <item.icon size={14} />
              {!sidebarCollapsed && <span className="text-[11px]">{item.label}</span>}
            </button>
          ))}
        </div>

        {!sidebarCollapsed && project && (
          <div className="absolute bottom-2 left-2 right-2 p-2 bg-white/5 rounded text-[10px] truncate">
            {project.name}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {/* CODE VIEW */}
        {currentView === 'code' && (
          <div className="h-full flex flex-col">
            <div className="h-8 flex items-center justify-between px-2 border-b border-white/10 bg-[#0c0e14]">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-white/40">{selectedPath.split('/').pop() || 'No file'}</span>
                {selectedPath && <span className="text-white/20">|</span>}
                {selectedPath && <span className="text-white/30">{code.split('\n').length} lines</span>}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <BsSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" size={10} />
                  <input
                    value={codeSearch}
                    onChange={e => setCodeSearch(e.target.value)}
                    placeholder="Search in file..."
                    className="w-36 pl-6 pr-2 py-0.5 text-[10px] bg-black/40 rounded border border-white/10 focus:border-blue-400 outline-none"
                  />
                </div>
                <div className="text-[8px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                  BG Terminal Active
                </div>
              </div>
            </div>

            {codeSearch && searchMatches.length > 0 && (
              <div className="absolute top-8 right-4 w-64 z-10 bg-[#1a1e24] border border-white/10 rounded shadow-lg p-1 max-h-40 overflow-auto">
                {searchMatches.map((m, i) => (
                  <div key={i} className="text-[9px] px-2 py-1 hover:bg-white/5 cursor-pointer truncate" onClick={() => {}}>
                    <span className="text-white/40">L{m.line}:</span> {m.text}
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1">
              <MonacoEditor
                value={code}
                language={selectedPath ? getLang(selectedPath) : 'plaintext'}
                theme="vs-dark"
                onChange={handleCodeChange}
                options={{ fontSize: 12, minimap: { enabled: false }, lineNumbers: 'on', padding: { top: 8 } }}
              />
            </div>
          </div>
        )}

        {/* FILES VIEW with Save Button */}
        {currentView === 'files' && (
          <div className="h-full flex flex-col">
            <div className="h-8 flex items-center justify-between px-2 border-b border-white/10 bg-[#0c0e14]">
              <span className="text-[11px] font-medium text-white/70">EXPLORER</span>
              <div className="flex gap-1">
                <button onClick={() => setCreatingIn({ path: '', type: 'file' })} className="p-1 text-white/40 hover:text-white/80" title="New file"><BsPlus size={14} /></button>
                <button onClick={() => setCreatingIn({ path: '', type: 'folder' })} className="p-1 text-white/40 hover:text-white/80" title="New folder"><BsFolder size={12} /></button>
              </div>
            </div>

            {/* File creation with Save button */}
            {creatingIn && (
              <div className="p-2 border-b border-white/10 bg-white/5 flex gap-1">
                <input
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  placeholder={creatingIn.type === 'file' ? 'filename.ts' : 'folder name'}
                  className="flex-1 px-2 py-1 text-[11px] bg-black/40 border border-white/20 rounded outline-none focus:border-blue-400"
                  onKeyDown={e => e.key === 'Enter' && handleCreateItem()}
                  autoFocus
                />
                <button
                  onClick={handleCreateItem}
                  className="px-2 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <BsPlus size={12} /> Save
                </button>
                <button
                  onClick={() => setCreatingIn(null)}
                  className="px-2 py-1 bg-white/10 text-white/60 text-[10px] rounded hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex-1 overflow-auto p-1">
              <FileTree
                nodes={files}
                onSelect={handleSelectFile}
                selectedPath={selectedPath}
                onDelete={handleDeleteFile}
                onRename={handleRename}
                onAdd={(path, type) => setCreatingIn({ path, type })}
                expanded={expandedFolders}
                setExpanded={setExpandedFolders}
              />
            </div>
          </div>
        )}

        {/* AI CHAT - NORMAL CHAT THAT WORKS */}
        {currentView === 'ai' && (
          <div className="h-full flex flex-col">
            <div className="h-8 flex items-center justify-between px-2 border-b border-white/10 bg-[#0c0e14]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-white/70">AI ASSISTANT</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowProviderSelector(!showProviderSelector)} className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded hover:bg-white/20">
                    {activeProvider.shortName} <BsChevronDown size={8} className="inline" />
                  </button>
                  <button onClick={() => setShowModelSelector(!showModelSelector)} className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded hover:bg-white/20">
                    {activeModel.name.split(' ')[0]} <BsChevronDown size={8} className="inline" />
                  </button>
                </div>
              </div>
              <div className={`text-[8px] px-1.5 py-0.5 rounded-full ${getApiKey(activeProvider.id) ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {getApiKey(activeProvider.id) ? '✓ API Key' : 'No Key'}
              </div>
            </div>

            {/* Messages - normal chat */}
            <div className="flex-1 overflow-auto p-2 space-y-2 text-[11px]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-4 h-4 rounded flex items-center justify-center text-[8px] shrink-0 ${
                    msg.role === 'assistant' ? 'bg-purple-500/20' : 'bg-blue-500/20'
                  }`}>
                    {msg.role === 'assistant' ? 'AI' : 'U'}
                  </div>
                  <div className={`flex-1 px-2 py-1 rounded ${
                    msg.role === 'assistant' ? 'bg-white/5' : 'bg-blue-600'
                  }`}>
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    <div className="text-[7px] text-white/30 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex items-center gap-2 text-white/40 text-[10px]">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                  AI is thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 border-t border-white/10">
              <div className="flex gap-1">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask me anything about your code..."
                  className="flex-1 px-2 py-1 text-[11px] bg-black/40 border border-white/10 rounded outline-none focus:border-blue-400"
                />
                <button 
                  onClick={sendMessage} 
                  disabled={aiLoading || !input.trim() || !getApiKey(activeProvider.id)} 
                  className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center disabled:opacity-50"
                >
                  <HiLightningBolt size={12} />
                </button>
              </div>
              <div className="text-[7px] text-white/20 mt-1 text-center">
                Background terminal active • File operations run silently
              </div>
            </div>
          </div>
        )}

        {/* TERMINAL VIEW - For debugging */}
        {currentView === 'term' && (
          <div className="h-full flex flex-col">
            <div className="h-8 flex items-center px-2 border-b border-white/10 bg-[#0c0e14]">
              <span className="text-[11px] font-medium text-white/70">BACKGROUND TERMINAL</span>
              <span className="ml-2 text-[8px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">Active</span>
            </div>
            <div className="flex-1 overflow-auto p-2 font-mono text-[11px] bg-black/60">
              {termLines.map((line, i) => (
                <div key={i} className={`leading-relaxed ${
                  line.type === 'error' ? 'text-red-400' : 
                  line.type === 'input' ? 'text-green-400' :
                  'text-white/70'
                }`}>
                  {line.text}
                </div>
              ))}
              <div ref={termEndRef} />
            </div>
            <div className="p-2 border-t border-white/10">
              <div className="flex items-center gap-1">
                <span className="text-green-400 text-[11px]">$</span>
                <input
                  value={termInput}
                  onChange={e => setTermInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (runTerminalCommand(), setTermInput(''))}
                  className="flex-1 bg-transparent text-[11px] outline-none font-mono"
                  placeholder="Run commands (for debugging)"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Model selectors */}
      {showProviderSelector && (
        <div className="absolute top-8 left-1/2 w-32 bg-[#1a1e24] border border-white/10 rounded shadow-lg z-50">
          {AI_PROVIDERS.map(p => (
            <button key={p.id} onClick={() => { setActiveProvider(p.id); setShowProviderSelector(false); }}
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/10">
              {p.shortName}
            </button>
          ))}
        </div>
      )}
      {showModelSelector && (
        <div className="absolute top-8 left-1/2 w-48 bg-[#1a1e24] border border-white/10 rounded shadow-lg z-50 max-h-60 overflow-auto">
          {activeProvider.models.map(m => (
            <button key={m.id} onClick={() => { setActiveModel(m.id); setShowModelSelector(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-white/10">
              <div className="text-[11px]">{m.name}</div>
              <div className="text-[8px] text-white/40">{m.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
