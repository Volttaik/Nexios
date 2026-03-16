'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import type { AppUser } from '@/app/types/user';
import type { ChatSession } from './components/DashboardSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string>();
  const pathname = usePathname();

  const isChatPage = pathname === '/dashboard/chat';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
    }
  }, []);

  const handleNewChat = (newSession: ChatSession) => {
    setCurrentChatId(newSession.id);
    window.location.href = '/dashboard/chat';
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (isChatPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar
        user={user}
        currentChatId={currentChatId}
        onChatSelect={setCurrentChatId}
        onNewChat={handleNewChat}
        onDeleteChat={(chatId) => console.log('Delete chat:', chatId)}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
        onMobileOpen={() => setIsMobileOpen(true)}
      />

      <div className={`transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-16'}`}>
        <DashboardHeader
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          user={user}
          onLogout={handleLogout}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
        />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
