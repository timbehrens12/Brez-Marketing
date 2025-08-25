import { Check, X, Star, ArrowRight, Zap, Shield, Sparkles, Crown, Users, BarChart3, TrendingUp, Target, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GridOverlay } from "@/components/GridOverlay"

export default function PricingPage() {
  const plans = [
    {
      name: "Freelancer",
      description: "Perfect for individual brand scalers working solo",
      price: 147,
      period: "month",
      popular: false,
      icon: "👤",
      features: {
        analytics: [
          "Meta Ads analytics & tracking",
          "Shopify store integration",
          "Performance dashboard",
          "90-day data retention"
        ],
        ai: [
          "10 AI consultant chats/day",
          "15 creative generations/week",
          "Campaign optimization",
          "Weekly performance insights"
        ],
        tools: [
          "Up to 3 brand connections",
          "Basic lead generation",
          "Outreach automation",
          "Email support"
        ]
      },
      limitations: [
        "Limited to 3 brands",
        "No team collaboration",
        "Basic reporting only"
      ],
      cta: "Start Free Trial",
      highlight: false
    },
    {
      name: "Brand Scaler",
      description: "For freelance brand scalers managing multiple clients",
      price: 347,
      period: "month",
      popular: true,
      icon: "🚀",
      features: {
        analytics: [
          "Advanced Meta & Shopify analytics",
          "Performance tracking",
          "Custom dashboard widgets",
          "Unlimited data retention",
          "Audience insights",
          "Automated daily reports"
        ],
        ai: [
          "25 AI consultant chats/day",
          "50 creative generations/week",
          "Advanced campaign optimization",
          "Daily AI performance reports",
          "Industry-specific recommendations"
        ],
        tools: [
          "Up to 10 brand connections",
          "Advanced lead generation & scraping",
          "Full outreach CRM & automation",
          "White-label reporting",
          "Priority support",
          "Client management tools"
        ]
      },
      limitations: [
        "Limited to 10 brands",
        "No team collaboration"
      ],
      cta: "Start Free Trial",
      highlight: true
    },
    {
      name: "Agency Pro",
      description: "For established brand scalers with teams",
      price: 647,
      period: "month",
      popular: false,
      icon: "⚡",
      features: {
        analytics: [
          "Advanced Meta & Shopify analytics",
          "Multi-platform performance tracking",
          "Custom dashboard widgets",
          "Unlimited data retention",
          "Advanced audience insights",
          "White-label reporting",
          "Custom analytics widgets"
        ],
        ai: [
          "50 AI consultant chats/day",
          "100 creative generations/week",
          "Advanced campaign automation",
          "Priority AI processing",
          "Agency-wide insights",
          "Bulk campaign analysis"
        ],
        tools: [
          "Up to 25 brand connections",
          "Advanced lead generation",
          "Full outreach CRM suite",
          "Advanced reporting & exports",
          "Priority support",
          "Team collaboration (5 users)",
          "Client portal access"
        ]
      },
      limitations: [
        "Limited to 25 brands",
        "5 team member limit"
      ],
      cta: "Start Free Trial",
      highlight: false
    },
    {
      name: "Enterprise",
      description: "For large scaling operations & teams",
      price: 997,
      period: "month",
      popular: false,
      icon: "👑",
      features: {
        analytics: [
          "Unlimited brand connections",
          "White-label reporting",
          "Custom agency branding",
          "Unlimited data retention",
          "Advanced client dashboards",
          "Multi-location tracking",
          "Custom analytics widgets"
        ],
        ai: [
          "100 AI consultant chats/day",
          "200 creative generations/week",
          "Advanced campaign automation",
          "Priority AI processing",
          "Agency-wide insights",
          "Bulk campaign analysis",
          "Custom AI workflows"
        ],
        tools: [
          "Unlimited brands & clients",
          "Team management (unlimited users)",
          "Client portal access",
          "Advanced lead generation",
          "Full outreach CRM suite",
          "Custom integrations",
          "Priority support",
          "API access"
        ]
      },
      limitations: [],
      cta: "Start Free Trial",
      highlight: false
    }
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] relative">
      <GridOverlay />

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <img
            src="https://i.imgur.com/PZCtbwG.png"
            alt="Brez Marketing"
            className="h-12 w-auto"
          />
          <Button className="bg-white text-black hover:bg-gray-100">
            Go to Dashboard
          </Button>
        </div>
      </header>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded-full px-4 py-2 mb-6">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Professional Brand Scaling Infrastructure</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-4">
                Scale Brands Like a Pro
              </h1>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                The complete toolkit for freelance brand scalers. AI-powered insights, automated lead generation,
                and professional analytics to help you scale brands to 7+ figures.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid md:grid-cols-4 gap-6 mb-20">
              {[
                { icon: BarChart3, title: "Real-Time Analytics", value: "24/7" },
                { icon: Sparkles, title: "AI Assistant", value: "GPT-4" },
                { icon: Target, title: "Lead Generation", value: "Automated" },
                { icon: Rocket, title: "Brand Scaling", value: "Proven" }
              ].map((feature, i) => (
                <div key={i} className="text-center">
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 mx-auto w-full hover:border-[#444] transition-all">
                    <feature.icon className="w-8 h-8 text-white mx-auto mb-3" />
                    <div className="text-2xl font-bold text-white mb-1">{feature.value}</div>
                    <div className="text-gray-400 text-sm">{feature.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                Choose Your Scaling Plan
              </h2>
              <p className="text-gray-400 text-xl">
                Built specifically for freelance brand scalers and agencies
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid lg:grid-cols-4 gap-8">
              {plans.map((plan, index) => (
                <Card key={plan.name} className={`relative bg-[#1a1a1a] border-[#333] hover:border-[#444] transition-all overflow-hidden ${
                  plan.popular ? 'border-white/30 shadow-2xl' : ''
                }`}>
                  {/* Gradient Header */}
                  <div className={`h-32 bg-gradient-to-br ${
                    plan.popular 
                      ? 'from-blue-400 via-purple-500 to-orange-400' 
                      : 'from-slate-600 via-slate-500 to-slate-600'
                  } relative`}>
                    {plan.popular && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-white/20 text-white px-3 py-1 backdrop-blur-sm border border-white/30 rounded-full">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardHeader className="text-center pt-6 pb-6 -mt-12 relative">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/95 backdrop-blur-sm flex items-center justify-center relative z-10 shadow-lg">
                      {index === 0 && <svg className="w-8 h-8 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/></svg>}
                      {index === 1 && <svg className="w-8 h-8 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M13 3L13.73 8.06C14.86 7.85 16.06 8.15 17 8.91C18.4 9.96 19 11.78 18.5 13.5C17.92 15.47 15.91 16.67 13.94 16.09C12.5 15.66 11.54 14.33 11.5 12.8L6.5 12.8C6.5 16.64 9.36 19.5 13.2 19.5C17.04 19.5 19.9 16.64 19.9 12.8C19.9 8.96 17.04 6.1 13.2 6.1C12.32 6.1 11.5 6.28 10.73 6.56L10 1.5L13 3M4 12C4 12.69 4.1 13.36 4.3 14H2.04C2.01 13.36 2 12.68 2 12S2.01 8.64 2.04 8H4.3C4.1 8.64 4 9.31 4 10V12Z"/></svg>}
                      {index === 2 && <svg className="w-8 h-8 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9V7L15 7.5V9.5L21 9M3 9V7L9 7.5V9.5L3 9M15 13.5V11.5L21 12V14L15 13.5M3 13.5V11.5L9 12V14L3 13.5M12 8L15.5 10L15.5 11.5L12 13.5L8.5 11.5V10L12 8Z"/></svg>}
                      {index === 3 && <svg className="w-8 h-8 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L13.09 8.26L22 9L17.27 12.74L18.18 21.02L12 17.77L5.82 21.02L6.73 12.74L2 9L10.91 8.26L12 2Z"/></svg>}
                    </div>

                    <CardTitle className="text-2xl font-bold text-white mb-2">{plan.name}</CardTitle>
                    <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                    <div className="flex items-baseline justify-center mb-4">
                      <span className="text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-gray-400 ml-2 text-sm">/{plan.period}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Analytics Features */}
                    <div>
                      <h4 className="font-semibold text-white mb-3 text-sm">
                        Analytics & Tracking
                      </h4>
                      <ul className="space-y-2">
                        {plan.features.analytics.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-300">
                            <svg className="w-4 h-4 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                            </svg>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* AI Features */}
                    <div>
                      <h4 className="font-semibold text-white mb-3 text-sm">
                        AI & Automation
                      </h4>
                      <ul className="space-y-2">
                        {plan.features.ai.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-300">
                            <svg className="w-4 h-4 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                            </svg>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tools Features */}
                    <div>
                      <h4 className="font-semibold text-white mb-3 text-sm">
                        Tools & Support
                      </h4>
                      <ul className="space-y-2">
                        {plan.features.tools.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-300">
                            <svg className="w-4 h-4 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                            </svg>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {plan.limitations.length > 0 && (
                      <div className="border-t border-[#2a2a2a] pt-4">
                        <h5 className="text-xs font-medium text-gray-500 mb-2">Limitations:</h5>
                        <ul className="space-y-1">
                          {plan.limitations.slice(0, 2).map((limitation, i) => (
                            <li key={i} className="flex items-start text-xs text-gray-500">
                              <div className="w-1 h-1 bg-gray-600 rounded-full mr-3 mt-1.5 flex-shrink-0" />
                              <span>{limitation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button className={`w-full font-semibold py-3 ${
                      plan.popular
                        ? 'bg-white text-black hover:bg-gray-100'
                        : 'bg-[#2a2a2a] hover:bg-[#333] text-white border border-[#444]'
                    }`}>
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 border-t border-[#333]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl font-bold text-white text-center mb-16">
              Everything You Need to Scale Brands
            </h3>

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[
                { icon: "📊", title: "Meta Ads Analytics", desc: "Real-time campaign tracking & optimization" },
                { icon: "🛍️", title: "Shopify Integration", desc: "Complete e-commerce data sync" },
                { icon: "📈", title: "Performance Dashboard", desc: "Custom widgets & real-time insights" },
                { icon: "🤖", title: "AI Consultant", desc: "24/7 optimization & recommendations" },
                { icon: "🎨", title: "Creative Generation", desc: "AI-powered ad creative creation" },
                { icon: "🎯", title: "Lead Generation", desc: "Automated prospecting & scraping" },
                { icon: "📧", title: "Outreach CRM", desc: "Professional email sequences" },
                { icon: "⚡", title: "Campaign Optimization", desc: "AI-powered performance improvements" },
                { icon: "👥", title: "Audience Insights", desc: "Advanced demographic analysis" },
                { icon: "📋", title: "Automated Reports", desc: "Daily performance summaries" },
                { icon: "🏷️", title: "White-label Reporting", desc: "Custom branded client reports" },
                { icon: "👨‍💼", title: "Client Management", desc: "Professional client tools" },
                { icon: "🤝", title: "Team Collaboration", desc: "Multi-user workspace features" },
                { icon: "📊", title: "Advanced Analytics", desc: "Unlimited data retention" },
                { icon: "💼", title: "Industry Intelligence", desc: "Niche-specific recommendations" },
                { icon: "🚀", title: "Scaling Tools", desc: "Everything to grow brands to 7+ figures" }
              ].map((feature, i) => (
                <div key={i} className="text-center group">
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 h-full hover:border-[#444] hover:bg-[#1f1f1f] transition-all duration-300 group-hover:scale-105">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                    <h4 className="text-white font-semibold mb-2 group-hover:text-blue-400 transition-colors duration-300">{feature.title}</h4>
                    <p className="text-gray-400 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 border-t border-[#333]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl font-bold text-white text-center mb-12">Common Questions</h3>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                { q: "What platforms do you support?", a: "Meta Ads and Shopify today. Google Ads integration coming Q2." },
                { q: "How long is the free trial?", a: "14 days full access, no credit card required." },
                { q: "Can I cancel anytime?", a: "Yes, cancel with one click from your dashboard." },
                { q: "Do you offer custom plans?", a: "Yes, contact us for enterprise scaling solutions." }
              ].map((faq, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                  <h4 className="text-white font-semibold mb-2">{faq.q}</h4>
                  <p className="text-gray-400 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <footer className="py-16 border-t border-[#333]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl font-bold text-white mb-4">Ready to Scale Brands Like a Pro?</h3>
            <p className="text-gray-400 mb-8 text-lg">
              Join thousands of brand scalers already using our platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 font-semibold px-8">
                Start Free 14-Day Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
                Schedule Demo
              </Button>
            </div>

            <div className="flex justify-center gap-8 mt-12 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                99.9% uptime
              </span>
              <span>SOC 2 compliant</span>
              <span>GDPR ready</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
