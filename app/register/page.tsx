'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BsRobot, BsShieldCheck } from 'react-icons/bs';
import {
  HiArrowLeft, HiUser, HiMail, HiLockClosed, HiPhone, HiCalendar,
  HiIdentification, HiArrowRight, HiCheckCircle, HiEye, HiEyeOff
} from 'react-icons/hi';

interface FieldConfig {
  label: string;
  name: keyof typeof INIT_STATE;
  type: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  autoComplete?: string;
}

const INIT_STATE = { username: '', fullName: '', email: '', phone: '', dateOfBirth: '', password: '', confirmPassword: '' };

const FIELDS: FieldConfig[] = [
  { label: 'Username', name: 'username', type: 'text', placeholder: 'johndoe123', icon: HiUser, autoComplete: 'username' },
  { label: 'Full Name', name: 'fullName', type: 'text', placeholder: 'John Doe', icon: HiIdentification, autoComplete: 'name' },
  { label: 'Email', name: 'email', type: 'email', placeholder: 'john@example.com', icon: HiMail, autoComplete: 'email' },
  { label: 'Phone', name: 'phone', type: 'tel', placeholder: '+1 234 567 8900', icon: HiPhone, autoComplete: 'tel' },
  { label: 'Date of Birth', name: 'dateOfBirth', type: 'date', placeholder: '', icon: HiCalendar },
  { label: 'Password', name: 'password', type: 'password', placeholder: 'Min. 6 characters', icon: HiLockClosed, autoComplete: 'new-password' },
  { label: 'Confirm Password', name: 'confirmPassword', type: 'password', placeholder: '••••••••', icon: HiLockClosed, autoComplete: 'new-password' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState(INIT_STATE);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { username, fullName, email, phone, dateOfBirth, password, confirmPassword } = formData;
    if (!username || !fullName || !email || !phone || !dateOfBirth || !password || !confirmPassword) { setError('All fields are required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return; }
    if (!/^\d{10,}$/.test(phone.replace(/\D/g, ''))) { setError('Please enter a valid phone number'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fullName, email, phone, dateOfBirth, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setShowSuccess(true);
      setIsLoading(false);
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
    }
  };

  const isPasswordField = (name: string) => name === 'password' || name === 'confirmPassword';

  const getInputType = (field: FieldConfig) => {
    if (field.name === 'password') return showPwd ? 'text' : 'password';
    if (field.name === 'confirmPassword') return showConfirmPwd ? 'text' : 'password';
    return field.type;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      {/* bg blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 right-[-10%] w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="fixed inset-0 bg-dots opacity-30" />
      </div>

      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="glass rounded-2xl p-8 max-w-sm w-full text-center animate-scaleIn"
            style={{ boxShadow: '0 0 60px rgba(52,211,153,0.15)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
              <HiCheckCircle className="w-8 h-8" style={{ color: '#34d399' }} />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Account Created!</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Welcome to Nexios AI, {formData.fullName}!</p>
            <div className="glass rounded-xl p-4 text-left space-y-2 mb-5">
              <div className="flex items-center gap-2.5">
                <HiUser className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formData.username}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <HiMail className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formData.email}</span>
              </div>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Redirecting to dashboard...</p>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-card)' }}>
              <div className="h-full rounded-full animate-[progress_2.5s_linear_forwards]" style={{ background: 'var(--accent)', width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm relative">
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-7 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <HiArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <div className="glass rounded-2xl p-8" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.08), 0 24px 48px rgba(0,0,0,0.4)' }}>
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', boxShadow: '0 0 24px var(--accent-glow)' }}>
              <BsRobot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Create your account</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Start building with AI today</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-sm" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {FIELDS.map((field) => {
              const Icon = field.icon;
              const isPwd = isPasswordField(field.name);
              const isConfirm = field.name === 'confirmPassword';
              const showToggle = isPwd;
              const isVisible = field.name === 'password' ? showPwd : showConfirmPwd;
              return (
                <div key={field.name}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                  <div className="relative">
                    <input
                      type={getInputType(field)}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      className="input-base"
                      style={{ paddingRight: showToggle ? '4.5rem' : '2.75rem' }}
                      placeholder={field.placeholder}
                      disabled={isLoading || showSuccess}
                      autoComplete={field.autoComplete}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-3">
                      {showToggle && (
                        <button type="button"
                          onClick={() => isConfirm ? setShowConfirmPwd(!showConfirmPwd) : setShowPwd(!showPwd)}
                          className="transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                          onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                          {isVisible ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                        </button>
                      )}
                      <Icon className="w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-start gap-2.5 pt-1">
              <input type="checkbox" id="terms" required
                className="mt-0.5 w-3.5 h-3.5 rounded cursor-pointer shrink-0" />
              <label htmlFor="terms" className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                I agree to the{' '}
                <Link href="#" className="font-semibold" style={{ color: 'var(--accent)' }}>Terms</Link>
                {' '}and{' '}
                <Link href="#" className="font-semibold" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || showSuccess}
              className="w-full btn-primary py-3 text-sm font-semibold mt-1"
              style={{ opacity: isLoading || showSuccess ? 0.6 : 1, cursor: isLoading || showSuccess ? 'not-allowed' : 'pointer' }}>
              {isLoading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account...</>
                : <>Create Account <HiArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center mt-5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>Sign in</Link>
          </p>
        </div>

        <div className="flex items-center justify-center gap-5 mt-5">
          <div className="flex items-center gap-1.5">
            <BsShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Enterprise security</span>
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
