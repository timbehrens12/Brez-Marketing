import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Layout, Smartphone, Search, Database, Shield, Zap, Lock, Gauge, Globe } from 'lucide-react';

const SmartWebsites: React.FC = () => {
  return (
    <section id="websites" className="py-32 bg-charcoal relative overflow-hidden border-b border-white/5 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
        
        {/* Left: Content (2/3 Width) */}
        <div className="lg:col-span-8">
           <div className="mb-8 flex items-center space-x-2 text-brand">
                <div className="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
                <span className="font-mono text-xs tracking-widest">SYSTEM PILLAR 1: INFRASTRUCTURE</span>
           </div>
           
           <h2 className="font-display text-4xl md:text-5xl text-white mb-6 leading-tight">
             INTELLIGENT <br/>
             <span className="text-brand">ARCHITECTURE</span>
           </h2>
           
           <p className="font-mono text-silver mb-8 leading-relaxed border-l-2 border-brand/30 pl-6 max-w-3xl">
             The foundation of your growth. We build dynamic, living <strong>Smart Websites</strong> equipped with AI automation to capture and convert every visitor. Unlike static templates, our systems are built to scale.
           </p>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
              {[
                { icon: <Layout />, label: "Niche-Specific Design", desc: "High-converting templates built for your industry." },
                { icon: <Smartphone />, label: "Mobile Optimized", desc: "Flawless experience on every device." },
                { icon: <Search />, label: "SEO Structure", desc: "Rank higher with clean, semantic code." },
                { icon: <Shield />, label: "Zero Maintenance", desc: "We handle hosting, security, and updates." },
                { icon: <Database />, label: "Built-In CRM", desc: "Capture and manage every lead automatically." },
                { icon: <Zap />, label: "Auto-Pilot Follow-Up", desc: "Never lose a lead with automated nurture sequences." },
                { icon: <Lock />, label: "Universal Integration", desc: "Connects with Stripe, PayPal, Meta, and more." },
                { icon: <Gauge />, label: "Reputation Engine", desc: "Get more 5-star reviews on autopilot." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start group">
                    <div className="p-3 bg-white/5 rounded group-hover:bg-brand/10 transition-colors text-brand shrink-0">
                        {item.icon}
                    </div>
                    <div>
                        <h4 className="font-display text-sm text-white mb-1">{item.label}</h4>
                        <p className="text-xs text-silver/60 leading-relaxed">{item.desc}</p>
                    </div>
                </div>
              ))}
           </div>
        </div>

        {/* Right: Interactive Network Animation (1/3 Width) */}
        <div className="lg:col-span-4 h-[500px] flex items-center justify-center relative">
            <InteractiveNetwork />
        </div>

      </div>
    </section>
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
                className="relative w-72 h-72 md:w-80 md:h-80 bg-white/[0.02] border border-white/10 rounded-xl backdrop-blur-sm shadow-2xl flex items-center justify-center"
            >
                {/* Central Core */}
                <div className="relative z-10 w-24 h-24 bg-charcoal border border-brand/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,31,31,0.2)] animate-pulse-slow">
                    <div className="absolute inset-0 rounded-full border border-brand opacity-30 animate-ping"></div>
                    <Globe size={40} className="text-brand" />
                    <div className="absolute -bottom-6 font-mono text-[10px] text-brand tracking-widest">AI CORE</div>
                </div>

                {/* Satellite Nodes */}
                <NetworkNode angle={0} distance={120} delay={0} icon={<Smartphone size={16} />} label="MOBILE" />
                <NetworkNode angle={90} distance={120} delay={1} icon={<Search size={16} />} label="SEO" />
                <NetworkNode angle={180} distance={120} delay={2} icon={<Lock size={16} />} label="SECURE" />
                <NetworkNode angle={270} distance={120} delay={3} icon={<Gauge size={16} />} label="SPEED" />

                {/* Background Grid Pattern inside card */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] rounded-xl z-0 pointer-events-none"></div>
            </motion.div>
        </div>
    );
};

const NetworkNode: React.FC<{ angle: number; distance: number; delay: number; icon: React.ReactNode; label: string }> = ({ angle, distance, delay, icon, label }) => {
    const [hovered, setHovered] = useState(false);
    
    // Calculate position
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * distance;
    const y = Math.sin(rad) * distance;

    return (
        <>
            {/* Connection Line */}
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

            {/* Node */}
            <motion.div
                className={`absolute w-12 h-12 rounded-full border bg-charcoal flex items-center justify-center cursor-pointer transition-all duration-300 z-20
                    ${hovered ? 'border-brand text-brand scale-110 shadow-[0_0_15px_rgba(255,31,31,0.4)]' : 'border-white/20 text-silver hover:border-brand/50'}
                `}
                style={{ 
                    x: x, 
                    y: y,
                    transform: 'translate(-50%, -50%)' // Center the node itself
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
}

export default SmartWebsites;

