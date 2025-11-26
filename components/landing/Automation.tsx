import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Phone, Brain, Inbox, Smartphone, Star, Bell, Mail } from 'lucide-react';

const Automation: React.FC = () => {
  const features = [
    { 
        icon: <Phone size={24} />, 
        title: "Call Tracking & Recording",
        desc: "Know exactly which ad generated the call. Listen to recordings to improve staff performance."
    },
    { 
        icon: <MessageSquare size={24} />, 
        title: "Missed Call Text-Back",
        desc: "Never lose a lead to voicemail. Our system automatically texts back: 'Sorry I missed you, how can I help?'"
    },
    { 
        icon: <Brain size={24} />, 
        title: "AI Chat & Booking",
        desc: "Our AI nurtures leads 24/7, answers questions, and books appointments on your calendar automatically."
    },
    { 
        icon: <Inbox size={24} />, 
        title: "Unified Inbox",
        desc: "Manage SMS, Email, Facebook DMs, Instagram, and Google Chats in one single stream."
    },
    { 
        icon: <Star size={24} />, 
        title: "Auto-Reviews",
        desc: "Automatically request 5-star reviews via text after a job is completed."
    },
    { 
        icon: <Smartphone size={24} />, 
        title: "Mobile App for Owners",
        desc: "Run your entire business from your pocket. Reply to leads, view appointments, and send invoices."
    }
  ];

  return (
    <section className="py-24 bg-charcoal relative overflow-hidden border-t border-white/5">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
                <div>
                    <h2 className="font-display text-3xl md:text-5xl mb-6">
                        THE MACHINE <br/>
                        <span className="text-brand italic">THAT NEVER SLEEPS</span>
                    </h2>
                    <p className="font-mono text-silver leading-relaxed mb-6">
                        Generating leads is only half the battle. You need to convert them.
                        Our integrated CRM (Powered by GoHighLevel) builds the pipelines that turn traffic into revenue.
                    </p>
                    
                    {/* Mobile App Highlight Card */}
                    <div className="mt-8 p-6 bg-brand/5 border border-brand/20 rounded-lg flex items-start gap-4">
                        <div className="p-3 bg-brand text-black rounded-lg">
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <h4 className="font-display text-white text-lg mb-1">OWNER COMMAND CENTER</h4>
                            <p className="text-xs text-silver leading-relaxed">
                                You get full access to the <strong>LeadConnector App</strong>. Get push notifications for every new lead, reply instantly via text, and see your pipeline revenue in real-time.
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Visual Graphic Representation of flow - ANIMATED */}
                <div className="relative bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm overflow-hidden min-h-[400px]">
                    <div className="absolute top-0 right-0 p-2 z-20">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                    </div>

                    <div className="space-y-6 mt-4 font-mono text-xs relative z-10">
                        {/* Step 1 */}
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-3 opacity-50"
                        >
                            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0 z-10 relative">
                                <Phone size={14}/>
                            </div>
                            <div className="flex-1 bg-white/5 h-8 rounded flex items-center px-3">Incoming Call... (Missed)</div>
                        </motion.div>

                        {/* Step 2 */}
                        <motion.div 
                             initial={{ opacity: 0, x: -10 }}
                             whileInView={{ opacity: 1, x: 0 }}
                             transition={{ delay: 0.8 }}
                             className="flex items-center gap-3"
                        >
                            <div className="w-8 h-8 rounded bg-brand flex items-center justify-center text-black shrink-0 z-10 relative shadow-[0_0_15px_rgba(255,31,31,0.5)]">
                                <MessageSquare size={14}/>
                            </div>
                            <div className="flex-1 bg-brand/20 border border-brand/30 h-8 rounded flex items-center px-3 text-brand">Auto-SMS: "Hi, how can I help?"</div>
                        </motion.div>

                        {/* Step 3 */}
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.4 }}
                            className="flex items-center gap-3 pl-8"
                        >
                             <div className="flex-1 bg-white/10 h-8 rounded flex items-center px-3">Lead: "I need a quote."</div>
                             <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center shrink-0">👤</div>
                        </motion.div>

                        {/* Step 4 */}
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 2.0 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-8 h-8 rounded bg-brand flex items-center justify-center text-black shrink-0 z-10 relative shadow-[0_0_15px_rgba(255,31,31,0.5)]">
                                <Brain size={14}/>
                            </div>
                            <div className="flex-1 bg-brand/20 border border-brand/30 h-8 rounded flex items-center px-3 text-brand">AI: "Sure! What day works best?"</div>
                        </motion.div>

                         {/* Step 5 */}
                         <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 2.6 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white shrink-0 z-10 relative">
                                <Bell size={14}/>
                            </div>
                            <div className="flex-1 bg-white/10 border border-white/20 h-8 rounded flex items-center px-3 text-silver">Push Notification Sent to Owner App</div>
                        </motion.div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 bg-white/[0.03] border border-white/5 hover:border-brand/40 transition-colors group cursor-default flex flex-col h-full"
                    >
                        <div className="mb-4 text-brand group-hover:scale-110 transition-transform duration-300">
                            {feature.icon}
                        </div>
                        <h3 className="font-display text-lg mb-2">{feature.title}</h3>
                        <p className="font-sans text-xs text-silver/70 leading-relaxed">
                            {feature.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
    </section>
  );
};

export default Automation;

