'use client';

import { useEffect, useState, useRef } from 'react';
import type { AppUser } from '@/app/types/user';
import { useAI, AI_PROVIDERS } from '@/app/context/AIContext';
import { useTheme, type UIStyle, type BGPattern } from '@/app/context/ThemeContext';

export default function SettingsPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const { settings, setActiveModel } = useAI();
  const { isDark, toggleTheme, uiStyle, setUIStyle, bgPattern, setBGPattern } = useTheme();

  useEffect(() => {
    setMounted(true);
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    const pic = localStorage.getItem('profilePicture');
    if (pic) setProfilePic(pic);
    const auto = localStorage.getItem('nexios_autonomous_mode');
    if (auto) setAutonomousMode(auto === 'true');
  }, []);

  const toggleAutonomousMode = () => {
    const next = !autonomousMode;
    setAutonomousMode(next);
    localStorage.setItem('nexios_autonomous_mode', String(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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

  const handleClearChats = () => {
    if (confirm('This will permanently delete all chat history. Continue?')) {
      localStorage.removeItem('chatSessions');
      alert('Chat history cleared.');
    }
  };

  const handleClearProjects = () => {
    if (confirm('This will permanently delete all projects. Continue?')) {
      localStorage.removeItem('nexios-projects');
      alert('All projects cleared.');
    }
  };

  if (!mounted) return null;

  const provider = AI_PROVIDERS[0]; // Nexios
  const currentModel = settings.providers.nexios?.selectedModel || 'nexios-core';

  const UI_STYLES: Array<{ id: UIStyle; label: string; desc: string; preview: string }> = [
    { id: 'flat', label: 'Flat', desc: 'Clean & minimal', preview: '□' },
    { id: 'glass', label: 'Glass', desc: 'Frosted blur effect', preview: '◫' },
    { id: 'soft', label: 'Soft UI', desc: 'Neumorphic shadows', preview: '◍' },
  ];

  const BG_PATTERNS: Array<{ id: BGPattern; label: string }> = [
    { id: 'none', label: 'None' },
    { id: 'dots', label: 'Dots' },
    { id: 'grid', label: 'Grid' },
    { id: 'lines', label: 'Lines' },
    { id: 'noise', label: 'Noise' },
    { id: 'circuit', label: 'Circuit' },
  ];

  const sectionCard = 'rounded-2xl border p-5 space-y-4 card-surface';

  return (
    <div className="space-y-5 max-w-2xl pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>Manage your account, AI model, and appearance</p>
      </div>

      {/* Profile */}
      <div className={sectionCard}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Profile</h2>
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer" onClick={() => profileInputRef.current?.click()}>
            {profilePic
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={profilePic} alt="Profile" className="w-16 h-16 rounded-2xl object-cover shadow-md" style={{ border: '2px solid var(--border)' }} />
              : <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
                  <span className="text-white text-xl font-bold">{user?.fullName?.[0] || 'U'}</span>
                </div>
            }
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-white shadow" style={{ background: 'var(--text)' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
            </div>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{user?.fullName || 'User'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>{user?.email}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>@{user?.username}</p>
            <button onClick={() => profileInputRef.current?.click()} className="text-xs mt-1.5 font-semibold transition-colors" style={{ color: 'var(--accent)' }}>
              Change photo
            </button>
          </div>
          <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
        </div>
      </div>

      {/* AI Model Selection */}
      <div className={sectionCard}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>AI Model</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
            All models are powered by Nexios AI — no API keys needed. Choose the model that fits your needs.
          </p>
        </div>

        <div className="rounded-xl p-4 border transition-all" style={{ background: 'var(--bg)', borderColor: provider.color + '80', borderWidth: 2 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: provider.color }}>
              {provider.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{provider.name}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#10b98120', color: '#10b981' }}>FREE</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text2)' }}>{provider.models.length} models · Built-in AI powered by state-of-the-art models</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {provider.models.map(m => (
              <button key={m.id} onClick={() => { setActiveModel(m.id); setSaved(true); setTimeout(() => setSaved(false), 2500); }}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all border"
                style={{
                  background: currentModel === m.id ? provider.color + '15' : 'var(--bg2)',
                  borderColor: currentModel === m.id ? provider.color + '60' : 'var(--border)',
                }}>
                <div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{m.name}</span>
                  <span className="text-xs mx-2" style={{ color: 'var(--text3)' }}>·</span>
                  <span className="text-xs" style={{ color: 'var(--text2)' }}>{m.description}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: '#10b98115', color: '#10b981' }}>Free</span>
                  {currentModel === m.id && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" style={{ color: provider.color }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Autonomous Mode */}
      <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: autonomousMode ? 'rgba(251,191,36,0.35)' : 'var(--border)', background: autonomousMode ? 'rgba(251,191,36,0.04)' : 'var(--bg2)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Autonomous Mode</span>
              {autonomousMode && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>⚡ ACTIVE</span>
              )}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>
              Gives Nexios AI full awareness of its own code and capabilities. In this mode the AI can analyze its own logic, propose self-improvements, and adapt its behavior to overcome limitations — exactly like an advanced coding agent.
            </p>
            {autonomousMode && (
              <p className="text-xs mt-2 font-medium" style={{ color: '#fbbf24' }}>
                ⚡ Active in all workspaces. The AI can now reason about and rewrite its own behavior.
              </p>
            )}
          </div>
          <button onClick={toggleAutonomousMode}
            className="relative w-12 h-6 rounded-full transition-colors shrink-0 mt-0.5"
            style={{ background: autonomousMode ? '#f59e0b' : 'var(--bg3)' }}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${autonomousMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        {autonomousMode && (
          <div className="rounded-xl p-3 text-xs leading-relaxed space-y-1" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', color: 'rgba(251,191,36,0.8)' }}>
            <p className="font-semibold">What autonomous mode enables:</p>
            <p>• The AI sees its own system prompt and decision logic</p>
            <p>• It can reason about why it made choices and refine them</p>
            <p>• It can propose new rules for itself when it hits limitations</p>
            <p>• Self-modification is sandboxed to prompt-level — not code execution</p>
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className={sectionCard}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Appearance</h2>

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Dark Mode</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>Toggle dark/light theme</p>
          </div>
          <button onClick={toggleTheme}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: isDark ? 'var(--accent)' : 'var(--bg3)' }}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* UI Style */}
        <div>
          <p className="text-sm font-medium mb-2.5" style={{ color: 'var(--text)' }}>UI Style</p>
          <div className="grid grid-cols-3 gap-2">
            {UI_STYLES.map(s => (
              <button key={s.id} onClick={() => setUIStyle(s.id)}
                className="flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all"
                style={{
                  background: uiStyle === s.id ? 'var(--accent)15' : 'var(--bg)',
                  borderColor: uiStyle === s.id ? 'var(--accent)' : 'var(--border)',
                  borderWidth: uiStyle === s.id ? 2 : 1,
                }}>
                <span className="text-2xl">{s.preview}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: uiStyle === s.id ? 'var(--accent)' : 'var(--text)' }}>{s.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* BG Pattern */}
        <div>
          <p className="text-sm font-medium mb-2.5" style={{ color: 'var(--text)' }}>Background Pattern</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {BG_PATTERNS.map(p => (
              <button key={p.id} onClick={() => setBGPattern(p.id)}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all"
                style={{
                  background: bgPattern === p.id ? 'var(--accent)15' : 'var(--bg)',
                  borderColor: bgPattern === p.id ? 'var(--accent)' : 'var(--border)',
                  color: bgPattern === p.id ? 'var(--accent)' : 'var(--text2)',
                  borderWidth: bgPattern === p.id ? 2 : 1,
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border p-5" style={{ borderColor: '#ef444430', background: 'var(--bg2)' }}>
        <h2 className="text-sm font-bold text-red-500 mb-1">Danger Zone</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text2)' }}>These actions are irreversible.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleClearChats}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 border transition-colors"
            style={{ borderColor: '#ef444430', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#ef444415')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            Clear Chat History
          </button>
          <button onClick={handleClearProjects}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 border transition-colors"
            style={{ borderColor: '#ef444430', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#ef444415')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            Clear All Projects
          </button>
        </div>
      </div>

      {saved && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl animate-slideDown" style={{ background: '#10b981' }}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          Changes saved
        </div>
      )}
    </div>
  );
}
