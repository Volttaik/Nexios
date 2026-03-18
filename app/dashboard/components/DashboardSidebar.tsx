'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { BsRobot, BsGrid, BsChatDots, BsBarChart, BsGear, BsChevronDown, BsChevronRight, BsPlus, BsClock } from 'react-icons/bs';
import { HiFolder } from 'react-icons/hi';
import type { AppUser } from '@/app/types/user';

export interface ChatMessage {
  id?: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp?: Date;
  imageUrls?: string[];
  provider?: string;
  model?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  sessionKey: string;
}

interface Project {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  lastModified?: string;
}

interface DashboardSidebarProps {
  isOpen: boolean;
  user: AppUser | null;
  onClose?: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onMobileOpen?: () => void;
  onToggle?: () => void;
  onLogout?: () => void;
  currentChatId?: string;
  onChatSelect?: (id: string) => void;
  onNewChat?: (session: ChatSession) => void;
  onDeleteChat?: (id: string) => void;
  onRenameChat?: (id: string, title: string) => void;
}


const TYPE_COLOR: Record<string, string> = {
  code: '#818cf8',
  design: '#f472b6',
  document: '#34d399',
};

function loadChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem('chatSessions');
    if (!raw) return [];
    return (JSON.parse(raw) as ChatSession[])
      .map(s => ({ ...s, updatedAt: new Date(s.updatedAt as unknown as string) }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 8);
  } catch { return []; }
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem('nexios_projects');
    if (!raw) return [];
    return (JSON.parse(raw) as Project[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  } catch { return []; }
}

export default function DashboardSidebar({ isOpen, user, isMobileOpen, onMobileClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [chatExpanded, setChatExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const reload = useCallback(() => {
    setChats(loadChats());
    setProjects(loadProjects());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (isOpen || isMobileOpen) reload();
  }, [isOpen, isMobileOpen, reload]);

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href) ?? false;
  };

  const navLink = (href: string, label: string, Icon: React.ElementType, exact = false, badge?: string) => {
    const active = isActive(href, exact);
    return (
      <Link
        key={href}
        href={href}
        onClick={onMobileClose}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative"
        style={{
          background: active ? 'var(--accent-glow)' : 'transparent',
          border: `1px solid ${active ? 'rgba(99,102,241,0.2)' : 'transparent'}`,
          color: active ? 'var(--accent)' : 'var(--text-secondary)',
        }}
        onMouseOver={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; } }}
        onMouseOut={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; } }}
      >
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: 'var(--accent)' }} />}
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium truncate flex-1">{label}</span>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)' }}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const handleChatClick = (id: string) => {
    localStorage.setItem('nexios_last_chat_id', id);
    onMobileClose();
    router.push('/dashboard/chat');
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 w-60
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isOpen ? 'md:translate-x-0' : 'md:-translate-x-full'}
        `}
        style={{
          background: 'var(--bg-secondary)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid var(--glass-border)',
        }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)', boxShadow: '0 0 12px var(--accent-glow)' }}>
            <BsRobot className="w-4 h-4 text-white" />
          </div>
          <span className="ml-2.5 text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            Nexios<span style={{ color: 'var(--accent)' }}>AI</span>
          </span>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5" style={{ scrollbarWidth: 'none' }}>

          {/* Overview */}
          {navLink('/dashboard', 'Overview', BsGrid, true)}

          {/* ── AI Chat section ── */}
          <div className="pt-2">
            <button
              onClick={() => setChatExpanded(p => !p)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
              style={{
                background: isActive('/dashboard/chat') ? 'var(--accent-glow)' : 'transparent',
                border: `1px solid ${isActive('/dashboard/chat') ? 'rgba(99,102,241,0.2)' : 'transparent'}`,
                color: isActive('/dashboard/chat') ? 'var(--accent)' : 'var(--text-secondary)',
              }}
              onMouseOver={e => { if (!isActive('/dashboard/chat')) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; } }}
              onMouseOut={e => { if (!isActive('/dashboard/chat')) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; } }}
            >
              <BsChatDots className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium flex-1 text-left">AI Chat</span>
              <div className="flex items-center gap-1">
                <Link
                  href="/dashboard/chat"
                  onClick={e => { e.stopPropagation(); onMobileClose(); }}
                  className="p-0.5 rounded hover:opacity-80"
                  title="New chat"
                  style={{ color: 'inherit' }}
                >
                  <BsPlus className="w-4 h-4" />
                </Link>
                {chatExpanded ? <BsChevronDown className="w-3 h-3" /> : <BsChevronRight className="w-3 h-3" />}
              </div>
            </button>

            {chatExpanded && (
              <div className="mt-0.5 ml-2 space-y-0.5">
                {chats.length === 0 ? (
                  <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>No chats yet</p>
                ) : (
                  chats.map(chat => {
                    const isCurrentChat = pathname === '/dashboard/chat' && (typeof window !== 'undefined' && localStorage.getItem('nexios_last_chat_id') === chat.id);
                    return (
                      <button
                        key={chat.id}
                        onClick={() => handleChatClick(chat.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-150 text-left"
                        style={{
                          background: isCurrentChat ? 'rgba(99,102,241,0.1)' : 'transparent',
                          color: isCurrentChat ? 'var(--accent)' : 'var(--text-muted)',
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = isCurrentChat ? 'rgba(99,102,241,0.1)' : 'transparent'; (e.currentTarget as HTMLElement).style.color = isCurrentChat ? 'var(--accent)' : 'var(--text-muted)'; }}
                      >
                        <BsClock className="w-3 h-3 shrink-0 opacity-60" />
                        <span className="text-[11px] truncate flex-1">{chat.title || 'Untitled chat'}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ── Projects section ── */}
          <div className="pt-1">
            <button
              onClick={() => setProjectsExpanded(p => !p)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
              style={{
                background: isActive('/dashboard/projects') ? 'var(--accent-glow)' : 'transparent',
                border: `1px solid ${isActive('/dashboard/projects') ? 'rgba(99,102,241,0.2)' : 'transparent'}`,
                color: isActive('/dashboard/projects') ? 'var(--accent)' : 'var(--text-secondary)',
              }}
              onMouseOver={e => { if (!isActive('/dashboard/projects')) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; } }}
              onMouseOut={e => { if (!isActive('/dashboard/projects')) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; } }}
            >
              <HiFolder className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium flex-1 text-left">Projects</span>
              <div className="flex items-center gap-1">
                <Link
                  href="/dashboard/projects"
                  onClick={e => { e.stopPropagation(); onMobileClose(); }}
                  className="p-0.5 rounded hover:opacity-80"
                  title="All projects"
                  style={{ color: 'inherit' }}
                >
                  <BsPlus className="w-4 h-4" />
                </Link>
                {projectsExpanded ? <BsChevronDown className="w-3 h-3" /> : <BsChevronRight className="w-3 h-3" />}
              </div>
            </button>

            {projectsExpanded && (
              <div className="mt-0.5 ml-2 space-y-0.5">
                {projects.length === 0 ? (
                  <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>No projects yet</p>
                ) : (
                  projects.map(proj => {
                    const active = pathname === `/dashboard/projects/${proj.id}`;
                    const dot = TYPE_COLOR[proj.type] || '#818cf8';
                    return (
                      <Link
                        key={proj.id}
                        href={`/dashboard/projects/${proj.id}`}
                        onClick={onMobileClose}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-150"
                        style={{
                          background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                          color: active ? 'var(--accent)' : 'var(--text-muted)',
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(99,102,241,0.1)' : 'transparent'; (e.currentTarget as HTMLElement).style.color = active ? 'var(--accent)' : 'var(--text-muted)'; }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
                        <span className="text-[11px] truncate flex-1">{proj.name}</span>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Bottom nav items */}
          <div className="pt-2 space-y-0.5">
            {navLink('/dashboard/analytics', 'Analytics', BsBarChart)}
            {navLink('/dashboard/settings', 'Settings', BsGear)}
          </div>
        </nav>

        {/* User footer */}
        {user && (
          <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                {user.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.fullName}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
