'use client';

import { useEffect, useState, useRef } from 'react';
import type { AppUser } from '@/app/types/user';
import type { ChatSession } from '../components/DashboardSidebar';
import { useAI } from '@/app/context/AIContext';

export default function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const { activeProvider } = useAI();

  useEffect(() => {
    setMounted(true);
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    const pic = localStorage.getItem('profilePicture');
    if (pic) setProfilePic(pic);
    const s = localStorage.getItem('chatSessions');
    if (s) { try { setSessions(JSON.parse(s)); } catch { /* ignore */ } }
  }, []);

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

  if (!mounted || !user) return null;

  const totalMessages = sessions.reduce((a, s) => a + s.messages.length, 0);
  const totalTokens = Math.floor(sessions.reduce((a, s) => a + s.messages.reduce((b, m) => b + m.text.length, 0), 0) / 4);
  const projects = (() => { try { return JSON.parse(localStorage.getItem('nexios-projects') || '[]').length; } catch { return 0; } })();
  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';

  const card = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 };

  const details = [
    { label: 'Full Name', value: user.fullName, icon: '👤' },
    { label: 'Username', value: `@${user.username}`, icon: '🏷️' },
    { label: 'Email', value: user.email, icon: '✉️' },
    { label: 'Phone', value: user.phone || 'Not set', icon: '📞' },
    { label: 'Date of Birth', value: user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not set', icon: '🎂' },
    { label: 'Member Since', value: memberSince, icon: '📅' },
    { label: 'User ID', value: String(user._id || user.id || 'N/A').slice(-16), icon: '🔑', mono: true },
  ];

  const stats = [
    { label: 'Sessions', value: sessions.length, color: '#3b82f6' },
    { label: 'Messages', value: totalMessages, color: '#8b5cf6' },
    { label: 'Est. Tokens', value: totalTokens.toLocaleString(), color: '#10b981' },
    { label: 'Projects', value: projects, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>My Profile</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>Your account information and activity</p>
      </div>

      {/* Profile card */}
      <div style={card}>
        <div className="flex items-center gap-5">
          <div className="relative cursor-pointer" onClick={() => profileInputRef.current?.click()}>
            {profilePic
              ? <img src={profilePic} alt="Profile" className="w-20 h-20 rounded-2xl object-cover shadow-md" style={{ border: '2px solid var(--border)' }} />
              : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md">
                  <span className="text-white text-2xl font-bold">{user.fullName?.[0] || 'U'}</span>
                </div>
            }
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: 'var(--text)' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
            </div>
            <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{user.fullName}</h2>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>@{user.username}</p>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#10b98120', color: '#10b981' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: activeProvider.color + '20', color: activeProvider.color }}>
                {activeProvider.icon} {activeProvider.shortName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="text-center p-4 rounded-xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text2)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Account details */}
      <div style={card}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Account Details</h2>
        <div className="space-y-0.5">
          {details.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-base w-6 text-center shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text3)' }}>{item.label}</p>
                <p className={`text-sm mt-0.5 ${item.mono ? 'font-mono text-xs' : ''}`} style={{ color: 'var(--text)' }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI config summary */}
      <div style={card}>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>AI Configuration</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>Active provider</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{activeProvider.name}</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: activeProvider.color }}>
            {activeProvider.icon}
          </div>
        </div>
      </div>
    </div>
  );
}
