'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HiCog, HiLogout, HiUser } from 'react-icons/hi';
import type { AppUser } from '@/app/types/user';

interface UserDropdownProps {
  user: AppUser | null;
  onLogout: () => void;
}

export default function UserDropdown({ user, onLogout }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', boxShadow: '0 0 12px rgba(99,102,241,0.3)' }}
        aria-label="User menu"
      >
        {user?.fullName?.[0]?.toUpperCase() || 'U'}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden z-50 animate-fadeIn"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                {user?.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'User'}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <button onClick={() => { setIsOpen(false); router.push('/dashboard'); }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors text-left"
              style={{ color: 'var(--text-secondary)' }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}>
              <HiUser className="w-4 h-4 shrink-0" /> Profile
            </button>
            <button onClick={() => { setIsOpen(false); router.push('/dashboard/settings'); }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors text-left"
              style={{ color: 'var(--text-secondary)' }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}>
              <HiCog className="w-4 h-4 shrink-0" /> Settings
            </button>
          </div>

          <div className="p-1.5" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <button onClick={() => { setIsOpen(false); onLogout(); }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors text-left"
              style={{ color: 'var(--danger)' }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <HiLogout className="w-4 h-4 shrink-0" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
