"use client"

import { Check, X, ArrowRight, Zap, Shield, Users, BarChart3, TrendingUp, Target, Rocket, Brain, Palette, Send, FileText, Settings, Globe, MessageSquare, ChevronDown, ChevronUp, Play, Award, Clock, DollarSign, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GridOverlay } from "@/components/GridOverlay"
import Link from "next/link"
import { useState } from "react"

export default function HomePage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#0A0A0A] relative overflow-x-hidden">
      {/* Full page grid overlay like dashboard */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <GridOverlay />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <img
            src="https://i.imgur.com/PZCtbwG.png"
            alt="Brez Marketing"
            className="h-12 w-auto"
          />
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-[#2A2A2A] text-white hover:bg-[#333] border border-[#444] shadow-lg">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 bg-[#1A1A1A] border border-[#333] rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-300">
                  Professional Brand Scaling Infrastructure
                </span>
              </div>

              <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold text-white leading-tight mb-8">
                Scale Brands
                <br />
                <span className="text-gray-300">
                  Like a Pro
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-16">
                The complete AI-powered toolkit for freelance brand scalers.
                Real-time analytics, automated lead generation, and professional
                tools to scale brands to 7+ figures.
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-6 mb-20">
                <Link href="/login">
                  <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-lg px-8 py-4 shadow-2xl">
                    Start Free 14-Day Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-[#444] text-white hover:bg-[#2A2A2A] text-lg px-8 py-4 backdrop-blur-sm">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
            </div>

            {/* Key Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-32">
              {[
                {
                  icon: BarChart3,
                  title: "Real-Time Analytics",
                  desc: "Meta Ads & Shopify performance tracking with custom dashboards",
                  value: "Live Data"
                },
                {
                  icon: Brain,
                  title: "AI Marketing Consultant",
                  desc: "24/7 AI assistant providing strategic insights and recommendations",
                  value: "Custom AI we built"
                },
                {
                  icon: Zap,
                  title: "Lead Generation",
                  desc: "Automated prospecting with Google Places integration and lead scoring",
                  value: "Automated Pipeline"
                },
                {
                  icon: Palette,
                  title: "Creative Studio",
                  desc: "AI-powered ad creative generation with professional backgrounds",
                  value: "Instant Creatives"
                }
              ].map((feature, i) => (
                <div key={i} className="text-center group">
                  <div className="bg-[#1A1A1A] border border-[#333] rounded-3xl p-8 h-full hover:border-[#444] hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                    <feature.icon className="w-12 h-12 text-white mx-auto mb-6 group-hover:text-gray-300 transition-colors duration-300" />
                    <div className="text-lg font-bold text-white mb-3">{feature.value}</div>
                    <div className="text-white font-semibold text-lg mb-3">{feature.title}</div>
                    <div className="text-gray-400 text-sm leading-relaxed">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>


          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Every Feature You Need
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                No hype, no exaggeration. Here's exactly what our platform includes.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: BarChart3,
                  title: "Meta Ads Analytics",
                  desc: "Real-time campaign tracking, performance metrics, audience insights, and automated reporting. Connect unlimited ad accounts.",
                  available: true
                },
                {
                  icon: Rocket,
                  title: "Shopify Integration",
                  desc: "Complete e-commerce data sync with order tracking, customer analytics, inventory management, and sales performance monitoring.",
                  available: true
                },
                {
                  icon: Brain,
                  title: "AI Marketing Consultant",
                  desc: "24/7 AI assistant providing strategic recommendations, campaign optimization suggestions, and growth strategies based on your data.",
                  available: true
                },
                {
                  icon: Zap,
                  title: "Lead Generation",
                  desc: "Automated prospecting using Google Places API with lead scoring, qualification, and business intelligence data enrichment.",
                  available: true
                },
                {
                  icon: Palette,
                  title: "Creative Studio",
                  desc: "AI-powered ad creative generation with professional backgrounds, product photography enhancement, and creative asset management.",
                  available: true
                },
                {
                  icon: Send,
                  title: "Outreach Automation",
                  desc: "Complete email marketing suite with campaign management, lead tracking, response analytics, and automated follow-up sequences.",
                  available: true
                },
                {
                  icon: FileText,
                  title: "Automated Reports",
                  desc: "Daily and monthly performance reports with white-label branding, client-ready presentations, and automated distribution.",
                  available: true
                },
                {
                  icon: Target,
                  title: "Campaign Optimization",
                  desc: "AI-powered bid management, audience targeting optimization, and automated budget reallocation based on performance data.",
                  available: true
                },
                {
                  icon: Users,
                  title: "Team Collaboration",
                  desc: "Multi-user workspaces with role-based permissions, client portal access, and collaborative project management tools.",
                  available: true
                },
                {
                  icon: Globe,
                  title: "Google Ads (Coming Soon)",
                  desc: "Full Google Ads integration with campaign management, performance tracking, and automated optimization (Q2 2024).",
                  available: false
                },
                {
                  icon: Settings,
                  title: "API & Integrations",
                  desc: "RESTful API access, webhook support, and custom integration capabilities for enterprise clients and developers.",
                  available: true
                },
                {
                  icon: Shield,
                  title: "Enterprise Security",
                  desc: "SOC 2 Type II compliant, GDPR compliant, bank-level encryption, and 99.9% uptime SLA with enterprise support.",
                  available: true
                }
              ].map((feature, i) => (
                <div key={i} className="group">
                  <div className={`bg-[#1A1A1A] border rounded-2xl p-6 h-full hover:shadow-2xl transition-all duration-300 group-hover:scale-105 ${
                    feature.available
                      ? 'border-[#333] hover:border-[#444]'
                      : 'border-[#333] opacity-60'
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-[#2A2A2A] rounded-lg">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      {!feature.available && (
                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-white font-semibold text-lg mb-3 group-hover:text-gray-300 transition-colors duration-300">
                      {feature.title}
                    </h4>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Choose Your Plan
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Transparent pricing with everything included. No hidden fees, no surprises.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {[
                {
                  name: "Freelancer",
                  description: "Perfect for solo brand scalers",
                  price: 147,
                  period: "month",
                  popular: false,
                  icon: "👤",
                  features: [
                    "Up to 3 brand connections",
                    "Meta Ads + Shopify analytics",
                    "10 AI consultant chats/day",
                    "Basic lead generation",
                    "Email support",
                    "90-day data retention"
                  ],
                  limitations: ["No team features", "Basic reporting"]
                },
                {
                  name: "Brand Scaler",
                  description: "For scaling multiple brands",
                  price: 347,
                  period: "month",
                  popular: true,
                  icon: "🚀",
                  features: [
                    "Up to 10 brand connections",
                    "Advanced Meta + Shopify analytics",
                    "25 AI consultant chats/day",
                    "Advanced lead generation & scraping",
                    "White-label reporting",
                    "Priority support",
                    "Unlimited data retention",
                    "Automated daily reports"
                  ],
                  limitations: ["No team features"]
                },
                {
                  name: "Agency Pro",
                  description: "For agencies with teams",
                  price: 647,
                  period: "month",
                  popular: false,
                  icon: "⚡",
                  features: [
                    "Up to 25 brand connections",
                    "Multi-platform analytics",
                    "50 AI consultant chats/day",
                    "Full outreach CRM & automation",
                    "Team collaboration (5 users)",
                    "Client portal access",
                    "Advanced reporting & exports",
                    "Custom dashboard widgets",
                    "API access"
                  ],
                  limitations: ["5 team member limit"]
                },
                {
                  name: "Enterprise",
                  description: "For large-scale operations",
                  price: 997,
                  period: "month",
                  popular: false,
                  icon: "👑",
                  features: [
                    "Unlimited brands & clients",
                    "Everything in Agency Pro",
                    "Unlimited team members",
                    "Custom integrations",
                    "Dedicated success manager",
                    "Custom AI workflows",
                    "White-label everything",
                    "Priority enterprise support",
                    "Advanced security features"
                  ],
                  limitations: []
                }
              ].map((plan, index) => (
                <div 
                  key={plan.name} 
                  className={`relative flex flex-col h-full rounded-2xl overflow-hidden border-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl group ${
                    plan.popular
                      ? 'border-white/30 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] shadow-2xl scale-105 z-10'
                      : 'border-[#333] bg-gradient-to-b from-[#1A1A1A] to-[#0F0F0F] hover:border-[#444]'
                  }`}
                >
                  {/* Popular Badge - Inside the widget */}
                  {plan.popular && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
                      <div className="bg-gradient-to-r from-white to-gray-100 text-black px-4 py-1.5 rounded-full text-sm font-bold shadow-lg border border-gray-200">
                        Most Popular
                      </div>
                    </div>
                  )}

                  {/* Gradient Background Effect for Popular */}
                  {plan.popular && (
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  )}

                  {/* Header Section */}
                  <div className={`relative px-8 pb-6 text-center ${plan.popular ? 'pt-16' : 'pt-8'}`}>
                    <div className="text-5xl mb-4 filter drop-shadow-lg">{plan.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                    <div className="flex items-baseline justify-center">
                      <span className="text-6xl font-black text-white">
                        ${plan.price}
                      </span>
                      <span className="text-gray-400 ml-2 text-lg font-medium">/{plan.period}</span>
                    </div>
                  </div>

                  {/* Features Section - Flexible grow */}
                  <div className="flex-1 px-8 pb-8">
                    {/* Features List */}
                    <div className="space-y-4 mb-6">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                            <Check className="w-3 h-3 text-green-400" />
                          </div>
                          <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Limitations */}
                    {plan.limitations.length > 0 && (
                      <div className="border-t border-[#333]/50 pt-6 mb-6">
                        <div className="text-gray-500 text-xs font-semibold mb-3 uppercase tracking-wider">Limitations</div>
                        <div className="space-y-2">
                          {plan.limitations.map((limitation, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                                <X className="w-2.5 h-2.5 text-red-400" />
                              </div>
                              <span className="text-gray-500 text-xs leading-relaxed">{limitation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CTA Button - Always at bottom */}
                  <div className="px-8 pb-8 mt-auto">
                    <Link href="/login" className="block">
                      <Button 
                        className={`w-full py-4 font-bold text-base rounded-xl transition-all duration-300 ${
                          plan.popular
                            ? 'bg-white text-black hover:bg-gray-100 shadow-xl hover:shadow-2xl hover:scale-[1.02]'
                            : 'bg-[#2A2A2A] hover:bg-[#333] text-white border border-[#444] hover:border-[#555] shadow-lg hover:shadow-xl'
                        }`}
                      >
                        Start Free Trial
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Enterprise CTA */}
            <div className="text-center mt-20">
              <div className="bg-[#1A1A1A] border border-[#333] rounded-3xl p-8 max-w-2xl mx-auto">
                <h3 className="text-3xl font-bold text-white mb-4">Need Something Custom?</h3>
                <p className="text-gray-400 mb-8 text-lg">
                  We work with enterprise clients to build custom solutions. Let's discuss your specific needs.
                </p>
                <Button variant="outline" className="border-[#444] text-white hover:bg-[#2A2A2A] px-8 py-3">
                  Contact Enterprise Sales
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-32 bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-400">
                Honest answers about what we offer and how it works
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  q: "What's included in the free trial?",
                  a: "Full access to all features for 14 days. No credit card required. You'll get complete Meta Ads and Shopify integrations, AI consultant, lead generation, creative studio, and all reporting tools."
                },
                {
                  q: "What platforms do you actually support right now?",
                  a: "Currently: Meta Ads (full integration) and Shopify (full integration). Google Ads integration is in development and will be available in Q2 2024."
                },
                {
                  q: "How does the AI consultant actually work?",
                  a: "It's our custom AI built specifically for marketing. It analyzes your actual campaign performance, provides specific recommendations, and can even write ad copy or suggest budget optimizations."
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Yes, absolutely. One-click cancellation from your dashboard. No long-term contracts, no cancellation fees, no hassle."
                },
                {
                  q: "What's your data retention policy?",
                  a: "Freelancer: 90 days. Brand Scaler & above: Unlimited. All data is securely encrypted and backed up multiple times."
                },
                {
                  q: "Do you offer white-label reporting?",
                  a: "Yes, starting with the Brand Scaler plan. You can customize branding, add your logo, and present reports as your own work."
                },
                {
                  q: "How secure is my data?",
                  a: "SOC 2 Type II compliant, GDPR compliant, bank-level encryption. We don't sell or share your data. 99.9% uptime with enterprise-grade infrastructure."
                },
                {
                  q: "Can I integrate with other tools?",
                  a: "Yes, we offer API access starting with Agency Pro plan. Webhooks, custom integrations, and Zapier support are available for Enterprise clients."
                }
              ].map((faq, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full text-left p-8 hover:bg-[#2A2A2A] transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-semibold text-xl">{faq.q}</h4>
                      {expandedFaq === i ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {expandedFaq === i && (
                    <div className="px-8 pb-8">
                      <p className="text-gray-400 leading-relaxed text-lg">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
              Ready to Scale Like a Pro?
            </h2>
            <p className="text-xl text-gray-400 mb-16 max-w-3xl mx-auto">
              Join the growing community of brand scalers who have transformed their businesses with our platform.
              Start your free trial today and see the difference professional tools make.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
              <Link href="/login">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-xl px-10 py-5 shadow-2xl">
                  Start Free 14-Day Trial
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-[#444] text-white hover:bg-[#2A2A2A] text-xl px-10 py-5 backdrop-blur-sm">
                <MessageSquare className="mr-3 h-6 w-6" />
                Talk to Sales
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-4 text-gray-400">
                <Shield className="w-6 h-6 text-white" />
                <span className="text-lg">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-gray-400">
                <Award className="w-6 h-6 text-white" />
                <span className="text-lg">99.9% Uptime</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-gray-400">
                <Clock className="w-6 h-6 text-white" />
                <span className="text-lg">24/7 Support</span>
              </div>
            </div>

            <div className="mt-16 pt-16 border-t border-[#333]">
              <p className="text-gray-500 text-sm">
                Trusted by brand scalers worldwide • No credit card required for trial • Cancel anytime
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
