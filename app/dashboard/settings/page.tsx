'use client';

import { useEffect, useState, useRef } from 'react';
import type { AppUser } from '@/app/types/user';
import { AI_MODELS } from '../components/DashboardSidebar';

export default function SettingsPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [apiKeyPreview, setApiKeyPreview] = useState('');
  const [saved, setSaved] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const profileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    const model = localStorage.getItem('selectedModel') || 'gemini-2.0-flash';
    setSelectedModel(model);
    const pic = localStorage.getItem('profilePicture');
    if (pic) setProfilePic(pic);
    const dm = localStorage.getItem('darkMode') === 'true';
    setDarkMode(dm);
    const notif = localStorage.getItem('notifications') !== 'false';
    setNotifications(notif);
    const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (key) setApiKeyPreview(key.slice(0, 6) + '••••••••••••' + key.slice(-4));
  }, []);

  const handleSave = () => {
    localStorage.setItem('selectedModel', selectedModel);
    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('notifications', notifications.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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

  const handleClearChats = () => {
    if (confirm('Are you sure? This will delete all your chat history permanently.')) {
      localStorage.removeItem('chatSessions');
      alert('All chat history cleared.');
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center border-2 border-gray-200">
                <span className="text-white text-xl font-bold">{user?.fullName?.[0]?.toUpperCase() || 'U'}</span>
              </div>
            )}
            <button
              onClick={() => profileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.fullName || 'User'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <button onClick={() => profileInputRef.current?.click()} className="text-xs text-blue-600 hover:underline mt-1">
              {profilePic ? 'Change photo' : 'Upload photo'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
            <p className="mt-1 text-gray-900">{user?.fullName || '—'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Username</label>
            <p className="mt-1 text-gray-900">@{user?.username || '—'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
            <p className="mt-1 text-gray-900">{user?.email || '—'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">User ID</label>
            <p className="mt-1 text-gray-900 font-mono text-xs">{(user?._id || user?.id || 'N/A').toString().slice(-12)}</p>
          </div>
        </div>
      </div>

      {/* AI Model */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Default AI Model</h2>
        <p className="text-sm text-gray-500 mb-4">Select which model to use by default in chat</p>
        <div className="space-y-2">
          {AI_MODELS.map(model => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedModel === model.id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: model.color }}>
                {model.tag}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-gray-900">{model.name}</p>
                <p className="text-xs text-gray-500">{model.description}</p>
              </div>
              {selectedModel === model.id && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-900 shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Gemini API Key</h2>
        <p className="text-sm text-gray-500 mb-4">Your API key is stored as an environment variable</p>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 shrink-0">
            <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-mono text-gray-700 flex-1">{apiKeyPreview || 'Not configured'}</span>
          {apiKeyPreview ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
          ) : (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Missing</span>
          )}
        </div>
        {!apiKeyPreview && (
          <p className="text-xs text-gray-400 mt-2">Add NEXT_PUBLIC_GEMINI_API_KEY to your environment secrets to enable AI chat.</p>
        )}
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Preferences</h2>
        <div className="space-y-4">
          {[
            { label: 'Dark Mode', desc: 'Switch to dark theme', value: darkMode, setter: setDarkMode },
            { label: 'Notifications', desc: 'Enable in-app notifications', value: notifications, setter: setNotifications },
          ].map((pref, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{pref.label}</p>
                <p className="text-xs text-gray-500">{pref.desc}</p>
              </div>
              <button
                onClick={() => pref.setter(!pref.value)}
                className={`relative w-11 h-6 rounded-full transition-colors ${pref.value ? 'bg-gray-900' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pref.value ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <h2 className="text-base font-bold text-red-600 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">Irreversible actions — proceed with caution</p>
        <button
          onClick={handleClearChats}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Clear All Chat History
        </button>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'}`}
        >
          {saved ? (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Saved!
            </>
          ) : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
