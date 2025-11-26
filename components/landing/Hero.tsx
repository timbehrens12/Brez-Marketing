import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowRight, Layout, Zap, Cpu } from 'lucide-react';

const Hero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 400]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let centerX = width / 2;
    let frameId: number;
    let tick = 0;

    // CONFIG
    const COLOR_BG = '#0A0A0C';
    const COLOR_ACCENT = '#FF1F1F';
    const COLOR_UI = '#444444';
    const COLOR_HIGHLIGHT = '#FFFFFF';
    
    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    // --- GEOMETRY DEFINITIONS ---
    
    // 1. AD SOURCES (Top Layer) y = -300
    const adNodes = [
        { x: -100, y: -300, z: 0, label: 'GOOGLE' },
        { x: 0, y: -320, z: 20, label: 'META' },
        { x: 100, y: -300, z: 0, label: 'LSA' }
    ];

    // 2. SMART WEBSITE (Upper Middle) y = -120
    const webY = -120;
    interface UIRect {
        x: number; y: number; z: number; w: number; h: number; color: string; fill?: boolean; id?: string;
    }

    const uiElements: UIRect[] = [
        // Browser Window Frame
        { x: 0, y: webY, z: 0, w: 240, h: 180, color: '#333333', id: 'frame' },
        // Header
        { x: 0, y: webY - 70, z: 5, w: 200, h: 10, color: COLOR_UI },
        // Hero Section Box
        { x: -40, y: webY - 30, z: 5, w: 100, h: 40, color: COLOR_UI },
        // Hero Sidebar/Image
        { x: 60, y: webY - 30, z: 5, w: 40, h: 40, color: COLOR_UI, fill: false },
        // CTA BUTTON (The Target)
        { x: -60, y: webY + 10, z: 15, w: 40, h: 10, color: COLOR_ACCENT, fill: true, id: 'cta' },
        // Feature Grid
        { x: -50, y: webY + 50, z: 5, w: 40, h: 30, color: COLOR_UI },
        { x: 0, y: webY + 50, z: 5, w: 40, h: 30, color: COLOR_UI },
        { x: 50, y: webY + 50, z: 5, w: 40, h: 30, color: COLOR_UI },
    ];

    // 3. AI ENGINE (Lower Middle) y = 80
    const aiNode = { x: 0, y: 80, z: 10, radius: 25 };

    // 4. OWNER PHONE (Bottom) y = 240
    const ownerY = 240;
    const ownerElements: UIRect[] = [
        // Phone Body
        { x: 0, y: ownerY, z: 0, w: 100, h: 180, color: '#666', id: 'phone' },
        // Screen
        { x: 0, y: ownerY, z: 5, w: 90, h: 160, color: '#222', fill: true },
        // Notification Pill
        { x: 0, y: ownerY - 40, z: 10, w: 70, h: 20, color: COLOR_ACCENT, fill: true, id: 'notif' },
    ];

    interface User {
        x: number; y: number; z: number;
        targetX: number; targetY: number; targetZ: number;
        speed: number;
        state: 'spawn' | 'captured' | 'qualified' | 'delivered' | 'done';
        sourceIndex: number;
        color: string;
        trail: {x: number, y: number}[];
    }
    
    const users: User[] = [];
    const conversions: { x: number, y: number, z: number, r: number, o: number }[] = [];

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      // Offset center to the right on large screens
      centerX = width >= 1024 ? width * 0.75 : width * 0.5;
    };

    const handleMouseMove = (e: MouseEvent) => {
        mouseX = (e.clientX / width) - 0.5;
        mouseY = (e.clientY / height) - 0.5;
    };

    const project = (x: number, y: number, z: number) => {
        const radX = targetRotationX; 
        const radY = targetRotationY;
        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);

        // Rotate Y
        const x1 = x * cosY - z * sinY;
        const z1 = z * cosY + x * sinY;

        // Rotate X
        const y2 = y * cosX - z1 * sinX;
        const z2 = z1 * cosX + y * sinX;

        // Perspective
        const scale = 800 / (800 + z2);
        return {
            x: centerX + x1 * scale, 
            y: height/2 + y2 * scale, 
            z: z2,
            scale: scale
        };
    };

    const drawRect = (rect: UIRect) => {
        const hw = rect.w / 2;
        const hh = rect.h / 2;
        
        const p1 = project(rect.x - hw, rect.y - hh, rect.z);
        const p2 = project(rect.x + hw, rect.y - hh, rect.z);
        const p3 = project(rect.x + hw, rect.y + hh, rect.z);
        const p4 = project(rect.x - hw, rect.y + hh, rect.z);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        if (rect.fill) {
            if (rect.id === 'cta') {
                 ctx.fillStyle = `rgba(255, 31, 31, ${0.5 + Math.sin(tick * 0.1)*0.3})`;
            } else if (rect.id === 'notif') {
                 ctx.fillStyle = `rgba(255, 31, 31, ${0.8 + Math.sin(tick * 0.2)*0.2})`;
            } else {
                 ctx.fillStyle = rect.color === '#222' ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.05)';
            }
            ctx.fill();
        }
        
        ctx.strokeStyle = (rect.id === 'cta' || rect.id === 'notif') ? COLOR_ACCENT : rect.color;
        ctx.lineWidth = (rect.id === 'frame' || rect.id === 'phone') ? 2 : 1;
        ctx.stroke();

        // CTA GLOW
        if (rect.id === 'cta') {
            const center = project(rect.x, rect.y, rect.z);
            const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 20 * center.scale);
            grad.addColorStop(0, 'rgba(255,31,31,0.4)');
            grad.addColorStop(1, 'rgba(255,31,31,0)');
            ctx.fillStyle = grad;
            ctx.fill();
        }
    };

    const drawLabel = (text: string, x: number, y: number, z: number, align: 'left' | 'right' = 'left', color: string = COLOR_HIGHLIGHT) => {
        const p = project(x, y, z);
        if (p.scale <= 0) return;

        ctx.font = '10px JetBrains Mono';
        ctx.fillStyle = color;
        ctx.textAlign = align;
        
        const offsetX = align === 'left' ? 20 : -20;
        const textX = p.x + offsetX;
        
        // Line
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(textX, p.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.stroke();

        ctx.fillText(text, textX + (align === 'left' ? 5 : -5), p.y + 3);
    };

    const draw = () => {
      tick++;
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, width, height);

      // Rotation Logic (Interactive Tilt)
      targetRotationX += (mouseY * 0.5 - 0.2 - targetRotationX) * 0.05;
      targetRotationY += (mouseX * 0.5 - targetRotationY) * 0.05;

      // 1. DRAW AD SOURCES (Top)
      adNodes.forEach((node, i) => {
          const p = project(node.x, node.y, node.z);
          // Draw Node Box
          ctx.strokeStyle = COLOR_HIGHLIGHT;
          ctx.lineWidth = 1;
          ctx.strokeRect(p.x - 15 * p.scale, p.y - 10 * p.scale, 30 * p.scale, 20 * p.scale);
          // Label
          ctx.font = `${8 * p.scale}px JetBrains Mono`;
          ctx.fillStyle = COLOR_ACCENT;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, p.x, p.y - 15 * p.scale);
      });

      // 2. DRAW SMART WEBSITE (Upper Middle)
      uiElements.forEach(drawRect);

      // 3. DRAW AI ENGINE (Lower Middle)
      const aiP = project(aiNode.x, aiNode.y, aiNode.z);
      ctx.beginPath();
      ctx.arc(aiP.x, aiP.y, aiNode.radius * aiP.scale, 0, Math.PI * 2);
      ctx.strokeStyle = COLOR_ACCENT;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Inner rotating ring
      ctx.beginPath();
      ctx.ellipse(aiP.x, aiP.y, (aiNode.radius - 5) * aiP.scale, (aiNode.radius - 15) * aiP.scale, tick * 0.05, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 31, 31, 0.5)';
      ctx.stroke();

      // 4. DRAW OWNER PHONE (Bottom)
      ownerElements.forEach(drawRect);
      // Phone Home Button
      const phoneP = project(0, ownerY + 70, 5);
      ctx.beginPath();
      ctx.arc(phoneP.x, phoneP.y, 4 * phoneP.scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#444';
      ctx.stroke();

      // 5. SPAWN PARTICLES (Traffic)
      if (tick % 8 === 0) {
          const sourceIdx = Math.floor(Math.random() * 3);
          const source = adNodes[sourceIdx];
          users.push({
              x: source.x, 
              y: source.y, 
              z: source.z,
              targetX: -60 + (Math.random()-0.5)*20, // Website CTA
              targetY: webY + 10, 
              targetZ: 15,
              speed: 6 + Math.random() * 2,
              state: 'spawn',
              sourceIndex: sourceIdx,
              color: '#FFFFFF', // Starts White (Raw Traffic)
              trail: []
          });
      }

      // 6. UPDATE & DRAW PARTICLES
      for (let i = users.length - 1; i >= 0; i--) {
          const u = users[i];
          
          // Move towards target
          const dx = u.targetX - u.x;
          const dy = u.targetY - u.y;
          const dz = u.targetZ - u.z;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

          // Movement Logic
          if (dist < 10) {
              if (u.state === 'spawn') {
                  // Reached Website CTA -> Capture -> Send to AI
                  conversions.push({ x: u.x, y: u.y, z: u.z, r: 5, o: 0.8 }); // Tap effect
                  u.state = 'captured';
                  u.targetX = aiNode.x;
                  u.targetY = aiNode.y;
                  u.targetZ = aiNode.z;
              } else if (u.state === 'captured') {
                  // Reached AI -> Qualify -> Send to Owner
                  u.state = 'qualified';
                  u.color = COLOR_ACCENT; // Turn Red
                  u.targetX = 0;
                  u.targetY = ownerY - 40; // Notification pill
                  u.targetZ = 10;
                  // AI Processing Ripple
                  conversions.push({ x: aiNode.x, y: aiNode.y, z: aiNode.z, r: 10, o: 0.5 });
              } else if (u.state === 'qualified') {
                  // Reached Owner -> Done
                  conversions.push({ x: u.x, y: u.y, z: u.z, r: 15, o: 1 }); // Notification Ripple
                  u.state = 'delivered';
                  u.state = 'done';
              }
          } else {
              u.x += (dx / dist) * u.speed;
              u.y += (dy / dist) * u.speed;
              u.z += (dz / dist) * u.speed;
          }

          if (u.state !== 'done') {
              const p = project(u.x, u.y, u.z);
              
              // Trail
              u.trail.push({x: p.x, y: p.y});
              if (u.trail.length > 5) u.trail.shift();

              ctx.beginPath();
              u.trail.forEach((t, idx) => {
                  if(idx === 0) ctx.moveTo(t.x, t.y);
                  else ctx.lineTo(t.x, t.y);
              });
              ctx.strokeStyle = u.color === COLOR_HIGHLIGHT ? 'rgba(255,255,255,0.2)' : 'rgba(255,31,31,0.5)';
              ctx.stroke();

              ctx.fillStyle = u.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 2 * p.scale, 0, Math.PI * 2);
              ctx.fill();
          } else {
              users.splice(i, 1);
          }
      }

      // 7. DRAW RIPPLES (Conversions/AI Processing)
      for (let i = conversions.length - 1; i >= 0; i--) {
          const c = conversions[i];
          c.r += 1.5;
          c.o -= 0.05;

          if (c.o <= 0) {
              conversions.splice(i, 1);
              continue;
          }

          const p = project(c.x, c.y, c.z);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, c.r * p.scale, c.r * 0.6 * p.scale, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${c.o})`;
          ctx.lineWidth = 1;
          ctx.stroke();
      }

      // 8. LABELS
      drawLabel("AD TRAFFIC", -120, -300, 0, 'right');
      drawLabel("SMART WEBSITE", 100, webY, 0, 'left');
      drawLabel("AI PROCESSING", -50, 80, 10, 'right', COLOR_ACCENT);
      drawLabel("BUSINESS OWNER", 70, ownerY, 0, 'left');

      frameId = requestAnimationFrame(draw);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section className="relative min-h-screen w-full flex items-center overflow-hidden bg-charcoal">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-100" />
      
      {/* Cinematic Vignette - Lighter on the right to show animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/80 to-transparent z-10 pointer-events-none" />
      
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center h-full pt-20 pb-10">
        
        {/* TEXT CONTENT - LEFT 2/3 */}
        <motion.div 
          className="lg:col-span-8 flex flex-col items-start text-left"
          style={{ y, opacity }}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="mb-8 flex items-center space-x-3 text-brand border border-brand/30 px-5 py-2 rounded-full bg-charcoal/90 backdrop-blur-md shadow-[0_0_25px_rgba(255,31,31,0.3)]"
            >
                <Cpu size={14} className="animate-pulse" />
                <span className="text-[10px] md:text-xs font-mono tracking-widest text-white">SYSTEM ARCHITECTS</span>
            </motion.div>

            {/* HEADLINE */}
            <h1 className="flex flex-col items-start font-display font-bold uppercase tracking-tighter mix-blend-screen mb-8 drop-shadow-[0_0_15px_rgba(255,31,31,0.6)] leading-none w-full">
            <span className="text-4xl md:text-6xl lg:text-7xl text-white mb-2">SMART WEBSITES</span>
            
            {/* Schematic Divider */}
            <div className="flex items-center gap-4 my-2 opacity-60 w-full max-w-md">
                <div className="h-[1px] w-12 bg-white"></div>
                <div className="w-2 h-2 bg-brand border border-white rotate-45"></div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-white to-transparent"></div>
            </div>

            <span className="text-4xl md:text-6xl lg:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-brand via-white to-brand bg-[length:200%_auto] animate-shine">
                PERFORMANCE ADS
            </span>
            </h1>

            <p className="max-w-xl text-silver/90 font-mono text-xs md:text-sm mb-12 leading-relaxed tracking-wide backdrop-blur-sm bg-black/40 p-4 rounded-lg border border-brand/10">
            Deploy them <span className="text-white font-bold border-b border-brand">independently</span> or combine them for <span className="text-white font-bold border-b border-brand">total ecosystem dominance</span>.
            </p>

            {/* ACTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <a href="/onboarding" className="group relative p-6 bg-white/5 border border-white/10 hover:border-brand/50 rounded-lg text-left transition-all duration-300 hover:bg-white/10 overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity text-brand">
                        <Layout size={24} />
                    </div>
                    <div className="font-mono text-[10px] text-brand mb-2 tracking-widest">OPTION A</div>
                    <div className="font-display text-xl text-white mb-1">BUILD WEBSITE</div>
                    <div className="text-xs text-silver/60 mb-4">AI-Integrated Architecture & Automation</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:gap-4 transition-all">
                        GET STARTED <ArrowRight size={14} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </a>

                <a href="/onboarding" className="group relative p-6 bg-white/5 border border-white/10 hover:border-brand/50 rounded-lg text-left transition-all duration-300 hover:bg-white/10 overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity text-brand">
                        <Zap size={24} />
                    </div>
                    <div className="font-mono text-[10px] text-brand mb-2 tracking-widest">OPTION B</div>
                    <div className="font-display text-xl text-white mb-1">RUN ADS</div>
                    <div className="text-xs text-silver/60 mb-4">Google, LSA, & Meta Traffic Injection</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:gap-4 transition-all">
                        GET STARTED <ArrowRight size={14} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 delay-75"></div>
                </a>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-[10px] font-mono text-silver/40">
                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse"></div>
                RECOMMENDATION: COMBINE BOTH FOR MAXIMUM REVENUE
            </div>
        </motion.div>

        {/* ANIMATION SPACE - RIGHT 1/3 */}
        <div className="lg:col-span-4 h-full min-h-[500px] pointer-events-none hidden lg:block">
            {/* The canvas renders here due to the projection logic update */}
        </div>

      </div>

      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-brand/50 z-20"
        animate={{ y: [0, 10, 0], opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <ArrowDown size={24} />
      </motion.div>
    </section>
  );
};

export default Hero;

