"use client"

import React, { useState, useEffect } from "react"
import { X, Zap, Shield, Users, User, BarChart3, TrendingUp, TrendingDown, Rocket, Brain, Palette, Send, FileText, Settings, Globe, MessageSquare, ChevronDown, ChevronUp, ArrowRight, Check, Target, Building2, Monitor, Filter, Cog, Star, Quote, Phone, Mail, Instagram, Facebook, Twitter, Award, Clock, DollarSign, Activity, Search, PieChart, Bot, Heart, Sparkles, Layers, Zap as ZapIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

const BRAND_RED = "#ff2a2a"
const BRAND_DARK = "#0a0a0a"
const BRAND_DARKER = "#1a1a1a"

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
    red: "bg-[#ff2a2a] text-black",
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
        <div className="w-24 h-[6px] bg-[#ff2a2a] shadow-[0_0_24px_rgba(255,42,42,.8)] rounded-full" />
      </div>
    </div>
  )
}

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      {/* Neural network grid */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <pattern id="neural-grid" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1" fill="#ff2a2a" opacity="0.3" />
              <line x1="25" y1="25" x2="50" y2="25" stroke="#ff2a2a" strokeWidth="0.5" opacity="0.2" />
              <line x1="25" y1="25" x2="25" y2="50" stroke="#ff2a2a" strokeWidth="0.5" opacity="0.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural-grid)" />
        </svg>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#ff2a2a] rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}

function HeroSection() {
  const [currentWord, setCurrentWord] = useState(0)
  const words = ["Clicks", "Leads", "Revenue"]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact')
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-6xl mx-auto text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 font-oswald">
            TLUCA <span className="text-[#ff2a2a]">SYSTEMS</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/70 font-mono">
            Systems That Scale.
          </p>
        </div>

        {/* Main Headline */}
        <div className="mb-8">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 font-oswald leading-tight">
            TURN <span className="relative inline-block">
              <span className="text-white font-black relative z-10">{words[currentWord]}</span>
              <div className="absolute -bottom-2 left-0 right-0 h-3 bg-[#ff2a2a] -z-10 transform transition-all duration-500" />
            </span> INTO CLIENTS
          </h2>
          <p className="text-xl md:text-2xl text-white/70 max-w-4xl mx-auto leading-relaxed font-mono">
            We build systems that attract, convert, and manage leads — all in one place.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mb-12">
          <Button
            onClick={scrollToContact}
            className="bg-[#ff2a2a] text-black hover:brightness-110 font-black shadow-[0_10px_0_rgba(0,0,0,.6)] px-8 py-6 text-lg transition-all duration-300 hover:scale-105"
          >
            Get Started <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto text-white/60">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="text-sm">Enterprise Security</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="text-sm">Lightning Fast</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Award className="w-5 h-5" />
            <span className="text-sm">Proven Results</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function ServicesSection() {
  const services = [
    {
      icon: Monitor,
      title: "Website Design & Development",
      desc: "Responsive, SEO-optimized sites that convert. High-performance landing pages, e-commerce stores, and lead capture systems.",
      features: ["Mobile-First Design", "SEO Optimization", "Conversion Focused", "Fast Loading"]
    },
    {
      icon: Filter,
      title: "Lead Generation Systems",
      desc: "Complete funnel automation with forms, CRM integration, and intelligent lead scoring. Turn visitors into qualified prospects.",
      features: ["Smart Lead Forms", "CRM Integration", "Lead Scoring", "Automated Follow-up"]
    },
    {
      icon: Cog,
      title: "Business Systems Management",
      desc: "Centralized dashboards, AI chat support, and performance tracking. Everything you need to manage and scale your business.",
      features: ["Unified Dashboard", "AI Chat Widgets", "Performance Analytics", "Team Collaboration"]
    }
  ]

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="What We Do"
          title="COMPLETE BUSINESS SYSTEMS"
          sub="From lead capture to client management — we build the entire ecosystem your business needs to scale."
        />

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-8 border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015))] hover:border-white/30 transition-all duration-500 hover:scale-105"
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(500px_200px_at_50%_-10%,rgba(255,42,42,.14),transparent)]" />

              <div className="relative z-10">
                <div className="p-4 bg-[#ff2a2a]/20 border border-[#ff2a2a]/30 rounded-lg w-fit mb-6">
                  <service.icon className="w-8 h-8 text-[#ff2a2a]" />
                </div>

                <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                <p className="text-white/75 mb-6 font-mono">{service.desc}</p>

                <div className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-[#ff2a2a] flex-shrink-0" />
                      <span className="text-white/70 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AddOnsSection() {
  const addons = [
    { icon: Globe, name: "Google Ads & Meta Ads Setup", desc: "Complete campaign setup and optimization" },
    { icon: Mail, name: "Automated Email + SMS Marketing", desc: "Multi-channel marketing automation" },
    { icon: Bot, name: "AI Lead Chatbot", desc: "24/7 intelligent lead engagement" },
    { icon: Palette, name: "Branding & Graphic Design", desc: "Professional brand identity design" },
    { icon: Settings, name: "GHL Automation Setup", desc: "GoHighLevel CRM integration" },
    { icon: BarChart3, name: "Advanced Analytics", desc: "Deep performance insights" }
  ]

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Premium Add-Ons"
          title="SCALE WITH POWERFUL UPSELLS"
          sub="Optional services to supercharge your business systems and maximize ROI."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addons.map((addon, i) => (
            <div
              key={i}
              className="group relative rounded-xl p-6 border border-white/10 bg-black/40 hover:border-[#ff2a2a]/30 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-[#ff2a2a]/20 border border-[#ff2a2a]/30 rounded-lg flex-shrink-0">
                  <addon.icon className="w-5 h-5 text-[#ff2a2a]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-2">{addon.name}</h4>
                  <p className="text-white/70 text-sm font-mono">{addon.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PortfolioSection() {
  const projects = [
    { title: "E-commerce Store", category: "Website + CRM", image: "/api/placeholder/400/300" },
    { title: "Lead Gen Funnel", category: "Funnel + Automation", image: "/api/placeholder/400/300" },
    { title: "Business Dashboard", category: "Custom System", image: "/api/placeholder/400/300" }
  ]

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Our Work"
          title="CLIENT SUCCESS STORIES"
          sub="Real businesses we've helped scale with our systems."
        />

        <div className="grid md:grid-cols-3 gap-8">
          {projects.map((project, i) => (
            <div
              key={i}
              className="group relative rounded-xl overflow-hidden border border-white/10 hover:border-[#ff2a2a]/30 transition-all duration-500 hover:scale-105"
            >
              <div className="aspect-video bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] relative overflow-hidden">
                {/* Placeholder for project image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Monitor className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50 text-sm">{project.title}</p>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="text-center">
                    <h4 className="text-xl font-bold mb-2">{project.title}</h4>
                    <p className="text-[#ff2a2a] font-semibold">{project.category}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const testimonials = [
    {
      quote: "TLUCA Systems transformed our lead generation. We went from 5 leads/month to 150+ in just 60 days.",
      author: "Sarah Johnson",
      role: "CEO, Tech Startup",
      rating: 5
    },
    {
      quote: "The automated systems they built saved us 20 hours per week. Best investment we've made.",
      author: "Mike Chen",
      role: "Marketing Director",
      rating: 5
    },
    {
      quote: "From website to CRM to marketing automation — everything works together perfectly.",
      author: "Lisa Rodriguez",
      role: "Business Owner",
      rating: 5
    }
  ]

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Client Love"
          title="WHAT OUR CLIENTS SAY"
          sub="Real results from real businesses we've helped scale."
        />

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="relative rounded-2xl p-8 border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015))]"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-[#ff2a2a] mb-6 opacity-50" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, idx) => (
                  <Star key={idx} className="w-4 h-4 fill-[#ff2a2a] text-[#ff2a2a]" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-white/90 text-lg leading-relaxed mb-6 font-mono">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div>
                <p className="font-bold text-white">{testimonial.author}</p>
                <p className="text-white/60 text-sm">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const packages = [
    {
      name: "Starter",
      price: 997,
      desc: "Perfect for small businesses getting started",
      features: [
        "Custom Website Design",
        "Lead Capture Form",
        "Basic CRM Setup",
        "Mobile Optimization",
        "SEO Setup",
        "30 Days Support"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: 1497,
      desc: "Complete lead generation and automation",
      features: [
        "Everything in Starter +",
        "Complete Lead Funnel",
        "Email Marketing Setup",
        "CRM Automation",
        "Google Ads Setup",
        "Meta Ads Setup",
        "90 Days Support"
      ],
      popular: true
    },
    {
      name: "Elite",
      price: 2497,
      desc: "Enterprise-grade systems and support",
      features: [
        "Everything in Professional +",
        "AI Chatbot Integration",
        "Advanced Analytics Dashboard",
        "Team Training",
        "Priority Support",
        "Custom Integrations",
        "6 Months Support"
      ],
      popular: false
    }
  ]

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="CHOOSE YOUR SYSTEM"
          sub="Start small, scale big. All packages include our core systems with room to add premium features."
        />

        <div className="grid md:grid-cols-3 gap-8">
          {packages.map((pkg, i) => (
            <div
              key={i}
              className={`relative flex flex-col h-full rounded-2xl transition-all duration-300 group overflow-visible ${
                pkg.popular
                  ? 'border-[4px] border-[#ff2a2a]/60 shadow-[0_0_40px_rgba(255,42,42,.3)] scale-105'
                  : 'border-[3px] border-gray-600/40 hover:border-gray-500/60 hover:shadow-[0_0_30px_rgba(255,255,255,.05)]'
              }`}
              style={{
                backgroundImage: pkg.popular
                  ? `linear-gradient(rgba(255,42,42,0.02), rgba(0,0,0,0.96))`
                  : `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.85))`,
              }}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <span className="px-4 py-2 text-sm font-black uppercase bg-[#ff2a2a] text-black rounded-md shadow-lg whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8 flex flex-col h-full relative z-10">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                  <p className="text-white/70 text-sm mb-6 font-mono">{pkg.desc}</p>

                  <div className="mb-6">
                    <span className="text-5xl font-black text-white">${pkg.price}</span>
                    <span className="text-white/40 text-lg"> one-time</span>
                  </div>
                </div>

                <div className="flex-1 mb-8">
                  <div className="space-y-4">
                    {pkg.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-[#ff2a2a] flex-shrink-0" />
                        <span className="text-white/80">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  className={`w-full h-12 text-sm font-bold transition-all ${
                    pkg.popular
                      ? 'bg-[#ff2a2a] text-black hover:brightness-110 shadow-[0_4px_0_rgba(0,0,0,.4)] hover:shadow-[0_2px_0_rgba(0,0,0,.4)] hover:translate-y-[2px]'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
                  }`}
                >
                  Get Started
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-white/60 text-sm">
            Need something custom? <span className="text-[#ff2a2a] font-semibold">Contact us</span> for enterprise solutions.
          </p>
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact')
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl p-12 border border-[#ff2a2a]/30 bg-gradient-to-br from-[#ff2a2a]/10 to-transparent">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 font-oswald">
            READY TO <span className="text-[#ff2a2a]">SCALE</span><br />
            YOUR BUSINESS?
          </h2>
          <p className="text-xl text-white/80 mb-8 font-mono max-w-2xl mx-auto">
            Book your free consultation and discover how TLUCA Systems can transform your lead generation and client acquisition.
          </p>

          <Button
            onClick={scrollToContact}
            className="bg-[#ff2a2a] text-black hover:brightness-110 font-black shadow-[0_10px_0_rgba(0,0,0,.6)] px-8 py-6 text-lg transition-all duration-300 hover:scale-105"
          >
            Book Your Onboarding Call <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contact" className="py-20 sm:py-28 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Get Started"
          title="LET'S BUILD YOUR SYSTEM"
          sub="Ready to turn clicks into clients? Let's discuss your project and create a custom solution."
        />

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="rounded-2xl p-8 border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015))]">
            <h3 className="text-2xl font-bold mb-6">Start Your Project</h3>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-[#ff2a2a] focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-[#ff2a2a] focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Type</label>
                <select className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white focus:border-[#ff2a2a] focus:outline-none">
                  <option value="">Select your business type</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="service">Service Business</option>
                  <option value="consulting">Consulting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Project Details</label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-[#ff2a2a] focus:outline-none"
                  placeholder="Tell us about your current challenges and goals..."
                />
              </div>
              <Button className="w-full bg-[#ff2a2a] text-black hover:brightness-110 font-bold py-3">
                Send Message
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-6">Get In Touch</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#ff2a2a]/20 border border-[#ff2a2a]/30 rounded-lg">
                    <Phone className="w-5 h-5 text-[#ff2a2a]" />
                  </div>
                  <div>
                    <p className="font-semibold">Call Us</p>
                    <p className="text-white/70">(555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#ff2a2a]/20 border border-[#ff2a2a]/30 rounded-lg">
                    <Mail className="w-5 h-5 text-[#ff2a2a]" />
                  </div>
                  <div>
                    <p className="font-semibold">Email Us</p>
                    <p className="text-white/70">hello@tluca.systems</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <a href="#" className="p-3 bg-white/10 border border-white/20 rounded-lg hover:bg-[#ff2a2a]/20 hover:border-[#ff2a2a]/30 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="p-3 bg-white/10 border border-white/20 rounded-lg hover:bg-[#ff2a2a]/20 hover:border-[#ff2a2a]/30 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="p-3 bg-white/10 border border-white/20 rounded-lg hover:bg-[#ff2a2a]/20 hover:border-[#ff2a2a]/30 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 border-t border-white/10 bg-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold mb-4">TLUCA SYSTEMS</h3>
          <p className="text-white/60 text-sm font-mono">
            Systems That Scale. © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 flex-wrap text-sm">
          <a href="#contact" className="text-white/60 hover:text-[#ff2a2a] transition-colors">Contact</a>
          <span className="text-white/40">•</span>
          <a href="#" className="text-white/60 hover:text-[#ff2a2a] transition-colors">Privacy</a>
          <span className="text-white/40">•</span>
          <a href="#" className="text-white/60 hover:text-[#ff2a2a] transition-colors">Terms</a>
          <span className="text-white/40">•</span>
          <a href="#" className="text-white/60 hover:text-[#ff2a2a] transition-colors">Support</a>
        </div>
      </div>
    </footer>
  )
}

export default function TLUCALandingPage() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=Oswald:wght@600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      <div
        className="min-h-screen text-white overflow-x-hidden scroll-smooth"
        style={{
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND_DARKER} 100%)`
        }}
      >
        <AnimatedBackground />

        <div className="relative z-10">
          <HeroSection />
          <ServicesSection />
          <AddOnsSection />
          <PortfolioSection />
          <TestimonialsSection />
          <PricingSection />
          <CTASection />
          <ContactSection />
          <Footer />
        </div>
      </div>

      <style>{`
        .font-oswald { font-family: Oswald, Inter, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

        /* Custom red text selection */
        ::selection {
          background-color: #ff2a2a;
          color: #ffffff;
        }
        ::-moz-selection {
          background-color: #ff2a2a;
          color: #ffffff;
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Animations */
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }

        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.8s ease-out forwards; }

        /* Intersection observer for scroll animations */
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.6s ease-out;
        }

        .animate-on-scroll.animate {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </>
  )
}
