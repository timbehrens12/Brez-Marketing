import React from 'react';
import { motion } from 'framer-motion';

const Onboarding: React.FC = () => {
  const steps = [
    { title: "Sign Up", desc: "Select your plan and complete the secure checkout." },
    { title: "Intake Form", desc: "We collect your assets (Logos, Offers, Access)." },
    { title: "System Setup", desc: "We build your campaigns and CRM pipeline (3-5 Days)." },
    { title: "Launch", desc: "Ads go live. Leads start flowing to your dashboard." },
  ];

  return (
    <section className="py-24 bg-charcoal relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="font-display text-3xl md:text-5xl mb-4">Launch <span className="text-brand">Timeline</span></h2>
                <p className="font-mono text-silver max-w-lg mx-auto">
                    Rapid deployment. We get your infrastructure online in under a week.
                </p>
            </div>

            <div className="relative">
                {/* Connector Line */}
                <div className="absolute top-[20px] md:top-[20px] left-0 w-full h-0.5 bg-white/10 hidden md:block"></div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {steps.map((step, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            className="relative flex flex-col md:items-center text-left md:text-center"
                        >
                            {/* Dot */}
                            <div className="w-10 h-10 rounded-full bg-charcoal border-2 border-brand text-brand font-mono flex items-center justify-center z-10 mb-4 shadow-[0_0_15px_rgba(255,31,31,0.2)]">
                                {i + 1}
                            </div>
                            
                            <h3 className="font-display text-lg text-white mb-2">{step.title}</h3>
                            <p className="font-sans text-sm text-silver/60">{step.desc}</p>
                            
                            {/* Mobile line segment */}
                            {i !== steps.length - 1 && (
                                <div className="absolute left-5 top-10 bottom-[-32px] w-0.5 bg-white/10 md:hidden"></div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    </section>
  );
};

export default Onboarding;

