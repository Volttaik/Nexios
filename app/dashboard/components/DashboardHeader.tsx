'use client';

import { useState } from 'react';
import { HiBell, HiOutlineMenuAlt2, HiSearch, HiSun, HiMoon, HiX } from 'react-icons/hi';
import UserDropdown from './UserDropdown';
import type { AppUser } from '@/app/types/user';
import { useTheme } from '@/app/context/ThemeContext';

interface DashboardHeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  user: AppUser | null;
  onLogout: () => void;
  onMobileMenuOpen: () => void;
  subdomain: string | null;
}

export default function DashboardHeader({ toggleSidebar, isSidebarOpen, user, onLogout, onMobileMenuOpen }: DashboardHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      className={`fixed top-0 right-0 h-14 z-30 flex items-center px-4 gap-3 transition-all duration-300 ${isSidebarOpen ? 'left-0 md:left-60' : 'left-0'}`}
      style={{ background: 'var(--bg-secondary)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--glass-border)', WebkitBackdropFilter: 'blur(24px)' }}>

      {/* Mobile menu button */}
      <button onClick={onMobileMenuOpen} className="md:hidden p-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseOut={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
        <HiOutlineMenuAlt2 className="w-5 h-5" />
      </button>

      {/* Desktop sidebar toggle — always visible, outside the sidebar */}
      <button onClick={toggleSidebar} className="hidden md:flex p-2 rounded-lg transition-colors items-center justify-center"
        title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        style={{ color: 'var(--text-secondary)' }}
        onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseOut={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
        {isSidebarOpen ? <HiX className="w-5 h-5" /> : <HiOutlineMenuAlt2 className="w-5 h-5" />}
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm relative hidden sm:block">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search projects, files, APIs..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl transition-all outline-none"
          style={{
            background: 'var(--input-bg)',
            border: `1px solid ${searchFocused ? 'var(--input-border-focus)' : 'var(--input-border)'}`,
            color: 'var(--text-primary)',
            boxShadow: searchFocused ? '0 0 0 3px var(--accent-glow)' : 'none',
          }}
        />
        {searchFocused && (
          <div className="absolute top-full mt-1 left-0 right-0 rounded-xl p-2 z-50" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-lg)' }}>
            <p className="text-xs px-2 py-1" style={{ color: 'var(--text-muted)' }}>Try &quot;new project&quot;, &quot;stripe api&quot;...</p>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-all"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ color: 'var(--text-secondary)', background: 'transparent' }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          {isDark ? <HiSun className="w-[18px] h-[18px]" /> : <HiMoon className="w-[18px] h-[18px]" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <HiBell className="w-[18px] h-[18px]" />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        </button>

        {/* AI Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
          AI Operational
        </div>

        <UserDropdown user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}
