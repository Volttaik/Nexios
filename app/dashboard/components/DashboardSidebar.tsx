'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BsRobot, BsGrid, BsChatDots, BsBarChart, BsGear } from 'react-icons/bs';
import { HiFolder } from 'react-icons/hi';
import type { AppUser } from '@/app/types/user';

interface DashboardSidebarProps {
  isOpen: boolean;
  user: AppUser | null;
  onClose?: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: BsGrid, exact: true },
  { href: '/dashboard/chat', label: 'AI Chat', icon: BsChatDots },
  { href: '/dashboard/projects', label: 'Projects', icon: HiFolder, badge: 'New' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BsBarChart },
  { href: '/dashboard/settings', label: 'Settings', icon: BsGear },
];

export default function DashboardSidebar({ isOpen, user, isMobileOpen, onMobileClose }: DashboardSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onMobileClose} />
      )}

      <aside className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300
          ${isOpen ? 'w-60' : 'w-[72px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ background: 'rgba(8,12,20,0.95)', backdropFilter: 'blur(24px)', borderRight: '1px solid var(--glass-border)' }}>

        {/* Logo */}
        <div className="h-14 flex items-center px-4 shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)', boxShadow: '0 0 12px var(--accent-glow)' }}>
            <BsRobot className="w-4 h-4 text-white" />
          </div>
          {isOpen && (
            <span className="ml-2.5 text-sm font-bold text-white truncate">
              Nexios<span style={{ color: 'var(--accent)' }}>AI</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {isOpen && (
            <p className="text-[10px] font-semibold uppercase tracking-widest px-3 pb-2 pt-1" style={{ color: 'var(--text-muted)' }}>Menu</p>
          )}
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative"
                style={{
                  background: active ? 'rgba(129,140,248,0.15)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(129,140,248,0.2)' : 'transparent'}`,
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                }}
                onMouseOver={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; } }}
                onMouseOut={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; } }}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: 'var(--accent)' }} />}
                <Icon className="w-4 h-4 shrink-0" />
                {isOpen && (
                  <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                )}
                {isOpen && item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(129,140,248,0.2)' }}>
                    {item.badge}
                  </span>
                )}
                {!isOpen && (
                  <div className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        {user && (
          <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                {user.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
              {isOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-white">{user.fullName}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
