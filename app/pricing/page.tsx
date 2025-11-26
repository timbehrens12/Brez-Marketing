"use client"

import React from 'react';
import { ChevronRight, Check, Star } from 'lucide-react';
import Link from 'next/link';

const PricingPage = () => {
  return (
    <div className="bg-charcoal min-h-screen text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center mix-blend-normal pointer-events-none">
        <Link href="/" className="pointer-events-auto">
          <img
            src="https://i.imgur.com/xOgn8Xe.png"
            alt="TLUCA Systems"
            className="h-10 md:h-16 w-auto object-contain"
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
              TRANSPARENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">PRICING</span>
            </h1>
            <p className="font-mono text-lg text-silver mb-12 max-w-2xl mx-auto">
              No hidden fees, no surprises. You pay for results, not promises. Every dollar you spend on us is an investment in your growth.
            </p>
          </div>
        </section>

        {/* Pricing Structure */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Build Fee */}
              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-brand text-black font-display font-bold px-4 py-2 rounded-full text-sm">
                    ONE-TIME
                  </div>
                </div>
                <div className="text-center mb-8">
                  <h3 className="font-display text-3xl font-bold mb-2">BUILD FEE</h3>
                  <div className="font-display text-5xl font-bold text-brand mb-4">$2,500</div>
                  <p className="font-mono text-gray-400">One-time setup investment</p>
                </div>
                <ul className="space-y-4 font-mono">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Complete website build
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    CRM system setup
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Ad account optimization
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Lead capture systems
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Training & onboarding
                  </li>
                </ul>
              </div>

              {/* Monthly Management */}
              <div className="bg-black/20 border border-brand p-8 rounded-lg backdrop-blur-sm relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-brand text-black font-display font-bold px-4 py-2 rounded-full text-sm">
                    MONTHLY
                  </div>
                </div>
                <Star className="w-8 h-8 text-brand mx-auto mb-4" />
                <div className="text-center mb-8">
                  <h3 className="font-display text-3xl font-bold mb-2">MANAGEMENT FEE</h3>
                  <div className="font-display text-5xl font-bold text-brand mb-4">$1,500</div>
                  <p className="font-mono text-gray-400">Per month management</p>
                </div>
                <ul className="space-y-4 font-mono">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    24/7 system monitoring
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Weekly performance reports
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Campaign optimization
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Lead response management
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Monthly strategy calls
                  </li>
                </ul>
              </div>

              {/* Ad Traffic */}
              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gray-600 text-white font-display font-bold px-4 py-2 rounded-full text-sm">
                    VARIABLE
                  </div>
                </div>
                <div className="text-center mb-8">
                  <h3 className="font-display text-3xl font-bold mb-2">AD TRAFFIC</h3>
                  <div className="font-display text-4xl font-bold text-silver mb-4">$2,000–$5,000</div>
                  <p className="font-mono text-gray-400">Monthly ad spend (your budget)</p>
                </div>
                <ul className="space-y-4 font-mono">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Paid directly to platforms
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Google Ads management
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Meta Ads management
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Performance tracking
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    ROI optimization
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why This Pricing Makes Sense */}
        <section className="px-6 py-20 bg-black/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-12">WHY THIS WORKS FOR YOU</h2>
            <div className="space-y-8">
              <div className="bg-black/30 border border-white/10 p-6 rounded-lg">
                <h3 className="font-display text-2xl font-bold mb-4 text-brand">You Keep Full Control</h3>
                <p className="font-mono text-gray-400">
                  The ad spend is yours—we manage it for you. You can pause, stop, or change direction anytime. Your money, your rules.
                </p>
              </div>

              <div className="bg-black/30 border border-white/10 p-6 rounded-lg">
                <h3 className="font-display text-2xl font-bold mb-4 text-brand">Results or Your Money Back</h3>
                <p className="font-mono text-gray-400">
                  If we don't deliver positive ROI within 90 days, we'll refund your management fees. We're that confident in our systems.
                </p>
              </div>

              <div className="bg-black/30 border border-white/10 p-6 rounded-lg">
                <h3 className="font-display text-2xl font-bold mb-4 text-brand">No Long-Term Contracts</h3>
                <p className="font-mono text-gray-400">
                  Month-to-month management. If we're not delivering value, you can cancel anytime. No penalties, no hassle.
                </p>
              </div>

              <div className="bg-black/30 border border-white/10 p-6 rounded-lg">
                <h3 className="font-display text-2xl font-bold mb-4 text-brand">Complete Transparency</h3>
                <p className="font-mono text-gray-400">
                  Real-time dashboards showing exactly where every dollar goes. Weekly reports with actionable insights. Nothing hidden.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ROI Calculator Preview */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">TYPICAL ROI RESULTS</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-black/20 border border-white/10 p-6 rounded-lg">
                <div className="font-display text-3xl font-bold text-green-400 mb-2">3-5x</div>
                <div className="font-mono text-sm text-gray-400">Average ROI on ad spend</div>
              </div>
              <div className="bg-black/20 border border-white/10 p-6 rounded-lg">
                <div className="font-display text-3xl font-bold text-blue-400 mb-2">$15-25K</div>
                <div className="font-mono text-sm text-gray-400">Monthly revenue increase</div>
              </div>
              <div className="bg-black/20 border border-white/10 p-6 rounded-lg">
                <div className="font-display text-3xl font-bold text-purple-400 mb-2">60 days</div>
                <div className="font-mono text-sm text-gray-400">Time to positive ROI</div>
              </div>
            </div>
            <p className="font-mono text-gray-400">
              These are actual results from our clients. Your results may vary based on your industry and market conditions.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20 text-center bg-black/20">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">
              READY TO START <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">GENERATING REVENUE?</span>
            </h2>
            <p className="font-mono text-lg text-silver mb-12">
              Stop wasting money on ads that don't convert. Start investing in systems that deliver measurable results.
            </p>

            <button
              className="group relative px-10 py-5 bg-white text-black font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-transform duration-300"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                GET STARTED TODAY <ChevronRight className="group-hover:translate-x-1 transition-transform" />
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
  );
};

export default PricingPage;
