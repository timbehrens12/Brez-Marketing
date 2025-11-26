import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion, useInView } from 'framer-motion';
import { Lock, FileText, BarChart2, ShieldCheck } from 'lucide-react';

const data = [
  { name: 'Jan', clicks: 4000, conv: 2400 },
  { name: 'Feb', clicks: 3000, conv: 1398 },
  { name: 'Mar', clicks: 2000, conv: 9800 },
  { name: 'Apr', clicks: 2780, conv: 3908 },
  { name: 'May', clicks: 1890, conv: 4800 },
  { name: 'Jun', clicks: 2390, conv: 3800 },
  { name: 'Jul', clicks: 3490, conv: 4300 },
];

const Results: React.FC = () => {
  const differentiators = [
    { icon: <BarChart2 size={18} />, title: "Transparent Reporting", desc: "Real-time dashboards. You see what we see." },
    { icon: <ShieldCheck size={18} />, title: "ROI Focused", desc: "We track leads, not just vanity metrics." },
    { icon: <Lock size={18} />, title: "No Long Contracts", desc: "We earn your business every single month." },
    { icon: <FileText size={18} />, title: "Full Data Ownership", desc: "You own your ad account and data. Always." },
  ];

  return (
    <section className="py-32 bg-charcoal w-full relative">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-start">
            <div>
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="font-display text-4xl mb-6">Why <span className="text-brand">TLUCA?</span></h2>
                    <p className="text-silver mb-8 leading-relaxed font-mono">
                        Most agencies hide behind confusing reports and long-term contracts. We do things differently.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                         {differentiators.map((diff, i) => (
                             <div key={i} className="p-4 border border-white/10 bg-white/5 backdrop-blur-sm flex flex-col gap-2 hover:bg-white/10 transition-colors">
                                 <div className="text-brand mb-1">{diff.icon}</div>
                                 <div className="font-display text-sm text-white">{diff.title}</div>
                                 <div className="text-xs text-silver/60 leading-tight">{diff.desc}</div>
                             </div>
                         ))}
                    </div>

                    <div className="p-6 border border-brand/20 bg-brand/5 rounded-lg relative overflow-hidden group">
                        <div className="absolute inset-0 bg-brand/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                        <h4 className="font-mono text-brand text-sm mb-2 uppercase relative z-10">Our Promise</h4>
                        <p className="text-sm text-white/80 relative z-10">We set up everything for you. From ad creative to the CRM backend. You focus on running your business, we handle the growth engine.</p>
                    </div>
                </motion.div>
            </div>

            {/* Chart Section */}
            <div>
                <div className="h-[400px] w-full bg-black/50 border border-white/10 p-4 rounded-xl relative overflow-hidden shadow-2xl">
                    <div className="absolute top-4 left-4 flex space-x-2 z-10">
                        <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                    </div>
                    <div className="absolute top-4 right-4 text-xs font-mono text-brand z-10">LIVE PERFORMANCE DATA</div>
                    
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 40, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FF1F1F" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#FF1F1F" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" tick={{fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono'}} />
                            <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono'}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0A0A0C', borderColor: '#333', color: '#fff' }}
                                itemStyle={{ color: '#FF1F1F', fontFamily: 'JetBrains Mono' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="conv" 
                                stroke="#FF1F1F" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorConv)" 
                                animationDuration={2000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                    
                    {/* Glitch Overlay */}
                    <div className="absolute inset-0 pointer-events-none bg-scanlines opacity-10"></div>
                </div>
                
                {/* Metric Counters */}
                <div className="mt-6 flex justify-between gap-4">
                    <Counter label="AVG ROAS" value={450} suffix="%" />
                    <Counter label="CPA REDUCTION" value={32} suffix="%" />
                    <Counter label="LEADS" value={1240} suffix="+" />
                </div>
            </div>
        </div>
    </section>
  );
};

const Counter: React.FC<{ label: string; value: number; suffix: string }> = ({ label, value, suffix }) => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true });
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (isInView) {
            let start = 0;
            const end = value;
            const duration = 2000;
            const incrementTime = duration / end;
            
            // For large numbers, jump bigger steps
            const step = Math.ceil(end / 100);
            
            const timer = setInterval(() => {
                start += step;
                if (start >= end) {
                    start = end;
                    clearInterval(timer);
                }
                setCount(start);
            }, duration / 100);
            
            return () => clearInterval(timer);
        }
    }, [isInView, value]);

    return (
        <div ref={ref} className="bg-white/5 border border-white/10 p-4 rounded flex-1 text-center">
            <div className="text-2xl md:text-3xl font-display text-white mb-1">
                {count}{suffix}
            </div>
            <div className="text-[10px] md:text-xs font-mono text-brand tracking-widest">{label}</div>
        </div>
    );
};

export default Results;

