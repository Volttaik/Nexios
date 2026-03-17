'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BsRobot } from 'react-icons/bs';
import { HiArrowLeft, HiUser, HiLockClosed, HiEye, HiEyeOff, HiArrowRight, HiShieldCheck } from 'react-icons/hi';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const errorParam = searchParams.get('error');

  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (errorParam === 'invalid_token') setError('Your session has expired. Please log in again.');
  }, [errorParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) { setError('All fields are required'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: formData.identifier, password: formData.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      document.cookie = `auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      setShowSuccess(true);
      setIsLoading(false);
      setTimeout(() => router.push(redirect.includes('token=') ? redirect : `${redirect}?token=${data.token}`), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      {/* bg blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="fixed inset-0 bg-dots opacity-30" />
      </div>

      <div className="w-full max-w-sm relative">
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <HiArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <div className="glass rounded-2xl p-8" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.08), 0 24px 48px rgba(0,0,0,0.4)' }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', boxShadow: '0 0 24px var(--accent-glow)' }}>
              <BsRobot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Welcome back</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Sign in to your Nexios account</p>
          </div>

          {/* Success */}
          {showSuccess && (
            <div className="mb-5 p-3.5 rounded-xl text-center text-sm font-medium"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
              ✓ Login successful — redirecting...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-sm"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  className="input-base input-icon-right pr-10"
                  placeholder="johndoe or john@email.com"
                  disabled={isLoading || showSuccess}
                  autoComplete="username"
                />
                <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none">
                  <HiUser className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <Link href="#" className="text-xs transition-colors" style={{ color: 'var(--accent)' }}>Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-base pr-20"
                  placeholder="••••••••"
                  disabled={isLoading || showSuccess}
                  autoComplete="current-password"
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                    {showPassword ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                  </button>
                  <HiLockClosed className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || showSuccess}
              className="w-full btn-primary py-3 text-sm font-semibold mt-2"
              style={{ opacity: isLoading || showSuccess ? 0.6 : 1, cursor: isLoading || showSuccess ? 'not-allowed' : 'pointer' }}>
              {isLoading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in...</>
                : <>Sign In <HiArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link href="/register" className="font-semibold transition-colors" style={{ color: 'var(--accent)' }}>Create one free</Link>
          </p>
        </div>

        {/* Trust */}
        <div className="flex items-center justify-center gap-5 mt-5">
          <div className="flex items-center gap-1.5">
            <HiShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>End-to-end encrypted</span>
          </div>
          <div className="w-px h-4" style={{ background: 'var(--glass-border)' }} />
          <div className="flex items-center gap-1.5">
            <HiLockClosed className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>256-bit AES</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
