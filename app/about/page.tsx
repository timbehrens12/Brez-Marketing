import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Target, TrendingUp, Users, Zap, Cpu, Globe, Layout, ShieldCheck, ArrowLeft } from 'lucide-react';

const AboutPage: React.FC = () => {
  return (
    <div className="bg-charcoal min-h-screen text-white overflow-x-hidden selection:bg-brand selection:text-white">
      {/* Noise Overlay */}
      <div className="noise-overlay"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center mix-blend-normal pointer-events-none">
        <a href="/" className="pointer-events-auto group flex items-center gap-2">
            <div className="p-2 bg-white/5 border border-white/10 rounded-full group-hover:border-brand/50 transition-colors">
                <ArrowLeft size={16} className="text-silver group-hover:text-brand transition-colors"/>
            </div>
            <span className="font-mono text-xs text-silver group-hover:text-white transition-colors">RETURN TO TERMINAL</span>
        </a>
        
        <div className="hidden md:flex space-x-8 font-mono text-xs pointer-events-auto">
             <div className="flex items-center gap-2 text-brand">
                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse"></div>
                SYSTEM STATUS: ONLINE
             </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 relative z-10">
        
        {/* Hero Section */}
        <section className="px-6 py-20 text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/5 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto relative z-10">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1 }}
                className="mb-8 flex items-center justify-center space-x-3 text-brand w-fit mx-auto border border-brand/30 px-5 py-2 rounded-full bg-charcoal/90 backdrop-blur-md shadow-[0_0_25px_rgba(255,31,31,0.3)]"
            >
                <Cpu size={14} className="animate-pulse" />
                <span className="text-[10px] md:text-xs font-mono tracking-widest text-white">SYSTEM ARCHITECT</span>
            </motion.div>

            <h1 className="font-display font-bold uppercase tracking-tighter mb-8 leading-none">
              <span className="block text-4xl md:text-7xl text-white mb-2">SYSTEMS THAT</span>
              <span className="block text-4xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-brand via-white to-brand bg-[length:200%_auto] animate-shine">
                SCALE
              </span>
            </h1>
            
            <p className="font-mono text-sm md:text-base text-silver mb-12 max-w-2xl mx-auto leading-relaxed border-l-2 border-brand/30 pl-6 text-left md:text-center md:border-l-0 md:pl-0">
              I don't just build websites or run ads—I engineer <span className="text-white font-bold">complete digital ecosystems</span>. 
              My architecture attracts, converts, and manages leads on autopilot.
            </p>
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="px-6 py-20 border-t border-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center gap-4 mb-8 opacity-60 justify-center">
                <div className="h-[1px] w-12 bg-white"></div>
                <div className="w-2 h-2 bg-brand border border-white rotate-45"></div>
                <div className="h-[1px] w-12 bg-white"></div>
            </div>
            
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-8 text-white">CORE PHILOSOPHY</h2>
            <p className="font-mono text-silver text-sm leading-relaxed max-w-3xl mx-auto bg-white/5 p-6 rounded-lg border border-white/10 backdrop-blur-sm">
              "Most agencies sell scattered parts—a website here, an ad campaign there. 
              <span className="text-brand block mt-4 font-bold">I build the entire machine.</span> 
              <br/>
              Your website feeds leads to your CRM, which triggers your ads, creating a flywheel of growth that never stops."
            </p>
          </div>
        </section>

        {/* Differentiators Grid */}
        <section className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
             <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
                <h2 className="font-display text-3xl md:text-4xl text-white">
                    OPERATIONAL <span className="text-brand">ADVANTAGE</span>
                </h2>
                <div className="hidden md:block font-mono text-xs text-silver/50">PROTOCOL: TRANSPARENCY</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { 
                    icon: <Target className="w-6 h-6" />, 
                    title: "System Approach", 
                    desc: "I don't sell services. I build integrated systems where Website, CRM, and Ads function as a single unit." 
                },
                { 
                    icon: <TrendingUp className="w-6 h-6" />, 
                    title: "ROI Obsessed", 
                    desc: "Every pixel and line of code is measured against revenue. If it doesn't print money, we delete it." 
                },
                { 
                    icon: <Users className="w-6 h-6" />, 
                    title: "Direct Access", 
                    desc: "No account managers. No middlemen. You work directly with the architect building your system." 
                },
                { 
                    icon: <ShieldCheck className="w-6 h-6" />, 
                    title: "Data Sovereignty", 
                    desc: "You own your data, your ad account, and your leads. I never hold your business hostage." 
                }
              ].map((item, i) => (
                <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group bg-white/[0.02] border border-white/10 p-8 rounded-lg hover:border-brand/50 transition-all duration-300 hover:bg-white/[0.05]"
                >
                    <div className="w-12 h-12 bg-white/5 rounded flex items-center justify-center mb-6 text-brand group-hover:scale-110 transition-transform">
                        {item.icon}
                    </div>
                    <h3 className="font-display text-xl text-white mb-3 group-hover:text-brand transition-colors">{item.title}</h3>
                    <p className="text-silver/70 font-mono text-xs leading-relaxed">
                        {item.desc}
                    </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="px-6 py-20 border-t border-white/5 bg-black/40">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-12 text-white">POWERED BY <span className="text-brand">ELITE TECH</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <Cpu />, label: "React + Vite" },
                { icon: <Globe />, label: "GoHighLevel" },
                { icon: <Target />, label: "Google Ads" },
                { icon: <Zap />, label: "Meta Ads" },
                { icon: <Layout />, label: "Tailwind CSS" },
                { icon: <Users />, label: "LeadConnector" },
                { icon: <ShieldCheck />, label: "Cloudflare" },
                { icon: <Target />, label: "OpenAI" },
              ].map((tech, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -5 }}
                    className="p-4 bg-white/5 border border-white/10 rounded flex flex-col items-center gap-3 hover:border-brand/30 transition-colors"
                  >
                      <div className="text-brand opacity-80">{tech.icon}</div>
                      <div className="font-mono text-[10px] tracking-wider text-silver">{tech.label}</div>
                  </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-32 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-brand/10 to-transparent opacity-20 pointer-events-none"></div>
          
          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-8 leading-tight">
              READY TO <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">DEPLOY?</span>
            </h2>
            <p className="font-mono text-sm md:text-base text-silver mb-12">
              Stop piecing together solutions. Start with a complete system designed for dominance.
            </p>

            <a href="/#contact" className="inline-block group relative px-10 py-5 bg-white text-black font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-transform duration-300">
              <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                INITIATE PARTNERSHIP <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-brand transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-0" />
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-end bg-black">
        <div className="mb-8 md:mb-0">
          <div className="font-display text-2xl mb-2 text-white">TLUCA</div>
          <div className="font-mono text-xs text-gray-500">© 2025 SYSTEM ARCHITECTURE</div>
        </div>
        <div className="flex flex-col space-y-2 font-mono text-xs text-gray-400">
          <span className="text-white mb-2">NAVIGATION</span>
          <a href="/#websites" className="hover:text-brand transition-colors">WEBSITES</a>
          <a href="/#ads" className="hover:text-brand transition-colors">ADS</a>
          <a href="/#systems" className="hover:text-brand transition-colors">SYSTEMS</a>
          <a href="/#pricing" className="hover:text-brand transition-colors">PRICING</a>
        </div>
      </footer>
    </div>
  );
}

export default AboutPage;