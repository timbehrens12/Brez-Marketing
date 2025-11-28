"use client"

import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Layout, Smartphone, Search, Database, Shield, Zap, Lock, Gauge, Globe, MessageSquare, Bot, ChevronRight, CheckCircle, Star, Users, TrendingUp, ArrowRight, Code, Palette, Target, Cpu } from 'lucide-react';
import Link from 'next/link';

const WebsitesPage: React.FC = () => {
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
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="mb-8 flex items-center space-x-2 text-brand">
                <div className="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
                <span className="font-mono text-xs tracking-widest">SYSTEM PILLAR 1: INFRASTRUCTURE</span>
              </div>

              <h1 className="font-display text-5xl md:text-7xl text-white mb-6 leading-tight">
                INTELLIGENT <br/>
                <span className="text-brand">ARCHITECTURE</span>
              </h1>

              <p className="font-mono text-silver mb-8 leading-relaxed text-lg max-w-2xl">
                The foundation of your growth. We build dynamic, living <strong>Smart Websites</strong> equipped with AI automation to capture and convert every visitor. Unlike static templates, our systems are built to scale.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/onboarding">
                  <button className="group relative px-8 py-4 bg-brand text-white font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-all duration-300">
                    <span className="relative z-10 flex items-center gap-2 group-hover:text-black transition-colors duration-300">
                      GET STARTED WITH WEBSITES <ChevronRight className="group-hover:translate-x-1 transition-transform" />
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <InteractiveNetwork />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-charcoal relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="font-display text-4xl md:text-6xl text-white mb-6">
              WHY CHOOSE <span className="text-brand">SMART WEBSITES?</span>
            </h2>
            <p className="font-mono text-silver text-lg max-w-3xl mx-auto">
              Our websites aren't just pretty faces. They're intelligent systems designed to generate leads, build trust, and scale your business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: <Layout />,
                title: "Niche-Specific Design",
                desc: "High-converting templates built for your industry. Every element is optimized for your specific market and customer psychology.",
                details: ["Industry-specific layouts", "Conversion-optimized flows", "Mobile-first design", "A/B tested elements"]
              },
              {
                icon: <Smartphone />,
                title: "Mobile Optimized",
                desc: "Flawless experience on every device. 70% of users access websites via mobile - we ensure your site converts on all screens.",
                details: ["Responsive design", "Touch-friendly interfaces", "Fast mobile loading", "Mobile SEO optimized"]
              },
              {
                icon: <Search />,
                title: "SEO Structure",
                desc: "Rank higher with clean, semantic code. Our websites are built with SEO in mind from the ground up.",
                details: ["Schema markup", "Fast loading speeds", "Clean URL structure", "Mobile SEO ready"]
              },
              {
                icon: <Shield />,
                title: "Zero Maintenance",
                desc: "We handle hosting, security, and updates. Focus on your business while we keep your website running smoothly.",
                details: ["Managed hosting", "Security monitoring", "Automatic updates", "24/7 uptime guarantee"]
              },
              {
                icon: <Database />,
                title: "Built-In CRM",
                desc: "Capture and manage every lead automatically. No more spreadsheets or disconnected systems.",
                details: ["Lead capture forms", "Contact management", "Lead scoring", "Follow-up automation"]
              },
              {
                icon: <Bot />,
                title: "AI Messaging Bot",
                desc: "Trained on your site's data to communicate with and capture leads 24/7. Never miss a potential customer.",
                details: ["24/7 availability", "Lead qualification", "Automated responses", "CRM integration"]
              },
              {
                icon: <Zap />,
                title: "Auto-Pilot Follow-Up",
                desc: "Never lose a lead with automated nurture sequences. Keep prospects engaged until they're ready to buy.",
                details: ["Email sequences", "SMS follow-up", "Behavioral triggers", "Lead nurturing"]
              },
              {
                icon: <Lock />,
                title: "Universal Integration",
                desc: "Connects with Stripe, PayPal, Meta, and more. Your website talks to all your business tools.",
                details: ["Payment processing", "Email marketing", "Social media", "Analytics platforms"]
              },
              {
                icon: <Gauge />,
                title: "Reputation Engine",
                desc: "Get more 5-star reviews on autopilot. Build trust and social proof automatically.",
                details: ["Review collection", "Testimonial display", "Social proof widgets", "Review management"]
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white/[0.02] border border-white/10 p-8 hover:border-brand/50 transition-all duration-300 group"
              >
                <div className="p-4 bg-white/5 rounded-full w-fit mb-6 group-hover:bg-brand/10 transition-colors">
                  <div className="text-brand group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="font-display text-xl text-white mb-4 group-hover:text-brand transition-colors">{feature.title}</h3>
                <p className="text-silver/80 mb-6 leading-relaxed">{feature.desc}</p>

                <div className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-sm">
                      <CheckCircle size={14} className="text-brand flex-shrink-0" />
                      <span className="text-silver/60">{detail}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Technology Stack */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-12">
            <div className="text-center mb-12">
              <h3 className="font-display text-3xl text-white mb-4">Powered by Enterprise Technology</h3>
              <p className="font-mono text-silver">Built with the same stack that powers Fortune 500 companies</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { name: "Next.js", desc: "React Framework" },
                { name: "TypeScript", desc: "Type Safety" },
                { name: "Tailwind CSS", desc: "Styling" },
                { name: "Supabase", desc: "Database" },
                { name: "Vercel", desc: "Hosting" },
                { name: "Stripe", desc: "Payments" },
                { name: "Resend", desc: "Email" },
                { name: "AI Models", desc: "Intelligence" }
              ].map((tech, i) => (
                <div key={i} className="text-center">
                  <div className="font-mono text-brand text-lg mb-1">{tech.name}</div>
                  <div className="text-silver/60 text-sm">{tech.desc}</div>
                </div>
              ))}
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
              From concept to conversion in 14 days. Our streamlined process ensures your website is live and generating leads fast.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Discovery",
                desc: "We analyze your business, competitors, and target audience to create a strategic foundation.",
                icon: <Target />
              },
              {
                step: "02",
                title: "Design",
                desc: "Custom designs that reflect your brand while maximizing conversions and user experience.",
                icon: <Palette />
              },
              {
                step: "03",
                title: "Development",
                desc: "Clean, fast, and scalable code built with modern technologies and best practices.",
                icon: <Code />
              },
              {
                step: "04",
                title: "Launch",
                desc: "Full testing, optimization, and deployment with ongoing monitoring and support.",
                icon: <TrendingUp />
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

      {/* Testimonials Section */}
      <section className="py-32 bg-black relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="font-display text-4xl md:text-6xl text-white mb-6">
              CLIENT <span className="text-brand">SUCCESS</span> STORIES
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                company: "Local Plumbing Co.",
                quote: "Our website went from 2 leads per month to 47. The AI bot handles inquiries 24/7 and our conversion rate doubled.",
                results: ["47 monthly leads", "156% conversion increase", "24/7 lead capture"]
              },
              {
                name: "Mike Chen",
                company: "Auto Repair Shop",
                quote: "The automated review system got us from 2 stars to 4.8 stars. Customers love the instant responses.",
                results: ["4.8 star rating", "300+ reviews", "40% time savings"]
              },
              {
                name: "Jennifer Davis",
                company: "Dental Practice",
                quote: "Finally, a website that actually works. The built-in CRM and follow-up automation saved us hours every week.",
                results: ["60% time savings", "Zero missed leads", "500+ appointments booked"]
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

      {/* CTA Section */}
      <section className="py-32 flex flex-col items-center justify-center text-center relative border-t border-white/5 bg-gradient-to-b from-charcoal to-black">
        <h2 className="font-display text-4xl md:text-6xl font-bold mb-8 max-w-4xl mx-auto leading-tight">
          READY TO BUILD YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">SMART WEBSITE?</span>
        </h2>
        <p className="font-mono text-silver mb-12 max-w-lg mx-auto">
          Join hundreds of businesses who've transformed their online presence with intelligent, lead-generating websites.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <Link href="/onboarding">
            <button className="group relative px-10 py-5 bg-brand text-white font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-transform duration-300">
              <span className="relative z-10 flex items-center gap-2 group-hover:text-black transition-colors duration-300">
                START BUILDING NOW <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-0" />
            </button>
          </Link>

          <Link href="/pricing">
            <button className="px-10 py-5 border-2 border-white text-white font-display font-bold text-lg tracking-wider hover:bg-white hover:text-black transition-all duration-300">
              VIEW ALL FEATURES
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};

const InteractiveNetwork: React.FC = () => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 400, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 400, damping: 30 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = e.clientX - rect.left;
    const mouseYVal = e.clientY - rect.top;
    x.set(mouseXVal / width - 0.5);
    y.set(mouseYVal / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="w-full h-full flex items-center justify-center perspective-1000" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-80 h-80 md:w-96 md:h-96 bg-white/[0.02] border border-white/10 rounded-xl backdrop-blur-sm shadow-2xl flex items-center justify-center"
      >
        {/* Central Core */}
        <div className="relative z-10 w-24 h-24 bg-charcoal border border-brand/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,31,31,0.2)] animate-pulse-slow">
          <div className="absolute inset-0 rounded-full border border-brand opacity-30 animate-ping"></div>
          <Globe size={40} className="text-brand" />
          <div className="absolute -bottom-6 font-mono text-[10px] text-brand tracking-widest">AI CORE</div>
        </div>

        {/* Satellite Nodes */}
        <NetworkNode angle={0} distance={130} delay={0} icon={<Smartphone size={16} />} label="MOBILE" />
        <NetworkNode angle={90} distance={130} delay={1} icon={<Search size={16} />} label="SEO" />
        <NetworkNode angle={180} distance={130} delay={2} icon={<Lock size={16} />} label="SECURE" />
        <NetworkNode angle={270} distance={130} delay={3} icon={<Gauge size={16} />} label="SPEED" />

        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] rounded-xl z-0 pointer-events-none"></div>
      </motion.div>
    </div>
  );
};

const NetworkNode: React.FC<{ angle: number; distance: number; delay: number; icon: React.ReactNode; label: string }> = ({ angle, distance, delay, icon, label }) => {
  const [hovered, setHovered] = useState(false);

  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * distance;
  const y = Math.sin(rad) * distance;

  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
        <motion.line
          x1="50%" y1="50%"
          x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`}
          stroke={hovered ? "#FF1F1F" : "rgba(255, 255, 255, 0.1)"}
          strokeWidth="1"
          strokeDasharray="4 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ repeat: Infinity, duration: hovered ? 0.5 : 2, ease: "linear" }}
        />
      </svg>

      <motion.div
        className={`absolute w-12 h-12 rounded-full border bg-charcoal flex items-center justify-center cursor-pointer transition-all duration-300 z-20
          ${hovered ? 'border-brand text-brand scale-110 shadow-[0_0_15px_rgba(255,31,31,0.4)]' : 'border-white/20 text-silver hover:border-brand/50'}
        `}
        style={{
          x: x,
          y: y,
          transform: 'translate(-50%, -50%)'
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay * 0.1 }}
      >
        {icon}
        <div className={`absolute -bottom-5 text-[9px] font-mono tracking-wider transition-colors duration-300 ${hovered ? 'text-brand' : 'text-silver/50'}`}>
          {label}
        </div>
      </motion.div>
    </>
  );
};

export default WebsitesPage;
