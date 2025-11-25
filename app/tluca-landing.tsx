"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
  ArrowRight, Check, Phone, Mail, Target, BarChart3, Globe, Shield, Zap, 
  Award, Users, TrendingUp, Sparkles, Star, Quote, ChevronRight, Rocket, 
  MessageSquare, Smartphone, Calendar, Bell, Search, MousePointer, LayoutDashboard,
  Clock, CreditCard, CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"

const COLORS = {
  dark: "#0a0a0a",
  darker: "#050505",
  gray: "#1a1a1a",
  grayLight: "#2a2a2a",
  grayMedium: "#3a3a3a",
  grayBorder: "#2a2a2a",
  text: "#e5e5e5",
  textLight: "#a0a0a0",
  textDark: "#6a6a6a",
  accent: "#3b82f6", // Changed to a blue accent for trust/business
  accentGlow: "#60a5fa",
  success: "#10b981"
}

function HeroSection() {
  const [scrollY, setScrollY] = useState(0)
  
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 py-20 overflow-hidden">
      <div 
        className="absolute inset-0 z-0"
        style={{ 
          background: `radial-gradient(circle at 50% 50%, ${COLORS.gray} 0%, ${COLORS.darker} 100%)`
        }}
      />
      
      {/* Animated Background Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.05]"
           style={{
             backgroundImage: `linear-gradient(${COLORS.text} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.text} 1px, transparent 1px)`,
             backgroundSize: '40px 40px',
             transform: `perspective(500px) rotateX(60deg) translateY(${scrollY * 0.5}px) translateZ(-200px)`
           }}
      />

      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8 backdrop-blur-sm animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-gray-300">Accepting New Clients for {new Date().getFullYear()}</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] text-white">
          Dominate Your <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Local Market</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
          We stop the guesswork. Data-driven ad campaigns that flood your business with high-quality leads, booked appointments, and loyal customers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button 
            size="lg"
            onClick={scrollToContact}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
          >
            Get Your Free Strategy Plan
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Link href="/#services">
            <Button 
              variant="outline" 
              size="lg"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white px-8 py-6 text-lg rounded-full backdrop-blur-sm"
            >
              Explore Services
            </Button>
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md max-w-3xl mx-auto">
          <p className="text-gray-300 font-medium italic">
            "Most local businesses waste budget on clicks that never convert. We focus on one metric: <span className="text-white font-bold">Revenue.</span> If you're ready to scale with a partner who handles everything, you're in the right place."
          </p>
        </div>
      </div>
    </section>
  )
}

function ServiceCard({ title, description, icon: Icon, features, colorClass }: any) {
  return (
    <div className="group relative p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent hover:from-blue-500/50 transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative h-full bg-gray-900/90 backdrop-blur-xl rounded-xl p-8 border border-white/5 overflow-hidden">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
          <Icon size={120} />
        </div>
        
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${colorClass} bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
        </div>

        <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
        <p className="text-gray-400 mb-8 leading-relaxed">{description}</p>

        <ul className="space-y-3">
          {features.map((feature: string, i: number) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
              <CheckCircle2 className={`w-5 h-5 shrink-0 ${colorClass.replace('bg-', 'text-')}`} />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ServicesSection() {
  const services = [
    {
      title: "Google Ads Management",
      description: "Capture customers exactly when they're searching for your services. We optimize for high intent to ensure your budget goes toward real leads.",
      icon: Search,
      colorClass: "text-blue-400",
      features: [
        "Keyword Research & Competitor Analysis",
        "High-Converting Ad Copy",
        "Negative Keyword Management",
        "Bid Optimization & Budget Control"
      ]
    },
    {
      title: "Google Local Service Ads (LSA)",
      description: "Appear at the very top of Google with the 'Google Guaranteed' badge. Build instant trust and pay only for qualified leads, not clicks.",
      icon: Shield,
      colorClass: "text-green-400",
      features: [
        "Google Guaranteed Badge Setup",
        "Pay-Per-Lead Model",
        "Top of Search Results Placement",
        "Dispute Management for Invalid Leads"
      ]
    },
    {
      title: "Meta Ads (Facebook & Instagram)",
      description: "Stop the scroll with visually stunning ads. We target your ideal customers based on demographics, interests, and behaviors before they even search.",
      icon: Users,
      colorClass: "text-purple-400",
      features: [
        "Custom Audience Targeting",
        "Retargeting Campaigns",
        "Lead Form Integration",
        "Creative Design & A/B Testing"
      ]
    }
  ]

  return (
    <section id="services" className="py-32 px-6 bg-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Complete Ad Solutions</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            We handle the complexity of modern advertising so you can focus on running your business.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((s, i) => (
            <ServiceCard key={i} {...s} />
          ))}
        </div>
      </div>
    </section>
  )
}

function CRMSection() {
  const features = [
    { icon: Phone, title: "Call Tracking & Recording", desc: "Know exactly which ads drive calls. Review recordings to improve sales." },
    { icon: MessageSquare, title: "Missed Call Text-Back", desc: "Never lose a lead. Our system automatically texts back when you miss a call." },
    { icon: LayoutDashboard, title: "Unified Inbox", desc: "Manage SMS, Email, Facebook, and Instagram messages in one simple stream." },
    { icon: Sparkles, title: "AI Chat Assistants", desc: "24/7 AI response to qualify leads and book appointments automatically." },
    { icon: TrendingUp, title: "Visual Pipeline", desc: "Drag-and-drop pipeline to track leads from 'New' to 'Sold' in real-time." },
    { icon: Calendar, title: "Automated Booking", desc: "Syncs with your calendar to let qualified leads book appointments instantly." }
  ]

  return (
    <section className="py-32 px-6 bg-gradient-to-b from-gray-900 to-black border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Powered by GoHighLevel
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Never Miss a Lead Again.
            </h2>
            <p className="text-xl text-gray-400 mb-10 leading-relaxed">
              Generating leads is only half the battle. Our all-in-one CRM ensures you capture, nurture, and close every opportunity that comes your way.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-8">
              {features.map((f, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                    <f.icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">{f.title}</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full" />
            <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
              {/* Abstract UI Representation */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-bold">JD</div>
                    <div>
                      <div className="text-white font-bold">John Doe</div>
                      <div className="text-xs text-gray-500">Looking for quote</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">Just now</div>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-800/50 p-3 rounded-lg rounded-tl-none max-w-[80%]">
                    <p className="text-sm text-gray-300">Hi, I'm interested in your services. Can you give me a price?</p>
                  </div>
                  <div className="bg-indigo-600/20 p-3 rounded-lg rounded-tr-none max-w-[80%] ml-auto border border-indigo-500/20">
                    <p className="text-sm text-indigo-200">Thanks for reaching out, John! We have a special offer this week. Would you like to schedule a quick call?</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="h-8 w-24 bg-indigo-600 rounded animate-pulse opacity-50"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function WhyUsSection() {
  return (
    <section className="py-24 px-6 bg-black">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-16">Why Businesses Choose Us</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: "Transparent Reporting", desc: "No vanity metrics. You see exactly where every dollar goes and what it returns." },
            { title: "No Long Contracts", desc: "We earn your business every month. No handcuffing you to long-term commitments." },
            { title: "Full Data Ownership", desc: "You own your ad accounts and data. We don't hold your assets hostage." },
            { title: "ROI Focused", desc: "We don't just get clicks; we optimize for booked appointments and sales." }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function OnboardingSection() {
  return (
    <section className="py-32 px-6 bg-gradient-to-t from-gray-900 to-black">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-6">Simple 3-Step Launch</h2>
          <p className="text-gray-400">We can have your campaigns live in as little as 3-5 days.</p>
        </div>

        <div className="space-y-8">
          {[
            { step: "01", title: "Strategy & Access", desc: "You complete a simple onboarding form and grant us access to your accounts. We map out your campaign strategy." },
            { step: "02", title: "Build & Setup", desc: "Our team builds your landing pages, sets up tracking, designs creatives, and configures your CRM dashboard." },
            { step: "03", title: "Launch & Optimize", desc: "We go live. Leads start flowing into your dashboard, and we continually tweak for better performance." }
          ].map((step, i) => (
            <div key={i} className="flex gap-6 p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
              <div className="text-3xl font-bold text-indigo-500 opacity-50">{step.step}</div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  return (
    <section className="py-32 px-6 bg-black" id="pricing">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Simple, Transparent Investment</h2>
          <p className="text-xl text-gray-400">Everything you need to scale, broken down clearly.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-gray-900 border-gray-800 text-gray-300">
            <CardHeader>
              <CardTitle className="text-white">Ad Spend</CardTitle>
              <CardDescription>Paid directly to Google/Meta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-4">$X - $X <span className="text-sm font-normal text-gray-500">/mo</span></div>
              <p className="text-sm text-gray-400">You decide your budget. We recommend a minimum to see meaningful results.</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-indigo-500/30 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500"></div>
            <CardHeader>
              <CardTitle className="text-white">Management Fee</CardTitle>
              <CardDescription>Our expert service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-4">$X <span className="text-sm font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-2 text-sm text-gray-300 mb-6">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400"/> Campaign Optimization</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400"/> Creative Refresh</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400"/> Monthly Reporting</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400"/> CRM Access Included</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 text-gray-300">
            <CardHeader>
              <CardTitle className="text-white">Setup Fee</CardTitle>
              <CardDescription>One-time investment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-4">$X <span className="text-sm font-normal text-gray-500">one-time</span></div>
              <p className="text-sm text-gray-400 mb-4">Covers comprehensive account setup, pixel installation, tracking configuration, and initial campaign build.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function SocialProofSection() {
  return (
    <section className="py-24 px-6 bg-gray-900/50">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-white mb-12 opacity-50 uppercase tracking-widest">Trusted By Local Businesses</h2>
        
        <div className="flex flex-wrap justify-center gap-12 mb-16 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
          {/* Placeholder Logos */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-32 bg-white/20 rounded animate-pulse" />
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-transparent border-white/5">
              <CardContent className="p-8 text-left">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(star => <Star key={star} className="w-4 h-4 text-yellow-500 fill-yellow-500" />)}
                </div>
                <p className="text-gray-300 mb-6 italic">"We saw a 200% increase in leads within the first month. The missed call text-back feature alone has saved us dozens of customers."</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-700" />
                  <div>
                    <div className="text-white font-bold text-sm">Client Name</div>
                    <div className="text-xs text-gray-500">Business Owner</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contact" className="py-32 px-6 bg-black">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-block p-4 rounded-full bg-indigo-500/10 mb-6">
          <Phone className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">Ready to Scale?</h2>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          Let's discuss your goals and see if we're a good fit. No pressure, just a strategy session.
        </p>
        <Button className="bg-white text-black hover:bg-gray-200 px-10 py-8 text-xl rounded-full font-bold shadow-2xl shadow-white/10 transition-all hover:scale-105">
          Book Your Strategy Call
        </Button>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 px-6 bg-gray-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-white font-bold text-2xl">TLUCA</div>
        <div className="flex gap-6 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
        </div>
        <div className="text-sm text-gray-600">
          © {new Date().getFullYear()} TLUCA Systems. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default function TLUCALandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      <HeroSection />
      <SocialProofSection />
      <ServicesSection />
      <CRMSection />
      <WhyUsSection />
      <OnboardingSection />
      <PricingSection />
      <ContactSection />
      <Footer />
      
      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
