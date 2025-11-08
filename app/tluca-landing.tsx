"use client"

import React, { useState, useEffect } from "react"
import { ArrowRight, Check, Phone, Mail, Zap, Globe, Sparkles, Star, ChevronRight, Play, Code2, Palette, Rocket, BarChart3, Shield, Clock, Users, TrendingUp, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

export default function TLUCALandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-slate-950/95 backdrop-blur-xl border-b border-purple-500/20 shadow-2xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">TLUCA</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-gray-300 hover:text-white transition-colors">Services</a>
            <a href="#process" className="text-gray-300 hover:text-white transition-colors">Process</a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
            <Link href="/onboarding">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Website as a Service Platform</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
              <span className="text-white">Build Your</span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                Digital Empire
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
              We don't just build websites. We create <span className="text-white font-semibold">complete digital ecosystems</span> that generate leads, close deals, and scale your business on autopilot.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link href="/onboarding">
                <Button size="lg" className="group px-8 py-6 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-2xl shadow-purple-500/50">
                  Start Building Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-purple-500/50 text-white hover:bg-purple-500/10">
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { value: "340%", label: "Revenue Growth" },
                { value: "50+", label: "Leads/Week" },
                { value: "8.2%", label: "Conversion Rate" },
                { value: "3 Weeks", label: "To Launch" }
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-sm">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight className="w-6 h-6 text-purple-400 rotate-90" />
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Everything You Need.<br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Nothing You Don't.</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              A complete digital infrastructure that works together seamlessly
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Code2,
                title: "Custom Websites",
                description: "Lightning-fast, conversion-optimized websites built with modern tech. Mobile-first, SEO-ready, and designed to convert.",
                features: ["Next.js & React", "SEO Optimized", "Mobile First", "Lightning Fast"],
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: Zap,
                title: "Marketing Automation",
                description: "Complete funnel automation with CRM integration, email sequences, and lead scoring that runs 24/7.",
                features: ["Lead Capture", "Email Automation", "CRM Integration", "Analytics"],
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: BarChart3,
                title: "Business Dashboards",
                description: "Real-time command centers showing everything that matters. Track performance, team activity, and revenue.",
                features: ["Real-time Data", "Custom Metrics", "Team Insights", "API Integrations"],
                color: "from-orange-500 to-red-500"
              }
            ].map((service, i) => (
              <Card key={i} className="group relative overflow-hidden bg-slate-900/50 border-purple-500/20 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                <CardContent className="p-8 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-6`}>
                    <service.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{service.title}</h3>
                  <p className="text-gray-400 mb-6 leading-relaxed">{service.description}</p>
                  <div className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-32 px-6 relative bg-gradient-to-b from-transparent via-purple-950/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              From Zero to Launch<br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">In 3 Weeks</span>
            </h2>
            <p className="text-xl text-gray-400">Our proven process gets you live fast</p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { icon: Rocket, title: "Discovery", desc: "We learn your business inside out", week: "Week 1" },
                { icon: Palette, title: "Design", desc: "Beautiful, conversion-focused designs", week: "Week 1-2" },
                { icon: Code2, title: "Build", desc: "Development & integration", week: "Week 2-3" },
                { icon: Globe, title: "Launch", desc: "Go live and start scaling", week: "Week 3" }
              ].map((step, i) => (
                <div key={i} className="relative">
                  <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-500/50 transition-all">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 mx-auto">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-purple-400 mb-2">{step.week}</div>
                      <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                      <p className="text-gray-400 text-sm">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Real Results.<br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Real Businesses.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                quote: "TLUCA built us a complete system in 3 weeks. We went from 5 leads/month to 50+ leads/week. ROI was positive in the first month.",
                author: "Sarah Chen",
                role: "CEO, Digital Agency",
                metric: "10x Lead Growth"
              },
              {
                quote: "The automation they built saves us 20+ hours per week. Our conversion rate tripled. Best investment we've ever made.",
                author: "Marcus Rodriguez",
                role: "Founder, SaaS Startup",
                metric: "3x Conversion Rate"
              },
              {
                quote: "From spreadsheets to a real-time dashboard. We can finally see what's working and scale what matters.",
                author: "Jennifer Wu",
                role: "Owner, E-commerce",
                metric: "340% Revenue Growth"
              },
              {
                quote: "They delivered everything on time and it actually works. The system handles everything automatically now.",
                author: "David Kim",
                role: "Managing Partner",
                metric: "100% Automated"
              }
            ].map((testimonial, i) => (
              <Card key={i} className="bg-slate-900/50 border-purple-500/20 backdrop-blur-sm hover:border-purple-500/50 transition-all">
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-purple-400 text-purple-400" />
                    ))}
                  </div>
                  <p className="text-lg text-gray-300 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{testimonial.author}</div>
                      <div className="text-sm text-gray-400">{testimonial.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {testimonial.metric}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 relative bg-gradient-to-b from-transparent via-purple-950/20 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Custom Solutions.<br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Transparent Pricing.</span>
            </h2>
            <p className="text-xl text-gray-400">Every business is unique. We build what you need.</p>
          </div>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-12">
              <div className="text-center mb-10">
                <div className="text-6xl font-black text-white mb-4">Custom</div>
                <p className="text-xl text-gray-300">Pricing based on your specific needs</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-10">
                {[
                  "Custom Website Design",
                  "CRM & Automation Setup",
                  "Lead Generation System",
                  "Business Dashboard",
                  "Email Marketing",
                  "API Integrations",
                  "Training & Support",
                  "Ongoing Optimization"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/onboarding">
                  <Button size="lg" className="px-8 py-6 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-2xl shadow-purple-500/50">
                    Start Your Project <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-purple-500/50 text-white hover:bg-purple-500/10">
                  <Phone className="mr-2 w-5 h-5" />
                  Schedule Call
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6">
            Ready to Build Your<br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Digital Empire?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Let's create a system that scales with you
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur-sm hover:border-purple-500/50 transition-all group cursor-pointer">
              <CardContent className="p-8">
                <Phone className="w-12 h-12 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-white mb-2">Call Us</h3>
                <a href="tel:832-561-4407" className="text-2xl font-bold text-purple-400 hover:text-purple-300">
                  832-561-4407
                </a>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur-sm hover:border-purple-500/50 transition-all group cursor-pointer">
              <CardContent className="p-8">
                <Mail className="w-12 h-12 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-white mb-2">Email Us</h3>
                <a href="mailto:tlucasystems@gmail.com" className="text-xl font-bold text-purple-400 hover:text-purple-300 break-all">
                  tlucasystems@gmail.com
                </a>
              </CardContent>
            </Card>
          </div>

          <Link href="/onboarding">
            <Button size="lg" className="px-12 py-6 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-2xl shadow-purple-500/50">
              Start Your Onboarding <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-purple-500/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">TLUCA SYSTEMS</span>
              </div>
              <p className="text-gray-400 mb-4">
                Building digital empires for ambitious businesses.
              </p>
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} TLUCA Systems. All rights reserved.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Quick Links</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
                <li><a href="#process" className="hover:text-white transition-colors">Process</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/onboarding" className="hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  )
}
