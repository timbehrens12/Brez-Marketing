"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
  ArrowRight, Phone, MessageSquare, Zap, Target, Users, 
  TrendingUp, Shield, MousePointer, Play, X, Check, 
  BarChart3, Globe, Smartphone, Bot, DollarSign, Activity, Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

// --- Utilities ---
const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY })
    }
    window.addEventListener('mousemove', updateMousePosition)
    return () => window.removeEventListener('mousemove', updateMousePosition)
  }, [])
  return mousePosition
}

// --- Components ---

function LiveTicker() {
  const events = [
    "New Lead: Roofing Quote ($12k)", 
    "Call Booked: Dental Cleaning", 
    "New Lead: HVAC Repair", 
    "Review: ⭐⭐⭐⭐⭐", 
    "New Lead: Legal Consult",
    "Call Booked: Spa Day"
  ]
  
  return (
    <div className="w-full bg-indigo-600 overflow-hidden py-2 flex relative z-20">
      <div className="animate-marquee whitespace-nowrap flex gap-8 items-center">
        {[...events, ...events, ...events].map((evt, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {evt}
          </div>
        ))}
      </div>
    </div>
  )
}

function MouseFollower() {
  const { x, y } = useMousePosition()
  return (
    <div 
      className="fixed pointer-events-none z-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] transition-transform duration-75 ease-out"
      style={{ 
        left: -300, 
        top: -300,
        transform: `translate(${x}px, ${y}px)` 
      }}
    />
  )
}

function CRMSimulator() {
  const [status, setStatus] = useState<'idle' | 'calling' | 'missed' | 'responded'>('idle')
  const [messages, setMessages] = useState<string[]>([])

  const startDemo = () => {
    if (status !== 'idle') return
    setStatus('calling')
    setMessages([])
    
    // Simulate sequence
    setTimeout(() => setStatus('missed'), 2500)
    setTimeout(() => {
      setStatus('responded')
      setMessages(["Sorry I missed you! How can we help?", "I need a quote for a project."])
    }, 3500)
    setTimeout(() => {
      setMessages(prev => [...prev, "Great! Click here to book a quick call: [Link]"])
    }, 5000)
    setTimeout(() => setStatus('idle'), 8000)
  }

  return (
    <div className="relative w-full max-w-[320px] mx-auto bg-gray-900 rounded-[3rem] border-8 border-gray-800 shadow-2xl overflow-hidden h-[600px]">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl z-20"></div>
      
      {/* Screen Content */}
      <div className="h-full w-full bg-black relative flex flex-col">
        {/* Status Bar */}
        <div className="flex justify-between px-6 pt-3 text-xs text-white/50">
          <span>9:41</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-white/50 rounded-full" />
            <div className="w-3 h-3 bg-white/50 rounded-full" />
          </div>
        </div>

        {status === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl mb-4 flex items-center justify-center">
              <Phone className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-500 mb-6">See what happens when you miss a customer call.</p>
            <Button onClick={startDemo} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full w-full py-6">
              Simulate Missed Call
            </Button>
          </div>
        )}

        {status === 'calling' && (
          <div className="flex-1 flex flex-col items-center pt-20 bg-gray-900/50 backdrop-blur-sm">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <span className="text-3xl font-bold text-white">JD</span>
            </div>
            <h3 className="text-2xl text-white font-medium mb-1">John Doe</h3>
            <p className="text-gray-400">Incoming Call...</p>
            <div className="mt-auto mb-20 w-full px-8 flex justify-between">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                <Phone className="rotate-[135deg] text-white" />
              </div>
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                <Phone className="text-white" />
              </div>
            </div>
          </div>
        )}

        {(status === 'missed' || status === 'responded') && (
          <div className="flex-1 flex flex-col bg-black relative">
             <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs text-white">JD</div>
                <div className="text-white text-sm font-medium">John Doe</div>
             </div>
             <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                <div className="flex justify-center">
                  <span className="text-[10px] text-gray-600 uppercase tracking-wide">Today 9:41 AM</span>
                </div>
                
                {/* The Missed Call Notification in Chat */}
                <div className="flex items-center gap-2 text-xs text-red-500 justify-center my-4 bg-red-500/10 py-2 rounded-lg">
                   <Phone className="w-3 h-3" /> Missed Call from John Doe
                </div>

                {status === 'responded' && (
                   <>
                      <div className="flex justify-end">
                         <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[80%] animate-in slide-in-from-right fade-in duration-300">
                            {messages[0]}
                         </div>
                      </div>
                      {messages[1] && (
                         <div className="flex justify-start">
                            <div className="bg-gray-800 text-gray-200 px-4 py-2 rounded-2xl rounded-tl-sm text-sm max-w-[80%] animate-in slide-in-from-left fade-in duration-300">
                               {messages[1]}
                            </div>
                         </div>
                      )}
                      {messages[2] && (
                        <div className="flex justify-end">
                         <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[80%] animate-in slide-in-from-right fade-in duration-300">
                            Great! Click here to book: <span className="underline text-blue-200">cal.com/book</span>
                         </div>
                      </div>
                      )}
                   </>
                )}
                
                {status === 'missed' && (
                   <div className="flex gap-1 justify-end">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                   </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ROICalculator() {
  const [adSpend, setAdSpend] = useState(1500)
  const [avgSale, setAvgSale] = useState(500)
  const [closeRate, setCloseRate] = useState(20)

  // Simple logic: 
  // $1500 spend -> ~30 leads (avg $50/lead) -> 20% close -> 6 sales * $500 = $3000
  const leads = Math.floor(adSpend / 50)
  const sales = Math.floor(leads * (closeRate / 100))
  const revenue = sales * avgSale
  const roi = Math.floor(((revenue - adSpend) / adSpend) * 100)

  return (
    <div className="w-full bg-black/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div>
            <div className="flex justify-between text-white mb-4">
              <label>Monthly Ad Spend</label>
              <span className="font-mono text-indigo-400">${adSpend}</span>
            </div>
            <input 
              type="range" min="500" max="10000" step="100" 
              value={adSpend} onChange={(e) => setAdSpend(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-white mb-4">
              <label>Average Customer Value</label>
              <span className="font-mono text-indigo-400">${avgSale}</span>
            </div>
            <input 
              type="range" min="100" max="5000" step="50" 
              value={avgSale} onChange={(e) => setAvgSale(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-white mb-4">
              <label>Close Rate</label>
              <span className="font-mono text-indigo-400">{closeRate}%</span>
            </div>
            <input 
              type="range" min="5" max="100" step="5" 
              value={closeRate} onChange={(e) => setCloseRate(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-8 flex flex-col justify-center items-center border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] z-0" />
          <div className="relative z-10 text-center">
            <p className="text-gray-400 mb-2">Projected Monthly Revenue</p>
            <div className="text-5xl md:text-6xl font-bold text-white mb-4 tabular-nums">
              ${revenue.toLocaleString()}
            </div>
            <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-1 rounded-full text-sm font-bold">
              <TrendingUp className="w-4 h-4" />
              {roi > 0 ? `+${roi}%` : `${roi}%`} ROI
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-6 text-center italic">
        *Estimates based on industry averages. Actual results vary by market and competition.
      </p>
    </div>
  )
}

function ServiceBento() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 h-auto md:h-[600px]">
      {/* Google Ads - Large */}
      <div className="col-span-1 md:col-span-2 row-span-1 md:row-span-2 group relative rounded-3xl bg-gray-900 border border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
          <div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
              <Search className="text-white" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">Google Ads Management</h3>
            <p className="text-gray-400 max-w-md">
              Capture high-intent customers the moment they search. We manage keywords, bids, and negatives daily.
            </p>
          </div>
          
          <div className="mt-8 space-y-2">
            <div className="flex items-center gap-3 text-sm text-gray-300">
               <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-500"><Check size={14} /></div>
               Search Intent Optimization
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
               <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-500"><Check size={14} /></div>
               Competitor Analysis
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
               <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-500"><Check size={14} /></div>
               Maximize ROI
            </div>
          </div>
        </div>
        
        {/* Decorative Graph */}
        <div className="absolute bottom-0 right-0 w-3/4 h-1/2 opacity-50 translate-y-12 translate-x-12">
          <div className="flex items-end gap-2 h-full">
            {[40, 60, 45, 70, 65, 85, 80, 95].map((h, i) => (
              <div key={i} 
                className="flex-1 bg-blue-500/30 rounded-t-sm transition-all duration-500 group-hover:bg-blue-500"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* LSA - Small */}
      <div className="col-span-1 row-span-1 group relative rounded-3xl bg-gray-900 border border-white/10 overflow-hidden p-8">
         <div className="absolute top-0 right-0 p-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
         <Shield className="w-10 h-10 text-green-400 mb-4" />
         <h3 className="text-xl font-bold text-white mb-2">Google Guaranteed</h3>
         <p className="text-sm text-gray-400">
           Earn the green badge of trust. Pay per lead, not per click. Top of search.
         </p>
      </div>

      {/* Meta Ads - Small */}
      <div className="col-span-1 row-span-1 group relative rounded-3xl bg-gray-900 border border-white/10 overflow-hidden p-8">
         <div className="absolute bottom-0 left-0 p-32 bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16" />
         <Users className="w-10 h-10 text-purple-400 mb-4" />
         <h3 className="text-xl font-bold text-white mb-2">Meta Targeting</h3>
         <p className="text-sm text-gray-400">
           Retargeting & demographic precision. Stop the scroll with visual creative.
         </p>
      </div>
    </div>
  )
}

export default function TLUCALandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      <MouseFollower />
      <LiveTicker />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold tracking-tighter flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="text-white w-5 h-5 fill-current" />
             </div>
             TLUCA
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
             <a href="#services" className="hover:text-white transition-colors">Services</a>
             <a href="#system" className="hover:text-white transition-colors">The System</a>
             <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <Button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-white text-black hover:bg-gray-200 rounded-full px-6 font-bold">
             Book Strategy
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="max-w-6xl mx-auto text-center z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-gray-300">ACCEPTING 3 NEW CLIENTS IN {new Date().toLocaleString('default', { month: 'long' }).toUpperCase()}</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9]">
            DOMINATE YOUR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-indigo-400 to-purple-600">
               LOCAL MARKET
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            We don't sell clicks. We build <span className="text-white font-bold">automated revenue engines</span> for local businesses that want to scale.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button 
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-16 px-10 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 hover:scale-105 transition-all duration-300 shadow-[0_0_50px_-12px_rgba(79,70,229,0.5)]"
            >
              Get Your Strategy Plan
              <ArrowRight className="ml-2" />
            </Button>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex -space-x-2">
                 {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-black" />
                 ))}
              </div>
              <p>Trusted by 50+ Owners</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div>
               <h2 className="text-4xl md:text-6xl font-bold mb-4">The Arsenal</h2>
               <p className="text-gray-400 max-w-md">Everything you need to capture attention and convert it into revenue.</p>
            </div>
            <div className="hidden md:block h-px flex-1 bg-gray-800 mx-12 mb-4" />
          </div>
          
          <ServiceBento />
        </div>
      </section>

      {/* The CRM System - Interactive */}
      <section id="system" className="py-32 px-6 bg-[#080808] border-y border-white/5 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
          <div className="order-2 lg:order-1">
             <CRMSimulator />
          </div>
          
          <div className="order-1 lg:order-2">
             <div className="inline-block p-3 bg-indigo-500/10 rounded-xl mb-6">
                <Bot className="w-8 h-8 text-indigo-400" />
             </div>
             <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
                The "Missed Call" <br />
                <span className="text-indigo-500">Revenue Saver</span>
             </h2>
             <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                62% of calls to local businesses go unanswered. Our AI system instantly texts them back, engages them, and books the appointment for you.
             </p>
             
             <div className="space-y-8">
                {[
                   { title: "Instant Text-Back", desc: "Never lose a lead to voicemail again." },
                   { title: "Unified Inbox", desc: "Manage texts, DMs, and emails in one stream." },
                   { title: "AI Booking Agent", desc: "Qualifies leads and books calendar slots 24/7." }
                ].map((item, i) => (
                   <div key={i} className="flex gap-6">
                      <div className="w-px h-full bg-gray-800 relative">
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rounded-full" />
                      </div>
                      <div>
                         <h4 className="text-xl font-bold text-white mb-2">{item.title}</h4>
                         <p className="text-gray-400">{item.desc}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-32 px-6 relative">
        <div className="max-w-5xl mx-auto">
           <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">Do The Math</h2>
              <p className="text-gray-400">See what a proper ad campaign could do for your bottom line.</p>
           </div>
           <ROICalculator />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
           <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                 <h2 className="text-4xl md:text-6xl font-bold mb-8">Simple Pricing.<br/>Serious Results.</h2>
                 <p className="text-xl text-gray-400 mb-12">
                    No hidden fees. No long-term contracts. Just a flat management fee and your ad spend.
                 </p>
                 <div className="flex flex-wrap gap-4">
                    <div className="px-6 py-3 rounded-full border border-white/10 bg-white/5 text-sm">Cancel Anytime</div>
                    <div className="px-6 py-3 rounded-full border border-white/10 bg-white/5 text-sm">Full Data Ownership</div>
                    <div className="px-6 py-3 rounded-full border border-white/10 bg-white/5 text-sm">Transparent Reports</div>
                 </div>
              </div>
              
              <div className="grid gap-6">
                 <Card className="bg-gray-900 border-white/10 p-8 hover:border-indigo-500/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <h3 className="text-2xl font-bold text-white">Management Fee</h3>
                          <p className="text-gray-400">Campaign optimization & CRM</p>
                       </div>
                       <div className="text-3xl font-bold text-indigo-400">$X/mo</div>
                    </div>
                    <ul className="space-y-3 text-gray-300 text-sm">
                       <li className="flex gap-2"><Check className="text-indigo-500 w-4 h-4" /> Unlimited Campaign Tweaks</li>
                       <li className="flex gap-2"><Check className="text-indigo-500 w-4 h-4" /> Bi-Weekly Creative Refresh</li>
                       <li className="flex gap-2"><Check className="text-indigo-500 w-4 h-4" /> Full CRM Access Included</li>
                    </ul>
                 </Card>
                 
                 <Card className="bg-gray-900 border-white/10 p-8 hover:border-green-500/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <h3 className="text-2xl font-bold text-white">Setup Fee</h3>
                          <p className="text-gray-400">One-time build out</p>
                       </div>
                       <div className="text-3xl font-bold text-white">$X</div>
                    </div>
                     <p className="text-sm text-gray-400">Includes pixel setup, tracking configuration, landing page design, and CRM integration.</p>
                 </Card>
              </div>
           </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/10" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
           <h2 className="text-5xl md:text-8xl font-bold mb-12 tracking-tighter">
              READY TO <br/> SCALE?
           </h2>
           <Button className="h-20 px-12 text-2xl rounded-full bg-white text-black hover:bg-gray-200 font-bold shadow-2xl hover:scale-105 transition-transform">
              Book Your Strategy Call
           </Button>
           <p className="mt-8 text-gray-500">No pressure. Just strategy.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 bg-black text-center md:text-left">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="text-gray-500 text-sm">
              © {new Date().getFullYear()} TLUCA Systems. All rights reserved.
           </div>
           <div className="flex gap-8 text-sm text-gray-500">
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Terms</Link>
           </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  )
}
