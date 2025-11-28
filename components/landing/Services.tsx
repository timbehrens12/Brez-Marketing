import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Search, MapPin, Facebook, Flame, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const Services: React.FC = () => {
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
      ]
    },
    {
      id: 'meta',
      icon: <Facebook className="w-8 h-8 text-brand" />,
      title: 'Meta Ads',
      subtitle: 'DEMAND GENERATION',
      desc: 'Pattern-interrupt creative that stops the scroll and fills your funnel.',
      features: [
        'Lead Forms & Messaging',
        'Retargeting Visitors',
        'Lookalike Modeling',
        'Creative Strategy'
      ]
    }
  ];

  return (
    <section id="ads" className="relative py-32 w-full bg-charcoal border-t border-white/5 overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,31,31,0.03),transparent_60%)]"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="mb-20 flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-10">
          <div>
            <div className="flex items-center gap-2 text-brand mb-2">
                <Flame size={18} className="animate-pulse" />
                <span className="font-mono text-xs tracking-widest">SYSTEM PILLAR 2: TRAFFIC</span>
            </div>
            <h2 className="font-display text-4xl text-white mb-2">PERFORMANCE <span className="text-brand">MARKETING</span></h2>
            <p className="font-mono text-silver text-sm max-w-xl">
              Infrastructure is useless without volume. We execute high-precision ad campaigns to pour leads into your new Smart Website.
            </p>
          </div>
          <div className="hidden md:block font-mono text-xs text-brand text-right">
            PROTOCOL: ACTIVE<br/>
            STATUS: SCALING
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 perspective-1000">
          {services.map((service, i) => (
            <TiltCard key={service.id} index={i}>
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
                    {service.features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs font-mono text-silver/80">
                        <div className="w-1.5 h-1.5 bg-brand rounded-full" />
                        <span>{feature}</span>
                    </div>
                    ))}
                </div>
            </TiltCard>
          ))}

          {/* Get Started Widget */}
          <div className="mt-16 pt-8 border-t border-white/10 text-center">
              <Link href="/onboarding">
                  <button className="group relative px-8 py-4 bg-brand text-white font-display font-bold text-lg tracking-wider overflow-hidden hover:scale-105 transition-all duration-300">
                      <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                          GET STARTED WITH ADS <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                      </span>
                      <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-0" />
                  </button>
              </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const TiltCard: React.FC<{ children: React.ReactNode; index: number }> = ({ children, index }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    
    const mouseX = useSpring(x, { stiffness: 500, damping: 30 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 30 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;
        const xPct = mouseXVal / width - 0.5;
        const yPct = mouseYVal / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d"
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
            className="group relative h-full min-h-[420px] bg-white/[0.02] border border-white/10 p-8 flex flex-col transition-colors duration-300 hover:border-brand/50 will-change-transform cursor-crosshair"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg" />
            <div className="transform-gpu" style={{ transform: "translateZ(20px)" }}>
                {children}
            </div>
        </motion.div>
    );
}

export default Services;

