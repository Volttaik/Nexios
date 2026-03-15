'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import { 
  HiStar, 
  HiLightningBolt,
  HiChip,
  HiUserGroup,
  HiShieldCheck,
  HiChartBar,
  HiClock,
  HiArrowRight
} from 'react-icons/hi';
import { 
  BsGraphUp, 
  BsChatDots, 
  BsRobot,
  BsCpu,
  BsBarChart,
  BsShieldCheck,
  BsLightningCharge,
  BsStars
} from 'react-icons/bs';

export default function Home() {
  const router = useRouter();
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

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
    
    // Show spinner for 2 seconds then navigate
    setTimeout(() => {
      router.push('/register');
      // Reset loading state after navigation
      setTimeout(() => {
        setIsRegisterLoading(false);
      }, 100);
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Minimal Spinner - No background overlay */}
      {isRegisterLoading && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-black opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-black opacity-5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full border border-white">
                <BsStars className="w-4 h-4" />
                <span className="text-sm font-medium">Welcome to Nexios AI</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-black">
                  The Future of
                </span>
                <br />
                <span className="inline-block text-white bg-black px-4 py-2 rounded-2xl mt-2">
                  Artificial Intelligence
                </span>
              </h1>
              
              <p className="text-base text-black/70 max-w-lg">
                Enterprise-grade AI solutions for businesses ready to transform their operations with cutting-edge machine learning.
              </p>
              
              {/* CTA Buttons - Only Get Started */}
              <div className="flex gap-4 pt-2">
                <button 
                  onClick={handleRegisterClick}
                  className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-black/80 transition-all border border-white"
                >
                  Get Started
                  <HiArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Trust Indicators - Small and compact */}
              <div className="flex items-center gap-4 pt-4">
                {stats.slice(0, 2).map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-black" />
                      <div>
                        <p className="text-sm font-bold text-black">{stat.value}</p>
                        <p className="text-[10px] text-black/60">{stat.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Right Column - Features Grid */}
            <div className="relative">
              <div className="bg-white rounded-2xl p-5 border-2 border-black">
                <div className="grid grid-cols-2 gap-3">
                  {features.map((feature, i) => {
                    const Icon = feature.icon;
                    return (
                      <div key={i} className="bg-white rounded-xl p-4 border-2 border-black hover:bg-black/5 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-bold text-black">{feature.stat}</span>
                        </div>
                        <h3 className="text-sm font-bold text-black">{feature.title}</h3>
                        <p className="text-[10px] text-black/60">{feature.desc}</p>
                      </div>
                    );
                  })}
                </div>
                
                {/* Stats Bar */}
                <div className="mt-4 bg-white rounded-lg p-3 border-2 border-black">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-black">Model Performance</span>
                    <span className="text-xs font-bold text-black">+156%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-black rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - White background, compact, curved edges */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-white rounded-xl p-4 border-2 border-black text-center">
                  <Icon className="w-5 h-5 text-black mx-auto mb-2" />
                  <p className="text-lg font-bold text-black">{stat.value}</p>
                  <p className="text-[10px] text-black/60">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white border-t-2 border-b-2 border-black">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl font-bold text-black mb-2">
              Why Choose Nexios AI
            </h2>
            <p className="text-sm text-black/70">
              Built for scale, designed for innovation
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { 
                title: 'Advanced ML', 
                desc: 'Custom models trained on your data',
                icon: BsCpu,
                stat: '98% accuracy'
              },
              { 
                title: 'Real-time Analytics', 
                desc: 'Process data in milliseconds',
                icon: BsBarChart,
                stat: '<50ms latency'
              },
              { 
                title: 'Enterprise Security', 
                desc: 'Bank-level encryption',
                icon: BsShieldCheck,
                stat: '256-bit'
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="bg-white rounded-xl p-6 border-2 border-black hover:bg-black/5 transition-all">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-black mb-1">{feature.title}</h3>
                  <p className="text-xs text-black/60 mb-3">{feature.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-black">{feature.stat}</span>
                    <Link href={`/features/${feature.title.toLowerCase().replace(/\s+/g, '-')}`} className="text-black text-xs font-medium inline-flex items-center gap-1">
                      Learn <HiArrowRight className="w-2 h-2" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="bg-black text-white rounded-xl p-8 text-center max-w-2xl mx-auto border-2 border-black">
            <h3 className="text-lg font-bold mb-2">Ready to Transform Your Business?</h3>
            <p className="text-xs text-white/70 mb-4">Join leading companies using Nexios AI</p>
            <button 
              onClick={handleRegisterClick}
              className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-white/90 transition-all border-2 border-white"
            >
              Start Free Trial
              <HiArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-white/60 mt-3">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-black bg-white py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-black">Nexios</span>
              <span className="text-xs font-bold text-white bg-black px-1.5 py-0.5 rounded border border-white">AI</span>
            </div>
            <div className="flex gap-6 text-xs text-black">
              <Link href="#" className="hover:underline underline-offset-4">Product</Link>
              <Link href="#" className="hover:underline underline-offset-4">Company</Link>
              <Link href="#" className="hover:underline underline-offset-4">Resources</Link>
              <Link href="#" className="hover:underline underline-offset-4">Contact</Link>
            </div>
            <p className="text-xs text-black/60">
              © 2024 Nexios AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
