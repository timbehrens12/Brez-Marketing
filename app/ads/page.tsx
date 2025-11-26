"use client"

import React from 'react';
import { ChevronRight, Target, TrendingUp, Users, DollarSign, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';

const AdsPage = () => {
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
        </div>
      </nav>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="px-6 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-8 leading-tight">
              PERFECT <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">TRAFFIC</span>
            </h1>
            <p className="font-mono text-lg text-silver mb-12 max-w-2xl mx-auto">
              We don't just run ads—we engineer traffic systems that turn clicks into customers. Every dollar spent works harder for your business.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Google Ads */}
              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm hover:border-brand/50 transition-colors">
                <div className="w-16 h-16 bg-blue-600/20 rounded-lg flex items-center justify-center mb-6">
                  <Target className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4 text-blue-400">GOOGLE ADS</h3>
                <p className="text-gray-400 font-mono mb-6">
                  Search ads that capture customers at the moment they're looking for your services. Pay-per-click with maximum ROI.
                </p>
                <ul className="space-y-2 text-sm font-mono text-gray-300">
                  <li>• Local search optimization</li>
                  <li>• Keyword research & bidding</li>
                  <li>• Conversion tracking</li>
                  <li>• A/B testing campaigns</li>
                </ul>
              </div>

              {/* Google LSA */}
              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm hover:border-brand/50 transition-colors">
                <div className="w-16 h-16 bg-green-600/20 rounded-lg flex items-center justify-center mb-6">
                  <MapPin className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4 text-green-400">LOCAL SERVICE ADS</h3>
                <p className="text-gray-400 font-mono mb-6">
                  Google's premium ad format for local businesses. Pay-per-lead, not per-click. Higher conversion rates with trust badges.
                </p>
                <ul className="space-y-2 text-sm font-mono text-gray-300">
                  <li>• Google Guaranteed badge</li>
                  <li>• Pay-per-lead pricing</li>
                  <li>• Higher conversion rates</li>
                  <li>• Local search dominance</li>
                </ul>
              </div>

              {/* Meta Ads */}
              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm hover:border-brand/50 transition-colors">
                <div className="w-16 h-16 bg-purple-600/20 rounded-lg flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4 text-purple-400">META ADS</h3>
                <p className="text-gray-400 font-mono mb-6">
                  Facebook & Instagram ads with professional creative and precise audience targeting. Generate leads through forms and messaging.
                </p>
                <ul className="space-y-2 text-sm font-mono text-gray-300">
                  <li>• Custom creative design</li>
                  <li>• Lookalike audiences</li>
                  <li>• Lead generation forms</li>
                  <li>• Messenger integration</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="px-6 py-20 bg-black/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-12">WHY OUR ADS CONVERT BETTER</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Data-Driven Strategy</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  Every campaign starts with deep market research and competitor analysis. We know exactly who to target and how to reach them.
                </p>
              </div>

              <div>
                <div className="flex items-center mb-4">
                  <DollarSign className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Transparent Reporting</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  Real-time dashboards showing exactly where your money goes and what results you're getting. No hidden fees or black boxes.
                </p>
              </div>

              <div>
                <div className="flex items-center mb-4">
                  <Phone className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Lead Quality Focus</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  We optimize for qualified leads, not just clicks. Better leads mean better customers and higher lifetime value.
                </p>
              </div>

              <div>
                <div className="flex items-center mb-4">
                  <Target className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Continuous Optimization</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  Our team monitors and optimizes campaigns 24/7. What works today might not work tomorrow—we stay ahead of changes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">
              READY TO DOMINATE YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">MARKET?</span>
            </h2>
            <p className="font-mono text-lg text-silver mb-12">
              Stop wasting money on ads that don't convert. Start getting qualified leads that turn into customers.
            </p>

            <button
              className="group relative px-10 py-5 bg-white text-black font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-transform duration-300"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                START ADVERTISING <ChevronRight className="group-hover:translate-x-1 transition-transform" />
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
          <Link href="/privacy" className="hover:text-brand transition-colors">PRIVACY</Link>
          <Link href="/terms" className="hover:text-brand transition-colors">TERMS</Link>
          <Link href="/about" className="hover:text-brand transition-colors">ABOUT</Link>
        </div>
      </footer>
    </div>
  );
};

export default AdsPage;
