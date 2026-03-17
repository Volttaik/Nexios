'use client';

import { useState } from 'react';
import { HiBell, HiOutlineMenuAlt2, HiSearch } from 'react-icons/hi';
import UserDropdown from './UserDropdown';
import type { AppUser } from '@/app/types/user';

interface DashboardHeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  user: AppUser | null;
  onLogout: () => void;
  onMobileMenuOpen: () => void;
  subdomain: string | null;
}

export default function DashboardHeader({ toggleSidebar, user, onLogout, onMobileMenuOpen }: DashboardHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 h-14 z-30 flex items-center px-4 gap-3"
      style={{ background: 'rgba(8,12,20,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--glass-border)' }}>

      {/* Mobile menu */}
      <button onClick={onMobileMenuOpen} className="md:hidden p-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseOut={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
        <HiOutlineMenuAlt2 className="w-5 h-5" />
      </button>

      {/* Toggle sidebar desktop */}
      <button onClick={toggleSidebar} className="hidden md:flex p-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseOut={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
        <HiOutlineMenuAlt2 className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm relative hidden sm:block">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search projects, files, APIs..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl transition-all outline-none"
          style={{
            background: searchFocused ? 'rgba(255,255,255,0.08)' : 'var(--input-bg)',
            border: `1px solid ${searchFocused ? 'var(--input-border-focus)' : 'var(--input-border)'}`,
            color: 'var(--text-primary)',
            boxShadow: searchFocused ? '0 0 0 3px var(--accent-glow)' : 'none',
          }}
        />
        {searchFocused && (
          <div className="absolute top-full mt-1 left-0 right-0 rounded-xl p-2 z-50" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', boxShadow: '0 16px 32px rgba(0,0,0,0.5)' }}>
            <p className="text-xs px-2 py-1" style={{ color: 'var(--text-muted)' }}>Try &quot;new project&quot;, &quot;stripe api&quot;...</p>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <HiBell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        </button>

        {/* AI Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
          AI Ready
        </div>

        <UserDropdown user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}
