'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Project, ProjectFile } from '../../components/DashboardSidebar';
import { useAI } from '@/app/context/AIContext';
import { callAI } from '@/app/lib/ai';
import DashboardSidebar from '../../components/DashboardSidebar';
import type { AppUser } from '@/app/types/user';
import type { ChatSession } from '../../components/DashboardSidebar';

/* ── Icons ────────────────────────────────────────────────────────────────── */
const I = {
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Save: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Run: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Chat: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Send: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  Back: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>,
  File: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  Robot: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="16" y1="15" x2="16" y2="15"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>,
  Copy: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
};

const LANG_EXT: Record<string, string> = { javascript: 'js', typescript: 'ts', python: 'py', rust: 'rs', go: 'go', html: 'html', css: 'css' };

interface AIMessage { role: 'user' | 'ai'; text: string; }

export default function SandboxPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { activeProvider, activeModel, getApiKey } = useAI();

  const [project, setProject] = useState<Project | null>(null);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [saved, setSaved] = useState(true);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showFileTree, setShowFileTree] = useState(true);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    const saved = localStorage.getItem('nexios-projects');
    if (saved) {
      try {
        const projects: Project[] = JSON.parse(saved);
        const found = projects.find(p => p.id === projectId);
        if (found) {
          setProject(found);
          if (found.files.length > 0) {
            setActiveFileId(found.files[0].id);
            setOpenFiles([found.files[0].id]);
          }
        } else {
          router.push('/dashboard/projects');
        }
      } catch { router.push('/dashboard/projects'); }
    } else {
      router.push('/dashboard/projects');
    }
  }, [projectId, router]);

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiLoading]);

  const activeFile = project?.files.find(f => f.id === activeFileId) || null;

  const saveProject = useCallback((proj: Project) => {
    const all = localStorage.getItem('nexios-projects');
    if (!all) return;
    try {
      const projects: Project[] = JSON.parse(all);
      const updated = projects.map(p => p.id === proj.id ? { ...proj, updatedAt: new Date().toISOString() } : p);
      localStorage.setItem('nexios-projects', JSON.stringify(updated));
    } catch { /* ignore */ }
  }, []);

  const handleCodeChange = (value: string) => {
    if (!project || !activeFileId) return;
    const updatedProject = { ...project, files: project.files.map(f => f.id === activeFileId ? { ...f, content: value } : f) };
    setProject(updatedProject);
    setSaved(false);
  };

  const handleSave = useCallback(() => {
    if (project) { saveProject(project); setSaved(true); }
  }, [project, saveProject]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handleOpenFile = (fileId: string) => {
    setActiveFileId(fileId);
    if (!openFiles.includes(fileId)) setOpenFiles(prev => [...prev, fileId]);
  };

  const handleCloseTab = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = openFiles.filter(id => id !== fileId);
    setOpenFiles(remaining);
    if (activeFileId === fileId) setActiveFileId(remaining[remaining.length - 1] || '');
  };

  const handleNewFile = () => {
    if (!newFileName.trim() || !project) return;
    const ext = newFileName.includes('.') ? newFileName.split('.').pop() || '' : '';
    const langMap: Record<string, string> = { js: 'javascript', ts: 'typescript', py: 'python', rs: 'rust', go: 'go', html: 'html', css: 'css' };
    const language = langMap[ext] || project.language;
    const newFile: ProjectFile = { id: Date.now().toString(36), name: newFileName.trim(), content: '', language };
    const updated = { ...project, files: [...project.files, newFile] };
    setProject(updated);
    saveProject(updated);
    setActiveFileId(newFile.id);
    setOpenFiles(prev => [...prev, newFile.id]);
    setNewFileName('');
    setShowNewFile(false);
  };

  const handleDeleteFile = (fileId: string) => {
    if (!project || project.files.length <= 1) return;
    const updated = { ...project, files: project.files.filter(f => f.id !== fileId) };
    setProject(updated);
    saveProject(updated);
    if (activeFileId === fileId) {
      const remaining = openFiles.filter(id => id !== fileId);
      setOpenFiles(remaining);
      setActiveFileId(updated.files[0]?.id || '');
    }
  };

  const handleAIChat = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiLoading(true);

    const codeContext = activeFile ? `\n\nCurrent file (${activeFile.name}):\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\`` : '';
    const systemPrompt = `You are an expert developer assistant in a code sandbox. Help the user with their ${project?.language || 'code'} code. Be concise, practical, and show code examples when helpful.`;

    try {
      const messages = [
        ...aiMessages.map(m => ({ role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.text })),
        { role: 'user' as const, content: systemPrompt + codeContext + '\n\n' + userMsg },
      ];
      const apiKey = getApiKey(activeProvider.id);
      const response = await callAI(activeProvider.id, activeModel.id, messages, apiKey);
      setAiMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (err) {
      setAiMessages(prev => [...prev, { role: 'ai', text: '⚠️ Error communicating with AI. Check your API key in the sidebar.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const renderCode = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n');
        const code = lines.slice(1, -1).join('\n');
        return (
          <div key={i} className="relative my-2 rounded-lg overflow-hidden" style={{ background: '#1e1e2e' }}>
            <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-[10px] text-white/40 font-mono">{lines[0].replace('```', '') || 'code'}</span>
              <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-white/30 hover:text-white/70 transition-colors">
                {copied ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 text-green-400"><polyline points="20 6 9 17 4 12"/></svg> : <I.Copy />}
              </button>
            </div>
            <pre className="p-3 text-[12px] text-green-300 font-mono overflow-x-auto leading-relaxed">{code}</pre>
          </div>
        );
      }
      return <span key={i} className="text-sm leading-relaxed whitespace-pre-wrap">{part}</span>;
    });
  };

  const lineCount = (activeFile?.content || '').split('\n').length;

  if (!project) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0c0c0f' }}>
        <div className="flex items-center gap-3 text-white/40">
          <div className="w-5 h-5 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
          Loading sandbox...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex" style={{ background: '#0c0c0f', fontFamily: 'var(--font-geist-mono, monospace)' }}>

      {/* Sidebar (collapsible) */}
      <DashboardSidebar
        user={user} currentChatId="" onChatSelect={() => {}} onNewChat={() => {}}
        isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobileOpen={isMobileOpen} onMobileClose={() => setIsMobileOpen(false)} onMobileOpen={() => setIsMobileOpen(true)}
      />

      {/* Main IDE area */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-[60px]'}`}>

        {/* ── Title bar ─────────────────────────────────────────────────────── */}
        <div className="h-10 flex items-center gap-2 px-3 shrink-0" style={{ background: '#111115', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => router.push('/dashboard/projects')} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors">
            <I.Back />
          </button>
          <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ background: project.color }}>{project.language.slice(0, 2).toUpperCase()}</div>
          <span className="text-xs font-semibold text-white/70 truncate">{project.name}</span>
          <span className="text-white/20 text-xs">—</span>
          <span className="text-xs text-white/40">{activeFile?.name || 'no file'}</span>
          {!saved && <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />}

          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] text-white/30 font-sans">{activeProvider.shortName} / {activeModel.name}</span>
            <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <button onClick={handleSave} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Save (Ctrl+S)">
              <I.Save /> Save
            </button>
            <button onClick={() => setShowAIPanel(!showAIPanel)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${showAIPanel ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
              <I.Robot /> AI
            </button>
          </div>
        </div>

        {/* ── Tab bar ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 shrink-0 overflow-x-auto scrollbar-none" style={{ background: '#0e0e12', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {openFiles.map(fileId => {
            const file = project.files.find(f => f.id === fileId);
            if (!file) return null;
            const isActive = fileId === activeFileId;
            return (
              <div key={fileId} onClick={() => setActiveFileId(fileId)}
                className={`flex items-center gap-2 px-3 h-9 cursor-pointer shrink-0 border-r transition-colors group
                  ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
                `}
                style={{ borderColor: 'rgba(255,255,255,0.06)', borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent', background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
                <I.File />
                <span className="text-[11px] font-medium whitespace-nowrap">{file.name}</span>
                <button onClick={e => handleCloseTab(fileId, e)} className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5 transition-all">
                  <I.X />
                </button>
              </div>
            );
          })}
          <button onClick={() => setShowNewFile(!showNewFile)} className="flex items-center gap-1 px-3 h-9 text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors shrink-0">
            <I.Plus />
          </button>
          {showNewFile && (
            <div className="flex items-center gap-1 px-2">
              <input autoFocus type="text" value={newFileName} onChange={e => setNewFileName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNewFile(); if (e.key === 'Escape') setShowNewFile(false); }}
                placeholder="filename.js"
                className="px-2 py-1 text-[11px] bg-white/10 border border-white/20 rounded text-white placeholder-white/30 outline-none focus:border-blue-400 w-32"
              />
            </div>
          )}
        </div>

        {/* ── Editor + AI panel ─────────────────────────────────────────────── */}
        <div className="flex-1 flex min-h-0">

          {/* File tree (slim left panel) */}
          {showFileTree && (
            <div className="w-44 shrink-0 flex flex-col" style={{ background: '#0e0e12', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[9px] font-semibold text-white/30 uppercase tracking-widest font-sans">Explorer</span>
                <button onClick={() => setShowNewFile(true)} className="text-white/30 hover:text-white/70 transition-colors"><I.Plus /></button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-none py-1">
                {project.files.map(file => (
                  <div key={file.id}
                    className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${activeFileId === file.id ? 'text-white bg-white/[0.08]' : 'text-white/45 hover:bg-white/[0.05] hover:text-white/70'}`}
                    onClick={() => handleOpenFile(file.id)}>
                    <I.File />
                    <span className="text-[11px] flex-1 truncate">{file.name}</span>
                    {project.files.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); handleDeleteFile(file.id); }}
                        className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 transition-all">
                        <I.Trash />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code editor */}
          <div className="flex-1 min-w-0 flex flex-col" style={{ background: '#13131a' }}>
            {activeFile ? (
              <div className="flex-1 relative overflow-hidden">
                <div className="code-editor-wrap h-full overflow-auto scrollbar-thin">
                  {/* Line numbers */}
                  <div className="code-line-numbers select-none" style={{ minWidth: 48 }}>
                    {Array.from({ length: lineCount }, (_, i) => (
                      <div key={i} className="leading-[1.6] text-[12px]">{i + 1}</div>
                    ))}
                  </div>
                  {/* Code textarea */}
                  <textarea
                    ref={textareaRef}
                    value={activeFile.content}
                    onChange={e => handleCodeChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const start = e.currentTarget.selectionStart;
                        const end = e.currentTarget.selectionEnd;
                        const newVal = activeFile.content.substring(0, start) + '  ' + activeFile.content.substring(end);
                        handleCodeChange(newVal);
                        setTimeout(() => { if (textareaRef.current) { textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2; } }, 0);
                      }
                    }}
                    spellCheck={false}
                    className="code-textarea flex-1 w-full h-full"
                    style={{ minHeight: '100%' }}
                  />
                </div>

                {/* Status bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-1 text-[10px] font-sans"
                  style={{ background: '#0c0c0f', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                  <div className="flex items-center gap-3">
                    <span>{activeFile.language}</span>
                    <span>{lineCount} lines</span>
                    <span>{activeFile.content.length} chars</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {saved ? <span className="text-green-400/60">✓ Saved</span> : <span className="text-amber-400/70">● Unsaved</span>}
                    <span>UTF-8</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <I.File />
                  <p className="text-white/20 text-sm mt-3 font-sans">Select a file to edit</p>
                </div>
              </div>
            )}
          </div>

          {/* ── AI Chat panel ─────────────────────────────────────────────── */}
          {showAIPanel && (
            <div className="w-80 shrink-0 flex flex-col" style={{ background: '#0f0f14', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
              {/* AI header */}
              <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white" style={{ background: activeProvider.color }}>
                  {activeProvider.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white/80 font-sans">{activeProvider.shortName} Assistant</p>
                  <p className="text-[9px] text-white/30 font-sans">{activeModel.name}</p>
                </div>
                <button onClick={() => setAiMessages([])} className="text-white/25 hover:text-white/60 transition-colors text-[9px] font-sans">clear</button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-3 font-sans">
                {aiMessages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: activeProvider.color }}>
                      <span className="text-white text-sm font-bold">{activeProvider.icon}</span>
                    </div>
                    <p className="text-white/30 text-xs">Ask me about your code</p>
                    <div className="mt-4 space-y-1.5">
                      {['Explain this code', 'Find bugs', 'Add TypeScript types', 'Optimize performance'].map(s => (
                        <button key={s} onClick={() => { setAiInput(s); aiInputRef.current?.focus(); }}
                          className="block w-full text-left text-[11px] text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 px-2 py-1.5 rounded-lg transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`${msg.role === 'user' ? 'text-right' : ''}`}>
                    {msg.role === 'user' ? (
                      <div className="inline-block text-left px-3 py-2 rounded-2xl rounded-tr-sm max-w-[85%] text-[12px] leading-relaxed text-white" style={{ background: '#3b82f6' }}>
                        {msg.text}
                      </div>
                    ) : (
                      <div className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {renderCode(msg.text)}
                      </div>
                    )}
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex items-center gap-2 text-white/30">
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-bold text-white" style={{ background: activeProvider.color }}>{activeProvider.icon}</div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce-dot" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={aiBottomRef} />
              </div>

              {/* AI input */}
              <div className="p-2.5 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <textarea ref={aiInputRef} value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIChat(); } }}
                    placeholder="Ask about the code…"
                    rows={1}
                    className="flex-1 text-[12px] text-white/80 bg-transparent outline-none resize-none placeholder-white/25 font-sans leading-relaxed"
                    style={{ maxHeight: 80 }}
                  />
                  <button onClick={handleAIChat} disabled={!aiInput.trim() || aiLoading}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-white transition-all shrink-0 ${aiInput.trim() && !aiLoading ? 'opacity-100' : 'opacity-30 cursor-not-allowed'}`}
                    style={{ background: activeProvider.color }}>
                    {aiLoading ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <I.Send />}
                  </button>
                </div>
                <p className="text-[9px] text-white/20 text-center mt-1.5 font-sans">Enter to send · Shift+Enter for newline</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
