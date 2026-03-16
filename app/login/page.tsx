'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import { HiArrowLeft, HiUser, HiLockClosed } from 'react-icons/hi';
import { BsShieldCheck, BsRobot } from 'react-icons/bs';

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
    if (errorParam === 'invalid_token') {
      setError('Your session has expired. Please login again.');
    }
  }, [errorParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) {
      setError('All fields are required');
      return;
    }
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
      localStorage.setItem('user', JSON.stringify(data.user));
      document.cookie = `auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

      setShowSuccess(true);
      setIsLoading(false);
      setTimeout(() => {
        router.push(redirect.includes('token=') ? redirect : `${redirect}?token=${data.token}`);
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 pt-24 pb-16">
      <div className="max-w-md mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-black mb-8 transition-colors text-sm font-medium">
          <HiArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BsRobot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-black">Welcome Back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your Nexios account</p>
          </div>

          {/* Success state */}
          {showSuccess && (
            <div className="mb-6 p-4 bg-black rounded-xl text-center">
              <p className="text-sm font-medium text-white">Login successful! Redirecting...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <HiUser className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition bg-gray-50 hover:bg-white"
                  placeholder="johndoe or john@email.com"
                  disabled={isLoading || showSuccess}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <HiLockClosed className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-16 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition bg-gray-50 hover:bg-white"
                  placeholder="••••••••"
                  disabled={isLoading || showSuccess}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-black transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || showSuccess}
              className={`w-full bg-black text-white py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                isLoading || showSuccess ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-900 active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-black font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-5 mt-6">
          <div className="flex items-center gap-1.5">
            <BsShieldCheck className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">Enterprise Security</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <HiLockClosed className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">256-bit Encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <Suspense fallback={<div className="pt-24 text-center text-sm text-gray-500">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
