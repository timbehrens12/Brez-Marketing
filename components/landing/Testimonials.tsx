import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const Testimonials: React.FC = () => {
  return (
    <section className="py-24 bg-charcoal overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
         <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-white/5 border border-white/10 text-center">
                    <div className="text-3xl font-display text-brand mb-1">50+</div>
                    <div className="text-xs font-mono text-silver">ACTIVE CLIENTS</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 text-center">
                    <div className="text-3xl font-display text-brand mb-1">$2M+</div>
                    <div className="text-xs font-mono text-silver">AD SPEND MANAGED</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 text-center">
                    <div className="text-3xl font-display text-brand mb-1">10k+</div>
                    <div className="text-xs font-mono text-silver">LEADS GENERATED</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 text-center">
                    <div className="text-3xl font-display text-brand mb-1">4.9</div>
                    <div className="text-xs font-mono text-silver">AVG RATING</div>
                </div>
            </div>

            {/* Quotes */}
            <div className="relative">
                <div className="absolute -left-10 -top-10 text-9xl text-white/[0.03] font-serif">"</div>
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    className="relative z-10 space-y-8"
                >
                     <div className="p-6 border-l-2 border-brand bg-white/[0.02]">
                         <div className="flex gap-1 mb-4 text-brand"><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/></div>
                         <p className="text-silver italic mb-4">"Within 30 days, our call volume doubled. The missed call text-back feature alone has saved us thousands in lost revenue."</p>
                         <div className="font-display text-sm text-white">JOHN DOE <span className="text-brand mx-2">//</span> HVAC OWNER</div>
                     </div>

                     <div className="p-6 border-l-2 border-brand bg-white/[0.02]">
                         <div className="flex gap-1 mb-4 text-brand"><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/></div>
                         <p className="text-silver italic mb-4">"Finally an agency that shows me where my money is going. The dashboard is clean and the results are undeniable."</p>
                         <div className="font-display text-sm text-white">JANE SMITH <span className="text-brand mx-2">//</span> REAL ESTATE</div>
                     </div>
                </motion.div>
            </div>
         </div>
      </div>
    </section>
  );
};

export default Testimonials;

