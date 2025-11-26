"use client"

import React from 'react';
import { ChevronRight, Target, TrendingUp, Users, Zap, Cpu, Globe } from 'lucide-react';
import Link from 'next/link';

const AboutPage = () => {
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
              SYSTEMS THAT <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">SCALE</span>
            </h1>
            <p className="font-mono text-lg text-silver mb-12 max-w-2xl mx-auto">
              We don't just build websites or run ads—we engineer complete digital systems that attract, convert, and manage leads automatically.
            </p>
          </div>
        </section>

        {/* Our Philosophy */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">OUR PHILOSOPHY</h2>
            <p className="font-mono text-lg text-silver mb-12 max-w-3xl mx-auto">
              Most agencies focus on individual pieces—websites, ads, CRM. We build complete systems that work together seamlessly. Every component is designed to feed the next, creating a flywheel of growth that never stops.
            </p>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="px-6 py-20 bg-black/20">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-12">WHAT MAKES US DIFFERENT</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm">
                <div className="w-16 h-16 bg-brand/20 rounded-lg flex items-center justify-center mb-6">
                  <Target className="w-8 h-8 text-brand" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4">Complete Systems Approach</h3>
                <p className="text-gray-400 font-mono">
                  We don't sell individual services—we build integrated systems. Your website feeds leads to your CRM, which triggers your ads, creating a growth flywheel.
                </p>
              </div>

              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm">
                <div className="w-16 h-16 bg-green-600/20 rounded-lg flex items-center justify-center mb-6">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4 text-green-400">ROI-Focused Results</h3>
                <p className="text-gray-400 font-mono">
                  Every decision is measured against ROI. We track every lead, every conversion, every dollar. If it doesn't contribute to your bottom line, we change it.
                </p>
              </div>

              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm">
                <div className="w-16 h-16 bg-blue-600/20 rounded-lg flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4 text-blue-400">Direct Communication</h3>
                <p className="text-gray-400 font-mono">
                  No account managers, no middlemen. You work directly with the strategists and developers building your systems.
                </p>
              </div>

              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm">
                <div className="w-16 h-16 bg-purple-600/20 rounded-lg flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4 text-purple-400">Full Data Access</h3>
                <p className="text-gray-400 font-mono">
                  Your data belongs to you. We never lock you into proprietary systems. Export everything anytime.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Technology Stack */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-12">BUILT ON PROVEN TECHNOLOGY</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="bg-black/20 border border-white/10 p-6 rounded-lg backdrop-blur-sm">
                <Cpu className="w-12 h-12 text-brand mx-auto mb-4" />
                <h3 className="font-display font-bold">AI & Machine Learning</h3>
              </div>
              <div className="bg-black/20 border border-white/10 p-6 rounded-lg backdrop-blur-sm">
                <Globe className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="font-display font-bold">GoHighLevel CRM</h3>
              </div>
              <div className="bg-black/20 border border-white/10 p-6 rounded-lg backdrop-blur-sm">
                <Target className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="font-display font-bold">Google Ads & Analytics</h3>
              </div>
              <div className="bg-black/20 border border-white/10 p-6 rounded-lg backdrop-blur-sm">
                <Zap className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="font-display font-bold">Meta Ads Platform</h3>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20 text-center bg-black/20">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">
              READY TO BUILD YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">SYSTEM?</span>
            </h2>
            <p className="font-mono text-lg text-silver mb-12">
              Stop piecing together solutions. Start with a complete system designed for growth.
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
          <Link href="/websites" className="hover:text-brand transition-colors">WEBSITES</Link>
          <Link href="/ads" className="hover:text-brand transition-colors">ADS</Link>
          <Link href="/systems" className="hover:text-brand transition-colors">SYSTEMS</Link>
          <Link href="/pricing" className="hover:text-brand transition-colors">PRICING</Link>
          <Link href="/onboarding" className="hover:text-brand transition-colors">ONBOARDING</Link>
          <Link href="/privacy" className="hover:text-brand transition-colors">PRIVACY</Link>
          <Link href="/terms" className="hover:text-brand transition-colors">TERMS</Link>
          <Link href="/about" className="hover:text-brand transition-colors">ABOUT</Link>
        </div>
      </footer>

    </div>
  )
}

export default AboutPage
