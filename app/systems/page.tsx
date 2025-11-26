"use client"

import React from 'react';
import { ChevronRight, Phone, MessageSquare, Clock, Bot, Database, Zap, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const SystemsPage = () => {
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
              MACHINE THAT <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">NEVER SLEEPS</span>
            </h1>
            <p className="font-mono text-lg text-silver mb-12 max-w-2xl mx-auto">
              CRM and automation systems powered by GoHighLevel that work 24/7 to capture leads, nurture prospects, and convert them into customers.
            </p>
          </div>
        </section>

        {/* Core Features */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm">
                <div className="w-16 h-16 bg-green-600/20 rounded-lg flex items-center justify-center mb-6">
                  <Phone className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4">Call Tracking</h3>
                <p className="text-gray-400 font-mono">
                  Every call recorded and tracked. Know exactly where your leads come from and what they say.
                </p>
              </div>

              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm">
                <div className="w-16 h-16 bg-blue-600/20 rounded-lg flex items-center justify-center mb-6">
                  <MessageSquare className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4">Smart Messaging</h3>
                <p className="text-gray-400 font-mono">
                  Centralized SMS, email, and social media messaging. Never miss a lead or let a conversation go cold.
                </p>
              </div>

              <div className="bg-black/20 border border-white/10 p-8 rounded-lg backdrop-blur-sm">
                <div className="w-16 h-16 bg-purple-600/20 rounded-lg flex items-center justify-center mb-6">
                  <Bot className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4">AI Chat Responses</h3>
                <p className="text-gray-400 font-mono">
                  Intelligent AI chatbots that qualify leads and book appointments while you sleep.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Automation Demo */}
        <section className="px-6 py-20 bg-black/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-12">HOW THE SYSTEM WORKS</h2>
            <div className="space-y-8">
              <div className="bg-black/30 border border-white/10 p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center mr-4">
                    <Phone className="w-4 h-4 text-red-400" />
                  </div>
                  <h3 className="font-display text-xl font-bold">1. Lead Calls Your Business</h3>
                </div>
                <p className="text-gray-400 font-mono ml-12">
                  Call tracking captures the lead's information and records the entire conversation.
                </p>
              </div>

              <div className="bg-black/30 border border-white/10 p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-yellow-600/20 rounded-full flex items-center justify-center mr-4">
                    <Clock className="w-4 h-4 text-yellow-400" />
                  </div>
                  <h3 className="font-display text-xl font-bold">2. Missed Call Text-Back</h3>
                </div>
                <p className="text-gray-400 font-mono ml-12">
                  Within seconds, our system sends a professional text message asking how we can help.
                </p>
              </div>

              <div className="bg-black/30 border border-white/10 p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center mr-4">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="font-display text-xl font-bold">3. Conversation Continues</h3>
                </div>
                <p className="text-gray-400 font-mono ml-12">
                  Lead responds via text, email, or social media. All channels are centralized in one dashboard.
                </p>
              </div>

              <div className="bg-black/30 border border-white/10 p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center mr-4">
                    <Database className="w-4 h-4 text-green-400" />
                  </div>
                  <h3 className="font-display text-xl font-bold">4. Lead Enters CRM Pipeline</h3>
                </div>
                <p className="text-gray-400 font-mono ml-12">
                  Automatically added to your sales pipeline with full contact history and appointment booking.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-12">WHY BUSINESSES CONVERT MORE</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <div className="flex items-center mb-4">
                  <Clock className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">24/7 Response Time</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  No lead goes unanswered. Instant responses mean higher conversion rates and better customer experience.
                </p>
              </div>

              <div>
                <div className="flex items-center mb-4">
                  <Users className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Qualified Leads Only</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  AI chatbots qualify leads before they reach you, ensuring you only spend time on serious prospects.
                </p>
              </div>

              <div>
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Data-Driven Insights</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  Track every interaction, conversion, and revenue source. Make informed decisions about your marketing.
                </p>
              </div>

              <div>
                <div className="flex items-center mb-4">
                  <Zap className="w-6 h-6 text-brand mr-3" />
                  <h3 className="font-display text-xl font-bold">Automated Workflows</h3>
                </div>
                <p className="text-gray-400 font-mono mb-6">
                  Email sequences, appointment reminders, and follow-up campaigns run automatically, saving you hours each week.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20 text-center bg-black/20">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">
              READY TO NEVER <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">MISS A LEAD?</span>
            </h2>
            <p className="font-mono text-lg text-silver mb-12">
              Stop losing customers to slow response times. Start capturing and converting every opportunity.
            </p>

            <button
              className="group relative px-10 py-5 bg-white text-black font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-transform duration-300"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                GET THE SYSTEM <ChevronRight className="group-hover:translate-x-1 transition-transform" />
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

export default SystemsPage;
