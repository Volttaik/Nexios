'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import { 
  HiArrowLeft,
  HiCheckCircle,
  HiLightningBolt,
  HiUser,
  HiLockClosed
} from 'react-icons/hi';
import { BsShieldCheck, BsRobot } from 'react-icons/bs';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const errorParam = searchParams.get('error');
  
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Show error if token was invalid
  useEffect(() => {
    if (errorParam === 'invalid_token') {
      setError('Your session has expired. Please login again.');
    }
  }, [errorParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!formData.identifier || !formData.password) {
      setError('All fields are required');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token in localStorage (for client-side)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Also set as cookie via server-side (optional)
      document.cookie = `auth_token=${data.token}; path=/; max-age=${60*60*24*30}; SameSite=Lax`;

      // Show success modal
      setShowSuccessModal(true);
      setIsLoading(false);
      
      // Redirect after 2 seconds - either to original destination or dashboard
      setTimeout(() => {
        setShowSuccessModal(false);
        
        // If we have a token, we can also redirect with token in URL
        // This allows for shareable authenticated links
        if (redirect.includes('?') || redirect.includes('token=')) {
          router.push(redirect);
        } else {
          // Add token to URL if you want shareable links
          router.push(`${redirect}?token=${data.token}`);
        }
      }, 2000);
      
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Rest of your component remains the same...
  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 border border-black animate-scaleIn relative">
            {/* ... modal content ... */}
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-6 pt-24 pb-16">
        <div className="max-w-md mx-auto">
          {/* Back button */}
          <Link href="/" className="inline-flex items-center gap-2 text-black/60 hover:text-black mb-6 transition-colors text-sm">
            <HiArrowLeft className="w-3 h-3" />
            Back to Home
          </Link>
          
          {/* Login Card */}
          <div className="bg-white rounded-2xl border border-black p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-3">
                <BsRobot className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-black">Welcome Back</h1>
              <p className="text-xs text-black/60 mt-1">Sign in to your account</p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username or Email */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  <HiUser className="w-3 h-3 inline mr-1" />
                  Username or Email
                </label>
                <input 
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-black rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none transition bg-white"
                  placeholder="johndoe or john@email.com"
                  disabled={isLoading || showSuccessModal}
                />
              </div>
              
              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  <HiLockClosed className="w-3 h-3 inline mr-1" />
                  Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-black rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none transition bg-white pr-14"
                    placeholder="••••••"
                    disabled={isLoading || showSuccessModal}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/60 hover:text-black text-xs font-medium"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isLoading || showSuccessModal}
                  className={`w-full bg-black text-white py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 border border-black ${
                    isLoading || showSuccessModal ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/80'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </form>
            
            {/* Register Link */}
            <p className="text-center mt-6 text-xs text-black/60">
              Don't have an account?{' '}
              <Link href="/register" className="text-black font-bold underline">
                Create one
              </Link>
            </p>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-1">
              <BsShieldCheck className="w-3 h-3 text-black/40" />
              <span className="text-[9px] text-black/40">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-1">
              <HiLockClosed className="w-3 h-3 text-black/40" />
              <span className="text-[9px] text-black/40">256-bit Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
