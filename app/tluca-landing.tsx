"use client"

import React from "react"
import { ArrowRight, Check, Phone, Mail, Building2, Target, Users, BarChart3, Globe, Shield, Zap, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

// Professional color scheme - Black & Metallic White
const COLORS = {
  black: "#000000",
  charcoal: "#0a0a0a",
  silver: "#e5e5e5",
  platinum: "#f5f5f5",
  steel: "#9ca3af"
}

function HeroSection() {
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact')
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 py-20 bg-black">
      <div className="max-w-6xl mx-auto text-center">
        {/* Logo */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4" style={{ color: COLORS.platinum }}>
            TLUCA <span style={{ color: COLORS.silver }}>SYSTEMS</span>
          </h1>
          <p className="text-xl md:text-2xl" style={{ color: COLORS.steel }}>
            Systems That Scale.
          </p>
        </div>

        {/* Main Headline */}
        <div className="mb-12">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight" style={{ color: COLORS.platinum }}>
            Build Systems That Attract,<br />Convert, and Manage Leads
          </h2>
          <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: COLORS.steel }}>
            High-converting websites, lead generation funnels, and automated business systems — all in one place.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mb-16">
          <Button
            onClick={scrollToContact}
            size="lg"
            className="px-8 py-6 text-lg font-semibold hover:scale-105 transition-transform duration-200"
            style={{ backgroundColor: COLORS.platinum, color: COLORS.black }}
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto" style={{ color: COLORS.steel }}>
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="text-sm">Enterprise Security</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="text-sm">Fast Deployment</span>
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
      icon: Building2,
      title: "Website Design & Development",
      description: "Responsive, SEO-optimized websites built to convert visitors into customers.",
      features: ["Mobile-First Design", "SEO Optimization", "Conversion Focused", "Fast Loading"]
    },
    {
      icon: Target,
      title: "Lead Generation Systems",
      description: "Complete funnel automation with forms, CRM integration, and intelligent lead scoring.",
      features: ["Smart Lead Forms", "CRM Integration", "Lead Scoring", "Automated Follow-up"]
    },
    {
      icon: BarChart3,
      title: "Business Systems Management",
      description: "Centralized dashboards and performance tracking to manage and scale your business.",
      features: ["Unified Dashboard", "Performance Analytics", "Team Collaboration", "Real-time Insights"]
    }
  ]

  return (
    <section className="py-24 px-6 lg:px-8" style={{ backgroundColor: COLORS.charcoal }}>
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: COLORS.platinum }}>
            Complete Business Systems
          </h2>
          <p className="text-lg max-w-3xl mx-auto" style={{ color: COLORS.steel }}>
            From lead capture to client management — we build the entire ecosystem your business needs to scale.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, i) => {
            const Icon = service.icon
            return (
              <Card
                key={i}
                className="border hover:scale-[1.02] transition-transform duration-300"
                style={{ backgroundColor: COLORS.black, borderColor: COLORS.steel + '30' }}
              >
                <CardContent className="p-8">
                  <div className="mb-6">
                    <div className="inline-flex p-3 rounded-lg" style={{ backgroundColor: COLORS.charcoal }}>
                      <Icon className="w-8 h-8" style={{ color: COLORS.silver }} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4" style={{ color: COLORS.platinum }}>
                    {service.title}
                  </h3>
                  <p className="mb-6" style={{ color: COLORS.steel }}>
                    {service.description}
                  </p>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2" style={{ color: COLORS.steel }}>
                        <Check className="w-4 h-4" style={{ color: COLORS.silver }} />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  return (
    <section className="py-24 px-6 lg:px-8 bg-black">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: COLORS.platinum }}>
          Simple, Transparent Pricing
        </h2>
        <p className="text-lg mb-12" style={{ color: COLORS.steel }}>
          Custom solutions tailored to your business needs.
        </p>

        <Card className="border" style={{ backgroundColor: COLORS.charcoal, borderColor: COLORS.steel + '30' }}>
          <CardContent className="p-12">
            <div className="mb-8">
              <div className="text-6xl font-bold mb-2" style={{ color: COLORS.platinum }}>
                Custom
              </div>
              <p style={{ color: COLORS.steel }}>
                Pricing based on your specific requirements
              </p>
            </div>

            <ul className="space-y-4 mb-8 text-left max-w-md mx-auto">
              {[
                "Website Design & Development",
                "Lead Generation Systems",
                "CRM Integration",
                "Business Dashboards",
                "Ongoing Support & Maintenance"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3" style={{ color: COLORS.steel }}>
                  <Check className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.silver }} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              size="lg"
              className="w-full px-8 py-6 text-lg font-semibold"
              style={{ backgroundColor: COLORS.platinum, color: COLORS.black }}
              onClick={() => {
                const contactSection = document.getElementById('contact')
                if (contactSection) {
                  contactSection.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              Get a Quote <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contact" className="py-24 px-6 lg:px-8" style={{ backgroundColor: COLORS.charcoal }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: COLORS.platinum }}>
            Ready to Get Started?
          </h2>
          <p className="text-lg" style={{ color: COLORS.steel }}>
            Let's discuss how we can help scale your business.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border" style={{ backgroundColor: COLORS.black, borderColor: COLORS.steel + '30' }}>
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="w-6 h-6" style={{ color: COLORS.silver }} />
                <h3 className="text-xl font-bold" style={{ color: COLORS.platinum }}>Phone</h3>
              </div>
              <a
                href="tel:832-561-4407"
                className="text-lg hover:underline"
                style={{ color: COLORS.steel }}
              >
                832-561-4407
              </a>
            </CardContent>
          </Card>

          <Card className="border" style={{ backgroundColor: COLORS.black, borderColor: COLORS.steel + '30' }}>
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-6 h-6" style={{ color: COLORS.silver }} />
                <h3 className="text-xl font-bold" style={{ color: COLORS.platinum }}>Email</h3>
              </div>
              <a
                href="mailto:tbehrens121@gmail.com"
                className="text-lg hover:underline"
                style={{ color: COLORS.steel }}
              >
                tbehrens121@gmail.com
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link href="/onboarding">
            <Button
              size="lg"
              className="px-12 py-6 text-lg font-semibold hover:scale-105 transition-transform duration-200"
              style={{ backgroundColor: COLORS.platinum, color: COLORS.black }}
            >
              Start Onboarding <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 px-6 lg:px-8 border-t bg-black" style={{ borderColor: COLORS.steel + '20' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.platinum }}>
              TLUCA SYSTEMS
            </h3>
            <p style={{ color: COLORS.steel }}>
              Systems That Scale.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4" style={{ color: COLORS.silver }}>Quick Links</h4>
            <ul className="space-y-2" style={{ color: COLORS.steel }}>
              <li>
                <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:underline">Terms & Conditions</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4" style={{ color: COLORS.silver }}>Contact</h4>
            <ul className="space-y-2" style={{ color: COLORS.steel }}>
              <li>
                <a href="tel:832-561-4407" className="hover:underline">832-561-4407</a>
              </li>
              <li>
                <a href="mailto:tbehrens121@gmail.com" className="hover:underline">
                  tbehrens121@gmail.com
                </a>
              </li>
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

