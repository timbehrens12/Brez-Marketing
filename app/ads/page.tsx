"use client"

import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Search, MapPin, Facebook, Flame, ChevronRight, TrendingUp, Target, Users, DollarSign, BarChart3, Zap, Award, CheckCircle, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const AdsPage: React.FC = () => {
  const services = [
    {
      id: 'google',
      icon: <Search className="w-8 h-8 text-brand" />,
      title: 'Google Ads',
      subtitle: 'HIGH INTENT CAPTURE',
      desc: 'We position your business exactly when customers are searching for your services.',
      features: [
        'Search & Display Networks',
        'Keyword Negation Strategies',
        'Monthly Optimization',
        'High-Intent Lead Capture'
      ],
      benefits: [
        'Pay only for qualified leads',
        'Target customers actively searching',
        'Scale budget based on performance',
        'Advanced conversion tracking'
      ]
    },
    {
      id: 'lsa',
      icon: <MapPin className="w-8 h-8 text-brand" />,
      title: 'Local Service Ads',
      subtitle: 'GOOGLE GUARANTEED',
      desc: 'Dominate the absolute top of search results. Pay only for qualified leads, not clicks.',
      features: [
        'Top-of-Page Placement',
        'Google Guaranteed Badge',
        'Pay-Per-Lead Model',
        'Voice Search Ready'
      ],
      benefits: [
        'Appear above organic results',
        'Build instant credibility',
        'Fixed cost per qualified lead',
        'Dominate local search'
      ]
    },
    {
      id: 'meta',
      icon: <Facebook className="w-8 h-8 text-brand" />,
      title: 'Meta Ads',
      subtitle: 'DEMAND GENERATION',
      desc: 'Scroll-stopping creative engineered to generate demand.',
      features: [
        'Lead Forms & Messaging',
        'Retargeting Visitors',
        'Lookalike Modeling',
        'Creative Strategy'
      ],
      benefits: [
        'Reach customers across platforms',
        'Remarketing to website visitors',
        'Find customers like your best ones',
        'Viral-worthy ad creative'
      ]
    }
  ];

  return (
    <div className="bg-charcoal min-h-screen text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center mix-blend-normal pointer-events-none">
        <Link href="/" className="pointer-events-auto">
          <img
            src="https://i.imgur.com/xOgn8Xe.png"
            alt="TLUCA Systems"
            className="h-10 md:h-16 w-auto object-contain"
          />
        </Link>
        <div className="hidden md:flex space-x-8 font-mono text-xs pointer-events-auto">
          {['WEBSITES', 'ADS', 'PRICING'].map((item) => (
            <Link key={item} href={`/${item.toLowerCase()}`} className="hover:text-brand transition-colors">{item}</Link>
          ))}
          <Link href="/onboarding" className="hover:text-brand transition-colors">ONBOARDING</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-32 bg-charcoal border-b border-white/5 pt-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="mb-8 flex items-center justify-center space-x-2 text-brand">
              <div className="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
              <span className="font-mono text-xs tracking-widest">SYSTEM PILLAR 2: TRAFFIC</span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl text-white mb-6 leading-tight">
              PERFORMANCE <br/>
              <span className="text-brand">MARKETING</span>
            </h1>

            <p className="font-mono text-silver mb-8 leading-relaxed text-lg max-w-3xl mx-auto">
              Infrastructure is useless without volume. We execute high-precision ad campaigns to pour leads into your new Smart Website. No vanity metrics, no wasted budget—just qualified leads that convert.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/onboarding">
                <button className="group relative px-8 py-4 bg-brand text-white font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-all duration-300">
                  <span className="relative z-10 flex items-center gap-2 group-hover:text-black transition-colors duration-300">
                    GET STARTED WITH ADS <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-0" />
                </button>
              </Link>
              <Link href="/pricing">
                <button className="px-8 py-4 border-2 border-white text-white font-display font-bold text-lg tracking-wider hover:bg-white hover:text-black transition-all duration-300">
                  VIEW PRICING
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Our Ads */}
      <section className="py-32 bg-charcoal relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="font-display text-4xl md:text-6xl text-white mb-6">
              WHY OUR <span className="text-brand">ADS WORK</span>
            </h2>
            <p className="font-mono text-silver text-lg max-w-3xl mx-auto">
              Most agencies focus on vanity metrics. We focus on what matters: qualified leads that turn into customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {[
              {
                icon: <Target />,
                title: "Laser-Targeted",
                desc: "We don't spray and pray. Every ad targets customers who are ready to buy."
              },
              {
                icon: <TrendingUp />,
                title: "Performance-Driven",
                desc: "Our campaigns are engineered for ROI, not vanity metrics."
              },
              {
                icon: <BarChart3 />,
                title: "Data-Driven",
                desc: "Every decision backed by data, testing, and proven marketing science."
              },
              {
                icon: <Award />,
                title: "Platform-Recognized",
                desc: "Built using best practices from top Google & Meta advertisers."
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white/[0.02] border border-white/10 p-8 hover:border-brand/50 transition-all duration-300 group text-center"
              >
                <div className="p-4 bg-white/5 rounded-full w-fit mb-6 mx-auto group-hover:bg-brand/10 transition-colors">
                  <div className="text-brand group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                </div>
                <h3 className="font-display text-xl text-white mb-4 group-hover:text-brand transition-colors">{item.title}</h3>
                <p className="text-silver/80 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-32 w-full bg-charcoal border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,31,31,0.03),transparent_60%)]"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="mb-20 flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-10">
            <div>
              <div className="flex items-center gap-2 text-brand mb-2">
                <Flame size={18} className="animate-pulse" />
                <span className="font-mono text-xs tracking-widest">PROTOCOL: ACTIVE</span>
              </div>
              <h2 className="font-display text-4xl text-white mb-2">OUR <span className="text-brand">SERVICES</span></h2>
              <p className="font-mono text-silver text-sm max-w-xl">
                Three proven ad platforms, each optimized for maximum ROI and lead quality.
              </p>
            </div>
            <div className="hidden md:block font-mono text-xs text-brand text-right">
              STATUS: SCALING<br/>
              EFFICIENCY: MAXIMUM
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 perspective-1000">
            {services.map((service, i) => (
              <TiltCard key={service.id} index={i} service={service} />
            ))}

            {/* Get Started CTA */}
            <div className="md:col-span-3 mt-16 pt-8 border-t border-white/10 text-center">
              <Link href="/onboarding">
                <button className="group relative px-8 py-4 bg-brand text-white font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-all duration-300">
                  <span className="relative z-10 flex items-center gap-2 group-hover:text-black transition-colors duration-300">
                    START YOUR AD CAMPAIGN <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-0" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-32 bg-charcoal border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="font-display text-4xl md:text-6xl text-white mb-6">
              OUR <span className="text-brand">PROCESS</span>
            </h2>
            <p className="font-mono text-silver text-lg max-w-3xl mx-auto">
              From strategy to scale in 30 days. Our proven system turns ad spend into predictable revenue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Strategy",
                desc: "Deep market analysis and competitive research to identify your unique positioning and target audience."
              },
              {
                step: "02",
                title: "Setup",
                desc: "Professional account setup, tracking implementation, and creative asset development."
              },
              {
                step: "03",
                title: "Launch",
                desc: "Controlled rollout with A/B testing to identify winning combinations before scaling."
              },
              {
                step: "04",
                title: "Optimize",
                desc: "Daily monitoring, weekly optimizations, and monthly scaling to maximize ROI."
              }
            ].map((process, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-brand/10 border border-brand/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="font-mono text-brand text-xl font-bold">{process.step}</span>
                </div>
                <h3 className="font-display text-xl text-white mb-4">{process.title}</h3>
                <p className="text-silver/80 leading-relaxed">{process.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-32 bg-black relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="font-display text-4xl md:text-6xl text-white mb-6">
              REAL <span className="text-brand">RESULTS</span>
            </h2>
            <p className="font-mono text-silver text-lg max-w-3xl mx-auto">
              Numbers don't lie. Here's what our clients achieve with our performance marketing system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                metric: "3.2x",
                label: "Average ROAS",
                desc: "For every $1 spent on ads, clients get $3.20 back in revenue"
              },
              {
                metric: "$47",
                label: "Cost Per Lead",
                desc: "Industry-leading efficiency with qualified leads under $50"
              },
              {
                metric: "156%",
                label: "Conversion Increase",
                desc: "Average improvement in website conversion rates"
              }
            ].map((result, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                className="bg-white/[0.02] border border-white/10 p-8 rounded-lg text-center"
              >
                <div className="font-display text-5xl text-brand mb-4">{result.metric}</div>
                <div className="font-display text-xl text-white mb-2">{result.label}</div>
                <div className="text-silver/80 leading-relaxed">{result.desc}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "John Martinez",
                company: "Roofing Contractor",
                quote: "We went from 3 jobs per month to 23. The leads are so qualified, our close rate went from 30% to 85%.",
                results: ["23 monthly jobs", "85% close rate", "$2.1M annual revenue"]
              },
              {
                name: "Lisa Thompson",
                company: "HVAC Company",
                quote: "Our cost per lead dropped from $120 to $38. We're getting twice the leads for half the cost.",
                results: ["$38 cost per lead", "2x more leads", "67% lower CAC"]
              },
              {
                name: "David Rodriguez",
                company: "Plumbing Service",
                quote: "The Local Service Ads changed everything. We're now #1 for every plumbing search in our area.",
                results: ["#1 local ranking", "300+ monthly leads", "5x ROI improvement"]
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                className="bg-white/[0.02] border border-white/10 p-8 rounded-lg"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={16} className="text-brand fill-current" />
                  ))}
                </div>
                <p className="text-white mb-6 italic">"{testimonial.quote}"</p>
                <div className="mb-4">
                  <div className="font-display text-white font-bold">{testimonial.name}</div>
                  <div className="font-mono text-silver/60 text-sm">{testimonial.company}</div>
                </div>
                <div className="space-y-1">
                  {testimonial.results.map((result, j) => (
                    <div key={j} className="flex items-center space-x-2 text-sm">
                      <CheckCircle size={12} className="text-brand" />
                      <span className="text-silver/60">{result}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 flex flex-col items-center justify-center text-center relative border-t border-white/5 bg-gradient-to-b from-charcoal to-black">
        <h2 className="font-display text-4xl md:text-6xl font-bold mb-8 max-w-4xl mx-auto leading-tight">
          READY TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">SCALE?</span>
        </h2>
        <p className="font-mono text-silver mb-12 max-w-lg mx-auto">
          Stop wasting money on ads that don't convert. Get qualified leads that turn into customers.
        </p>

        <div className="mb-8 text-center">
          <h3 className="font-display text-xl text-white mb-2">Simple Pricing</h3>
          <p className="font-mono text-silver/80">Flat monthly fee + your ad spend. No hidden charges.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <Link href="/onboarding">
            <button className="group relative px-10 py-5 bg-brand text-white font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-transform duration-300">
              <span className="relative z-10 flex items-center gap-2 group-hover:text-black transition-colors duration-300">
                APPLY TO START YOUR CAMPAIGN <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-0" />
            </button>
          </Link>

          <Link href="/pricing">
            <button className="px-10 py-5 border-2 border-white text-white font-display font-bold text-lg tracking-wider hover:bg-white hover:text-black transition-all duration-300">
              VIEW PRICING PLANS
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};

const TiltCard: React.FC<{ index: number; service: any }> = ({ index, service }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      className="group relative h-full min-h-[420px] bg-white/[0.02] border border-white/10 p-8 flex flex-col transition-colors duration-300 hover:border-brand/50 will-change-transform cursor-crosshair"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg" />
      <div className="relative z-10 flex-grow">
        <div className="mb-6 p-4 bg-white/5 rounded-full w-fit group-hover:bg-brand/10 transition-colors duration-300">
          {service.icon}
        </div>
        <div className="font-mono text-xs text-brand mb-2 tracking-widest">{service.subtitle}</div>
        <h3 className="font-display text-2xl text-white mb-4 group-hover:text-brand transition-colors duration-300">{service.title}</h3>
        <p className="font-sans text-sm text-silver mb-8 leading-relaxed">
          {service.desc}
        </p>
      </div>

      <div className="relative z-10 space-y-3 mt-auto border-t border-white/5 pt-6">
        <div className="mb-4">
          <h4 className="font-display text-sm text-white mb-3">Key Features:</h4>
          {service.features.map((feature: string, idx: number) => (
            <div key={idx} className="flex items-center space-x-2 text-xs font-mono text-silver/80">
              <div className="w-1.5 h-1.5 bg-brand rounded-full" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div>
          <h4 className="font-display text-sm text-white mb-3">Benefits:</h4>
          {service.benefits.map((benefit: string, idx: number) => (
            <div key={idx} className="flex items-center space-x-2 text-xs font-mono text-silver/80">
              <CheckCircle size={12} className="text-brand flex-shrink-0" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AdsPage;
