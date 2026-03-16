'use client';

import { useEffect, useState, useRef } from 'react';
import type { AppUser } from '@/app/types/user';
import type { ChatSession } from '../components/DashboardSidebar';

export default function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const profileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    const pic = localStorage.getItem('profilePicture');
    if (pic) setProfilePic(pic);
    const saved = localStorage.getItem('chatSessions');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, []);

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setProfilePic(base64);
      localStorage.setItem('profilePicture', base64);
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        parsed.profilePicture = base64;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!mounted || !user) return null;

  const totalMessages = sessions.reduce((acc, s) => acc + s.messages.length, 0);
  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const userId = user._id || user.id || 'N/A';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Your account information and activity</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200 shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center border-2 border-gray-200 shadow-md">
                <span className="text-white text-2xl font-bold">{user.fullName?.[0]?.toUpperCase() || 'U'}</span>
              </div>
            )}
            <button
              onClick={() => profileInputRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-gray-900 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors shadow-md"
              title="Change photo"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
            <p className="text-sm text-gray-500">@{user.username}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Account Details</h2>
        <div className="grid grid-cols-1 gap-4">
          {[
            { label: 'Full Name', value: user.fullName, icon: '👤' },
            { label: 'Username', value: `@${user.username}`, icon: '🏷️' },
            { label: 'Email Address', value: user.email, icon: '✉️' },
            { label: 'Phone', value: user.phone || 'Not set', icon: '📞' },
            { label: 'Date of Birth', value: user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not set', icon: '🎂' },
            { label: 'Member Since', value: memberSince, icon: '📅' },
            { label: 'User ID', value: String(userId).slice(-16), icon: '🔑', mono: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-base shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{item.label}</p>
                <p className={`text-sm text-gray-900 mt-0.5 ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Usage Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Chat Sessions', value: sessions.length },
            { label: 'Total Messages', value: totalMessages },
            { label: 'Est. Tokens', value: Math.floor(sessions.reduce((acc, s) => acc + s.messages.reduce((a, m) => a + m.text.length, 0), 0) / 4).toLocaleString() },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
