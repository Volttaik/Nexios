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
  HiLightningBolt,
  HiCalendar,
  HiPhone,
  HiIdentification
} from 'react-icons/hi';
import { BsShieldCheck, BsRobot } from 'react-icons/bs';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Validation
    if (!formData.username || !formData.fullName || !formData.email || !formData.phone || !formData.dateOfBirth || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Simple phone validation
    const phoneRegex = /^\d{10,}$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setIsLoading(true);
    
    try {
      // Send data to API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Show success modal
      setShowSuccessModal(true);
      setIsLoading(false);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        router.push('/login');
      }, 3000);
      
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 border border-black animate-scaleIn relative">
            {/* Close button using HTML entity */}
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-black/40 hover:text-black text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
            
            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <HiCheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">
                Account Created Successfully!
              </h3>
              <p className="text-base text-black/60">
                Welcome to Nexios AI, {formData.fullName || 'User'}!
              </p>
            </div>

            {/* User Info Summary */}
            <div className="bg-black/5 rounded-xl p-4 mb-6 border border-black/10">
              <div className="flex items-center gap-3 mb-3">
                <HiUser className="w-4 h-4 text-black" />
                <span className="text-sm text-black">{formData.username}</span>
              </div>
              <div className="flex items-center gap-3">
                <HiMail className="w-4 h-4 text-black" />
                <span className="text-sm text-black">{formData.email}</span>
              </div>
            </div>

            {/* Redirect Message */}
            <div className="text-center">
              <p className="text-sm text-black/60 mb-3">
                Redirecting to login in 3 seconds...
              </p>
              <div className="w-full bg-black/10 h-1 rounded-full overflow-hidden">
                <div className="w-full h-full bg-black animate-progress"></div>
              </div>
            </div>

            {/* AI Icons */}
            <div className="flex justify-center gap-4 mt-6">
              <BsRobot className="w-5 h-5 text-black/40" />
              <HiLightningBolt className="w-5 h-5 text-black/40" />
              <BsShieldCheck className="w-5 h-5 text-black/40" />
            </div>
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
          
          {/* Register Card */}
          <div className="bg-white rounded-2xl border border-black p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-3">
                <BsRobot className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-black">Create Account</h1>
              <p className="text-xs text-black/60 mt-1">Start your AI journey</p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  <HiUser className="w-3 h-3 inline mr-1" />
                  Username
                </label>
                <input 
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-black rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none transition bg-white"
                  placeholder="johndoe123"
                  disabled={isLoading || showSuccessModal}
                />
              </div>
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  <HiIdentification className="w-3 h-3 inline mr-1" />
                  Full Name
                </label>
                <input 
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-black rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none transition bg-white"
                  placeholder="John Doe"
                  disabled={isLoading || showSuccessModal}
                />
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  <HiMail className="w-3 h-3 inline mr-1" />
                  Email
                </label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-black rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none transition bg-white"
                  placeholder="john.doe@gmail.com"
                  disabled={isLoading || showSuccessModal}
                />
              </div>
              
              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  <HiPhone className="w-3 h-3 inline mr-1" />
                  Phone Number
                </label>
                <input 
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-black rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none transition bg-white"
                  placeholder="+1 234 567 8900"
                  disabled={isLoading || showSuccessModal}
                />
              </div>
              
              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  <HiCalendar className="w-3 h-3 inline mr-1" />
                  Date of Birth
                </label>
                <input 
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-black rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none transition bg-white"
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
                <p className="text-[10px] text-black/40 mt-1">Minimum 6 characters</p>
              </div>
              
              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-black mb-1">
                  <HiLockClosed className="w-3 h-3 inline mr-1" />
                  Confirm Password
                </label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-black rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none transition bg-white pr-14"
                    placeholder="••••••"
                    disabled={isLoading || showSuccessModal}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/60 hover:text-black text-xs font-medium"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              
              {/* Terms */}
              <div className="flex items-start gap-2">
                <input type="checkbox" id="terms" className="mt-1 border border-black" />
                <label htmlFor="terms" className="text-[10px] text-black/60">
                  I agree to the <Link href="#" className="text-black font-bold underline">Terms</Link> and <Link href="#" className="text-black font-bold underline">Privacy Policy</Link>
                </label>
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
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
            
            {/* Login Link */}
            <p className="text-center mt-6 text-xs text-black/60">
              Already have an account?{' '}
              <Link href="/login" className="text-black font-bold underline">
                Sign in
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

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 3s linear forwards;
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </main>
  );
}
