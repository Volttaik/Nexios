'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AppUser } from '@/app/types/user';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/app/context/ThemeContext';
import { useAI, AI_PROVIDERS } from '@/app/context/AIContext';

/* ── Types ───────────────────────────────────────────────────────────────── */
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrls?: string[];
  model?: string;
  provider?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: string;
  sessionKey?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  language: string;
  color: string;
  files: ProjectFile[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  content: string;
  language: string;
}

/* ── Exported AI_MODELS for backwards compat ──────────────────────────────── */
export const AI_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: '2.0', color: '#4285F4', description: 'Fastest & latest' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tag: '1.5F', color: '#34A853', description: 'Fast & efficient' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: '1.5P', color: '#9B59B6', description: 'Most capable' },
];

export interface AIModel {
  id: string; name: string; tag: string; color: string; description: string;
}

/* ── SVG Icons ─────────────────────────────────────────────────────────────── */
const Icons = {
  Grid: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  Chat: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Folder: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  Chart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Doc: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Gear: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ChevronLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>,
  ChevronDown: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><polyline points="6 9 12 15 18 9"/></svg>,
  Sun: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  Logout: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Key: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  Dots: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
  Code: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Lock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
};

/* ── Props ─────────────────────────────────────────────────────────────────── */
interface DashboardSidebarProps {
  user: AppUser | null;
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: (newSession: ChatSession) => void;
  onDeleteChat?: (chatId: string) => void;
  onRenameChat?: (chatId: string, newTitle: string) => void;
  onLogout?: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onMobileOpen: () => void;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
}

const NAV = [
  { href: '/dashboard', label: 'Overview', Icon: Icons.Grid, exact: true },
  { href: '/dashboard/chat', label: 'AI Chat', Icon: Icons.Chat },
  { href: '/dashboard/projects', label: 'Projects', Icon: Icons.Code },
  { href: '/dashboard/analytics', label: 'Analytics', Icon: Icons.Chart },
  { href: '/dashboard/documents', label: 'Documents', Icon: Icons.Doc },
  { href: '/dashboard/settings', label: 'Settings', Icon: Icons.Gear },
];

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

/* ── Sidebar Component ─────────────────────────────────────────────────────── */
export default function DashboardSidebar({
  user, currentChatId, onChatSelect, onNewChat, onDeleteChat, onRenameChat,
  onLogout, isOpen, onToggle, isMobileOpen, onMobileClose, onMobileOpen,
  selectedModel: _externalModel, onModelChange: _onModelChange,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { settings, activeProvider, activeModel, updateProviderConfig, setActiveProvider, setActiveModel, getApiKey } = useAI();

  const isChatPage = pathname === '/dashboard/chat';

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);
  const [projectMenuId, setProjectMenuId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showProjectsExpanded, setShowProjectsExpanded] = useState(true);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [editingKeyFor, setEditingKeyFor] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* Load sessions */
  useEffect(() => {
    const saved = localStorage.getItem('chatSessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed.map((s: Record<string, unknown>) => ({
          ...s,
          createdAt: new Date(s.createdAt as string),
          updatedAt: new Date(s.updatedAt as string),
          messages: (s.messages as Array<Record<string, unknown>>).map((m) => ({ ...m, timestamp: new Date(m.timestamp as string) })),
        })));
      } catch { /* ignore */ }
    }
  }, [currentChatId]);

  /* Load projects */
  useEffect(() => {
    const saved = localStorage.getItem('nexios-projects');
    if (saved) {
      try { setProjects(JSON.parse(saved)); } catch { /* ignore */ }
    }
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) setProfilePic(savedPic);
  }, []);

  /* Save sessions */
  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem('chatSessions', JSON.stringify(sessions));
  }, [sessions]);

  /* Close user menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (editingChatId && editInputRef.current) { editInputRef.current.focus(); editInputRef.current.select(); }
  }, [editingChatId]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleNewChat = () => {
    const session: ChatSession = {
      id: genId(), title: 'New Chat', messages: [], createdAt: new Date(), updatedAt: new Date(), sessionKey: genId(),
    };
    setSessions(prev => [session, ...prev]);
    onNewChat(session);
    onMobileClose();
  };

  const handleNewProject = () => {
    if (!newProjectName.trim()) return;
    const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899'];
    const project: Project = {
      id: genId(), name: newProjectName.trim(), description: '',
      language: 'javascript', color: colors[projects.length % colors.length],
      files: [{ id: genId(), name: 'index.js', content: '// Start coding here\nconsole.log("Hello, World!");\n', language: 'javascript' }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const updated = [project, ...projects];
    setProjects(updated);
    localStorage.setItem('nexios-projects', JSON.stringify(updated));
    setNewProjectName('');
    setShowNewProject(false);
    router.push(`/dashboard/sandbox/${project.id}`);
  };

  const handleDeleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem('nexios-projects', JSON.stringify(updated));
  };

  const handleRenameSubmit = (chatId: string) => {
    if (editingTitle.trim()) {
      setSessions(prev => prev.map(s => s.id === chatId ? { ...s, title: editingTitle.trim() } : s));
      if (onRenameChat) onRenameChat(chatId, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    else { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/login'); }
    setShowUserMenu(false);
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setProfilePic(b64);
      localStorage.setItem('profilePicture', b64);
      const u = localStorage.getItem('user');
      if (u) { const p = JSON.parse(u); p.profilePicture = b64; localStorage.setItem('user', JSON.stringify(p)); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveKey = (providerId: string) => {
    updateProviderConfig(providerId, { apiKey: tempKey });
    setEditingKeyFor(null);
    setTempKey('');
  };

  const formatDate = (d: Date) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(d).toLocaleDateString();
  };

  const isActive = (href: string, exact = false) => exact ? pathname === href : pathname.startsWith(href);

  /* ── Sidebar inner ─────────────────────────────────────────────────────── */
  const sidebarContent = (
    <aside className={`flex flex-col h-full transition-all duration-300 ${isOpen ? 'w-72' : 'w-[60px]'}`}
      style={{ background: 'var(--sidebar)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="h-14 flex items-center px-3 gap-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg">
          <span className="text-white text-[11px] font-bold tracking-tight">NX</span>
        </div>
        {isOpen && <span className="text-sm font-bold text-white/90 flex-1 truncate tracking-tight">Nexios AI</span>}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors hidden md:flex items-center justify-center text-white/40 hover:text-white/80"
          title={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? <Icons.ChevronLeft /> : <Icons.ChevronRight />}
        </button>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-none py-3 flex flex-col gap-0.5">

        {/* Navigation */}
        <div className="px-2 mb-1">
          {!isOpen ? null : <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-2.5 mb-1.5">Navigation</p>}
          {NAV.map(({ href, label, Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href} onClick={onMobileClose}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all text-sm group relative mb-0.5
                  ${active ? 'bg-white/[0.12] text-white' : 'text-white/45 hover:bg-white/[0.07] hover:text-white/80'}
                  ${!isOpen ? 'justify-center' : ''}
                `}
                title={!isOpen ? label : undefined}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r-full" />}
                <span className={`shrink-0 ${active ? 'text-white' : ''}`}><Icon /></span>
                {isOpen && <span className="font-medium truncate">{label}</span>}
              </Link>
            );
          })}
        </div>

        {/* ── Projects section ────────────────────────────────────────────── */}
        {isOpen && (
          <div className="px-2 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="pt-3">
              <div className="flex items-center justify-between px-2.5 mb-2">
                <button onClick={() => setShowProjectsExpanded(!showProjectsExpanded)}
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors">
                  <span className={`transition-transform ${showProjectsExpanded ? '' : '-rotate-90'}`}><Icons.ChevronDown /></span>
                  Projects ({projects.length})
                </button>
                <button onClick={() => setShowNewProject(!showNewProject)}
                  className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/80 transition-colors" title="New project">
                  <Icons.Plus />
                </button>
              </div>

              {showNewProject && (
                <div className="mb-2 px-1 animate-slideDown">
                  <div className="flex gap-1.5">
                    <input
                      type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleNewProject(); if (e.key === 'Escape') { setShowNewProject(false); setNewProjectName(''); } }}
                      placeholder="Project name..."
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white/10 border border-white/15 rounded-lg text-white placeholder-white/30 outline-none focus:border-blue-400"
                      autoFocus
                    />
                    <button onClick={handleNewProject} className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors">
                      <Icons.Check />
                    </button>
                  </div>
                </div>
              )}

              {showProjectsExpanded && (
                <div className="space-y-0.5">
                  {projects.slice(0, 6).map(project => (
                    <div key={project.id} className="relative group">
                      <Link href={`/dashboard/sandbox/${project.id}`} onClick={onMobileClose}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors
                          ${pathname === `/dashboard/sandbox/${project.id}` ? 'bg-white/[0.12] text-white' : 'text-white/45 hover:bg-white/[0.07] hover:text-white/80'}
                        `}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                        <span className="text-xs font-medium truncate flex-1">{project.name}</span>
                        <button
                          onClick={e => { e.preventDefault(); e.stopPropagation(); setProjectMenuId(projectMenuId === project.id ? null : project.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all"
                        >
                          <Icons.Dots />
                        </button>
                      </Link>
                      {projectMenuId === project.id && (
                        <div className="absolute right-0 mt-1 w-36 rounded-xl glass-dark shadow-2xl z-50 py-1 animate-scaleIn">
                          <button onClick={() => { handleDeleteProject(project.id); setProjectMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left">
                            <Icons.Trash /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-xs text-white/20 px-2.5 py-2">No projects yet. Create one above.</p>
                  )}
                  {projects.length > 6 && (
                    <Link href="/dashboard/projects" className="block text-xs text-blue-400/70 hover:text-blue-400 px-2.5 py-1.5 transition-colors">
                      View all {projects.length} projects →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Chat sessions (only on chat page) ──────────────────────────── */}
        {isChatPage && isOpen && (
          <div className="px-2 mt-2 flex-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="pt-3">
              <div className="flex items-center justify-between px-2.5 mb-2">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Chats ({sessions.length})</p>
                <button onClick={handleNewChat} className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/80 transition-colors" title="New chat">
                  <Icons.Plus />
                </button>
              </div>
              <div className="space-y-0.5">
                {sessions.map(chat => (
                  <div key={chat.id} className="relative group">
                    {editingChatId === chat.id ? (
                      <div className="p-1" onClick={e => e.stopPropagation()}>
                        <input ref={editInputRef} type="text" value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(chat.id); if (e.key === 'Escape') setEditingChatId(null); }}
                          onBlur={() => handleRenameSubmit(chat.id)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white outline-none focus:border-blue-400"
                        />
                      </div>
                    ) : (
                      <div onClick={() => { onChatSelect(chat.id); onMobileClose(); setChatMenuId(null); }}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors
                          ${currentChatId === chat.id ? 'bg-white/[0.12] text-white' : 'text-white/45 hover:bg-white/[0.07] hover:text-white/80'}
                        `}>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0 text-white/25">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{chat.title}</p>
                          <p className="text-[10px] text-white/25">{formatDate(chat.updatedAt)}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); setChatMenuId(chatMenuId === chat.id ? null : chat.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all">
                          <Icons.Dots />
                        </button>
                      </div>
                    )}
                    {chatMenuId === chat.id && (
                      <div className="absolute right-0 mt-1 w-40 rounded-xl glass-dark shadow-2xl z-50 py-1 animate-scaleIn">
                        <button onClick={() => { setEditingChatId(chat.id); setEditingTitle(chat.title); setChatMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition-colors text-left">
                          <Icons.Edit /> Rename
                        </button>
                        <button onClick={e => { e.stopPropagation(); setSessions(p => p.filter(s => s.id !== chat.id)); if (onDeleteChat) onDeleteChat(chat.id); setChatMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left">
                          <Icons.Trash /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-xs text-white/20">No chats yet</p>
                    <button onClick={handleNewChat} className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">Start chatting</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* ── AI Provider Panel ────────────────────────────────────────────── */}
        {isOpen && (
          <div className="px-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="pt-3 pb-1">
              <button onClick={() => setShowAIPanel(!showAIPanel)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/[0.07] transition-colors">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: activeProvider.color }}>
                  {activeProvider.icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-white/80 truncate">{activeProvider.shortName}</p>
                  <p className="text-[10px] text-white/30 truncate">{activeModel.name}</p>
                </div>
                <span className={`text-white/30 transition-transform ${showAIPanel ? 'rotate-180' : ''}`}><Icons.ChevronDown /></span>
              </button>

              {showAIPanel && (
                <div className="mt-2 rounded-xl border border-white/[0.08] overflow-hidden animate-slideDown" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {/* Provider selector */}
                  <div className="p-2 border-b border-white/[0.06]">
                    <p className="text-[9px] font-semibold text-white/25 uppercase tracking-widest px-1 mb-1.5">Provider</p>
                    <div className="grid grid-cols-2 gap-1">
                      {AI_PROVIDERS.map(p => (
                        <button key={p.id} onClick={() => setActiveProvider(p.id)}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all
                            ${settings.activeProvider === p.id ? 'bg-white/[0.15] text-white' : 'text-white/40 hover:bg-white/[0.07] hover:text-white/70'}
                          `}>
                          <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ background: p.color }}>
                            {p.icon}
                          </div>
                          <span className="truncate font-medium">{p.shortName}</span>
                          {settings.activeProvider === p.id && <Icons.Check />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model selector */}
                  <div className="p-2 border-b border-white/[0.06]">
                    <p className="text-[9px] font-semibold text-white/25 uppercase tracking-widest px-1 mb-1.5">Model</p>
                    <div className="space-y-0.5">
                      {activeProvider.models.map(m => (
                        <button key={m.id} onClick={() => setActiveModel(m.id)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all
                            ${activeModel.id === m.id ? 'bg-white/[0.15] text-white' : 'text-white/40 hover:bg-white/[0.07] hover:text-white/70'}
                          `}>
                          <span className="font-medium truncate text-left">{m.name}</span>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            {m.supportsImages && <span className="text-[9px] text-white/30">📷</span>}
                            {activeModel.id === m.id && <Icons.Check />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="p-2">
                    <p className="text-[9px] font-semibold text-white/25 uppercase tracking-widest px-1 mb-1.5">API Key</p>
                    {editingKeyFor === settings.activeProvider ? (
                      <div className="flex gap-1">
                        <input type="password" value={tempKey} onChange={e => setTempKey(e.target.value)}
                          placeholder={activeProvider.apiKeyPlaceholder}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(settings.activeProvider); if (e.key === 'Escape') setEditingKeyFor(null); }}
                          className="flex-1 px-2 py-1.5 text-[11px] bg-white/10 border border-white/15 rounded-lg text-white placeholder-white/25 outline-none focus:border-blue-400"
                          autoFocus
                        />
                        <button onClick={() => handleSaveKey(settings.activeProvider)} className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-xs transition-colors">
                          <Icons.Check />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingKeyFor(settings.activeProvider); setTempKey(settings.providers[settings.activeProvider]?.apiKey || ''); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors text-left">
                        <Icons.Key />
                        <span className="text-[11px] text-white/40 flex-1 truncate font-mono">
                          {settings.providers[settings.activeProvider]?.apiKey
                            ? '••••••••' + settings.providers[settings.activeProvider].apiKey.slice(-4)
                            : getApiKey(settings.activeProvider) ? 'Using default key' : 'Add API key…'
                          }
                        </span>
                        {(settings.providers[settings.activeProvider]?.apiKey || getApiKey(settings.activeProvider)) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsed model indicator */}
        {!isOpen && (
          <div className="px-1.5 py-2 flex justify-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={onToggle}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
              style={{ background: activeProvider.color }} title={`${activeProvider.shortName} - Click to expand`}>
              {activeProvider.icon}
            </button>
          </div>
        )}

        {/* ── Dark mode + settings ─────────────────────────────────────────── */}
        <div className="px-2 pb-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className={`flex items-center pt-2 gap-1 ${isOpen ? 'justify-between' : 'justify-center flex-col'}`}>
            <button onClick={toggleTheme}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/[0.07] transition-colors text-white/40 hover:text-white/80 ${!isOpen ? 'justify-center' : 'flex-1'}`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <Icons.Sun /> : <Icons.Moon />}
              {isOpen && <span className="text-xs font-medium">{isDark ? 'Light mode' : 'Dark mode'}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ── User footer ──────────────────────────────────────────────────── */}
      <div className="shrink-0 p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} ref={userMenuRef}>
        {user ? (
          <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/[0.07] transition-colors ${!isOpen ? 'justify-center' : ''}`}>
              <div className="relative shrink-0">
                {profilePic
                  ? <img src={profilePic} alt="You" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20" />
                  : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center ring-1 ring-white/20">
                      <span className="text-white text-xs font-bold">{user.fullName?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                }
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border-2 border-[#0f0f12]" />
              </div>
              {isOpen && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-white/80 truncate">{user.fullName}</p>
                  <p className="text-[10px] text-white/30 truncate">{user.email}</p>
                </div>
              )}
            </button>

            {showUserMenu && (
              <div className={`absolute ${isOpen ? 'left-0 right-0' : 'left-12 w-52'} bottom-full mb-2 rounded-2xl glass-dark shadow-2xl z-50 py-2 animate-scaleIn`}>
                <div className="px-3 py-2 border-b border-white/[0.07] mb-1">
                  <p className="text-xs font-semibold text-white/80">{user.fullName}</p>
                  <p className="text-[10px] text-white/30">{user.email}</p>
                </div>
                {[
                  { label: 'Profile', href: '/dashboard/profile', Icon: Icons.User },
                  { label: 'Settings', href: '/dashboard/settings', Icon: Icons.Gear },
                ].map(item => (
                  <Link key={item.href} href={item.href}
                    onClick={() => { setShowUserMenu(false); onMobileClose(); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.07] hover:text-white transition-colors">
                    <item.Icon /> {item.label}
                  </Link>
                ))}
                <div className="border-t border-white/[0.07] mt-1 pt-1">
                  <button onClick={() => { profileInputRef.current?.click(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.07] hover:text-white transition-colors text-left">
                    <Icons.User /> Change photo
                  </button>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left">
                    <Icons.Logout /> Sign out
                  </button>
                </div>
              </div>
            )}
            <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
          </div>
        ) : (
          <div className={`flex items-center gap-2.5 px-2.5 py-2 ${!isOpen ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Icons.User />
            </div>
            {isOpen && <span className="text-xs text-white/30">Not signed in</span>}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && <div className="fixed inset-0 bg-black/70 z-30 md:hidden backdrop-blur-sm" onClick={onMobileClose} />}

      {/* Mobile toggle */}
      <button
        onClick={onMobileOpen}
        className="fixed top-3 left-3 z-50 md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-white/80 hover:text-white transition-colors"
        style={{ background: 'rgba(15,15,18,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Desktop sidebar */}
      <div className="fixed top-0 left-0 h-full z-40 hidden md:block">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed top-0 left-0 h-full z-40 md:hidden transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 288 }}>
        {sidebarContent}
      </div>
    </>
  );
}
