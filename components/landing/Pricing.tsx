import React from 'react';
import { Check } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const Pricing: React.FC = () => {
  return (
    <section className="py-24 bg-charcoal border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
         <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl mb-4">Investment <span className="text-brand">Structure</span></h2>
            <p className="font-mono text-silver max-w-xl mx-auto">
                Simple WAAS (Website as a Service) Model. Low upfront, predictable monthly.
            </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 perspective-1000">
            {/* Tier 1: The Build */}
            <PricingCard>
                <div className="text-silver/50 font-mono text-xs mb-4">STEP 1: THE BUILD</div>
                <h3 className="font-display text-2xl text-white mb-2">Build Fee</h3>
                <div className="text-4xl font-mono text-brand mb-6">$X <span className="text-sm text-silver">one-time</span></div>
                <p className="text-sm text-silver/70 mb-8 border-b border-white/10 pb-8">
                    We architect your entire digital presence. High-converting website + System Setup.
                </p>
                <ul className="space-y-3 mt-auto">
                    <li className="flex items-center gap-3 text-sm text-silver"><Check size={14} className="text-brand"/> Custom Website Design</li>
                    <li className="flex items-center gap-3 text-sm text-silver"><Check size={14} className="text-brand"/> SEO Structure</li>
                    <li className="flex items-center gap-3 text-sm text-silver"><Check size={14} className="text-brand"/> CRM & Pipeline Setup</li>
                </ul>
            </PricingCard>

            {/* Tier 2: The Subscription */}
            <PricingCard highlighted>
                <div className="absolute top-0 right-0 px-3 py-1 bg-brand text-black font-bold text-xs">REQUIRED</div>
                <div className="text-brand/80 font-mono text-xs mb-4">STEP 2: THE SYSTEM</div>
                <h3 className="font-display text-2xl text-white mb-2">Subscription</h3>
                <div className="text-4xl font-mono text-white mb-6">$X <span className="text-sm text-silver">/mo</span></div>
                <p className="text-sm text-silver/70 mb-8 border-b border-white/10 pb-8">
                    Your all-in-one operating cost. Replaces hosting, CRM, and texting tools.
                </p>
                <ul className="space-y-3 mt-auto">
                    <li className="flex items-center gap-3 text-sm text-white"><Check size={14} className="text-brand"/> Hosting & Maintenance</li>
                    <li className="flex items-center gap-3 text-sm text-white"><Check size={14} className="text-brand"/> CRM & Mobile App</li>
                    <li className="flex items-center gap-3 text-sm text-white"><Check size={14} className="text-brand"/> Unlimited Automations</li>
                    <li className="flex items-center gap-3 text-sm text-white"><Check size={14} className="text-brand"/> 2-Way SMS & Email</li>
                </ul>
            </PricingCard>

            {/* Tier 3: The Fuel */}
            <PricingCard>
                <div className="text-silver/50 font-mono text-xs mb-4">STEP 3: THE FUEL</div>
                <h3 className="font-display text-2xl text-white mb-2">Ad Traffic</h3>
                <div className="text-4xl font-mono text-brand mb-6">$X+ <span className="text-sm text-silver">/mo</span></div>
                <p className="text-sm text-silver/70 mb-8 border-b border-white/10 pb-8">
                    Optional Acceleration. Paid directly to Google/Meta to drive new leads.
                </p>
                <ul className="space-y-3 mt-auto">
                    <li className="flex items-center gap-3 text-sm text-silver"><Check size={14} className="text-brand"/> Google Ads Mgmt</li>
                    <li className="flex items-center gap-3 text-sm text-silver"><Check size={14} className="text-brand"/> LSA Optimization</li>
                    <li className="flex items-center gap-3 text-sm text-silver"><Check size={14} className="text-brand"/> Meta Ads Mgmt</li>
                </ul>
            </PricingCard>
         </div>
      </div>
    </section>
  );
};

const PricingCard: React.FC<{ children: React.ReactNode; highlighted?: boolean }> = ({ children, highlighted }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    
    const mouseX = useSpring(x, { stiffness: 500, damping: 30 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 30 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["10deg", "-10deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-10deg", "10deg"]);

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
        <motion.div
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d"
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`p-8 rounded-lg flex flex-col relative overflow-hidden transition-all duration-300 transform-gpu
                ${highlighted 
                    ? 'bg-brand/[0.05] border border-brand/30 shadow-[0_0_30px_rgba(255,31,31,0.1)]' 
                    : 'bg-white/[0.02] border border-white/10 hover:border-brand/40'
                }`}
        >
             {/* Glossy reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div style={{ transform: "translateZ(30px)" }} className="flex flex-col h-full">
                {children}
            </div>
        </motion.div>
    );
};

export default Pricing;

