"use client"

import React, { useState } from "react"
import { ArrowRight, Check, Phone, Mail, Building2, Target, BarChart3, Globe, Shield, Zap, Award, Users, TrendingUp, Sparkles, Star, Quote, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

const COLORS = {
  black: "#000000",
  charcoal: "#0a0a0a",
  silver: "#e5e5e5",
  platinum: "#f5f5f5",
  steel: "#9ca3af"
}

function HeroSection() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 py-20" style={{ background: `linear-gradient(to bottom, ${COLORS.black}, ${COLORS.charcoal})` }}>
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, ${COLORS.silver} 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8" style={{ backgroundColor: COLORS.charcoal, borderColor: COLORS.steel + '30' }}>
          <Sparkles className="w-4 h-4" style={{ color: COLORS.silver }} />
          <span className="text-sm" style={{ color: COLORS.silver }}>Systems That Scale Your Business</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6" style={{ color: COLORS.platinum }}>
          Turn Visitors Into<br />
          <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Revenue-Generating</span> Clients
        </h1>
        
        <p className="text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed mb-12" style={{ color: COLORS.steel }}>
          We build complete business ecosystems: <span style={{ color: COLORS.platinum }}>high-converting websites</span>, 
          <span style={{ color: COLORS.platinum }}> automated CRM systems</span>, 
          <span style={{ color: COLORS.platinum }}> lead generation funnels</span>, and 
          <span style={{ color: COLORS.platinum }}> business dashboards</span> — all working together seamlessly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button
            onClick={scrollToContact}
            size="lg"
            className="px-8 py-6 text-lg font-semibold hover:scale-105 transition-all duration-300 shadow-xl"
            style={{ backgroundColor: COLORS.platinum, color: COLORS.black }}
          >
            Start Building <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Link href="/onboarding">
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-lg font-semibold hover:scale-105 transition-all duration-300"
              style={{ borderColor: COLORS.silver + '50', color: COLORS.platinum }}
            >
              View Onboarding <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { icon: Shield, label: "Enterprise Grade" },
            { icon: Zap, label: "Fast Deployment" },
            { icon: Award, label: "Proven Results" },
            { icon: Users, label: "Expert Team" }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-lg border" style={{ backgroundColor: COLORS.charcoal, borderColor: COLORS.steel + '20' }}>
              <item.icon className="w-6 h-6" style={{ color: COLORS.silver }} />
              <span className="text-sm font-medium" style={{ color: COLORS.steel }}>{item.label}</span>
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
      icon: Building2,
      title: "Custom Websites & Landing Pages",
      description: "Stunning, high-converting websites built with modern technology. Mobile-first, SEO-optimized, and designed to turn visitors into customers.",
      features: ["Responsive Design", "SEO Optimization", "Conversion Focused", "Lightning Fast"]
    },
    {
      icon: Target,
      title: "Lead Generation & CRM Systems",
      description: "Complete funnel automation with intelligent forms, CRM integration, lead scoring, and automated follow-ups that nurture prospects into clients.",
      features: ["Smart Lead Capture", "CRM Automation", "Email Sequences", "Lead Scoring"]
    },
    {
      icon: BarChart3,
      title: "Business Dashboards & Analytics",
      description: "Centralized command centers that give you real-time insights into your business performance, customer data, and team productivity.",
      features: ["Real-time Data", "Custom Metrics", "Team Collaboration", "Performance Tracking"]
    },
    {
      icon: Globe,
      title: "Marketing Automation",
      description: "Automated email campaigns, SMS marketing, social media integration, and multi-channel communication that runs on autopilot.",
      features: ["Email Automation", "SMS Campaigns", "Social Integration", "Workflow Builder"]
    }
  ]

  return (
    <section className="py-32 px-6 lg:px-8" style={{ backgroundColor: COLORS.charcoal }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6" style={{ backgroundColor: COLORS.black, borderColor: COLORS.steel + '30' }}>
            <TrendingUp className="w-4 h-4" style={{ color: COLORS.silver }} />
            <span className="text-sm" style={{ color: COLORS.silver }}>What We Build</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ color: COLORS.platinum }}>
            Complete Business<br />Ecosystems
          </h2>
          <p className="text-xl max-w-3xl mx-auto" style={{ color: COLORS.steel }}>
            We don't just build websites. We create entire systems that work together to attract, convert, and manage your clients automatically.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {services.map((service, i) => {
            const Icon = service.icon
            return (
              <Card
                key={i}
                className="group border hover:scale-[1.02] transition-all duration-300 overflow-hidden"
                style={{ backgroundColor: COLORS.black, borderColor: COLORS.steel + '30' }}
              >
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: COLORS.charcoal }}>
                      <Icon className="w-8 h-8" style={{ color: COLORS.platinum }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-3" style={{ color: COLORS.platinum }}>
                        {service.title}
                      </h3>
                      <p className="mb-6 leading-relaxed" style={{ color: COLORS.steel }}>
                        {service.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2" style={{ color: COLORS.steel }}>
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.silver }} />
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

function TestimonialsSection() {
  const testimonials = [
    {
      quote: "TLUCA Systems transformed our entire business. The automated lead system they built generates 50+ qualified leads per week on autopilot. ROI was positive within the first month.",
      author: "Sarah Mitchell",
      role: "CEO, Digital Marketing Agency",
      rating: 5
    },
    {
      quote: "We went from manually tracking everything in spreadsheets to having a complete dashboard that shows us exactly what's working. Their CRM integration saved us 20+ hours per week.",
      author: "Marcus Johnson",
      role: "Founder, SaaS Startup",
      rating: 5
    },
    {
      quote: "The website they built converts at 8.2% - triple our old rate. Combined with their lead nurturing system, we've grown revenue by 340% in 6 months. Best investment we've ever made.",
      author: "Jennifer Chen",
      role: "Owner, E-commerce Brand",
      rating: 5
    },
    {
      quote: "From design to deployment took just 3 weeks. The system handles lead capture, CRM updates, email sequences, and reporting automatically. It's like having a full marketing team.",
      author: "David Rodriguez",
      role: "Managing Partner, Consulting Firm",
      rating: 5
    }
  ]

  return (
    <section className="py-32 px-6 lg:px-8 relative overflow-hidden" style={{ backgroundColor: COLORS.black }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6" style={{ backgroundColor: COLORS.charcoal, borderColor: COLORS.steel + '30' }}>
            <Star className="w-4 h-4 fill-current" style={{ color: COLORS.silver }} />
            <span className="text-sm" style={{ color: COLORS.silver }}>Client Success</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ color: COLORS.platinum }}>
            Real Results from<br />Real Businesses
          </h2>
          <p className="text-xl max-w-3xl mx-auto" style={{ color: COLORS.steel }}>
            Don't just take our word for it. Here's what our clients say about working with us.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, i) => (
            <Card
              key={i}
              className="border relative overflow-hidden"
              style={{ backgroundColor: COLORS.charcoal, borderColor: COLORS.steel + '30' }}
            >
              <CardContent className="p-8">
                <Quote className="w-10 h-10 mb-6 opacity-30" style={{ color: COLORS.silver }} />
                
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-current" style={{ color: COLORS.silver }} />
                  ))}
                </div>

                <p className="text-lg leading-relaxed mb-6" style={{ color: COLORS.platinum }}>
                  "{testimonial.quote}"
                </p>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full" style={{ backgroundColor: COLORS.black }}></div>
                  <div>
                    <p className="font-bold" style={{ color: COLORS.platinum }}>{testimonial.author}</p>
                    <p className="text-sm" style={{ color: COLORS.steel }}>{testimonial.role}</p>
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
    <section className="py-32 px-6 lg:px-8" style={{ backgroundColor: COLORS.charcoal }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6" style={{ backgroundColor: COLORS.black, borderColor: COLORS.steel + '30' }}>
            <Building2 className="w-4 h-4" style={{ color: COLORS.silver }} />
            <span className="text-sm" style={{ color: COLORS.silver }}>Investment</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ color: COLORS.platinum }}>
            Custom Solutions<br />Tailored to You
          </h2>
          <p className="text-xl max-w-3xl mx-auto" style={{ color: COLORS.steel }}>
            Every business is unique. We build custom systems based on your specific needs, goals, and budget.
          </p>
        </div>

        <Card className="border overflow-hidden" style={{ backgroundColor: COLORS.black, borderColor: COLORS.steel + '30' }}>
          <CardContent className="p-12">
            <div className="text-center mb-10">
              <div className="text-7xl font-bold mb-4" style={{ color: COLORS.platinum }}>
                Custom
              </div>
              <p className="text-xl" style={{ color: COLORS.steel }}>
                Pricing based on scope and complexity
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {[
                "Website Design & Development",
                "Custom CRM Setup",
                "Lead Generation Systems",
                "Marketing Automation",
                "Business Dashboards",
                "API Integrations",
                "Ongoing Support",
                "Team Training"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3" style={{ color: COLORS.steel }}>
                  <Check className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.platinum }} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full px-8 py-6 text-lg font-semibold hover:scale-[1.02] transition-all duration-300"
              style={{ backgroundColor: COLORS.platinum, color: COLORS.black }}
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Get Your Custom Quote <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contact" className="py-32 px-6 lg:px-8" style={{ backgroundColor: COLORS.black }}>
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ color: COLORS.platinum }}>
            Ready to Build Your<br />Business System?
          </h2>
          <p className="text-xl" style={{ color: COLORS.steel }}>
            Let's discuss your project and create a solution that scales with you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border group hover:scale-[1.02] transition-transform duration-300" style={{ backgroundColor: COLORS.charcoal, borderColor: COLORS.steel + '30' }}>
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.black }}>
                  <Phone className="w-6 h-6" style={{ color: COLORS.platinum }} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: COLORS.platinum }}>Call Us</h3>
              </div>
              <a
                href="tel:832-561-4407"
                className="text-2xl font-bold hover:underline"
                style={{ color: COLORS.silver }}
              >
                832-561-4407
              </a>
            </CardContent>
          </Card>

          <Card className="border group hover:scale-[1.02] transition-transform duration-300" style={{ backgroundColor: COLORS.charcoal, borderColor: COLORS.steel + '30' }}>
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.black }}>
                  <Mail className="w-6 h-6" style={{ color: COLORS.platinum }} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: COLORS.platinum }}>Email Us</h3>
              </div>
              <a
                href="mailto:tlucasystems@gmail.com"
                className="text-2xl font-bold hover:underline break-all"
                style={{ color: COLORS.silver }}
              >
                tlucasystems@gmail.com
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/onboarding">
            <Button
              size="lg"
              className="px-12 py-6 text-lg font-semibold hover:scale-105 transition-all duration-300 shadow-2xl"
              style={{ backgroundColor: COLORS.platinum, color: COLORS.black }}
            >
              Start Your Onboarding <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-16 px-6 lg:px-8 border-t" style={{ backgroundColor: COLORS.charcoal, borderColor: COLORS.steel + '20' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold mb-4" style={{ color: COLORS.platinum }}>
              TLUCA SYSTEMS
            </h3>
            <p className="text-lg mb-4" style={{ color: COLORS.steel }}>
              Systems That Scale.
            </p>
            <p style={{ color: COLORS.steel }}>
              We build complete business ecosystems that turn visitors into revenue-generating clients.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4" style={{ color: COLORS.silver }}>Quick Links</h4>
            <ul className="space-y-3" style={{ color: COLORS.steel }}>
              <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:underline">Terms & Conditions</Link></li>
              <li><Link href="/onboarding" className="hover:underline">Start Onboarding</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4" style={{ color: COLORS.silver }}>Contact</h4>
            <ul className="space-y-3" style={{ color: COLORS.steel }}>
              <li><a href="tel:832-561-4407" className="hover:underline">832-561-4407</a></li>
              <li><a href="mailto:tlucasystems@gmail.com" className="hover:underline break-all">tlucasystems@gmail.com</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t text-center" style={{ borderColor: COLORS.steel + '20', color: COLORS.steel }}>
          <p>© {new Date().getFullYear()} TLUCA Systems. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default function TLUCALandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.black, color: COLORS.platinum }}>
      <HeroSection />
      <ServicesSection />
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

