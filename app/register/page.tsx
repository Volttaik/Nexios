'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import {
  HiUser,
  HiMail,
  HiLockClosed,
  HiArrowLeft,
  HiCheckCircle,
  HiCalendar,
  HiPhone,
  HiIdentification,
  HiLightningBolt
} from 'react-icons/hi';
import { BsShieldCheck, BsRobot } from 'react-icons/bs';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '', fullName: '', email: '',
    phone: '', dateOfBirth: '', password: '', confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { username, fullName, email, phone, dateOfBirth, password, confirmPassword } = formData;
    if (!username || !fullName || !email || !phone || !dateOfBirth || !password || !confirmPassword) {
      setError('All fields are required'); return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address'); return; }
    if (!/^\d{10,}$/.test(phone.replace(/\D/g, ''))) { setError('Please enter a valid phone number'); return; }

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
      const normalizedUser = { ...data.user, _id: data.user._id || data.user.id };
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setShowSuccessModal(true);
      setIsLoading(false);
      setTimeout(() => { setShowSuccessModal(false); router.push('/login'); }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition bg-gray-50 hover:bg-white";

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl border border-gray-100 animate-[scaleIn_0.3s_ease-out]">
            <div className="text-center">
              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-5">
                <HiCheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-1">Account Created!</h3>
              <p className="text-sm text-gray-500 mb-1">Welcome to Nexios AI, {formData.fullName}!</p>

              <div className="mt-5 bg-gray-50 rounded-xl p-4 text-left space-y-2 border border-gray-100">
                <div className="flex items-center gap-2.5">
                  <HiUser className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{formData.username}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <HiMail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{formData.email}</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-5">Redirecting to login in 3 seconds...</p>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="w-full h-full bg-black animate-[progress_3s_linear_forwards] rounded-full" />
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-6 text-gray-300">
              <BsRobot className="w-5 h-5" />
              <HiLightningBolt className="w-5 h-5" />
              <BsShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 pt-24 pb-16">
        <div className="max-w-md mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-black mb-8 transition-colors text-sm font-medium">
            <HiArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="text-center mb-7">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <BsRobot className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-black">Create Account</h1>
              <p className="text-sm text-gray-500 mt-1">Start your AI journey today</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" name="username" value={formData.username} onChange={handleChange} className={inputClass} placeholder="johndoe123" disabled={isLoading || showSuccessModal} />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <HiIdentification className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className={inputClass} placeholder="John Doe" disabled={isLoading || showSuccessModal} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <HiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder="john@example.com" disabled={isLoading || showSuccessModal} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <HiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} placeholder="+1 234 567 8900" disabled={isLoading || showSuccessModal} />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                <div className="relative">
                  <HiCalendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={`${inputClass} pl-10`} disabled={isLoading || showSuccessModal} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 pr-16 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition bg-gray-50 hover:bg-white" placeholder="Min. 6 characters" disabled={isLoading || showSuccessModal} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-black">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full pl-10 pr-16 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition bg-gray-50 hover:bg-white" placeholder="••••••••" disabled={isLoading || showSuccessModal} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-black">
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2.5 pt-1">
                <input type="checkbox" id="terms" required className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-black cursor-pointer" />
                <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed">
                  I agree to the{' '}
                  <Link href="#" className="text-black font-semibold hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="#" className="text-black font-semibold hover:underline">Privacy Policy</Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || showSuccessModal}
                className={`w-full bg-black text-white py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md mt-2 ${
                  isLoading || showSuccessModal ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-900 active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : 'Create Account'}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-black font-semibold hover:underline">Sign in</Link>
            </p>
          </div>

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
    </main>
  );
}
