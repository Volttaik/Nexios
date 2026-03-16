'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from './components/DashboardHeader';
import DashboardSidebar from './components/DashboardSidebar';
import { useSubdomain } from '@/app/components/SubdomainHandler';
import type { AppUser } from '@/app/types/user';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const subdomain = useSubdomain(); // 👈 Hook is used here

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <DashboardSidebar 
        isOpen={isSidebarOpen} 
        user={user} 
        onClose={() => setIsMobileMenuOpen(false)}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        isSidebarOpen ? 'md:ml-64' : 'md:ml-20'
      }`}>
        <DashboardHeader 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          user={user}
          onLogout={handleLogout}
          onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
          subdomain={subdomain} // 👈 Passed to header
        />

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
