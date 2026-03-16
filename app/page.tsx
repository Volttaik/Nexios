'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Header from './components/Header';
import { 
  HiUserGroup,
  HiShieldCheck,
  HiClock,
  HiArrowRight
} from 'react-icons/hi';
import { 
  BsChatDots, 
  BsRobot,
  BsCpu,
  BsBarChart,
  BsShieldCheck,
  BsStars
} from 'react-icons/bs';

export default function Home() {
  const router = useRouter();
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      router.replace('/dashboard/chat');
    } else {
      setChecking(false);
    }
  }, [router]);

  const features = [
    { icon: BsCpu, title: 'Deep Learning', desc: 'Advanced neural networks', stat: '98%' },
    { icon: BsBarChart, title: 'Predictive Analytics', desc: 'Forecast with precision', stat: '99.9%' },
    { icon: BsChatDots, title: 'NLP', desc: 'Natural language processing', stat: '95%' },
    { icon: BsRobot, title: 'AutoML', desc: 'Automated model training', stat: '24/7' },
  ];

  const stats = [
    { value: '10K+', label: 'Active Users', icon: HiUserGroup },
    { value: '1M+', label: 'Models Trained', icon: BsCpu },
    { value: '99.9%', label: 'Uptime', icon: HiShieldCheck },
    { value: '<50ms', label: 'Response Time', icon: HiClock },
  ];

  const handleRegisterClick = () => {
    setIsRegisterLoading(true);
    setTimeout(() => {
      router.push('/register');
      setTimeout(() => setIsRegisterLoading(false), 100);
    }, 800);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {isRegisterLoading && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 left-1/4 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gray-100 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="container mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                <BsStars className="w-4 h-4" />
                Welcome to Nexios AI
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                <span className="text-black">The Future of</span>
                <br />
                <span className="inline-block text-white bg-black px-4 py-2 rounded-2xl mt-3 shadow-lg">
                  Artificial Intelligence
                </span>
              </h1>

              <p className="text-base text-gray-600 max-w-lg leading-relaxed">
                Enterprise-grade AI solutions for businesses ready to transform their operations with cutting-edge machine learning.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleRegisterClick}
                  className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-900 active:scale-95 transition-all shadow-md"
                >
                  Get Started
                  <HiArrowRight className="w-4 h-4" />
                </button>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl text-sm font-semibold border-2 border-black hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Sign In
                </Link>
              </div>

              <div className="flex items-center gap-6 pt-2">
                {stats.slice(0, 2).map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-black">{stat.value}</p>
                        <p className="text-[10px] text-gray-500">{stat.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-br from-gray-100 to-white rounded-3xl" />
              <div className="relative bg-white rounded-2xl p-5 border border-gray-200 shadow-xl">
                <div className="grid grid-cols-2 gap-3">
                  {features.map((feature, i) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={i}
                        className="bg-white rounded-xl p-4 border border-gray-100 hover:border-black hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs font-bold text-black bg-gray-100 px-2 py-0.5 rounded-full">
                            {feature.stat}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-black mb-0.5">{feature.title}</h3>
                        <p className="text-[11px] text-gray-500">{feature.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">Model Performance</span>
                    <span className="text-xs font-bold text-black">+156%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-black rounded-full" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">vs. previous quarter</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center hover:border-black hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-black">{stat.value}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Why Choose Us</span>
            <h2 className="text-3xl font-bold text-black mt-2 mb-3">Built for the Modern Enterprise</h2>
            <p className="text-sm text-gray-500">Designed for scale, optimised for innovation</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Advanced ML',
                desc: 'Custom models trained on your proprietary data with state-of-the-art accuracy.',
                icon: BsCpu,
                stat: '98% accuracy',
                href: '/register',
              },
              {
                title: 'Real-time Analytics',
                desc: 'Process and visualise your data in milliseconds with our optimised pipeline.',
                icon: BsBarChart,
                stat: '<50ms latency',
                href: '/register',
              },
              {
                title: 'Enterprise Security',
                desc: 'Bank-grade encryption and compliance standards for your peace of mind.',
                icon: BsShieldCheck,
                stat: '256-bit AES',
                href: '/register',
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="group bg-white rounded-2xl p-6 border border-gray-100 hover:border-black hover:shadow-xl transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-black mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{feature.desc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs font-semibold text-black bg-gray-100 px-2.5 py-1 rounded-full">
                      {feature.stat}
                    </span>
                    <Link
                      href={feature.href}
                      className="text-black text-xs font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      Learn more <HiArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing / Plans teaser */}
      <section className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Simple Pricing</span>
            <h2 className="text-3xl font-bold text-black mt-2 mb-3">Plans for Every Team</h2>
            <p className="text-sm text-gray-500">Start free, scale as you grow</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { plan: 'Starter', price: 'Free', desc: 'For individuals exploring AI', features: ['100 messages/day', '2 AI models', 'Basic analytics'] },
              { plan: 'Pro', price: '$29/mo', desc: 'For power users and small teams', features: ['Unlimited messages', 'All AI models', 'Advanced analytics', 'Priority support'], featured: true },
              { plan: 'Enterprise', price: 'Custom', desc: 'For large-scale deployments', features: ['Custom limits', 'Dedicated instance', 'SLA guarantee', 'Custom integrations'] },
            ].map((tier, i) => (
              <div key={i} className={`rounded-2xl p-6 border transition-all ${tier.featured ? 'bg-black text-white border-black shadow-2xl scale-105' : 'bg-white border-gray-200 hover:border-gray-400'}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${tier.featured ? 'text-white/60' : 'text-gray-400'}`}>{tier.plan}</p>
                <p className={`text-3xl font-bold mb-1 ${tier.featured ? 'text-white' : 'text-black'}`}>{tier.price}</p>
                <p className={`text-xs mb-5 ${tier.featured ? 'text-white/50' : 'text-gray-500'}`}>{tier.desc}</p>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((f, j) => (
                    <li key={j} className={`flex items-center gap-2 text-sm ${tier.featured ? 'text-white/80' : 'text-gray-600'}`}>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" fill={tier.featured ? 'rgba(255,255,255,0.2)' : '#f3f4f6'} />
                        <path d="M5 8l2 2 4-4" stroke={tier.featured ? '#fff' : '#111'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center text-sm font-semibold py-2.5 rounded-xl transition-all ${tier.featured ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="relative bg-black text-white rounded-2xl p-10 text-center max-w-2xl mx-auto overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <BsStars className="w-8 h-8 mx-auto mb-4 text-white/60" />
              <h3 className="text-2xl font-bold mb-2">Ready to Transform Your Business?</h3>
              <p className="text-sm text-white/60 mb-6">Join 10,000+ companies already using Nexios AI</p>
              <button
                onClick={handleRegisterClick}
                className="inline-flex items-center gap-2 bg-white text-black px-7 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 active:scale-95 transition-all shadow-md"
              >
                Start Free Trial
                <HiArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-white/40 mt-4">No credit card required · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-black">Nexios</span>
              <span className="text-xs font-bold text-white bg-black px-2 py-0.5 rounded-md">AI</span>
            </div>
            <div className="flex gap-6 text-xs text-gray-500">
              {['Product', 'Company', 'Resources', 'Contact'].map((item) => (
                <Link key={item} href="#" className="hover:text-black transition-colors">
                  {item}
                </Link>
              ))}
            </div>
            <p className="text-xs text-gray-400">© 2025 Nexios AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
