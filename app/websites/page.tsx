"use client"

import React from 'react';
import { ChevronRight, Cpu, Network, Zap, Globe, Target, Rocket } from 'lucide-react';
import Link from 'next/link';

const WebsitesPage = () => {
  return (
    <div className="bg-charcoal min-h-screen text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center mix-blend-normal pointer-events-none">
        <Link href="/" className="pointer-events-auto">
          <img
            src="https://i.imgur.com/xOgn8Xe.png"
            alt="TLUCA Systems"
            className="h-16 w-auto object-contain"
          />
        </Link>
        <div className="hidden md:flex space-x-8 font-mono text-xs pointer-events-auto">
          {['WEBSITES', 'ADS', 'SYSTEMS', 'PRICING'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-brand transition-colors">{item}</a>
          ))}
          <Link href="/onboarding" className="hover:text-brand transition-colors">ONBOARDING</Link>
        </div>
      </nav>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="px-6 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-8 leading-tight">
              INTELLIGENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">ARCHITECTURE</span>
            </h1>
            <p className="font-mono text-lg text-silver mb-12 max-w-2xl mx-auto">
              Websites that don't just look good—they think, learn, and convert visitors into customers. Built with AI-driven design and conversion optimization.
            </p>
          </div>
        </section>

        {/* Core Features */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm">
                <div className="w-16 h-16 bg-brand/20 rounded-lg flex items-center justify-center mb-6">
                  <Cpu className="w-8 h-8 text-brand" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4">AI-Powered Design</h3>
                <p className="text-gray-400 font-mono">
                  Every pixel is optimized through machine learning algorithms that analyze thousands of successful conversions.
                </p>
              </div>

              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm">
                <div className="w-16 h-16 bg-brand/20 rounded-lg flex items-center justify-center mb-6">
                  <Network className="w-8 h-8 text-brand" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4">Neural Network Integration</h3>
                <p className="text-gray-400 font-mono">
                  Built-in AI that learns from your visitors' behavior and continuously optimizes for better performance.
                </p>
              </div>

              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm">
                <div className="w-16 h-16 bg-brand/20 rounded-lg flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-brand" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4">Lightning Fast</h3>
                <p className="text-gray-400 font-mono">
                  Optimized for speed with advanced caching, CDN integration, and performance monitoring.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="px-6 py-20 bg-black/20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-12">WHY CHOOSE OUR WEBSITES?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="text-left">
                <div className="flex items-center mb-4">
                  <Globe className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Conversion Optimized</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  Every element is strategically placed to guide visitors toward your desired action. We don't guess—we test and optimize.
                </p>
              </div>

              <div className="text-left">
                <div className="flex items-center mb-4">
                  <Target className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Lead Capture Built-In</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  Multiple lead capture mechanisms ensure no opportunity slips away. Forms, popups, and chat integration work together.
                </p>
              </div>

              <div className="text-left">
                <div className="flex items-center mb-4">
                  <Rocket className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Mobile-First Design</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  Optimized for mobile devices where 60% of your traffic comes from. Beautiful on every screen size.
                </p>
              </div>

              <div className="text-left">
                <div className="flex items-center mb-4">
                  <Network className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Seamless Integration</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  Connects perfectly with your CRM, email marketing, and ad platforms for a unified customer experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">
              READY TO BUILD YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">INTELLIGENT WEBSITE?</span>
            </h2>
            <p className="font-mono text-lg text-silver mb-12">
              Join the businesses already using AI-powered websites to dominate their markets.
            </p>

            <button
              className="group relative px-10 py-5 bg-white text-black font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-transform duration-300"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                START BUILDING <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-brand transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-0" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-end bg-black">
        <div className="mb-8 md:mb-0">
          <img src="https://i.imgur.com/xOgn8Xe.png" alt="TLUCA Systems" className="h-12 w-auto object-contain mb-2"/>
          <div className="font-mono text-xs text-gray-500">© 2025 TLUCA SYSTEMS</div>
        </div>
        <div className="flex flex-col space-y-2 font-mono text-xs text-gray-400">
          <span className="text-white mb-2">PAGES</span>
          <Link href="#websites" className="hover:text-brand transition-colors">WEBSITES</Link>
          <Link href="#ads" className="hover:text-brand transition-colors">ADS</Link>
          <Link href="#systems" className="hover:text-brand transition-colors">SYSTEMS</Link>
          <Link href="/pricing" className="hover:text-brand transition-colors">PRICING</Link>
          <Link href="/onboarding" className="hover:text-brand transition-colors">ONBOARDING</Link>
          <Link href="/privacy" className="hover:text-brand transition-colors">PRIVACY</Link>
          <Link href="/terms" className="hover:text-brand transition-colors">TERMS</Link>
          <Link href="/about" className="hover:text-brand transition-colors">ABOUT</Link>
        </div>
      </footer>
    </div>
  );
};

export default WebsitesPage;
