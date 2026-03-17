'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

const FIELDS = [
  { name: 'username', label: 'Username', type: 'text', placeholder: 'johndoe123', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'John Doe', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  { name: 'email', label: 'Email Address', type: 'email', placeholder: 'john@example.com', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
  { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+1 234 567 8900', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15v1.92z"/></svg> },
  { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', placeholder: '', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', fullName: '', email: '', phone: '', dateOfBirth: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { username, fullName, email, phone, dateOfBirth, password, confirmPassword } = formData;
    if (!username || !fullName || !email || !phone || !dateOfBirth || !password || !confirmPassword) { setError('All fields are required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address'); return; }

    setIsLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fullName, email, phone, dateOfBirth, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ ...data.user, _id: data.user._id || data.user.id }));
      setSuccess(true);
      setIsLoading(false);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[380px] flex-col justify-between p-10 relative overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(135deg, #060610 0%, #0d1535 50%, #0d0d1a 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 -right-10 w-56 h-56 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #5b78ff, transparent 70%)' }} />
          <div className="absolute bottom-1/4 -left-10 w-44 h-44 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
        </div>
        <div className="relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5b78ff, #8b5cf6)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h1 className="text-white text-2xl font-bold mt-4">Nexios AI</h1>
          <p className="text-white/40 text-sm mt-1">Join thousands of developers</p>
        </div>
        <div className="relative z-10">
          <div className="space-y-3 mb-6">
            {['Free to get started', 'Multiple AI providers', 'Code sandbox & editor', 'No credit card required'].map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(91,120,255,0.25)' }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3" style={{ color: '#5b78ff' }}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                </div>
                <span className="text-white/60 text-sm">{f}</span>
              </div>
            ))}
          </div>
          <p className="text-white/20 text-xs">© 2025 Nexios AI</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-[420px] py-8">
          <div className="flex items-center gap-2.5 mb-7 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5b78ff, #8b5cf6)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"/></svg>
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>Nexios AI</span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Create your account</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>
            Already have one?{' '}
            <Link href="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>Sign in</Link>
          </p>

          {success && (
            <div className="mb-5 p-4 rounded-2xl text-center" style={{ background: 'rgba(91,120,255,0.12)', border: '1px solid rgba(91,120,255,0.3)' }}>
              <div className="text-2xl mb-1">🎉</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Account created! Redirecting to login…</p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl flex items-start gap-2.5" style={{ background: '#ef444415', border: '1px solid #ef444440' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5 text-red-400"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {FIELDS.map(field => (
              <div key={field.name}>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text2)' }}>{field.label}</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text3)' }}>{field.icon}</span>
                  <input type={field.type} name={field.name}
                    value={formData[field.name as keyof typeof formData]}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder={field.placeholder}
                    disabled={isLoading || success}
                  />
                </div>
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Password</label>
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text3)' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                  className="input-field pl-10 pr-12" placeholder="Min. 6 characters" disabled={isLoading || success} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Confirm Password</label>
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text3)' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                  className="input-field pl-10 pr-12" placeholder="Re-enter password" disabled={isLoading || success} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5 pt-0.5">
              <input type="checkbox" id="terms" required className="mt-0.5 w-4 h-4 rounded cursor-pointer" style={{ accentColor: 'var(--accent)' }} />
              <label htmlFor="terms" className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>
                I agree to the{' '}
                <Link href="#" className="font-semibold" style={{ color: 'var(--accent)' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link href="#" className="font-semibold" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>
              </label>
            </div>

            <button type="submit" disabled={isLoading || success}
              className="w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 mt-1"
              style={{ background: isLoading || success ? 'var(--text3)' : 'linear-gradient(135deg, var(--accent), var(--accent2))', cursor: isLoading || success ? 'not-allowed' : 'pointer' }}>
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating account…</>
              ) : success ? '✓ Account Created!' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
