"use client"

import { Check, X, ArrowRight, Zap, Shield, Users, BarChart3, TrendingUp, Target, Rocket, Brain, Palette, Send, FileText, Settings, Globe, MessageSquare, ChevronDown, ChevronUp, Award, Clock, DollarSign, Activity, Search, PieChart, Bot, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GridOverlay } from "@/components/GridOverlay"
import Link from "next/link"
import { useState } from "react"

const BRAND_RED = "#FF2A2A"

function TagBadge({
  children,
  tone = "red",
  className = "",
}: {
  children: React.ReactNode
  tone?: "red" | "white" | "dark"
  className?: string
}) {
  const toneMap = {
    red: "bg-[var(--brand-red)] text-black",
    white: "bg-white text-black",
    dark: "bg-black text-white border border-white/15",
  } as const
  return (
    <span
      className={`relative inline-flex items-center px-3 py-1 text-xs font-extrabold uppercase tracking-wide rounded-[8px] shadow-[0_2px_0_rgba(0,0,0,.6)] ${toneMap[tone]} ${className}`}
      style={{ clipPath: "polygon(0 0, 96% 0, 100% 25%, 100% 100%, 4% 100%, 0 75%)" }}
    >
      {children}
    </span>
  )
}

function SectionHeader({ eyebrow, title, sub }: { eyebrow?: string, title: React.ReactNode, sub?: React.ReactNode }) {
  return (
    <div className="text-center mb-16">
      {eyebrow && (
        <TagBadge tone="dark" className="mb-4">{eyebrow}</TagBadge>
      )}
      <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 font-oswald">{title}</h2>
      {sub && <p className="text-lg text-gray-300/90 max-w-3xl mx-auto font-mono">{sub}</p>}
      <div className="mt-8 flex items-center justify-center">
        <div className="w-24 h-[6px] bg-[var(--brand-red)] shadow-[0_0_24px_rgba(255,42,42,.8)] rounded-full" />
      </div>
    </div>
  )
}

function Ribbon({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
      <div className="relative">
        <span className="px-4 py-1 text-xs font-black uppercase bg-[var(--brand-red)] text-black rounded shadow-[0_6px_0_rgba(0,0,0,.4)]">
          {children}
        </span>
        <span className="absolute -left-3 top-1.5 w-3 h-3 bg-[var(--brand-red)] rotate-45" />
        <span className="absolute -right-3 top-1.5 w-3 h-3 bg-[var(--brand-red)] rotate-45" />
      </div>
    </div>
  )
}

export default function HomePage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [activePreview, setActivePreview] = useState('analytics')

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing')
    if (pricingSection) {
      pricingSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  const dashboardPreviews = [
    { id: 'analytics', title: 'Analytics', icon: BarChart3 },
    { id: 'leads', title: 'Lead Gen', icon: Search },
    { id: 'creatives', title: 'Creatives', icon: Palette },
    { id: 'report', title: 'Brand Report', icon: FileText },
    { id: 'chatbot', title: 'Chatbot', icon: Bot },
    { id: 'assistant', title: 'AI Assistant', icon: Brain },
    { id: 'outreach', title: 'Outreach', icon: Mail },
    { id: 'teams', title: 'Team Collab', icon: Users },
  ]

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=Oswald:wght@600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      <div
        className="min-h-screen bg-[#0B0B0B] text-white overflow-x-hidden"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        <div className="pointer-events-none fixed inset-0 z-0">
          <GridOverlay />
          {/* subtle radial glow */}
          <div className="absolute left-1/2 top-[-20%] -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,42,42,.12),transparent_60%)]" />
        </div>

        <div className="relative z-10" style={{ ['--brand-red' as any]: BRAND_RED }}>
          {/* Top urgency strip */}
          <div className="w-full bg-black/70 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-3">
              <TagBadge tone="red" className="hidden sm:inline-flex">Limited</TagBadge>
                <p className="text-xs md:text-sm text-white/80 tracking-wide font-extrabold">
                  Launch Special: 30% off for first week users. <span className="text-white/60">Limited time only.</span>
                </p>
            </div>
          </div>

          {/* Header */}
          <header className="py-6 sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-black/40 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                <img src="https://i.imgur.com/5a6dQWO.png" alt="Brez Marketing" className="h-10 w-auto" />
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <Button className="bg-transparent border border-white/20 hover:bg-white/10 text-white">
                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button 
                  onClick={scrollToPricing}
                  className="bg-[var(--brand-red)] text-black hover:brightness-110 font-black shadow-[0_8px_0_rgba(0,0,0,.5)]"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </header>

          {/* Hero */}
          <section className="py-20 sm:py-28 relative">
            {/* diagonal divider */}
            <div className="absolute -bottom-6 left-0 right-0 h-12 bg-[linear-gradient(135deg,transparent_0%,transparent_49%,rgba(255,255,255,.06)_50%,transparent_51%)] opacity-40 pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
              <div className="text-center lg:text-left">
                <TagBadge tone="white" className="mb-5">Professional Brand Scaling Infrastructure</TagBadge>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-6 font-oswald">
                  SCALING BRANDS<br />
                  <span className="text-transparent bg-clip-text bg-[linear-gradient(90deg,#fff,rgba(255,255,255,.5))]">HAS NEVER BEEN EASIER</span>
                </h1>
                <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8">
                  The complete AI-powered toolkit for freelance brand scalers. Real-time analytics, automated lead generation, and professional tools to scale brands to 7+ figures.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                  <Button 
                    onClick={scrollToPricing}
                    className="bg-[var(--brand-red)] text-black hover:brightness-110 font-black shadow-[0_10px_0_rgba(0,0,0,.6)] px-6 py-6 text-base"
                  >
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
                {/* trust row */}
                <div className="mt-6 flex flex-wrap items-center gap-3 text-xs justify-center lg:justify-start">
                  <TagBadge tone="dark">SOC 2 Ready</TagBadge>
                  <TagBadge tone="dark">99.9% Uptime</TagBadge>
                  <TagBadge tone="dark">Cancel Anytime</TagBadge>
                </div>
              </div>

              {/* animated preview container (kept) */}
              <div className="relative h-[28rem]">
                <div className="absolute inset-0 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03))] backdrop-blur-md shadow-[0_20px_80px_rgba(255,42,42,.15)] rotate-2 transition-all duration-500 hover:rotate-0 hover:scale-[1.02]" />
                <div className="absolute inset-0 bg-[#0F0F10] border border-white/25 rounded-2xl p-6 -rotate-1 transition-all duration-500 hover:rotate-0 hover:scale-[1.02] shadow-2xl flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-[var(--brand-red)] rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-xs text-white/50">Included Features</div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {dashboardPreviews.map(preview => (
                      <button
                        key={preview.id}
                        onMouseEnter={() => setActivePreview(preview.id)}
                        className={`flex items-center justify-center gap-2 p-2 rounded-md transition-colors duration-200 border ${
                          activePreview === preview.id ? 'bg-white/10 border-white/30' : 'bg-transparent hover:bg-white/5 border-white/10'
                        }`}
                      >
                        <preview.icon className={`w-4 h-4 ${activePreview === preview.id ? 'text-white' : 'text-white/50'}`} />
                        <span className={`text-xs font-semibold hidden sm:inline ${activePreview === preview.id ? 'text-white' : 'text-white/60'}`}>{preview.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* animated canvases (unchanged logic) */}
                  <div className="w-full flex-grow bg-white/5 rounded-lg p-4 flex items-center justify-center overflow-hidden">
                    {activePreview === 'analytics' && (
                      <svg viewBox="0 0 100 60" className="w-full h-full opacity-80">
                        <rect x="10" y="40" width="10" height="15" fill="currentColor" className="animate-bar-grow" style={{ color: "rgba(255,255,255,.35)" }} />
                        <rect x="25" y="25" width="10" height="30" fill="currentColor" className="animate-bar-grow" style={{ color: "rgba(255,255,255,.45)", animationDelay: '0.15s' }} />
                        <rect x="40" y="35" width="10" height="20" fill="currentColor" className="animate-bar-grow" style={{ color: "rgba(255,255,255,.55)", animationDelay: '0.3s' }} />
                        <rect x="55" y="20" width="10" height="35" fill="currentColor" className="animate-bar-grow" style={{ color: "rgba(255,255,255,.7)", animationDelay: '0.45s' }} />
                        <rect x="70" y="30" width="10" height="25" fill="currentColor" className="animate-bar-grow" style={{ color: "rgba(255,255,255,.55)", animationDelay: '0.6s' }} />
                        <rect x="85" y="15" width="10" height="40" fill="currentColor" className="animate-bar-grow" style={{ color: "rgba(255,255,255,.45)", animationDelay: '0.75s' }} />
                      </svg>
                    )}
                    {activePreview === 'teams' && (
                      <svg viewBox="0 0 100 60" className="w-full h-full opacity-80">
                        <circle cx="50" cy="30" r="8" fill="rgba(255,255,255,.6)" />
                        <circle cx="20" cy="15" r="5" fill="rgba(255,255,255,.3)" />
                        <circle cx="80" cy="15" r="5" fill="rgba(255,255,255,.3)" />
                        <circle cx="20" cy="45" r="5" fill="rgba(255,255,255,.3)" />
                        <circle cx="80" cy="45" r="5" fill="rgba(255,255,255,.3)" />
                        <line x1="20" y1="15" x2="50" y2="30" stroke="rgba(255,255,255,.5)" strokeWidth="1" className="animate-draw-line-short" />
                        <line x1="80" y1="15" x2="50" y2="30" stroke="rgba(255,255,255,.5)" strokeWidth="1" className="animate-draw-line-short" style={{ animationDelay: '0.5s' }} />
                        <line x1="20" y1="45" x2="50" y2="30" stroke="rgba(255,255,255,.5)" strokeWidth="1" className="animate-draw-line-short" style={{ animationDelay: '1s' }} />
                        <line x1="80" y1="45" x2="50" y2="30" stroke="rgba(255,255,255,.5)" strokeWidth="1" className="animate-draw-line-short" style={{ animationDelay: '1.5s' }} />
                      </svg>
                    )}
                    {activePreview === 'leads' && (
                      <svg viewBox="0 0 100 60" className="w-full h-full opacity-80">
                        <g className="animate-magnify">
                          <circle cx="40" cy="25" r="12" stroke="rgba(255,255,255,.7)" strokeWidth="2" fill="none" />
                          <line x1="48" y1="33" x2="55" y2="40" stroke="rgba(255,255,255,.7)" strokeWidth="2" />
                        </g>
                        <rect x="20" y="10" width="60" height="40" fill="rgba(255,255,255,.06)" rx="2" />
                        <line x1="25" y1="20" x2="75" y2="20" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
                        <line x1="25" y1="30" x2="65" y2="30" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
                        <line x1="25" y1="40" x2="70" y2="40" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
                      </svg>
                    )}
                    {activePreview === 'creatives' && (
                      <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="bg-white/15 rounded animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }} />
                        ))}
                      </div>
                    )}
                    {activePreview === 'report' && (
                      <svg viewBox="0 0 100 60" className="w-full h-full opacity-90">
                        <rect x="10" y="5" width="80" height="50" rx="2" stroke="rgba(255,255,255,.7)" strokeWidth="1" fill="rgba(255,255,255,.06)"/>
                        <g clipPath="url(#clipReport)">
                          <g className="animate-scroll-report">
                            {[10,20,25,30,40,45,50,60,65,70].map((y, i) => (
                              <rect key={i} x="15" y={y} width={i === 0 ? 40 : i % 3 === 0 ? 60 : 70} height={i === 0 ? 4 : 2} fill="rgba(255,255,255,.5)" />
                            ))}
                          </g>
                        </g>
                        <defs>
                          <clipPath id="clipReport">
                            <rect x="10" y="5" width="80" height="50" />
                          </clipPath>
                        </defs>
                      </svg>
                    )}
                    {activePreview === 'chatbot' && (
                      <div className="w-full h-full flex flex-col justify-end p-4 gap-2">
                        <div className="w-3/4 bg-white/15 rounded-lg p-2 animate-fade-in opacity-0" style={{ animationDelay: '0.3s' }}>
                          <div className="w-full h-2 bg-white/30 rounded" />
                        </div>
                        <div className="w-3/4 bg-white/30 rounded-lg p-2 self-end flex items-center gap-1 animate-fade-in opacity-0" style={{ animationDelay: '1.2s' }}>
                          <div className="w-2 h-2 bg-white rounded-full animate-typing" />
                          <div className="w-2 h-2 bg-white rounded-full animate-typing" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 bg-white rounded-full animate-typing" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    )}
                    {activePreview === 'assistant' && (
                      <svg viewBox="0 0 100 60" className="w-full h-full opacity-90">
                        <path d="M 10 50 L 30 40 L 50 25 L 70 15 L 90 5" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.5" className="animate-draw-profit-line" />
                        <g>
                          <circle cx="30" cy="40" r="3" fill={BRAND_RED} className="animate-ai-spark" style={{ animationDelay: '0.5s' }} />
                          <circle cx="50" cy="25" r="3" fill={BRAND_RED} className="animate-ai-spark" style={{ animationDelay: '1s' }} />
                          <circle cx="70" cy="15" r="3" fill={BRAND_RED} className="animate-ai-spark" style={{ animationDelay: '1.5s' }} />
                        </g>
                        <text x="92" y="10" fontSize="10" fill="rgba(255,255,255,.7)" className="animate-dollar-sign">$</text>
                      </svg>
                    )}
                    {activePreview === 'outreach' && (
                      <svg viewBox="0 0 100 60" className="w-full h-full opacity-90">
                        <g className="animate-send-mail">
                          <path d="M 10 20 L 10 50 L 90 50 L 90 20" stroke="rgba(255,255,255,.8)" strokeWidth="2" fill="rgba(255,255,255,.06)" />
                          <path d="M 10 20 L 50 35 L 90 20" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2" />
                        </g>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Value Proposition */}
          <section className="py-20 sm:py-28 relative">
            <div className="absolute inset-x-0 -top-6 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader
                eyebrow="Everything in one place"
                title={<span>EVERYTHING IN ONE PLACE</span>}
                sub="Stop juggling 12 different tools. Our all-in-one platform replaces your entire marketing stack with one unified dashboard."
              />
              <div className="grid lg:grid-cols-3 gap-8 mb-16">
                {[
                  { 
                    icon: Zap, 
                    title: "ALL-IN-ONE PLATFORM", 
                    desc: "Replace Zapier, HubSpot, Canva, Triple Whale, Hyros, Google Analytics, and 8+ other tools with one login.",
                    bullets: [
                      "Unified dashboard for all marketing channels",
                      "Replace 8+ expensive monthly subscriptions",
                      "No more context switching between tools"
                    ],
                    tags: ["Zapier", "HubSpot", "Triple Whale", "Hyros", "Canva", "Analytics"]
                  },
                  { 
                    icon: Palette, 
                    title: "FULLY WHITE-LABELABLE", 
                    desc: "Rebrand everything as your own software. Your logo, your colors, your branding - clients never see our name.",
                    bullets: [
                      "Your logo, colors, and branding everywhere",
                      "Clients never see our name or brand",
                      "Complete rebrand capabilities included"
                    ],
                    tags: ["White-Label", "Custom Branding", "Your Logo"]
                  },
                  { 
                    icon: Shield, 
                    title: "OWN YOUR BUSINESS", 
                    desc: "No dependencies on external tools. Everything runs under your brand with enterprise-grade reliability.",
                    bullets: [
                      "No dependency on external tools or services",
                      "Enterprise-grade reliability and uptime",
                      "Full control over your business operations"
                    ],
                    tags: ["Enterprise", "Reliable", "Independent"]
                  },
                ].map((feature, i) => (
                  <div key={i} className="relative">
                    {/* Hanging Tag */}
                    <div className="relative mb-8">
                      {/* String/Chain */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-yellow-600 to-yellow-800"></div>
                      
                      {/* Metal Ring */}
                      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 border-2 border-yellow-600 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 shadow-[0_2px_4px_rgba(0,0,0,0.3)]"></div>
                      
                      {/* Tag Shape */}
                      <div className="relative mt-8 mx-auto max-w-sm">
                        <div 
                          className="bg-gradient-to-br from-gray-100 to-gray-300 text-black p-6 pb-8 shadow-[0_8px_16px_rgba(0,0,0,0.3)] transform perspective-1000 rotate-y-2"
                          style={{
                            clipPath: 'polygon(0 0, 85% 0, 100% 15%, 100% 100%, 0 100%)'
                          }}
                        >
                          {/* Hole in top right */}
                          <div className="absolute top-3 right-3 w-2 h-2 bg-black/20 rounded-full"></div>
                          
                          <h3 className="text-lg font-black mb-3 text-center leading-tight">
                            {feature.title}
                          </h3>
                          
                          <div className="border-b border-black/20 mb-4"></div>
                          
                          {feature.bullets.map((bullet, bulletIndex) => (
                            <div key={bulletIndex} className="flex items-start mb-2">
                              <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                              <span className="text-xs font-medium leading-relaxed">{bullet}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Tag Shadow */}
                        <div 
                          className="absolute inset-0 bg-black/10 transform translate-x-1 translate-y-1 -z-10"
                          style={{
                            clipPath: 'polygon(0 0, 85% 0, 100% 15%, 100% 100%, 0 100%)'
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Description and Tags below */}
                    <div className="text-center">
                      <p className="text-white/70 text-sm mb-4 font-mono">{feature.desc}</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {feature.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-black/80 to-black/60 border border-white/30 rounded-lg text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:border-[var(--brand-red)]/60 hover:shadow-[0_2px_12px_rgba(255,42,42,0.2)] transition-all"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/15 p-8 text-center bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))]">
                <TagBadge tone="red" className="mb-3">White-Label</TagBadge>
                <h3 className="text-2xl font-bold mb-3">Your Clients Think It's Your Software</h3>
                <p className="text-white/80 text-lg max-w-4xl mx-auto font-mono">
                  Complete white-label solution means you can sell this as your own proprietary platform. Charge premium prices for "your" custom-built marketing software while we handle all the backend infrastructure.
                </p>
              </div>
            </div>
          </section>

          {/* Bento / Features */}
          <section className="py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader
                eyebrow="Features"
                title="EVERY FEATURE YOU NEED"
                sub="No hype, no exaggeration. Here's exactly what our platform includes."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[
                  { icon: BarChart3, title: "Meta Ads Analytics", desc: "Real-time campaign tracking, performance metrics, audience insights, and automated reporting. Connect unlimited ad accounts.", available: true },
                  { icon: Rocket, title: "Shopify Integration", desc: "Complete e-commerce data sync with order tracking, customer analytics, inventory management, and sales performance monitoring.", available: true },
                  { icon: Brain, title: "AI Marketing Consultant", desc: "24/7 AI assistant providing strategic recommendations, campaign optimization suggestions, and growth strategies based on your data.", available: true },
                  { icon: Zap, title: "Lead Generation", desc: "Automated prospecting using Google Places API with lead scoring, qualification, and business intelligence data enrichment.", available: true },
                  { icon: Palette, title: "Creative Studio", desc: "AI-powered ad creative generation with professional backgrounds, product photography enhancement, and creative asset management.", available: true },
                  { icon: Send, title: "Outreach Automation", desc: "Complete email marketing suite with campaign management, lead tracking, response analytics, and automated follow-up sequences.", available: true },
                  { icon: FileText, title: "Automated Reports", desc: "Daily and monthly performance reports with white-label branding, client-ready presentations, and automated distribution.", available: true },
                  { icon: Target, title: "Campaign Optimization", desc: "AI-powered bid management, audience targeting optimization, and automated budget reallocation based on performance data.", available: true },
                  { icon: Users, title: "Team Collaboration", desc: "Multi-user workspaces with role-based permissions, client portal access, and collaborative project management tools.", available: true },
                  { icon: Settings, title: "API & Integrations", desc: "RESTful API access, webhook support, and custom integration capabilities for enterprise clients and developers.", available: true },
                  { icon: Shield, title: "Enterprise Security", desc: "SOC 2 Type II compliant, GDPR compliant, bank-level encryption, and 99.9% uptime SLA with enterprise support.", available: true },
                  { icon: Globe, title: "Google Ads (Coming Soon)", desc: "Full Google Ads integration with campaign management, performance tracking, and automated optimization (Q2 2024).", available: false },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="group relative rounded-2xl p-6 border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015))] hover:border-white/30 transition-all"
                  >
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(500px_200px_at_50%_-10%,rgba(255,42,42,.14),transparent)]" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 border border-white/12 rounded-lg bg-black/40">
                          <feature.icon className="w-6 h-6 text-white/70" />
                        </div>
                        {!feature.available && (
                          <TagBadge tone="white">Coming Soon</TagBadge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                      <p className="text-sm text-white/75 font-mono">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="py-20 sm:py-28 relative">
            <div className="absolute inset-x-0 -top-6 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader
                eyebrow="Pricing"
                title="CHOOSE YOUR PLAN"
                sub="Low barrier to entry - start cheap and only upgrade as you grow and make more money. Pay for what you need, scale when you're ready."
              />

              <div className="grid lg:grid-cols-4 gap-8 items-start">
                {[
                  {
                    name: "Solo Brand",
                    description: "Perfect for single brand owners",
                    price: 147,
                    popular: false,
                    icon: Users,
                    coreFeatures: [
                      "1 Brand Connection",
                      "Meta Ads Analytics",
                      "Shopify Integration",
                      "10 AI Assistant Chats/day",
                      "25 Creative Generations/month",
                      "Basic Reporting"
                    ],
                    advancedFeatures: [],
                    teamFeatures: [],
                    whiteLabel: false
                  },
                  {
                    name: "Multi-Brand",
                    description: "Scale across multiple brands",
                    price: 347,
                    popular: true,
                    icon: Rocket,
                    coreFeatures: [
                      "Up to 10 Brand Connections",
                      "Meta Ads Analytics",
                      "Shopify Integration",
                      "25 AI Assistant Chats/day",
                      "100 Creative Generations/month",
                      "Advanced Reporting"
                    ],
                    advancedFeatures: [
                      "500 Lead Generations/month",
                      "1,000 Outreach Emails/month",
                      "Campaign Optimization",
                      "API Access"
                    ],
                    teamFeatures: [],
                    whiteLabel: false
                  },
                  {
                    name: "Agency",
                    description: "For agencies serving clients",
                    price: 647,
                    popular: false,
                    icon: Zap,
                    coreFeatures: [
                      "Up to 25 Brand Connections",
                      "Meta Ads Analytics",
                      "Shopify Integration",
                      "50 AI Assistant Chats/day",
                      "250 Creative Generations/month",
                      "Advanced Reporting"
                    ],
                    advancedFeatures: [
                      "2,500 Lead Generations/month",
                      "5,000 Outreach Emails/month",
                      "Campaign Optimization",
                      "Priority API Access"
                    ],
                    teamFeatures: [
                      "Team Collaboration (5 users)",
                      "Client Portal Access",
                      "Role-Based Permissions"
                    ],
                    whiteLabel: true
                  },
                  {
                    name: "Enterprise",
                    description: "Large-scale operations",
                    price: 997,
                    popular: false,
                    icon: Award,
                    coreFeatures: [
                      "Unlimited Brand Connections",
                      "Meta Ads Analytics",
                      "Shopify Integration",
                      "Unlimited AI Assistant Chats",
                      "500 Creative Generations/month",
                      "Advanced Reporting & Analytics"
                    ],
                    advancedFeatures: [
                      "10,000 Lead Generations/month",
                      "25,000 Outreach Emails/month",
                      "Campaign Optimization",
                      "Enterprise API Access"
                    ],
                    teamFeatures: [
                      "Unlimited Team Members",
                      "Client Portal Access",
                      "Role-Based Permissions",
                      "Custom Integrations"
                    ],
                    whiteLabel: true
                  }
                ].map((plan, index) => (
                  <div
                    key={plan.name}
                    className={`relative flex flex-col h-full rounded-2xl transition-all duration-300 group ${
                      plan.popular 
                        ? 'bg-gradient-to-br from-black/90 via-black/95 to-black/90 border-2 border-[var(--brand-red)]/60 scale-[1.02] shadow-[0_0_40px_rgba(255,42,42,.3),inset_0_1px_0_rgba(255,42,42,.2)]' 
                        : 'bg-gradient-to-br from-black/70 via-black/80 to-black/70 border border-white/15 hover:border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,.1)]'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div className="relative">
                          <span className="px-4 py-1 text-xs font-black uppercase bg-[var(--brand-red)] text-black rounded-lg shadow-[0_4px_0_rgba(0,0,0,.6)]">
                            Most Popular
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${plan.popular ? 'bg-[var(--brand-red)]/20 border border-[var(--brand-red)]/30' : 'bg-white/5 border border-white/10'}`}>
                          <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-[var(--brand-red)]' : 'text-white/70'}`} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                          <p className="text-white/60 text-xs">{plan.description}</p>
                        </div>
                      </div>
                      <div className="mb-6">
                        <div className="flex items-baseline">
                          <span className="text-4xl font-black text-white">${plan.price}</span>
                          <span className="text-white/40 text-sm ml-1">/mo</span>
                        </div>
                      </div>
                      <Link href="/login">
                        <Button className={`w-full mb-4 h-10 text-sm font-bold ${
                          plan.popular 
                            ? 'bg-[var(--brand-red)] text-black hover:brightness-110 shadow-[0_4px_0_rgba(0,0,0,.4)] hover:shadow-[0_2px_0_rgba(0,0,0,.4)] hover:translate-y-[2px] transition-all' 
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
                        }`}>
                          Get Started
                        </Button>
                      </Link>
                    </div>

                    <div className="px-6 pb-6 flex-1">
                      <div className="mb-4">
                        <h4 className="text-white/90 font-semibold text-xs mb-3 uppercase tracking-wide">✓ Included</h4>
                        <div className="space-y-2">
                          {plan.coreFeatures.slice(0, 4).map((feature: string, i: number) => (
                            <div key={i} className="flex items-center">
                              <Check className={`w-3 h-3 mr-2 flex-shrink-0 ${plan.popular ? 'text-[var(--brand-red)]' : 'text-white/70'}`} />
                              <span className="text-white/75 text-xs">{feature}</span>
                            </div>
                          ))}
                          {plan.coreFeatures.length > 4 && (
                            <div className="text-white/50 text-xs">
                              +{plan.coreFeatures.length - 4} more features
                            </div>
                          )}
                        </div>
                      </div>

                      {plan.advancedFeatures.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-blue-400 font-semibold text-xs mb-2 uppercase tracking-wide">⚡ Growth</h4>
                          <div className="space-y-1">
                            {plan.advancedFeatures.slice(0, 2).map((feature: string, i: number) => (
                              <div key={i} className="flex items-center">
                                <Check className="w-3 h-3 mr-2 flex-shrink-0 text-blue-400" />
                                <span className="text-white/75 text-xs">{feature}</span>
                              </div>
                            ))}
                            {plan.advancedFeatures.length > 2 && (
                              <div className="text-white/50 text-xs">
                                +{plan.advancedFeatures.length - 2} more tools
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {plan.teamFeatures.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-purple-400 font-semibold text-xs mb-2 uppercase tracking-wide">👥 Team</h4>
                          <div className="space-y-1">
                            {plan.teamFeatures.slice(0, 2).map((feature: string, i: number) => (
                              <div key={i} className="flex items-center">
                                <Check className="w-3 h-3 mr-2 flex-shrink-0 text-purple-400" />
                                <span className="text-white/75 text-xs">{feature}</span>
                              </div>
                            ))}
                            {plan.teamFeatures.length > 2 && (
                              <div className="text-white/50 text-xs">
                                +{plan.teamFeatures.length - 2} more features
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {plan.whiteLabel && (
                        <div className="border border-[var(--brand-red)]/30 bg-[var(--brand-red)]/10 rounded-lg p-3">
                          <div className="flex items-center">
                            <Check className="w-3 h-3 mr-2 text-[var(--brand-red)]" />
                            <span className="text-white text-xs font-semibold">Full White-Label Rights</span>
                          </div>
                        </div>
                      )}

                      {index < 3 && (
                        <div className="mt-6 pt-4 border-t border-white/10">
                          <div className="space-y-2">
                            {index === 0 && (
                              <>
                                <div className="flex items-start opacity-60">
                                  <X className="w-4 h-4 text-white/40 mr-3 mt-0.5 flex-shrink-0" />
                                  <span className="text-white/55 text-sm font-mono">Lead Generation</span>
                                </div>
                                <div className="flex items-start opacity-60">
                                  <X className="w-4 h-4 text-white/40 mr-3 mt-0.5 flex-shrink-0" />
                                  <span className="text-white/55 text-sm font-mono">Team Features</span>
                                </div>
                                <div className="flex items-start opacity-60">
                                  <X className="w-4 h-4 text-white/40 mr-3 mt-0.5 flex-shrink-0" />
                                  <span className="text-white/55 text-sm font-mono">White-Label Rights</span>
                                </div>
                              </>
                            )}
                            {index === 1 && (
                              <>
                                <div className="flex items-start opacity-60">
                                  <X className="w-4 h-4 text-white/40 mr-3 mt-0.5 flex-shrink-0" />
                                  <span className="text-white/55 text-sm font-mono">Team Collaboration</span>
                                </div>
                                <div className="flex items-start opacity-60">
                                  <X className="w-4 h-4 text-white/40 mr-3 mt-0.5 flex-shrink-0" />
                                  <span className="text-white/55 text-sm font-mono">White-Label Rights</span>
                                </div>
                              </>
                            )}
                            {index === 2 && (
                              <>
                                <div className="flex items-start opacity-60">
                                  <X className="w-4 h-4 text-white/40 mr-3 mt-0.5 flex-shrink-0" />
                                  <span className="text-white/55 text-sm font-mono">Unlimited Team Members</span>
                                </div>
                                <div className="flex items-start opacity-60">
                                  <X className="w-4 h-4 text-white/40 mr-3 mt-0.5 flex-shrink-0" />
                                  <span className="text-white/55 text-sm font-mono">Custom Integrations</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-20 sm:py-28">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader
                eyebrow="FAQ"
                title="FREQUENTLY ASKED QUESTIONS"
                sub="Honest answers about what we offer and how it works."
              />
              <div className="space-y-4">
                {[
                  { q: "What platforms do you actually support right now?", a: "Currently: Meta Ads (full integration) and Shopify (full integration). Google Ads integration is in development and will be available in Q2 2024." },
                  { q: "How does the AI consultant actually work?", a: "It's our custom AI built specifically for marketing. It analyzes your actual campaign performance, provides specific recommendations, and can even write ad copy or suggest budget optimizations." },
                  { q: "Can I cancel anytime?", a: "Yes, absolutely. One-click cancellation from your dashboard. No long-term contracts, no cancellation fees, no hassle." },
                  { q: "What's your data retention policy?", a: "Brand Owner: 90 days. Brand Scaler & above: Unlimited. All data is securely encrypted and backed up multiple times." },
                  { q: "Do you offer white-label reporting?", a: "Yes, starting with the Brand Scaler plan. You can customize branding, add your logo, and present reports as your own work." },
                  { q: "How secure is my data?", a: "SOC 2 Type II compliant, GDPR compliant, bank-level encryption. We don't sell or share your data. 99.9% uptime with enterprise-grade infrastructure." },
                  { q: "Can I integrate with other tools?", a: "Yes, we offer API access starting with Agency Pro plan. Webhooks, custom integrations, and Zapier support are available for Enterprise clients." }
                ].map((faq, i) => (
                  <div key={i} className="bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01))] border border-white/12 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full text-left p-6 flex justify-between items-center hover:bg-white/[.06] transition-colors">
                      <span className="text-lg font-semibold">{faq.q}</span>
                      {expandedFaq === i ? <ChevronUp className="w-5 h-5 text-white/60" /> : <ChevronDown className="w-5 h-5 text-white/60" />}
                    </button>
                    {expandedFaq === i && (
                      <div className="px-6 pb-6 border-t border-white/10">
                        <p className="text-white/75 pt-4 leading-relaxed font-mono">{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-20 sm:py-28 relative">
            <div className="absolute inset-x-0 -top-6 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6 font-oswald">
                READY TO SCALE<br />
                <span className="text-transparent bg-clip-text bg-[linear-gradient(90deg,#fff,rgba(255,255,255,.5))]">LIKE A PRO?</span>
              </h2>
              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10 font-mono">
                Join the growing community of brand scalers who have transformed their businesses with our platform. Start scaling today and see the difference professional tools make.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
                <Link href="/login">
                  <Button className="bg-[var(--brand-red)] text-black hover:brightness-110 font-black shadow-[0_10px_0_rgba(0,0,0,.6)] px-6 py-6 text-base">
                    Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 backdrop-blur px-6 py-6">
                  <MessageSquare className="mr-2 h-5 w-5" /> Talk to Sales
                </Button>
              </div>
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-white/75">
                <div className="flex items-center justify-center gap-3"><Shield className="w-5 h-5" /> SOC 2 Compliant</div>
                <div className="flex items-center justify-center gap-3"><Award className="w-5 h-5" /> 99.9% Uptime</div>
                <div className="flex items-center justify-center gap-3"><Clock className="w-5 h-5" /> 24/7 Support</div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 border-t border-white/10 bg-black/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <img src="https://i.imgur.com/5a6dQWO.png" alt="Brez Marketing" className="h-8 w-auto mx-auto mb-6" />
              <p className="text-white/55 text-sm font-mono">
                © {new Date().getFullYear()} Brez Marketing. All rights reserved. <br />
                Trusted by brand scalers worldwide • Cancel anytime
              </p>
            </div>
          </footer>
        </div>
      </div>

      <style>{`
        .font-oswald { font-family: Oswald, Inter, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

        /* anims (kept, just tuned) */
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in .5s ease-out forwards; animation-delay: var(--animation-delay, 0s); }

        @keyframes bar-grow { 0%,100% { transform: scaleY(.2); } 50% { transform: scaleY(1); } }
        .animate-bar-grow { transform-origin: bottom; animation: bar-grow 1.6s ease-in-out infinite; }

        @keyframes draw-line-short { from { stroke-dashoffset: 50; } to { stroke-dashoffset: 0; } }
        .animate-draw-line-short { stroke-dasharray: 50; stroke-dashoffset: 50; animation: draw-line-short 1.6s ease-in-out infinite; }

        @keyframes magnify { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(10px,-5px) scale(1.2); } }
        .animate-magnify { animation: magnify 3s ease-in-out infinite; }

        @keyframes typing { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .animate-typing { animation: typing 1.2s ease-in-out infinite; }

        @keyframes scroll-report { from { transform: translateY(0); } to { transform: translateY(-20px); } }
        .animate-scroll-report { animation: scroll-report 3s ease-in-out infinite alternate; }

        @keyframes draw-profit-line { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
        .animate-draw-profit-line { stroke-dasharray: 200; animation: draw-profit-line 2s ease-out infinite; }

        @keyframes ai-spark { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: .55; } }
        .animate-ai-spark { transform-origin: center; animation: ai-spark 1.5s ease-in-out infinite; }

        @keyframes dollar-sign-fade { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
        .animate-dollar-sign { animation: dollar-sign-fade 2s ease-in-out infinite; }
        @keyframes send-mail-anim { 0% { transform: translate(0,0); opacity: 1; } 50% { transform: translate(40px,-20px); opacity: 1; } 100% { transform: translate(80px,-40px); opacity: 0; } }
        .animate-send-mail { animation: send-mail-anim 2.5s ease-in-out infinite; }
      `}</style>
    </>
  )
}
