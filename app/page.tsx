"use client"

import { Check, X, ArrowRight, Zap, Shield, Users, BarChart3, TrendingUp, Target, Rocket, Brain, Palette, Send, FileText, Settings, Globe, MessageSquare, ChevronDown, ChevronUp, Play, Award, Clock, DollarSign, Activity, Search, PieChart, Bot, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GridOverlay } from "@/components/GridOverlay"
import Link from "next/link"
import { useState } from "react"

export default function HomePage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [activePreview, setActivePreview] = useState('analytics')

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
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <div className="absolute inset-0 z-0">
          <GridOverlay />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[600px] bg-gray-600/10 rounded-full blur-3xl filter pointer-events-none opacity-40"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <img src="https://i.imgur.com/PZCtbwG.png" alt="Brez Marketing" className="h-10 w-auto"/>
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="outline" className="border-[#444] text-white hover:bg-[#2A2A2A] backdrop-blur-sm">Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left">
              <p className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6 text-sm font-medium text-gray-300">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                Professional Brand Scaling Infrastructure
              </p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter mb-6">
                Scaling Brands<br />
                <span className="bg-gradient-to-r from-gray-300 to-gray-500 text-transparent bg-clip-text">Has Never Been Easier</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-10">
                The complete AI-powered toolkit for freelance brand scalers. Real-time analytics, automated lead generation, and professional tools to scale brands to 7+ figures.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link href="/login">
                  <Button size="lg" className="bg-white text-black hover:bg-gray-100">Get Started <ArrowRight className="ml-2 h-5 w-5" /></Button>
                </Link>
                <Button size="lg" variant="outline" className="border-[#444] text-white hover:bg-[#2A2A2A] backdrop-blur-sm"><Play className="mr-2 h-5 w-5" /> Watch Demo</Button>
              </div>
            </div>
            
            <div className="relative h-[28rem]">
              <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl transform-gpu rotate-3 transition-all duration-500 hover:rotate-0 hover:scale-105 backdrop-blur-md"></div>
              <div className="absolute inset-0 bg-[#1A1A1A] border border-white/20 rounded-2xl p-6 transform-gpu -rotate-1 transition-all duration-500 hover:rotate-0 hover:scale-105 shadow-2xl shadow-gray-500/10 backdrop-blur-md flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-500">Included Features +</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 flex-shrink-0">
                    {dashboardPreviews.map(preview => (
                        <button key={preview.id} onMouseEnter={() => setActivePreview(preview.id)} className={`flex items-center justify-center gap-2 p-2 rounded-md transition-colors duration-200 ${activePreview === preview.id ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'}`}>
                            <preview.icon className={`w-4 h-4 transition-colors duration-200 ${activePreview === preview.id ? 'text-white' : 'text-gray-500'}`} />
                            <span className={`text-xs font-semibold hidden sm:inline transition-colors duration-200 ${activePreview === preview.id ? 'text-white' : 'text-gray-500'}`}>{preview.title}</span>
                        </button>
                    ))}
                </div>
                
                <div className="w-full flex-grow bg-white/5 rounded-lg p-4 flex items-center justify-center overflow-hidden">
                    {activePreview === 'analytics' && (
                        <svg viewBox="0 0 100 60" className="w-full h-full opacity-70">
                            <rect x="10" y="40" width="10" height="15" fill="#888" fillOpacity="0.3" className="animate-bar-grow" style={{animationDelay: '0s', transformOrigin: 'bottom'}} />
                            <rect x="25" y="25" width="10" height="30" fill="#888" fillOpacity="0.4" className="animate-bar-grow" style={{animationDelay: '0.2s', transformOrigin: 'bottom'}} />
                            <rect x="40" y="35" width="10" height="20" fill="#888" fillOpacity="0.5" className="animate-bar-grow" style={{animationDelay: '0.4s', transformOrigin: 'bottom'}} />
                            <rect x="55" y="20" width="10" height="35" fill="#888" fillOpacity="0.6" className="animate-bar-grow" style={{animationDelay: '0.6s', transformOrigin: 'bottom'}} />
                            <rect x="70" y="30" width="10" height="25" fill="#888" fillOpacity="0.5" className="animate-bar-grow" style={{animationDelay: '0.8s', transformOrigin: 'bottom'}} />
                            <rect x="85" y="15" width="10" height="40" fill="#888" fillOpacity="0.4" className="animate-bar-grow" style={{animationDelay: '1.0s', transformOrigin: 'bottom'}} />
                        </svg>
                    )}
                    {activePreview === 'teams' && (
                        <svg viewBox="0 0 100 60" className="w-full h-full opacity-60">
                            <circle cx="50" cy="30" r="8" fill="#888" fillOpacity="0.5" />
                            <circle cx="20" cy="15" r="5" fill="#888" fillOpacity="0.3" />
                            <circle cx="80" cy="15" r="5" fill="#888" fillOpacity="0.3" />
                            <circle cx="20" cy="45" r="5" fill="#888" fillOpacity="0.3" />
                            <circle cx="80" cy="45" r="5" fill="#888" fillOpacity="0.3" />
                            <line x1="20" y1="15" x2="50" y2="30" stroke="#888" strokeWidth="1" className="animate-draw-line-short" style={{animationDelay: '0s'}} />
                            <line x1="80" y1="15" x2="50" y2="30" stroke="#888" strokeWidth="1" className="animate-draw-line-short" style={{animationDelay: '0.8s'}}/>
                            <line x1="20" y1="45" x2="50" y2="30" stroke="#888" strokeWidth="1" className="animate-draw-line-short" style={{animationDelay: '1.6s'}}/>
                            <line x1="80" y1="45" x2="50" y2="30" stroke="#888" strokeWidth="1" className="animate-draw-line-short" style={{animationDelay: '2.4s'}}/>
                        </svg>
                    )}
                    {activePreview === 'leads' && (
                       <svg viewBox="0 0 100 60" className="w-full h-full opacity-60">
                            <g className="animate-magnify">
                                <circle cx="40" cy="25" r="12" stroke="#888" strokeWidth="2" fill="none" />
                                <line x1="48" y1="33" x2="55" y2="40" stroke="#888" strokeWidth="2" />
                            </g>
                            <rect x="20" y="10" width="60" height="40" fill="#888" fillOpacity="0.1" rx="2" />
                            <line x1="25" y1="20" x2="75" y2="20" stroke="#888" strokeOpacity="0.3" strokeWidth="2" />
                            <line x1="25" y1="30" x2="65" y2="30" stroke="#888" strokeOpacity="0.3" strokeWidth="2" />
                            <line x1="25" y1="40" x2="70" y2="40" stroke="#888" strokeOpacity="0.3" strokeWidth="2" />
                        </svg>
                    )}
                    {activePreview === 'creatives' && (
                        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-2">
                           <div className="bg-gray-500/40 rounded animate-fade-in" style={{animationDelay: '0s'}}></div>
                           <div className="bg-gray-500/40 rounded animate-fade-in" style={{animationDelay: '0.1s'}}></div>
                           <div className="bg-gray-500/40 rounded animate-fade-in" style={{animationDelay: '0.2s'}}></div>
                           <div className="bg-gray-500/40 rounded animate-fade-in" style={{animationDelay: '0.3s'}}></div>
                           <div className="bg-gray-500/40 rounded animate-fade-in" style={{animationDelay: '0.4s'}}></div>
                           <div className="bg-gray-500/40 rounded animate-fade-in" style={{animationDelay: '0.5s'}}></div>
                        </div>
                    )}
                    {activePreview === 'report' && (
                         <svg viewBox="0 0 100 60" className="w-full h-full opacity-60">
                            <rect x="10" y="5" width="80" height="50" rx="2" stroke="#888" strokeWidth="1" fill="#888" fillOpacity="0.1"/>
                            <g clipPath="url(#clipReport)">
                                <g className="animate-scroll-report">
                                    <rect x="15" y="10" width="40" height="4" fill="#888" fillOpacity="0.5"/>
                                    <rect x="15" y="20" width="70" height="2" fill="#888" fillOpacity="0.3"/>
                                    <rect x="15" y="25" width="70" height="2" fill="#888" fillOpacity="0.3"/>
                                    <rect x="15" y="30" width="60" height="2" fill="#888" fillOpacity="0.3"/>
                                    <rect x="15" y="40" width="70" height="2" fill="#888" fillOpacity="0.3"/>
                                    <rect x="15" y="45" width="70" height="2" fill="#888" fillOpacity="0.3"/>
                                    <rect x="15" y="50" width="55" height="2" fill="#888" fillOpacity="0.3"/>
                                    <rect x="15" y="60" width="70" height="2" fill="#888" fillOpacity="0.3"/>
                                    <rect x="15" y="65" width="70" height="2" fill="#888" fillOpacity="0.3"/>
                                    <rect x="15" y="70" width="65" height="2" fill="#888" fillOpacity="0.3"/>
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
                            <div className="w-3/4 bg-gray-500/20 rounded-lg p-2 animate-fade-in opacity-0" style={{animationDelay: '0.3s'}}>
                                <div className="w-full h-2 bg-gray-500/40 rounded"></div>
                            </div>
                            <div className="w-3/4 bg-gray-500/50 rounded-lg p-2 self-end flex items-center gap-1 animate-fade-in opacity-0" style={{animationDelay: '1.2s'}}>
                                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-typing" style={{animationDelay: '1.5s'}}></div>
                                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-typing" style={{animationDelay: '1.7s'}}></div>
                                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-typing" style={{animationDelay: '1.9s'}}></div>
                            </div>
                        </div>
                    )}
                    {activePreview === 'assistant' && (
                        <svg viewBox="0 0 100 60" className="w-full h-full opacity-80">
                            <path d="M 10 50 L 30 40 L 50 25 L 70 15 L 90 5" fill="none" stroke="#888" strokeWidth="1.5" className="animate-draw-profit-line" />
                            <g>
                                <circle cx="30" cy="40" r="3" fill="white" className="animate-ai-spark" style={{animationDelay: '0.5s'}} />
                                <circle cx="50" cy="25" r="3" fill="white" className="animate-ai-spark" style={{animationDelay: '1s'}} />
                                <circle cx="70" cy="15" r="3" fill="white" className="animate-ai-spark" style={{animationDelay: '1.5s'}} />
                            </g>
                            <text x="92" y="10" fontSize="10" fill="#888" className="animate-dollar-sign">$</text>
                        </svg>
                    )}
                    {activePreview === 'outreach' && (
                        <svg viewBox="0 0 100 60" className="w-full h-full opacity-60">
                           <g className="animate-send-mail">
                             <path d="M 10 20 L 10 50 L 90 50 L 90 20" stroke="#888" strokeWidth="2" fill="#888" fillOpacity="0.1" />
                             <path d="M 10 20 L 50 35 L 90 20" fill="none" stroke="#888" strokeWidth="2" />
                           </g>
                        </svg>
                    )}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Key Features Section */}
        <section className="py-24 sm:py-32">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">The Operating System for Brand Scalers</h2>
                    <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                        A unified platform to manage clients, analyze data, generate leads, and create winning ad creatives.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { icon: BarChart3, title: "Real-Time Analytics", desc: "Live Data" },
                        { icon: Brain, title: "AI Marketing Consultant", desc: "Custom AI we built" },
                        { icon: Zap, title: "Lead Generation", desc: "Automated Pipeline" },
                        { icon: Palette, title: "Creative Studio", desc: "Instant Creatives" },
                    ].map((feature, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 text-center group hover:bg-white/10 transition-all duration-300">
                             <div className="inline-block p-4 bg-gray-500/10 rounded-lg mb-4">
                                <feature.icon className="w-8 h-8 text-gray-400" />
                             </div>
                             <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                             <p className="text-gray-400">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Bento Grid Features Section */}
        <section className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Every Feature You Need</h2>
              <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                No hype, no exaggeration. Here's exactly what our platform includes.
              </p>
            </div>
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
                <div key={i} className="group relative bg-white/[.03] border border-white/10 rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:border-gray-500/50 hover:bg-white/5">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                        <feature.icon className="w-6 h-6 text-gray-400" />
                      </div>
                       {!feature.available && (
                         <span className="bg-orange-500/20 text-orange-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-orange-500/30">
                           Coming Soon
                         </span>
                       )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Choose Your Plan</h2>
              <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                Transparent pricing with everything included. No hidden fees, no surprises.
              </p>
            </div>
            <div className="grid lg:grid-cols-4 gap-8 items-start">
              {[
                { name: "Brand Owner", description: "Perfect for managing your own brand", price: 147, period: "month", popular: false, icon: "👤", features: ["1 Brand Connection", "Meta Ads + Shopify analytics", "10 AI consultant chats/day", "Basic lead generation", "Email support", "90-day data retention"], limitations: ["No team features", "Basic reporting"] },
                { name: "Brand Scaler", description: "For scaling multiple brands", price: 347, period: "month", popular: true, icon: "🚀", features: ["Up to 10 brand connections", "Advanced Meta + Shopify analytics", "25 AI consultant chats/day", "Advanced lead generation & scraping", "White-label reporting", "Priority support", "Unlimited data retention", "Automated daily reports"], limitations: ["No team features"] },
                { name: "Agency Pro", description: "For agencies with teams", price: 647, period: "month", popular: false, icon: "⚡", features: ["Up to 25 brand connections", "Multi-platform analytics", "50 AI consultant chats/day", "Full outreach CRM & automation", "Team collaboration (5 users)", "Client portal access", "Advanced reporting & exports", "Custom dashboard widgets", "API access"], limitations: ["5 team member limit"] },
                { name: "Enterprise", description: "For large-scale operations", price: 997, period: "month", popular: false, icon: "👑", features: ["Unlimited brands & clients", "Everything in Agency Pro", "Unlimited team members", "Custom integrations", "Dedicated success manager", "Custom AI workflows", "White-label everything", "Priority enterprise support", "Advanced security features"], limitations: [] }
              ].map((plan) => (
                <div key={plan.name} className={`relative flex flex-col h-full rounded-2xl border transition-all duration-300 group ${plan.popular ? 'border-gray-400 bg-white/5 scale-105' : 'border-white/10 bg-[#141414] hover:border-white/20'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-700 text-white px-4 py-1 text-sm font-semibold rounded-full shadow-lg shadow-gray-700/20">Most Popular</div>
                  )}
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-gray-400 mb-6">{plan.description}</p>
                    <div className="mb-6">
                      <span className="text-5xl font-extrabold text-white">${plan.price}</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                    <Link href="/login">
                      <Button className={`w-full ${plan.popular ? 'bg-white text-black hover:bg-gray-100' : 'bg-white/10 text-white hover:bg-white/20'}`}>Choose Plan</Button>
                    </Link>
                  </div>
                  <div className="p-8 pt-0 flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mr-3 mt-1 flex-shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                     {plan.limitations.length > 0 && (
                       <div className="border-t border-white/10 mt-6 pt-6">
                         <div className="space-y-2">
                           {plan.limitations.map((limitation, i) => (
                             <div key={i} className="flex items-start">
                               <X className="w-4 h-4 text-red-500 mr-3 mt-1 flex-shrink-0" />
                               <span className="text-gray-500">{limitation}</span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 sm:py-32">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Frequently Asked Questions</h2>
               <p className="text-lg text-gray-400">Honest answers about what we offer and how it works.</p>
            </div>
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
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full text-left p-6 flex justify-between items-center hover:bg-white/5 transition-colors">
                    <span className="text-lg font-semibold text-white">{faq.q}</span>
                    {expandedFaq === i ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedFaq === i && (
                    <div className="px-6 pb-6 border-t border-white/10">
                      <p className="text-gray-400 pt-4 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 sm:py-32">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter mb-6">
                    Ready to Scale<br />
                    <span className="bg-gradient-to-r from-gray-300 to-gray-500 text-transparent bg-clip-text">Like a Pro?</span>
                </h2>
                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
                    Join the growing community of brand scalers who have transformed their businesses with our platform. Start your free trial today and see the difference professional tools make.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                    <Link href="/login">
                      <Button size="lg" className="bg-white text-black hover:bg-gray-100">Get Started Now <ArrowRight className="ml-2 h-5 w-5" /></Button>
                    </Link>
                    <Button size="lg" variant="outline" className="border-[#444] text-white hover:bg-[#2A2A2A] backdrop-blur-sm"><MessageSquare className="mr-2 h-5 w-5" /> Talk to Sales</Button>
                </div>
                 <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    <div className="flex items-center justify-center gap-3 text-gray-400"><Shield className="w-5 h-5 text-gray-400" /> SOC 2 Compliant</div>
                    <div className="flex items-center justify-center gap-3 text-gray-400"><Award className="w-5 h-5 text-gray-400" /> 99.9% Uptime</div>
                    <div className="flex items-center justify-center gap-3 text-gray-400"><Clock className="w-5 h-5 text-gray-400" /> 24/7 Support</div>
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <img src="https://i.imgur.com/PZCtbwG.png" alt="Brez Marketing" className="h-8 w-auto mx-auto mb-6"/>
                <p className="text-gray-500 text-sm">
                    © {new Date().getFullYear()} Brez Marketing. All rights reserved. <br />
                    Trusted by brand scalers worldwide • Cancel anytime
                </p>
            </div>
        </footer>
      </div>

      <style>{`
        @keyframes chart-bar-anim {
            0% { transform: scaleY(0.1); }
            50% { transform: scaleY(1); }
            100% { transform: scaleY(0.1); }
        }
        .animate-chart-bar {
            transform-origin: bottom;
            animation: chart-bar-anim 2s infinite ease-in-out;
            animation-delay: var(--animation-delay, 0s);
        }
        @keyframes draw-line {
            from { stroke-dashoffset: 200; }
            to { stroke-dashoffset: 0; }
        }
        .animate-draw-line {
            stroke-dasharray: 200;
            stroke-dashoffset: 200;
            animation: draw-line 2s ease-in-out infinite;
        }
         @keyframes draw-line-short {
            from { stroke-dashoffset: 50; }
            to { stroke-dashoffset: 0; }
        }
        .animate-draw-line-short {
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
            animation: draw-line-short 1.5s ease-in-out infinite;
        }
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
            animation-delay: var(--animation-delay, 0s);
        }
        @keyframes magnify {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(10px, -5px) scale(1.2); }
        }
        .animate-magnify {
            animation: magnify 3s ease-in-out infinite;
        }
        @keyframes typing {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
        }
        .animate-typing {
            animation: typing 1.2s ease-in-out infinite;
        }
        @keyframes scroll-report {
            from { transform: translateY(0); }
            to { transform: translateY(-20px); }
        }
        .animate-scroll-report {
            animation: scroll-report 3s ease-in-out infinite alternate;
        }
        @keyframes bar-grow {
            0%, 100% { transform: scaleY(0.2); }
            50% { transform: scaleY(1); }
        }
        .animate-bar-grow {
            animation: bar-grow 1.5s ease-in-out infinite;
        }
        @keyframes draw-short-path {
            from { stroke-dashoffset: 100; }
            to { stroke-dashoffset: 0; }
        }
        .animate-draw-short-path {
            stroke-dasharray: 100;
            animation: draw-short-path 2s ease-in-out infinite alternate;
        }
        @keyframes draw-profit-line {
            from { stroke-dashoffset: 200; }
            to { stroke-dashoffset: 0; }
        }
        .animate-draw-profit-line {
            stroke-dasharray: 200;
            animation: draw-profit-line 2s ease-out infinite;
        }
        @keyframes ai-spark {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.5; }
        }
        .animate-ai-spark {
            transform-origin: center;
            animation: ai-spark 1.5s ease-in-out infinite;
        }
        @keyframes dollar-sign-fade {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
        }
        .animate-dollar-sign {
            animation: dollar-sign-fade 2s ease-in-out infinite;
        }
        @keyframes pulse-node {
            0%, 100% { fill-opacity: 0.3; }
            50% { fill-opacity: 1; }
        }
        .animate-pulse-node {
            animation: pulse-node 2s infinite ease-in-out;
        }
        @keyframes pulse-node-center {
            0%, 100% { fill-opacity: 0.5; transform: scale(1); }
            50% { fill-opacity: 1; transform: scale(1.1); }
        }
        .animate-pulse-node-center {
            transform-origin: center;
            animation: pulse-node-center 2s infinite ease-in-out;
        }
        @keyframes draw-connection-anim {
            from { stroke-dashoffset: 40; }
            to { stroke-dashoffset: 0; }
        }
        .animate-draw-connection {
            stroke-dasharray: 40;
            stroke-dashoffset: 40;
            animation: draw-connection-anim 1s infinite alternate;
        }
        @keyframes send-mail-anim {
            0% { transform: translate(0, 0); opacity: 1; }
            50% { transform: translate(40px, -20px); opacity: 1; }
            100% { transform: translate(80px, -40px); opacity: 0; }
        }
        .animate-send-mail {
            animation: send-mail-anim 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
