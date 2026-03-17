'use client';

import { useEffect, useState, useRef } from 'react';
import type { AppUser } from '@/app/types/user';
import { useAI, AI_PROVIDERS } from '@/app/context/AIContext';
import { useTheme } from '@/app/context/ThemeContext';

export default function SettingsPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState('');
  const profileInputRef = useRef<HTMLInputElement>(null);
  const { settings, updateProviderConfig, setActiveProvider, setActiveModel, getApiKey } = useAI();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    const pic = localStorage.getItem('profilePicture');
    if (pic) setProfilePic(pic);
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

  const handleSaveKey = (providerId: string) => {
    updateProviderConfig(providerId, { apiKey: tempKey.trim() });
    setEditingKey(null);
    setTempKey('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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

  const card = { background: 'var(--bg2)', borderColor: 'var(--border)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 0 };
  const label = { color: 'var(--text2)', fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
  const inputStyle = { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none' };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>Manage your account, AI providers, and preferences</p>
      </div>

      {/* Profile */}
      <div style={card}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Profile</h2>
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer" onClick={() => profileInputRef.current?.click()}>
            {profilePic
              ? <img src={profilePic} alt="Profile" className="w-16 h-16 rounded-2xl object-cover" style={{ border: '2px solid var(--border)' }} />
              : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{user?.fullName?.[0] || 'U'}</span>
                </div>
            }
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--text)' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
            </div>
          </div>
          <div>
            <p className="font-bold" style={{ color: 'var(--text)' }}>{user?.fullName || 'User'}</p>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>{user?.email}</p>
            <button onClick={() => profileInputRef.current?.click()} className="text-xs text-blue-500 hover:text-blue-400 mt-1 transition-colors">Change photo</button>
          </div>
          <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
        </div>
      </div>

      {/* AI Providers */}
      <div style={card}>
        <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>AI Providers</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text2)' }}>Configure providers and API keys. Leave blank to use the app&apos;s default key.</p>
        <div className="space-y-3">
          {AI_PROVIDERS.map(provider => {
            const config = settings.providers[provider.id];
            const isActive = settings.activeProvider === provider.id;
            const hasKey = !!(config?.apiKey?.trim() || getApiKey(provider.id));
            return (
              <div key={provider.id} className="rounded-xl p-4 border transition-all" style={{ background: 'var(--bg)', borderColor: isActive ? provider.color : 'var(--border)', borderWidth: isActive ? 2 : 1 }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: provider.color }}>
                    {provider.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{provider.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text2)' }}>{provider.models.length} models available</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasKey && <span className="w-2 h-2 rounded-full bg-green-400" title="API key configured" />}
                    <button onClick={() => setActiveProvider(provider.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${isActive ? 'text-white' : 'border'}`}
                      style={{ background: isActive ? provider.color : 'transparent', borderColor: 'var(--border)', color: isActive ? '#fff' : 'var(--text2)' }}>
                      {isActive ? '✓ Active' : 'Use'}
                    </button>
                  </div>
                </div>

                {/* Model selector */}
                {isActive && (
                  <div className="mb-3">
                    <label style={label}>Model</label>
                    <div className="grid grid-cols-1 gap-1">
                      {provider.models.map(m => (
                        <button key={m.id} onClick={() => setActiveModel(m.id)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left`}
                          style={{ background: config?.selectedModel === m.id ? provider.color + '20' : 'var(--bg2)', borderColor: config?.selectedModel === m.id ? provider.color : 'var(--border)', border: `1px solid ${config?.selectedModel === m.id ? provider.color : 'var(--border)'}`, color: 'var(--text)' }}>
                          <span className="font-medium">{m.name} <span className="font-normal" style={{ color: 'var(--text3)' }}>— {m.description}</span></span>
                          <div className="flex items-center gap-1.5">
                            {m.supportsImages && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>📷 Vision</span>}
                            {config?.selectedModel === m.id && <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" style={{ color: provider.color }}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* API Key */}
                <div>
                  <label style={label}>API Key</label>
                  {editingKey === provider.id ? (
                    <div className="flex gap-2">
                      <input type="password" value={tempKey} onChange={e => setTempKey(e.target.value)}
                        placeholder={provider.apiKeyPlaceholder}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(provider.id); if (e.key === 'Escape') setEditingKey(null); }}
                        style={{ ...inputStyle, flex: 1 }} autoFocus
                      />
                      <button onClick={() => handleSaveKey(provider.id)} className="px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors" style={{ background: provider.color }}>Save</button>
                      <button onClick={() => setEditingKey(null)} className="px-3 py-2 rounded-lg text-xs transition-colors border" style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingKey(provider.id); setTempKey(config?.apiKey || ''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all hover:border-blue-400 border"
                      style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 shrink-0"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                      <span className="flex-1 font-mono truncate">
                        {config?.apiKey ? '••••••••' + config.apiKey.slice(-4) : getApiKey(provider.id) ? 'Using app default key' : 'Click to add API key…'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Appearance */}
      <div style={card}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Appearance</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Dark Mode</p>
            <p className="text-xs" style={{ color: 'var(--text2)' }}>Toggle dark theme across the entire app</p>
          </div>
          <button onClick={toggleTheme}
            className={`relative w-11 h-6 rounded-full transition-colors`}
            style={{ background: isDark ? 'var(--accent)' : 'var(--bg3)' }}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border p-6" style={{ borderColor: '#ef444430', background: 'var(--bg2)' }}>
        <h2 className="text-sm font-bold text-red-500 mb-1">Danger Zone</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text2)' }}>These actions are irreversible</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleClearChats} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            Clear Chat History
          </button>
          <button onClick={handleClearProjects} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            Clear All Projects
          </button>
        </div>
      </div>

      {saved && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl animate-slideDown" style={{ background: '#10b981' }}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Changes saved
        </div>
      )}
    </div>
  );
}
