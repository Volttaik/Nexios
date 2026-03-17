'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import DashboardSidebar from './components/DashboardSidebar';
import type { AppUser } from '@/app/types/user';
import type { ChatSession } from './components/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string>();
  const pathname = usePathname();

  const isChatPage = pathname === '/dashboard/chat';
  const isSandboxPage = pathname.startsWith('/dashboard/sandbox/');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    const token = localStorage.getItem('token');
    if (!token) window.location.href = '/login';
    const saved = localStorage.getItem('nexios-sidebar-open');
    if (saved !== null) setIsSidebarOpen(saved === 'true');
  }, []);

  const handleToggle = () => {
    const next = !isSidebarOpen;
    setIsSidebarOpen(next);
    localStorage.setItem('nexios-sidebar-open', String(next));
  };

  const handleNewChat = (newSession: ChatSession) => {
    setCurrentChatId(newSession.id);
    window.location.href = '/dashboard/chat';
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  /* Chat and sandbox pages handle their own full-screen layout */
  if (isChatPage || isSandboxPage) return <>{children}</>;

  const ml = isSidebarOpen ? 'md:ml-72' : 'md:ml-[60px]';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardSidebar
        user={user}
        currentChatId={currentChatId}
        onChatSelect={setCurrentChatId}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        onToggle={handleToggle}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
        onMobileOpen={() => setIsMobileOpen(true)}
        onLogout={handleLogout}
      />
      <div className={`transition-all duration-300 ${ml} min-h-screen flex flex-col`}>
        <main className="flex-1 p-6 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
