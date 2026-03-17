'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import { useSubdomain } from '@/app/components/SubdomainHandler';
import type { AppUser } from '@/app/types/user';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const subdomain = useSubdomain();

<<<<<<< HEAD
=======
  // Project workspace gets its own full-screen layout — match /dashboard/projects/[any-id]
>>>>>>> 9fbf77f (Improve user interface and add theme customization options)
  const isWorkspace = /\/dashboard\/projects\/[^/]+/.test(pathname || '');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (isWorkspace) {
    return <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>{children}</div>;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <DashboardSidebar
        isOpen={isSidebarOpen}
        user={user}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'md:ml-60' : 'md:ml-0'}`}>
        <DashboardHeader
          toggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          isSidebarOpen={isSidebarOpen}
          user={user}
          onLogout={handleLogout}
          onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
          subdomain={subdomain}
        />
        <main className="p-6 pt-20">
          {children}
        </main>
      </div>
    </div>
  );
}
