'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard/chat';
  const errorParam = searchParams.get('error');

  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (errorParam === 'invalid_token') setError('Your session has expired. Please login again.');
  }, [errorParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) { setError('All fields are required'); return; }
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: formData.identifier, password: formData.password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ ...data.user, _id: data.user._id || data.user.id }));
      document.cookie = `auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      setShowSuccess(true);
      setIsLoading(false);
      setTimeout(() => router.push('/dashboard/chat'), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left decorative panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-10 relative overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(135deg, #0d0d10 0%, #1a1040 50%, #0d1a30 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #5b78ff, transparent 70%)' }} />
          <div className="absolute bottom-1/3 right-0 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
          <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 400 600" fill="none">
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
            <rect width="400" height="600" fill="url(#grid)"/>
          </svg>
        </div>
        <div className="relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #5b78ff, #8b5cf6)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h1 className="text-white text-2xl font-bold mt-4 tracking-tight">Nexios AI</h1>
          <p className="text-white/50 text-sm mt-1">Your intelligent AI workspace</p>
        </div>
        <div className="relative z-10 space-y-5">
          {[
            { icon: '⚡', title: 'Multiple AI Models', desc: 'Gemini, GPT-4, Claude, Groq & more' },
            { icon: '💻', title: 'Code Sandbox', desc: 'VS Code-like editor with AI assistance' },
            { icon: '🔒', title: 'Secure & Private', desc: 'Your data stays encrypted' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>{f.icon}</div>
              <div>
                <p className="text-white text-sm font-semibold">{f.title}</p>
                <p className="text-white/40 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-white/20 text-xs relative z-10">© 2025 Nexios AI. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5b78ff, #8b5cf6)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4.5 h-4.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>Nexios AI</span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Welcome back</h2>
          <p className="text-sm mb-7" style={{ color: 'var(--text2)' }}>
            Sign in to continue.{' '}
            <Link href="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>Create account</Link>
          </p>

          {showSuccess && (
            <div className="mb-5 p-4 rounded-2xl flex items-center gap-3" style={{ background: 'rgba(91,120,255,0.12)', border: '1px solid rgba(91,120,255,0.3)' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Login successful! Redirecting…</p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl flex items-start gap-2.5" style={{ background: '#ef444415', border: '1px solid #ef444440' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5 text-red-400"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Username or Email</label>
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text3)' }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input type="text" name="identifier" value={formData.identifier} onChange={handleChange}
                  className="input-field pl-10" placeholder="johndoe or john@example.com"
                  disabled={isLoading || showSuccess} autoComplete="username" autoFocus />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Password</label>
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text3)' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                  className="input-field pl-10 pr-12" placeholder="Enter your password"
                  disabled={isLoading || showSuccess} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text3)' }}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading || showSuccess}
              className="w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 mt-2"
              style={{ background: isLoading || showSuccess ? 'var(--text3)' : 'linear-gradient(135deg, var(--accent), var(--accent2))', cursor: isLoading || showSuccess ? 'not-allowed' : 'pointer' }}>
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Signing in…</>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center justify-center gap-4 mt-7">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" style={{ color: 'var(--text3)' }}><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              <span className="text-xs" style={{ color: 'var(--text3)' }}>Enterprise Security</span>
            </div>
            <div className="w-px h-3" style={{ background: 'var(--border)' }} />
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" style={{ color: 'var(--text3)' }}><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
              <span className="text-xs" style={{ color: 'var(--text3)' }}>256-bit Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
