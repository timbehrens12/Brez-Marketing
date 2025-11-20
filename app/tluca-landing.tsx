"use client"

import React, { useState, useEffect, useRef } from "react"
import { ArrowRight, Check, Phone, Mail, Building2, Target, BarChart3, Globe, Shield, Zap, Award, Users, TrendingUp, Sparkles, Star, Quote, ChevronRight, Rocket, Code, Layers, Activity, Monitor, Database, Workflow, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  accent: "#ffffff",
  accentDim: "#808080"
}

function HeroSection() {
  const [scrollY, setScrollY] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 py-20 overflow-hidden"
      style={{ 
        background: `linear-gradient(180deg, ${COLORS.darker} 0%, ${COLORS.dark} 50%, ${COLORS.gray} 100%)`
      }}
    >
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Gradient orbs - very subtle */}
      <div 
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl opacity-5"
        style={{ 
          background: `radial-gradient(circle, ${COLORS.accent} 0%, transparent 70%)`,
          transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.15}px)`
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl opacity-5"
        style={{ 
          background: `radial-gradient(circle, ${COLORS.accentDim} 0%, transparent 70%)`,
          transform: `translate(${-scrollY * 0.1}px, ${-scrollY * 0.15}px)`
        }}
      />
      
      {/* Navigation */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold" style={{ color: COLORS.text }}>
            TLUCA
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#services" className="text-sm hover:text-white transition-colors" style={{ color: COLORS.textLight }}>Services</Link>
            <Link href="/#process" className="text-sm hover:text-white transition-colors" style={{ color: COLORS.textLight }}>Process</Link>
            <Link href="/about" className="text-sm hover:text-white transition-colors" style={{ color: COLORS.textLight }}>About</Link>
            <Link href="/#contact" className="text-sm hover:text-white transition-colors" style={{ color: COLORS.textLight }}>Contact</Link>
          </div>
          <Button
            size="sm"
            className="hidden md:inline-flex px-5 py-2.5 font-semibold rounded-lg"
            style={{ backgroundColor: COLORS.accent, color: COLORS.dark }}
            onClick={scrollToContact}
          >
            Get Started
          </Button>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        {/* Badge */}
        <div 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border mb-8 backdrop-blur-sm"
          style={{ 
            backgroundColor: `${COLORS.gray}80`, 
            borderColor: COLORS.grayBorder 
          }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.accent }}></div>
          <span className="text-sm font-medium" style={{ color: COLORS.textLight }}>
            Website as a Service Platform
          </span>
        </div>

        {/* Main Headline */}
        <h1 
          className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]"
          style={{ color: COLORS.text }}
        >
          Websites That<br />
          <span style={{ color: COLORS.accent }}>Convert & Scale</span>
        </h1>
        
        {/* Subheadline */}
        <p 
          className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed mb-12"
          style={{ color: COLORS.textLight }}
        >
          Complete website solutions built for service businesses. 
          From design to deployment, I handle everything so you can focus on your clients.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
          <Button
            onClick={scrollToContact}
            size="lg"
            className="group px-10 py-7 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: COLORS.accent, color: COLORS.dark }}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Link href="/onboarding">
            <Button
              size="lg"
              variant="outline"
              className="group px-10 py-7 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105"
              style={{ 
                borderColor: COLORS.grayBorder, 
                color: COLORS.text,
                backgroundColor: `${COLORS.gray}40`
              }}
            >
              Start Onboarding
              <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { value: "3 Weeks", label: "Average Build Time" },
            { value: "8.2%", label: "Avg Conversion Rate" },
            { value: "340%", label: "Revenue Growth" },
            { value: "24/7", label: "Support Included" }
          ].map((stat, i) => (
            <div 
              key={i} 
              className="p-6 rounded-xl border backdrop-blur-sm"
              style={{ 
                backgroundColor: `${COLORS.gray}60`, 
                borderColor: COLORS.grayBorder 
              }}
            >
              <div className="text-3xl font-bold mb-2" style={{ color: COLORS.accent }}>
                {stat.value}
              </div>
              <div className="text-sm" style={{ color: COLORS.textDark }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ServicesSection() {
  const services = [
    {
      icon: Monitor,
      title: "Custom Website Design",
      description: "Modern, responsive websites built with your brand in mind. Mobile-first design that converts visitors into customers.",
      features: ["Responsive Design", "SEO Optimized", "Fast Loading", "Conversion Focused"]
    },
    {
      icon: Database,
      title: "CRM Integration",
      description: "Seamless connection with your existing tools. Automate lead capture, follow-ups, and customer management.",
      features: ["Lead Capture", "Auto Follow-ups", "Pipeline Management", "Data Sync"]
    },
    {
      icon: Workflow,
      title: "Marketing Automation",
      description: "Set up automated email sequences, SMS campaigns, and lead nurturing workflows that work around the clock.",
      features: ["Email Sequences", "SMS Campaigns", "Lead Scoring", "Behavioral Triggers"]
    },
    {
      icon: BarChart3,
      title: "Analytics & Reporting",
      description: "Real-time dashboards showing your website performance, lead sources, and conversion metrics.",
      features: ["Live Dashboards", "Conversion Tracking", "Lead Analytics", "Custom Reports"]
    }
  ]

  return (
    <section id="services" className="py-32 px-6 lg:px-8" style={{ backgroundColor: COLORS.gray }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border mb-6"
            style={{ 
              backgroundColor: COLORS.dark, 
              borderColor: COLORS.grayBorder 
            }}
          >
            <Layers className="w-4 h-4" style={{ color: COLORS.textLight }} />
            <span className="text-sm font-medium" style={{ color: COLORS.textLight }}>
              What I Build
            </span>
          </div>
          <h2 
            className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
            style={{ color: COLORS.text }}
          >
            Complete Website Solutions
          </h2>
          <p 
            className="text-xl max-w-2xl mx-auto"
            style={{ color: COLORS.textLight }}
          >
            Everything you need to attract, convert, and manage clients—all in one platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service, i) => {
            const Icon = service.icon
            return (
              <Card
                key={i}
                className="group border hover:border-opacity-100 transition-all duration-300 overflow-hidden"
                style={{ 
                  backgroundColor: COLORS.dark, 
                  borderColor: COLORS.grayBorder 
                }}
              >
                <CardContent className="p-10">
                  <div className="flex items-start gap-6 mb-6">
                    <div 
                      className="p-4 rounded-xl group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: COLORS.gray }}
                    >
                      <Icon className="w-8 h-8" style={{ color: COLORS.text }} />
                    </div>
                    <div className="flex-1">
                      <h3 
                        className="text-2xl font-bold mb-3"
                        style={{ color: COLORS.text }}
                      >
                        {service.title}
                      </h3>
                      <p 
                        className="leading-relaxed mb-6"
                        style={{ color: COLORS.textLight }}
                      >
                        {service.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {service.features.map((feature, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-2"
                        style={{ color: COLORS.textDark }}
                      >
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.textLight }} />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ProcessSection() {
  const steps = [
    {
      number: "01",
      title: "Discovery & Planning",
      description: "I learn about your business, target audience, and goals to map out the perfect solution."
    },
    {
      number: "02",
      title: "Design & Development",
      description: "I build your website, set up integrations, and configure all automations to your specifications."
    },
    {
      number: "03",
      title: "Testing & Refinement",
      description: "I test every feature, optimize performance, and refine until everything works flawlessly."
    },
    {
      number: "04",
      title: "Launch & Support",
      description: "Go live with confidence. I provide training, documentation, and ongoing support as you grow."
    }
  ]

  return (
    <section id="process" className="py-32 px-6 lg:px-8 relative" style={{ backgroundColor: COLORS.dark }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border mb-6"
            style={{ 
              backgroundColor: COLORS.gray, 
              borderColor: COLORS.grayBorder 
            }}
          >
            <Clock className="w-4 h-4" style={{ color: COLORS.textLight }} />
            <span className="text-sm font-medium" style={{ color: COLORS.textLight }}>
              My Process
            </span>
          </div>
          <h2 
            className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
            style={{ color: COLORS.text }}
          >
            Simple, Streamlined Process
          </h2>
          <p 
            className="text-xl max-w-2xl mx-auto"
            style={{ color: COLORS.textLight }}
          >
            From initial consultation to launch, I handle everything. Typically 3-4 weeks from start to finish.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative group"
            >
              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div 
                  className="hidden lg:block absolute top-12 left-full w-full h-px -translate-x-1/2 z-0"
                  style={{ backgroundColor: COLORS.grayBorder }}
                />
              )}
              
              <Card
                className="border h-full transition-all duration-300 hover:scale-105"
                style={{ 
                  backgroundColor: COLORS.gray, 
                  borderColor: COLORS.grayBorder 
                }}
              >
                <CardContent className="p-8">
                  <div 
                    className="text-5xl font-bold mb-6 opacity-20"
                    style={{ color: COLORS.text }}
                  >
                    {step.number}
                  </div>
                  
                  <h3 
                    className="text-xl font-bold mb-3"
                    style={{ color: COLORS.text }}
                  >
                    {step.title}
                  </h3>
                  <p 
                    className="leading-relaxed"
                    style={{ color: COLORS.textLight }}
                  >
                    {step.description}
                  </p>
                </CardContent>
              </Card>
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
      quote: "TLUCA Systems built our entire website and CRM integration in 3 weeks. The automated lead system generates 50+ qualified leads per week. Best investment we've made.",
      author: "Sarah Mitchell",
      role: "CEO, Digital Marketing Agency",
      rating: 5
    },
    {
      quote: "We went from manually tracking everything to having a complete dashboard that shows us exactly what's working. Saved us 20+ hours per week.",
      author: "Marcus Johnson",
      role: "Founder, SaaS Startup",
      rating: 5
    },
    {
      quote: "The website converts at 8.2%—triple our old rate. Combined with their lead nurturing system, we've grown revenue by 340% in 6 months.",
      author: "Jennifer Chen",
      role: "Owner, E-commerce Brand",
      rating: 5
    }
  ]

  return (
    <section className="py-32 px-6 lg:px-8" style={{ backgroundColor: COLORS.gray }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border mb-6"
            style={{ 
              backgroundColor: COLORS.dark, 
              borderColor: COLORS.grayBorder 
            }}
          >
            <Star className="w-4 h-4 fill-current" style={{ color: COLORS.textLight }} />
            <span className="text-sm font-medium" style={{ color: COLORS.textLight }}>
              Client Results
            </span>
          </div>
          <h2 
            className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
            style={{ color: COLORS.text }}
          >
            Trusted by Growing Businesses
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <Card
              key={i}
              className="border"
              style={{ 
                backgroundColor: COLORS.dark, 
                borderColor: COLORS.grayBorder 
              }}
            >
              <CardContent className="p-8">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, idx) => (
                    <Star 
                      key={idx} 
                      className="w-4 h-4 fill-current" 
                      style={{ color: COLORS.textLight }} 
                    />
                  ))}
                </div>

                <Quote className="w-8 h-8 mb-4 opacity-30" style={{ color: COLORS.textLight }} />
                
                <p 
                  className="text-lg leading-relaxed mb-6"
                  style={{ color: COLORS.text }}
                >
                  "{testimonial.quote}"
                </p>

                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-full"
                    style={{ backgroundColor: COLORS.gray }}
                  />
                  <div>
                    <p className="font-bold" style={{ color: COLORS.text }}>
                      {testimonial.author}
                    </p>
                    <p className="text-sm" style={{ color: COLORS.textDark }}>
                      {testimonial.role}
                    </p>
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

function PricingSection() {
  return (
    <section className="py-32 px-6 lg:px-8" style={{ backgroundColor: COLORS.dark }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <div 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border mb-6"
            style={{ 
              backgroundColor: COLORS.gray, 
              borderColor: COLORS.grayBorder 
            }}
          >
            <Building2 className="w-4 h-4" style={{ color: COLORS.textLight }} />
            <span className="text-sm font-medium" style={{ color: COLORS.textLight }}>
              Investment
            </span>
          </div>
          <h2 
            className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
            style={{ color: COLORS.text }}
          >
            Custom Solutions, Transparent Pricing
          </h2>
          <p 
            className="text-xl max-w-2xl mx-auto"
            style={{ color: COLORS.textLight }}
          >
            Every business is unique. I build custom solutions based on your specific needs and budget.
          </p>
        </div>

        <Card 
          className="border overflow-hidden"
          style={{ 
            backgroundColor: COLORS.gray, 
            borderColor: COLORS.grayBorder 
          }}
        >
          <CardContent className="p-12">
            <div className="text-center mb-10">
              <div 
                className="text-6xl font-bold mb-4"
                style={{ color: COLORS.text }}
              >
                Custom Pricing
              </div>
              <p 
                className="text-xl"
                style={{ color: COLORS.textLight }}
              >
                Based on scope and requirements
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {[
                "Custom Website Design",
                "CRM Integration & Setup",
                "Lead Generation Systems",
                "Marketing Automation",
                "Analytics & Dashboards",
                "API Integrations",
                "Ongoing Support",
                "Team Training"
              ].map((feature, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3"
                  style={{ color: COLORS.textLight }}
                >
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.text }} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full px-8 py-7 text-lg font-semibold rounded-lg hover:scale-[1.02] transition-all duration-300"
              style={{ backgroundColor: COLORS.accent, color: COLORS.dark }}
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Get Your Custom Quote
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section 
      id="contact" 
      className="py-32 px-6 lg:px-8"
      style={{ backgroundColor: COLORS.gray }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 
            className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
            style={{ color: COLORS.text }}
          >
            Ready to Get Started?
          </h2>
          <p 
            className="text-xl"
            style={{ color: COLORS.textLight }}
          >
            Let's discuss your project and build something great for your business.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card 
            className="border group hover:scale-[1.02] transition-transform duration-300"
            style={{ 
              backgroundColor: COLORS.dark, 
              borderColor: COLORS.grayBorder 
            }}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: COLORS.gray }}
                >
                  <Phone className="w-6 h-6" style={{ color: COLORS.text }} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: COLORS.text }}>
                  Call Us
                </h3>
              </div>
              <a
                href="tel:832-561-4407"
                className="text-2xl font-bold hover:underline block"
                style={{ color: COLORS.text }}
              >
                832-561-4407
              </a>
            </CardContent>
          </Card>

          <Card 
            className="border group hover:scale-[1.02] transition-transform duration-300"
            style={{ 
              backgroundColor: COLORS.dark, 
              borderColor: COLORS.grayBorder 
            }}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: COLORS.gray }}
                >
                  <Mail className="w-6 h-6" style={{ color: COLORS.text }} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: COLORS.text }}>
                  Email Us
                </h3>
              </div>
              <a
                href="mailto:help@tlucasystems.com"
                className="text-xl font-bold hover:underline break-all block"
                style={{ color: COLORS.text }}
              >
                help@tlucasystems.com
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/onboarding">
            <Button
              size="lg"
              className="px-12 py-7 text-lg font-semibold rounded-lg hover:scale-105 transition-all duration-300"
              style={{ backgroundColor: COLORS.accent, color: COLORS.dark }}
            >
              Start Your Onboarding
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer 
      className="py-16 px-6 lg:px-8 border-t"
      style={{ 
        backgroundColor: COLORS.dark, 
        borderColor: COLORS.grayBorder 
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <h3 
              className="text-2xl font-bold mb-4"
              style={{ color: COLORS.text }}
            >
              TLUCA SYSTEMS
            </h3>
            <p className="text-lg mb-4" style={{ color: COLORS.textLight }}>
              Websites That Convert & Scale
            </p>
            <p style={{ color: COLORS.textDark }}>
              Complete website solutions built for service businesses.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4" style={{ color: COLORS.text }}>
              Quick Links
            </h4>
            <ul className="space-y-3" style={{ color: COLORS.textDark }}>
              <li>
                <Link href="/about" className="hover:underline">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:underline">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/onboarding" className="hover:underline">
                  Start Onboarding
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4" style={{ color: COLORS.text }}>
              Contact
            </h4>
            <ul className="space-y-3" style={{ color: COLORS.textDark }}>
              <li>
                <a href="tel:832-561-4407" className="hover:underline">
                  832-561-4407
                </a>
              </li>
              <li>
                <a href="mailto:tlucasystems@gmail.com" className="hover:underline break-all">
                  help@tlucasystems.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div 
          className="pt-8 border-t text-center"
          style={{ 
            borderColor: COLORS.grayBorder, 
            color: COLORS.textDark 
          }}
        >
          <p>© {new Date().getFullYear()} TLUCA Systems. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default function TLUCALandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.dark, color: COLORS.text }}>
      <HeroSection />
      <ServicesSection />
      <ProcessSection />
      <TestimonialsSection />
      <PricingSection />
      <ContactSection />
      <Footer />

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        * {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }
      `}</style>
    </div>
  )
}
