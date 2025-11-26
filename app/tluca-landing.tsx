"use client"

import React, { useEffect, useState } from 'react';
import Hero from '@/components/landing/Hero';
import SmartWebsites from '@/components/landing/SmartWebsites';
import Services from '@/components/landing/Services';
import Automation from '@/components/landing/Automation';
import Results from '@/components/landing/Results';
import Onboarding from '@/components/landing/Onboarding';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import CustomCursor from '@/components/landing/CustomCursor';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

const TLUCALandingPage: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="bg-charcoal min-h-screen text-white overflow-x-hidden selection:bg-brand selection:text-white">
      {!isMobile && <CustomCursor />}
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center mix-blend-normal pointer-events-none">
        <div className="pointer-events-auto">
          <img 
            src="https://i.imgur.com/xOgn8Xe.png" 
            alt="TLUCA Systems" 
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="hidden md:flex space-x-8 font-mono text-xs pointer-events-auto">
             {/* Updated Nav Links */}
             {['WEBSITES', 'ADS', 'SYSTEMS', 'PRICING'].map((item) => (
                 <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-brand transition-colors">{item}</a>
             ))}
        </div>
      </nav>

      <main>
        <Hero />
        <SmartWebsites />
        <Services />
        <Automation />
        <Results />
        <Onboarding />
        <Pricing />
        <Testimonials />
        
        {/* Final CTA */}
        <section className="py-32 flex flex-col items-center justify-center text-center relative border-t border-white/5 bg-gradient-to-b from-charcoal to-black">
            <h2 className="font-display text-4xl md:text-7xl font-bold mb-8 max-w-4xl mx-auto leading-tight">
                READY TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">SCALE?</span>
            </h2>
            <p className="font-mono text-silver mb-12 max-w-lg mx-auto">
                Secure your territory. We only accept 4 new clients per quarter to ensure maximum performance.
            </p>
            
            <button 
                data-hover="true"
                className="group relative px-10 py-5 bg-white text-black font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-transform duration-300"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
                <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                    BOOK STRATEGY CALL <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-brand transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-0" />
            </button>
        </section>

        <footer className="py-12 px-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-end bg-black">
            <div className="mb-8 md:mb-0">
                <div className="font-display text-2xl mb-2 text-white">TLUCA</div>
                <div className="font-mono text-xs text-gray-500">© 2024 SYSTEM ARCHITECTURE</div>
            </div>
            <div className="grid grid-cols-2 gap-8 font-mono text-xs text-gray-400">
                <div className="flex flex-col space-y-2">
                    <span className="text-white mb-2">SOCIAL</span>
                    <a href="#" className="hover:text-brand transition-colors">TWITTER</a>
                    <a href="#" className="hover:text-brand transition-colors">LINKEDIN</a>
                    <a href="#" className="hover:text-brand transition-colors">INSTAGRAM</a>
                </div>
                <div className="flex flex-col space-y-2">
                    <span className="text-white mb-2">LEGAL</span>
                    <Link href="/privacy" className="hover:text-brand transition-colors">PRIVACY</Link>
                    <Link href="/terms" className="hover:text-brand transition-colors">TERMS</Link>
                </div>
            </div>
        </footer>
      </main>
    </div>
  );
};

export default TLUCALandingPage;
