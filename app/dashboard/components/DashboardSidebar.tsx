'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AppUser } from '@/app/types/user';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/app/context/ThemeContext';
import { useAI, AI_PROVIDERS } from '@/app/context/AIContext';

/* ── Types ───────────────────────────────────────────────────────────────── */
export interface Message {
  id: string; text: string; sender: 'user' | 'ai'; timestamp: Date;
  imageUrls?: string[]; model?: string; provider?: string;
}
export interface ChatSession {
  id: string; title: string; messages: Message[];
  createdAt: Date; updatedAt: Date; lastMessage?: string; sessionKey?: string;
}
export interface Project {
  id: string; name: string; description: string; language: string;
  color: string; files: ProjectFile[]; createdAt: string; updatedAt: string;
}
export interface ProjectFile {
  id: string; name: string; content: string; language: string;
}

export const AI_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: '2.0', color: '#4285F4', description: 'Fastest & latest' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tag: '1.5F', color: '#34A853', description: 'Fast & efficient' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: '1.5P', color: '#9B59B6', description: 'Most capable' },
];

export interface AIModel { id: string; name: string; tag: string; color: string; description: string; }

/* ── Icons ─────────────────────────────────────────────────────────────── */
const I = {
  Grid: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>,
  Chat: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Code: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Chart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Doc: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Gear: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Left: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>,
  Right: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>,
  Down: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><polyline points="6 9 12 15 18 9"/></svg>,
  Sun: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  Logout: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Dots: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Close: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Menu: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Bolt: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
};

/* ── Nav items ──────────────────────────────────────────────────────────── */
const NAV = [
  { href: '/dashboard', label: 'Overview', Icon: I.Grid, exact: true, color: '#6366f1' },
  { href: '/dashboard/chat', label: 'AI Chat', Icon: I.Chat, color: '#3b82f6' },
  { href: '/dashboard/projects', label: 'Projects', Icon: I.Code, color: '#10b981' },
  { href: '/dashboard/analytics', label: 'Analytics', Icon: I.Chart, color: '#f59e0b' },
  { href: '/dashboard/documents', label: 'Documents', Icon: I.Doc, color: '#8b5cf6' },
  { href: '/dashboard/settings', label: 'Settings', Icon: I.Gear, color: '#64748b' },
];

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

/* ── Props ─────────────────────────────────────────────────────────────── */
interface Props {
  user: AppUser | null;
  currentChatId?: string;
  onChatSelect: (id: string) => void;
  onNewChat: (s: ChatSession) => void;
  onDeleteChat?: (id: string) => void;
  onRenameChat?: (id: string, t: string) => void;
  onLogout?: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onMobileOpen: () => void;
  selectedModel?: string;
  onModelChange?: (id: string) => void;
}

/* ── Component ──────────────────────────────────────────────────────────── */
export default function DashboardSidebar({
  user, currentChatId, onChatSelect, onNewChat, onDeleteChat, onRenameChat,
  onLogout, isOpen, onToggle, isMobileOpen, onMobileClose, onMobileOpen,
}: Props) {
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

  /* Load data */
  useEffect(() => {
    const saved = localStorage.getItem('chatSessions');
    if (saved) {
      try {
        setSessions(JSON.parse(saved).map((s: Record<string, unknown>) => ({
          ...s,
          createdAt: new Date(s.createdAt as string),
          updatedAt: new Date(s.updatedAt as string),
          messages: (s.messages as Array<Record<string, unknown>>).map(m => ({ ...m, timestamp: new Date(m.timestamp as string) })),
        })));
      } catch { /* ignore */ }
    }
  }, [currentChatId]);

  useEffect(() => {
    const saved = localStorage.getItem('nexios-projects');
    if (saved) { try { setProjects(JSON.parse(saved)); } catch { /* ignore */ } }
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) setProfilePic(savedPic);
  }, []);

  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem('chatSessions', JSON.stringify(sessions));
  }, [sessions]);

  /* Close menus on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      setChatMenuId(null);
      setProjectMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (editingChatId && editInputRef.current) { editInputRef.current.focus(); editInputRef.current.select(); }
  }, [editingChatId]);

  /* Handlers */
  const handleNewChat = () => {
    const session: ChatSession = { id: genId(), title: 'New Chat', messages: [], createdAt: new Date(), updatedAt: new Date(), sessionKey: genId() };
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
    setNewProjectName(''); setShowNewProject(false);
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

  const isActive = (href: string, exact = false) => exact ? pathname === href : pathname.startsWith(href);

  const formatDate = (d: Date) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(d).toLocaleDateString();
  };

  /* ── Sidebar content ──────────────────────────────────────────────────── */
  const sidebarContent = (
    <aside
      className={`flex flex-col h-full transition-all duration-300 ${isOpen ? 'w-72' : 'w-16'}`}
      style={{ background: 'var(--sidebar)', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <div className="h-14 flex items-center px-3 gap-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #5b78ff, #8b5cf6)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-4 h-4"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        {isOpen && (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-white tracking-tight">Nexios AI</span>
            <div className="w-2 h-2 rounded-full bg-green-400 inline-block ml-2 animate-pulse-soft" title="Online" />
          </div>
        )}
        <button onClick={onToggle}
          className="p-1.5 rounded-lg transition-all hidden md:flex items-center justify-center"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)', e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          {isOpen ? <I.Left /> : <I.Right />}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scrollbar-none py-2 flex flex-col">

        {/* New chat button (on chat page) */}
        {isChatPage && isOpen && (
          <div className="px-2.5 mb-2">
            <button onClick={handleNewChat}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(91,120,255,0.25), rgba(139,92,246,0.2))', border: '1px solid rgba(91,120,255,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(91,120,255,0.35), rgba(139,92,246,0.3))')}
              onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(91,120,255,0.25), rgba(139,92,246,0.2))')}>
              <I.Plus /> New Conversation
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="px-2 space-y-0.5">
          {!isOpen ? null : <p className="text-[10px] font-semibold uppercase tracking-widest px-2.5 mb-2 mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Menu</p>}
          {NAV.map(({ href, label, Icon, exact, color }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href} onClick={onMobileClose}
                title={!isOpen ? label : undefined}
                className={`sidebar-item ${active ? 'active' : ''} ${!isOpen ? 'justify-center px-0' : ''}`}>
                {active && <span className="nav-active-dot" style={{ background: color }} />}
                <span className={`shrink-0 transition-colors ${active ? '' : ''}`} style={{ color: active ? color : 'rgba(255,255,255,0.4)' }}>
                  <Icon />
                </span>
                {isOpen && <span className={`truncate ${active ? 'text-white' : ''}`}>{label}</span>}
                {active && isOpen && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />}
              </Link>
            );
          })}
        </nav>

        {/* AI Model Selector (collapsed shows just icon) */}
        {isOpen && (
          <div className="px-2.5 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <button onClick={() => setShowAIPanel(!showAIPanel)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: activeProvider.color }}>
                {activeProvider.icon}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-white/80 truncate">{activeModel.name}</p>
                <p className="text-[10px] text-white/30 truncate">{activeProvider.shortName}</p>
              </div>
              <span className={`transition-transform ${showAIPanel ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.3)' }}><I.Down /></span>
            </button>

            {showAIPanel && (
              <div className="mt-2 rounded-xl overflow-hidden animate-slideDown" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                {AI_PROVIDERS.map(provider => {
                  const config = settings.providers[provider.id];
                  const isProviderActive = settings.activeProvider === provider.id;
                  const hasKey = !!(config?.apiKey?.trim() || getApiKey(provider.id));
                  return (
                    <div key={provider.id} className="border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <button onClick={() => { setActiveProvider(provider.id); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-all text-left"
                        style={{ background: isProviderActive ? provider.color + '20' : 'transparent' }}
                        onMouseEnter={e => !isProviderActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={e => !isProviderActive && (e.currentTarget.style.background = 'transparent')}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: provider.color }}>
                          {provider.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold truncate" style={{ color: isProviderActive ? '#fff' : 'rgba(255,255,255,0.6)' }}>{provider.shortName}</p>
                            {provider.isFree && <span className="text-[9px] px-1 py-0.5 rounded-full font-bold" style={{ background: '#10b98130', color: '#10b981' }}>FREE</span>}
                            {hasKey && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-white/30 truncate">{provider.models.length} models</p>
                        </div>
                        {isProviderActive && <I.Check />}
                      </button>

                      {/* Model selector (when provider active) */}
                      {isProviderActive && (
                        <div className="px-3 pb-2.5 space-y-1">
                          {provider.models.map(m => (
                            <button key={m.id} onClick={() => setActiveModel(m.id)}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all"
                              style={{ background: config?.selectedModel === m.id ? provider.color + '25' : 'rgba(255,255,255,0.04)', border: `1px solid ${config?.selectedModel === m.id ? provider.color + '50' : 'transparent'}` }}>
                              <div>
                                <p className="text-[11px] font-medium" style={{ color: config?.selectedModel === m.id ? '#fff' : 'rgba(255,255,255,0.55)' }}>{m.name}</p>
                                <p className="text-[9px] text-white/25">{m.description}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {m.supportsImages && <span className="text-[8px] px-1 py-0.5 rounded font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>IMG</span>}
                                {(m as { free?: boolean }).free && <span className="text-[8px] px-1 py-0.5 rounded font-medium" style={{ background: '#10b98115', color: '#10b981' }}>FREE</span>}
                              </div>
                            </button>
                          ))}
                          {/* API Key entry */}
                          {!hasKey && (
                            <div className="mt-1.5">
                              {editingKeyFor === provider.id ? (
                                <div className="flex gap-1.5">
                                  <input type="password" value={tempKey} onChange={e => setTempKey(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { updateProviderConfig(provider.id, { apiKey: tempKey }); setEditingKeyFor(null); setTempKey(''); } if (e.key === 'Escape') { setEditingKeyFor(null); setTempKey(''); } }}
                                    placeholder={provider.apiKeyPlaceholder}
                                    className="flex-1 px-2 py-1.5 text-[11px] bg-white/10 border border-white/15 rounded-lg text-white placeholder-white/25 outline-none focus:border-blue-400/60"
                                    autoFocus />
                                  <button onClick={() => { updateProviderConfig(provider.id, { apiKey: tempKey }); setEditingKeyFor(null); setTempKey(''); }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-semibold text-white" style={{ background: provider.color }}>
                                    <I.Check />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingKeyFor(provider.id); setTempKey(''); }}
                                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] transition-all"
                                  style={{ background: provider.isFree ? '#10b98115' : 'rgba(255,255,255,0.06)', color: provider.isFree ? '#10b981' : 'rgba(255,255,255,0.4)', border: `1px solid ${provider.isFree ? '#10b98130' : 'transparent'}` }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                                  {provider.isFree ? `Add free ${provider.shortName} key` : `Add ${provider.shortName} API key`}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Collapsed: AI icon */}
        {!isOpen && (
          <div className="px-2 mt-3">
            <button onClick={() => { if (!isOpen) onToggle(); setShowAIPanel(true); }}
              className="w-full flex items-center justify-center p-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.05)' }}
              title={`${activeProvider.shortName} / ${activeModel.name}`}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: activeProvider.color }}>
                {activeProvider.icon}
              </div>
            </button>
          </div>
        )}

        {/* Projects section */}
        {isOpen && (
          <div className="px-2 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <div className="flex items-center justify-between px-2.5 mb-1.5">
              <button onClick={() => setShowProjectsExpanded(!showProjectsExpanded)}
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest transition-colors"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
                <span className={`transition-transform ${showProjectsExpanded ? '' : '-rotate-90'}`}><I.Down /></span>
                Projects ({projects.length})
              </button>
              <button onClick={() => setShowNewProject(!showNewProject)}
                className="p-1 rounded-md transition-all" title="New project"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)', e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
                <I.Plus />
              </button>
            </div>

            {showNewProject && (
              <div className="mb-2 animate-slideDown">
                <div className="flex gap-1.5">
                  <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleNewProject(); if (e.key === 'Escape') { setShowNewProject(false); setNewProjectName(''); } }}
                    placeholder="Project name…"
                    className="flex-1 px-2.5 py-2 text-xs bg-white/[0.08] border border-white/[0.12] rounded-xl text-white placeholder-white/25 outline-none"
                    style={{ fontSize: 12 }}
                    autoFocus />
                  <button onClick={handleNewProject}
                    className="px-2.5 py-1.5 rounded-xl text-white transition-colors"
                    style={{ background: 'rgba(91,120,255,0.7)' }}>
                    <I.Check />
                  </button>
                </div>
              </div>
            )}

            {showProjectsExpanded && (
              <div className="space-y-0.5">
                {projects.slice(0, 7).map(project => (
                  <div key={project.id} className="relative group">
                    <Link href={`/dashboard/sandbox/${project.id}`} onClick={onMobileClose}
                      className={`sidebar-item ${pathname === `/dashboard/sandbox/${project.id}` ? 'active' : ''}`}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: project.color }} />
                      <span className="text-xs font-medium truncate flex-1">{project.name}</span>
                      <button onClick={e => { e.preventDefault(); e.stopPropagation(); setProjectMenuId(projectMenuId === project.id ? null : project.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <I.Dots />
                      </button>
                    </Link>
                    {projectMenuId === project.id && (
                      <div className="absolute right-2 top-full mt-1 w-36 rounded-xl glass-dark shadow-2xl z-50 py-1 animate-scaleIn">
                        <button onClick={() => { handleDeleteProject(project.id); setProjectMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 text-left transition-colors"
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <I.Trash /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="text-[11px] px-2.5 py-2" style={{ color: 'rgba(255,255,255,0.2)' }}>No projects yet.</p>
                )}
                {projects.length > 7 && (
                  <Link href="/dashboard/projects" onClick={onMobileClose}
                    className="block text-[11px] px-2.5 py-1.5 transition-colors"
                    style={{ color: 'rgba(91,120,255,0.7)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(91,120,255,1)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(91,120,255,0.7)')}>
                    View all {projects.length} projects →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat sessions */}
        {isChatPage && isOpen && (
          <div className="px-2 mt-3 flex-1 min-h-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <div className="flex items-center justify-between px-2.5 mb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Recent Chats ({sessions.length})
              </p>
            </div>
            <div className="space-y-0.5 overflow-y-auto scrollbar-none" style={{ maxHeight: 220 }}>
              {sessions.map(chat => (
                <div key={chat.id} className="relative group">
                  {editingChatId === chat.id ? (
                    <div className="p-1">
                      <input ref={editInputRef} type="text" value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(chat.id); if (e.key === 'Escape') setEditingChatId(null); }}
                        onBlur={() => handleRenameSubmit(chat.id)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white outline-none"
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  ) : (
                    <div onClick={() => { onChatSelect(chat.id); onMobileClose(); setChatMenuId(null); }}
                      className={`sidebar-item cursor-pointer ${currentChatId === chat.id ? 'active' : ''}`}>
                      {currentChatId === chat.id && <span className="nav-active-dot" style={{ background: '#5b78ff' }} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: currentChatId === chat.id ? '#fff' : 'rgba(255,255,255,0.55)' }}>{chat.title}</p>
                        <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>{formatDate(chat.updatedAt)}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setChatMenuId(chatMenuId === chat.id ? null : chat.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <I.Dots />
                      </button>
                    </div>
                  )}
                  {chatMenuId === chat.id && (
                    <div className="absolute right-2 top-full mt-1 w-36 rounded-xl glass-dark shadow-2xl z-50 py-1 animate-scaleIn">
                      <button onClick={() => { setEditingChatId(chat.id); setEditingTitle(chat.title); setChatMenuId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white/60 text-left transition-colors"
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <I.Edit /> Rename
                      </button>
                      <button onClick={() => {
                        if (onDeleteChat) onDeleteChat(chat.id);
                        setSessions(prev => prev.filter(s => s.id !== chat.id));
                        setChatMenuId(null);
                      }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 text-left transition-colors"
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <I.Trash /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-[11px] px-2.5 py-2" style={{ color: 'rgba(255,255,255,0.2)' }}>No chats yet. Start a conversation!</p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Theme toggle */}
        <div className="px-2 pb-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
          <button onClick={toggleTheme}
            className={`sidebar-item w-full ${!isOpen ? 'justify-center' : ''}`}
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{isDark ? <I.Sun /> : <I.Moon />}</span>
            {isOpen && <span className="text-xs">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>

        {/* User section */}
        <div className="px-2 pb-3 relative" ref={userMenuRef}>
          {user ? (
            <>
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl transition-all ${!isOpen ? 'justify-center' : ''}`}
                style={{ background: showUserMenu ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
                onMouseLeave={e => (e.currentTarget.style.background = showUserMenu ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)')}>
                {profilePic
                  ? <img src={profilePic} alt="Avatar" className="w-8 h-8 rounded-xl object-cover shrink-0" style={{ border: '2px solid rgba(91,120,255,0.5)' }} />
                  : <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #5b78ff, #8b5cf6)' }}>
                      {user.fullName?.[0]?.toUpperCase() || 'U'}
                    </div>
                }
                {isOpen && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-white/80 truncate">{user.fullName}</p>
                    <p className="text-[10px] text-white/30 truncate">@{user.username}</p>
                  </div>
                )}
                {isOpen && <I.Down />}
              </button>
              <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />

              {showUserMenu && (
                <div className="absolute bottom-full left-2 right-2 mb-2 rounded-2xl glass-dark shadow-2xl py-2 z-50 animate-slideDown">
                  <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-bold text-white">{user.fullName}</p>
                    <p className="text-[10px] text-white/40 truncate">{user.email}</p>
                  </div>
                  <button onClick={() => { profileInputRef.current?.click(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/60 text-left transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <I.User /> Change Photo
                  </button>
                  <Link href="/dashboard/settings" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/60 transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <I.Gear /> Settings
                  </Link>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }} />
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 text-left transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <I.Logout /> Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={`flex items-center gap-2.5 px-2.5 py-2 ${!isOpen ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <I.User />
              </div>
              {isOpen && <span className="text-xs text-white/25">Not signed in</span>}
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden animate-fadeIn"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={onMobileClose} />
      )}

      {/* Mobile toggle button — hidden when menu is open */}
      {!isMobileOpen && (
        <button onClick={onMobileOpen}
          className="fixed top-3 left-3 z-50 md:hidden w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: 'rgba(13,13,16,0.95)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
          <I.Menu />
        </button>
      )}

      {/* Desktop sidebar */}
      <div className="fixed top-0 left-0 h-full z-40 hidden md:block">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed top-0 left-0 h-full z-40 md:hidden transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 288 }}>
        {/* Mobile close button inside panel */}
        <div className="absolute top-3 right-3 z-10">
          <button onClick={onMobileClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
            <I.Close />
          </button>
        </div>
        {sidebarContent}
      </div>
    </>
  );
}
