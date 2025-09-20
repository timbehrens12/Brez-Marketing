"use client"

import { Check, X, ArrowRight, Zap, Shield, Users, BarChart3, TrendingUp, TrendingDown, Target, Rocket, Brain, Palette, Send, FileText, Settings, Globe, MessageSquare, ChevronDown, ChevronUp, Award, Clock, DollarSign, Activity, Search, PieChart, Bot, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GridOverlay } from "@/components/GridOverlay"
import Link from "next/link"
import { useState } from "react"

const BRAND_RED = "#FF2A2A"

// Plan Recommendation Quiz Component
function PlanRecommendationQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [showResult, setShowResult] = useState(false)

  const questions = [
    {
      question: "What best describes your current situation?",
      options: [
        { text: "I own a single brand/business", value: "single-brand" },
        { text: "I want to start freelance brand scaling but have no clients yet", value: "aspiring-freelancer" },
        { text: "I have 1-3 clients already", value: "few-clients" },
        { text: "I manage 4+ brands/clients", value: "established-agency" },
        { text: "I run a large agency (10+ brands)", value: "enterprise" }
      ]
    },
    {
      question: "What's your primary goal?",
      options: [
        { text: "Track my own business performance", value: "own-business" },
        { text: "Get my first freelance client", value: "first-client" },
        { text: "Scale my existing clients", value: "scale-existing" },
        { text: "Streamline agency operations", value: "streamline-agency" }
      ]
    },
    {
      question: "How important is lead generation to you?",
      options: [
        { text: "Not needed - I have my own business", value: "no-leads" },
        { text: "Critical - I need to find clients", value: "need-leads" },
        { text: "Helpful for growth", value: "growth-leads" }
      ]
    }
  ]

  const handleAnswer = (value: string) => {
    const newAnswers = [...answers, value]
    setAnswers(newAnswers)
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResult(true)
    }
  }

  const getRecommendation = () => {
    const [situation, goal, leads] = answers
    
    // Single brand owner
    if (situation === "single-brand" || goal === "own-business") {
      return {
        plan: "DTC Owner",
        reason: "Perfect for tracking your own business performance with essential analytics and reporting.",
        price: "$67/mo",
        features: ["Track your brand's performance", "Shopify & Meta integration", "Basic AI assistance"]
      }
    }
    
    // Aspiring freelancer or first client
    if (situation === "aspiring-freelancer" || goal === "first-client" || leads === "need-leads") {
      return {
        plan: "Beginner",
        reason: "Includes lead generation and outreach tools to help you land your first clients.",
        price: "$97/mo",
        features: ["100 leads/month", "250 outreach emails", "Client management tools", "White-label reports"]
      }
    }
    
    // Few clients
    if (situation === "few-clients" || goal === "scale-existing") {
      return {
        plan: "Growing",
        reason: "Perfect for managing multiple brands with advanced features and higher API limits.",
        price: "$397/mo",
        features: ["Up to 5 brands", "300 leads/month", "750 outreach emails", "Advanced analytics"]
      }
    }
    
    // Established agency
    if (situation === "established-agency") {
      return {
        plan: "Multi-Brand",
        reason: "Built for agencies managing multiple clients with team collaboration features.",
        price: "$697/mo",
        features: ["Up to 15 brands", "Team collaboration", "750 leads/month", "Premium analytics"]
      }
    }
    
    // Enterprise
    if (situation === "enterprise") {
      return {
        plan: "Enterprise",
        reason: "Full-scale operations with unlimited features and dedicated support.",
        price: "$1,337/mo",
        features: ["Up to 25 brands", "Unlimited AI", "Enterprise support", "Custom integrations"]
      }
    }
    
    // Default fallback
    return {
      plan: "Beginner",
      reason: "A great starting point with all essential features for growing your business.",
      price: "$97/mo",
      features: ["Lead generation", "Client management", "White-label reports", "AI assistance"]
    }
  }

  const resetQuiz = () => {
    setCurrentQuestion(0)
    setAnswers([])
    setShowResult(false)
  }

  if (showResult) {
    const recommendation = getRecommendation()
    return (
      <div className="bg-gradient-to-br from-black/60 to-black/80 border border-white/15 rounded-2xl p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[var(--brand-red)]/20 border border-[var(--brand-red)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-[var(--brand-red)]" />
          </div>
          <h3 className="text-2xl font-bold mb-2">We recommend the <span className="text-[var(--brand-red)]">{recommendation.plan}</span> plan</h3>
          <p className="text-white/70 mb-4">{recommendation.reason}</p>
          <div className="text-3xl font-black text-[var(--brand-red)] mb-6">{recommendation.price}</div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {recommendation.features.map((feature, index) => (
            <div key={index} className="flex items-center text-left">
              <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
              <span className="text-white/80">{feature}</span>
            </div>
          ))}
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-[var(--brand-red)] text-black hover:brightness-110 font-bold"
          >
            View Plans <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button 
            onClick={resetQuiz}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            Retake Quiz
          </Button>
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="bg-gradient-to-br from-black/60 to-black/80 border border-white/15 rounded-2xl p-8">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-white/60 mb-2">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-[var(--brand-red)] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <h3 className="text-xl font-bold text-white mb-6">{question.question}</h3>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(option.value)}
            className="w-full text-left p-4 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[var(--brand-red)]/50 rounded-lg transition-all duration-200 group"
          >
            <span className="text-white group-hover:text-white">{option.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

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

        <div className="relative z-10 overflow-x-hidden" style={{ ['--brand-red' as any]: BRAND_RED }}>
          {/* Top banner */}
          <div className="w-full bg-black/70 border-b border-white/10">
            <div className="flex justify-center py-2">
              <div className="flex items-center gap-2">
                <TagBadge tone="red">LIMITED TIME OFFER</TagBadge>
                <span className="text-sm text-white/80 tracking-wide font-bold">
                  Existing Scale 2.0 users get 25% off
                </span>
              </div>
            </div>
          </div>

          {/* Header */}
           <header className="py-6 sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-black/40 border-b border-white/10 relative">
             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <img src="https://i.imgur.com/j4AQPxj.png" alt="Brez Marketing" className="h-10 w-auto -ml-4" />
             </div>
              <div className="absolute right-32 sm:right-37 lg:right-41 top-1/2 -translate-y-1/2 flex items-center gap-3">
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
           </header>

          {/* Hero */}
          <section className="py-20 sm:py-28 relative">
            {/* diagonal divider */}
            <div className="absolute -bottom-6 left-0 right-0 h-12 bg-[linear-gradient(135deg,transparent_0%,transparent_49%,rgba(255,255,255,.06)_50%,transparent_51%)] opacity-40 pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
              <div className="text-center lg:text-left">
                <TagBadge tone="red" className="mb-5">LIMITED TIME OFFER</TagBadge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter mb-6 font-oswald leading-tight">
                  THE <img src="/brand/new-logo.png" alt="Scale 2.0 Dashboard" className="inline h-[1.1em] mx-2" /><br />
                  FOR SIGNING <span className="relative inline-block">
                    <span className="text-white font-black relative z-10">FREELANCE</span>
                    <div className="absolute -bottom-1 left-0 right-0 h-2 bg-[var(--brand-red)] -z-10"></div>
                  </span> <span className="relative inline-block">
                    <span className="text-white font-black relative z-10">BRANDSCALING</span>
                    <div className="absolute -bottom-1 left-0 right-0 h-2 bg-[var(--brand-red)] -z-10"></div>
                  </span><br />
                  <span className="text-white font-black">CLIENTS</span>
                </h1>
                <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8">
                  The complete AI-powered dashboard to find, sign, and deliver results for your first freelance brandscaling clients.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                  <Button 
                    onClick={scrollToPricing}
                    className="bg-[var(--brand-red)] text-black hover:brightness-110 font-black shadow-[0_10px_0_rgba(0,0,0,.6)] px-6 py-6 text-base"
                  >
                    SIGN YOUR FIRST CLIENT <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
                {/* trust row */}
                <div className="mt-6 flex flex-wrap items-center gap-3 text-xs justify-center lg:justify-start">
                  <TagBadge tone="dark">SOC Compliant</TagBadge>
                  <TagBadge tone="dark">Cancel Anytime</TagBadge>
                  <TagBadge tone="dark">30-Day Guarantee</TagBadge>
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
                        <rect x="55" y="20" width="10" height="35" fill={BRAND_RED} className="animate-bar-grow" style={{ animationDelay: '0.45s' }} />
                        <rect x="70" y="30" width="10" height="25" fill="currentColor" className="animate-bar-grow" style={{ color: "rgba(255,255,255,.55)", animationDelay: '0.6s' }} />
                        <rect x="85" y="15" width="10" height="40" fill="currentColor" className="animate-bar-grow" style={{ color: "rgba(255,255,255,.45)", animationDelay: '0.75s' }} />
                        {/* Red accent line */}
                        <line x1="5" y1="58" x2="95" y2="58" stroke={BRAND_RED} strokeWidth="1" opacity="0.6" />
                      </svg>
                    )}
                    {activePreview === 'teams' && (
                      <svg viewBox="0 0 100 60" className="w-full h-full opacity-80">
                        <circle cx="50" cy="30" r="8" fill={BRAND_RED} />
                        <circle cx="20" cy="15" r="5" fill="rgba(255,255,255,.3)" />
                        <circle cx="80" cy="15" r="5" fill="rgba(255,255,255,.3)" />
                        <circle cx="20" cy="45" r="5" fill="rgba(255,255,255,.3)" />
                        <circle cx="80" cy="45" r="5" fill="rgba(255,255,255,.3)" />
                        <line x1="20" y1="15" x2="50" y2="30" stroke="rgba(255,255,255,.5)" strokeWidth="1" className="animate-draw-line-short" />
                        <line x1="80" y1="15" x2="50" y2="30" stroke={BRAND_RED} strokeWidth="1.5" className="animate-draw-line-short" style={{ animationDelay: '0.5s' }} />
                        <line x1="20" y1="45" x2="50" y2="30" stroke="rgba(255,255,255,.5)" strokeWidth="1" className="animate-draw-line-short" style={{ animationDelay: '1s' }} />
                        <line x1="80" y1="45" x2="50" y2="30" stroke={BRAND_RED} strokeWidth="1.5" className="animate-draw-line-short" style={{ animationDelay: '1.5s' }} />
                      </svg>
                    )}
                    {activePreview === 'leads' && (
                      <svg viewBox="0 0 100 60" className="w-full h-full opacity-80">
                        <g className="animate-magnify">
                          <circle cx="40" cy="25" r="12" stroke={BRAND_RED} strokeWidth="2" fill="none" />
                          <line x1="48" y1="33" x2="55" y2="40" stroke={BRAND_RED} strokeWidth="2" />
                        </g>
                        <rect x="20" y="10" width="60" height="40" fill="rgba(255,255,255,.06)" rx="2" />
                        <line x1="25" y1="20" x2="75" y2="20" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
                        <line x1="25" y1="30" x2="65" y2="30" stroke={BRAND_RED} strokeWidth="2" opacity="0.6" />
                        <line x1="25" y1="40" x2="70" y2="40" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
                        {/* Red lead indicator dots */}
                        <circle cx="75" cy="20" r="1.5" fill={BRAND_RED} className="animate-ping" />
                        <circle cx="65" cy="30" r="1.5" fill={BRAND_RED} className="animate-ping" style={{ animationDelay: '0.3s' }} />
                      </svg>
                    )}
                    {activePreview === 'creatives' && (
                      <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`${i === 2 || i === 4 ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30' : 'bg-white/15'} rounded animate-fade-in`} 
                            style={{ animationDelay: `${i * 0.08}s` }} 
                          />
                        ))}
                      </div>
                    )}
                    {activePreview === 'report' && (
                      <svg viewBox="0 0 100 60" className="w-full h-full opacity-90">
                        <rect x="10" y="5" width="80" height="50" rx="2" stroke="rgba(255,255,255,.7)" strokeWidth="1" fill="rgba(255,255,255,.06)"/>
                        <g clipPath="url(#clipReport)">
                          <g className="animate-scroll-report">
                            {[10,20,25,30,40,45,50,60,65,70].map((y, i) => (
                              <rect 
                                key={i} 
                                x="15" 
                                y={y} 
                                width={i === 0 ? 40 : i % 3 === 0 ? 60 : 70} 
                                height={i === 0 ? 4 : 2} 
                                fill={i === 0 || i === 3 ? BRAND_RED : "rgba(255,255,255,.5)"} 
                                opacity={i === 0 || i === 3 ? "0.8" : "1"}
                              />
                            ))}
                          </g>
                        </g>
                        {/* Red report indicator */}
                        <circle cx="85" cy="10" r="2" fill={BRAND_RED} className="animate-pulse" />
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
                        <div className="w-3/4 bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 rounded-lg p-2 self-end flex items-center gap-1 animate-fade-in opacity-0" style={{ animationDelay: '1.2s' }}>
                          <div className="w-2 h-2 bg-white rounded-full animate-typing" />
                          <div className="w-2 h-2 bg-white rounded-full animate-typing" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 bg-white rounded-full animate-typing" style={{ animationDelay: '0.4s' }} />
                        </div>
                        {/* Red chat indicator */}
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
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
                          <path d="M 10 20 L 50 35 L 90 20" fill="none" stroke={BRAND_RED} strokeWidth="2" />
                        </g>
                        {/* Red sent indicator */}
                        <circle cx="85" cy="15" r="2" fill={BRAND_RED} className="animate-ping" />
                        <circle cx="75" cy="12" r="1.5" fill={BRAND_RED} className="animate-ping" style={{ animationDelay: '0.3s' }} />
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
                title={
                  <span>
                    <span className="relative inline-block">
                      <span className="text-white font-black relative z-10">EVERYTHING</span>
                      <div className="absolute -bottom-1 left-0 right-0 h-2 bg-[var(--brand-red)] -z-10"></div>
                    </span> IN ONE PLACE
                  </span>
                }
                sub="Stop juggling dozens of browser tabs for all the brands you manage or own. Connect multiple platforms to one unified dashboard and manage everything from a single login."
              />
              <div className="grid lg:grid-cols-3 gap-8 mb-16">
                {[
                  { 
                    icon: Zap, 
                    title: "MULTI-PLATFORM DASHBOARD", 
                    desc: "Connect Shopify, Meta Ads, Google Ads (coming soon), TikTok Ads (coming soon), and more to one unified dashboard. No more juggling tons of tabs for all the brands you manage.",
                    bullets: [
                      "Connect multiple platforms to one dashboard",
                      "Manage all brands from a single interface", 
                      "No more browser tab chaos or platform switching"
                    ],
                    tags: ["Shopify", "Meta Ads", "Google Ads", "TikTok", "Unified", "Multi-Brand"]
                  },
                  { 
                    icon: Palette, 
                    title: "FULLY WHITE-LABELABLE", 
                    desc: "Add your agency name and logo to the platform. Clients see your brand signature, not ours.",
                    bullets: [
                      "Your agency name and logo everywhere",
                      "Custom brand signature on all reports", 
                      "Clients never see our name or brand"
                    ],
                    tags: ["Agency Name", "Your Logo", "Brand Signature"]
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

          {/* Cost Comparison */}
          <section className="py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <TagBadge tone="red" className="mb-4">COST BREAKDOWN</TagBadge>
                <h3 className="text-3xl font-black mb-4">Replace $2,847/month in Tool Costs</h3>
                <p className="text-white/70 text-lg max-w-3xl mx-auto">
                  Here's what you'd pay for these tools separately vs. our all-in-one platform
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {/* Individual Tool Costs */}
                <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-500/30 rounded-2xl p-8">
                  <h4 className="text-xl font-bold mb-6 text-center text-red-300">Traditional Tool Stack</h4>
                  <div className="space-y-3">
                    {[
                      { tool: "HubSpot Marketing Hub Pro", cost: 800 },
                      { tool: "Zapier Professional", cost: 49 },
                      { tool: "Triple Whale", cost: 299 },
                      { tool: "Hyros Attribution", cost: 499 },
                      { tool: "Canva for Teams", cost: 30 },
                      { tool: "Jasper AI (Creative Writing)", cost: 59 },
                      { tool: "Apollo.io (Lead Generation)", cost: 147 },
                      { tool: "Outreach.io", cost: 390 },
                      { tool: "Klaviyo (Email Marketing)", cost: 150 },
                      { tool: "AdEspresso (Campaign Management)", cost: 49 },
                      { tool: "Typeform (Lead Forms)", cost: 35 }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-white/80">{item.tool}</span>
                        <span className="text-white font-mono">${item.cost}/mo</span>
                      </div>
                    ))}
                    <div className="pt-4 mt-4 border-t border-red-500/30">
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span className="text-red-300">TOTAL MONTHLY COST</span>
                        <span className="text-red-300 text-2xl">$2847/mo</span>
                      </div>
                      <div className="text-center mt-2 text-red-200 text-sm">
                        = $34164/year
                      </div>
                    </div>
                  </div>
                </div>

                {/* Our Platform Cost */}
                <div className="bg-gradient-to-br from-green-900/20 to-green-800/20 border border-green-500/30 rounded-2xl p-8">
                  <h4 className="text-xl font-bold mb-6 text-center text-green-300">Brez Marketing Platform</h4>
                  <div className="text-center mb-8">
                    <div className="text-6xl font-black text-green-300 mb-2">$67</div>
                    <div className="text-green-200 text-lg">Starting Price</div>
                    <div className="text-white/60 text-sm mt-2">Scale to $1,497 as you grow</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-300 mb-1">95%</div>
                        <div className="text-green-200 text-sm">Cost Savings</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-green-200">
                        <Check className="w-4 h-4 mr-2" />
                        <span>All tools in one platform</span>
                      </div>
                      <div className="flex items-center text-green-200">
                        <Check className="w-4 h-4 mr-2" />
                        <span>No integration headaches</span>
                      </div>
                      <div className="flex items-center text-green-200">
                        <Check className="w-4 h-4 mr-2" />
                        <span>Single monthly payment</span>
                      </div>
                      <div className="flex items-center text-green-200">
                        <Check className="w-4 h-4 mr-2" />
                        <span>Scale as you grow</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-12">
                <div className="inline-flex items-center gap-4 bg-gradient-to-r from-green-500/20 to-green-400/20 border border-green-500/30 rounded-full px-8 py-4">
                  <TrendingDown className="w-6 h-6 text-green-400" />
                  <div>
                    <div className="text-green-300 font-bold text-lg">Save $2,780+ per month</div>
                    <div className="text-green-200 text-sm">That's $33,360+ per year in tool costs alone</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bento / Features */}
          <section className="py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader
                eyebrow="Features"
                title={
                  <span>
                    <span className="relative inline-block">
                      <span className="text-white font-black relative z-10">EVERY</span>
                      <div className="absolute -bottom-1 left-0 right-0 h-2 bg-[var(--brand-red)] -z-10"></div>
                    </span> FEATURE YOU NEED
                  </span>
                }
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

          {/* Plan Recommendation Quiz */}
          <section className="py-16 sm:py-20 relative">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black mb-4 font-oswald">
                  FIND YOUR <span className="text-[var(--brand-red)]">PERFECT PLAN</span>
                </h2>
                <p className="text-white/70 text-lg">
                  Answer a few quick questions and we'll recommend the best plan for your situation
                </p>
              </div>

              <PlanRecommendationQuiz />
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

              <div className="grid lg:grid-cols-5 gap-6 items-start mt-8">
                {[
                  {
                    name: "DTC Owner",
                    description: "Single brand owners",
                    price: 67,
                    popular: false,
                    icon: Users,
                    brands: 1,
                    leadGen: 0,
                    outreach: 0,
                    aiChats: 5,
                    creativeGen: 10,
                    features: [
                      "Brand Analytics & Reports",
                      "AI Marketing Chatbot", 
                      "Campaign Optimization",
                      "Shopify Integration",
                      "Meta Ads Analytics",
                      "Creative Generation",
                      "Basic Performance Reports"
                    ],
                    limitations: ["No Lead Generation", "No Outreach CRM"],
                    whiteLabel: false
                  },
                  {
                    name: "Beginner", 
                    description: "First freelance clients",
                    price: 97,
                    popular: true,
                    icon: Rocket,
                    brands: 1,
                    leadGen: 100,
                    outreach: 250,
                    aiChats: 10,
                    creativeGen: 25,
                    features: [
                      "Everything in DTC Owner",
                      "Lead Generation",
                      "Outreach CRM",
                      "White-Label Reports",
                      "Contract Generation AI",
                      "Ad Creative Studio"
                    ],
                    limitations: [],
                    whiteLabel: true
                  },
                  {
                    name: "Growing",
                    description: "Multiple clients",
                    price: 397,
                    popular: false,
                    icon: TrendingUp,
                    brands: 5,
                    leadGen: 300,
                    outreach: 750,
                    aiChats: 25,
                    creativeGen: 75,
                    features: [
                      "Everything in Beginner",
                      "Multi-Brand Management",
                      "Advanced Analytics",
                      "Campaign Performance Predictions",
                      "Priority API Access"
                    ],
                    limitations: [],
                    whiteLabel: true
                  },
                  {
                    name: "Multi-Brand",
                    description: "Agencies with teams",
                    price: 697,
                    popular: false,
                    icon: Zap,
                    brands: 15,
                    leadGen: 750,
                    outreach: 2000,
                    aiChats: 50,
                    creativeGen: 150,
                    features: [
                      "Everything in Growing",
                      "Team Collaboration (15 users)",
                      "Client Portal Access",
                      "Advanced Role Permissions",
                      "Competitor Ad Intelligence"
                    ],
                    limitations: [],
                    whiteLabel: true
                  },
                  {
                    name: "Enterprise",
                    description: "Large agencies",
                    price: 1337,
                    popular: false,
                    icon: Award,
                    brands: 25,
                    leadGen: 2500,
                    outreach: 7500,
                    aiChats: "Unlimited",
                    creativeGen: 500,
                    features: [
                      "Everything in Multi-Brand",
                      "Unlimited Team Members",
                      "Custom Integrations",
                      "24/7 Priority Support",
                      "Dedicated Account Manager",
                      "White-Glove Implementation"
                    ],
                    limitations: [],
                    whiteLabel: true
                  }
                ].map((plan, index) => (
                  <div
                    key={plan.name}
                    className={`relative flex flex-col h-full rounded-2xl transition-all duration-300 group ${
                      plan.popular 
                        ? 'bg-gradient-to-br from-red-900/40 via-black/90 to-red-900/40 border-2 border-[var(--brand-red)]/60 scale-[1.02] shadow-[0_0_40px_rgba(255,42,42,.3),inset_0_1px_0_rgba(255,42,42,.2)]' 
                        : 'bg-gradient-to-br from-red-900/20 via-black/80 to-red-900/20 border border-red-500/30 hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(255,42,42,.1)]'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <span className="px-3 py-1 text-xs font-black uppercase bg-[var(--brand-red)] text-black rounded-md shadow-lg whitespace-nowrap">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="p-6 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-[var(--brand-red)]/20 border border-[var(--brand-red)]/30">
                          <plan.icon className="w-6 h-6 text-[var(--brand-red)]" />
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
                      
                      {/* Usage Limits */}
                      <div className="flex-1">
                        <div className="mb-6">
                          <h4 className="text-white/90 font-semibold text-xs mb-3 uppercase tracking-wide">Usage Limits</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-white/70 text-xs">Brands</span>
                              <span className="text-white font-semibold text-xs">{plan.brands}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/70 text-xs">Lead Generation</span>
                              <span className={`font-semibold text-xs ${plan.leadGen === 0 ? "text-white/50" : "text-white"}`}>
                                {plan.leadGen === 0 ? "None" : `${plan.leadGen}/month`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/70 text-xs">Outreach Emails</span>
                              <span className={`font-semibold text-xs ${plan.outreach === 0 ? "text-white/50" : "text-white"}`}>
                                {plan.outreach === 0 ? "None" : `${plan.outreach}/month`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/70 text-xs">AI Chatbot</span>
                              <span className="text-white font-semibold text-xs">{plan.aiChats}/day</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/70 text-xs">Creative Generation</span>
                              <span className="text-white font-semibold text-xs">{plan.creativeGen}/month</span>
                            </div>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="mb-4">
                          <h4 className="text-white/90 font-semibold text-xs mb-3 uppercase tracking-wide">✓ Included Features</h4>
                          <div className="space-y-1">
                            {plan.features.map((feature: string, i: number) => (
                              <div key={i} className="flex items-center">
                                <Check className="w-3 h-3 mr-2 flex-shrink-0 text-[var(--brand-red)]" />
                                <span className="text-white/75 text-xs">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Limitations */}
                        {plan.limitations.length > 0 && (
                          <div className="mb-4">
                            <div className="space-y-1">
                              {plan.limitations.map((limitation: string, i: number) => (
                                <div key={i} className="flex items-center">
                                  <X className="w-3 h-3 mr-2 flex-shrink-0 text-white/40" />
                                  <span className="text-white/50 text-xs">{limitation}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* White Label Badge */}
                        {plan.whiteLabel && (
                          <div className="text-center mb-4">
                            <span className="bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 text-[var(--brand-red)] px-3 py-1 rounded-full text-xs font-medium">
                              White-Label Ready
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Button aligned at bottom */}
                      <div className="mt-auto pt-4">
                        <Link href="/login">
                          <Button className={`w-full h-10 text-sm font-bold ${
                            plan.popular 
                              ? 'bg-[var(--brand-red)] text-black hover:brightness-110 shadow-[0_4px_0_rgba(0,0,0,.4)] hover:shadow-[0_2px_0_rgba(0,0,0,.4)] hover:translate-y-[2px] transition-all' 
                              : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
                          }`}>
                            Get Started
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contact Sales */}
              <div className="mt-16 text-center">
                <div className="bg-gradient-to-br from-[var(--brand-red)]/10 via-[var(--brand-red)]/5 to-transparent border border-[var(--brand-red)]/20 rounded-2xl p-8 max-w-md mx-auto">
                  <h3 className="text-2xl font-bold mb-4 text-white">Need More Than 25 Brands?</h3>
                  <p className="text-white/70 mb-6">
                    Custom enterprise solutions for large-scale operations with unlimited brands and dedicated support.
                  </p>
                  <Link href="/join-agency">
                    <Button className="bg-[var(--brand-red)] text-black hover:brightness-110 font-bold px-8 py-3 shadow-[0_4px_0_rgba(0,0,0,.4)] hover:shadow-[0_2px_0_rgba(0,0,0,.4)] hover:translate-y-[2px] transition-all">
                      Contact Sales
                    </Button>
                  </Link>
                </div>
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
                READY TO <span className="relative inline-block">
                  <span className="text-white font-black relative z-10">SCALE</span>
                  <div className="absolute -bottom-1 left-0 right-0 h-2 bg-[var(--brand-red)] -z-10"></div>
                </span><br />
                <span className="text-transparent bg-clip-text bg-[linear-gradient(90deg,#fff,rgba(255,255,255,.5))]">LIKE A PRO?</span>
              </h2>
              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10 font-mono">
                Join the growing community of brand scalers who have transformed their businesses with our platform. Start scaling today and see the difference professional tools make.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
                <Button 
                  onClick={scrollToPricing}
                  className="bg-[var(--brand-red)] text-black hover:brightness-110 font-black shadow-[0_10px_0_rgba(0,0,0,.6)] px-6 py-6 text-base"
                >
                  Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
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
              <img src="https://i.imgur.com/j4AQPxj.png" alt="Brez Marketing" className="h-8 w-auto mx-auto mb-6" />
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
