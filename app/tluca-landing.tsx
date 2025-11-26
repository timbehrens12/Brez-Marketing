"use client"

import React, { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion'
import { ArrowRight, ArrowDown, Layout, Zap, Cpu, ChevronRight, Target, Users, BarChart3, Check, MessageSquare, Phone, TrendingUp, Shield, Globe, Activity, Search, DollarSign, MapPin, Facebook, Flame, Smartphone, Database, Lock, Gauge, Star, Quote } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Color scheme from Google AI Studio design
const COLORS = {
  brand: '#FF1F1F',
  'brand-dark': '#8a0a0a',
  charcoal: '#0A0A0C',
  silver: '#C0C0C0',
  white: '#FFFFFF',
}

// Custom cursor component from Google AI Studio
function CustomCursor() {
  const [isHovered, setIsHovered] = useState(false)
  // Stiffer springs for less "laggy" feel
  const cursorX = useSpring(0, { stiffness: 1000, damping: 50 })
  const cursorY = useSpring(0, { stiffness: 1000, damping: 50 })
  const cursorOuterX = useSpring(0, { stiffness: 300, damping: 30 })
  const cursorOuterY = useSpring(0, { stiffness: 300, damping: 30 })

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 4) // Center offset
      cursorY.set(e.clientY - 4)
      cursorOuterX.set(e.clientX - 24)
      cursorOuterY.set(e.clientY - 24)

      const target = e.target as HTMLElement
      setIsHovered(!!target.closest('button, a, [data-hover="true"]'))
    }

    window.addEventListener('mousemove', moveCursor)
    return () => window.removeEventListener('mousemove', moveCursor)
  }, [cursorX, cursorY, cursorOuterX, cursorOuterY])

  return (
    <>
      {/* Inner Dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 bg-brand rounded-full pointer-events-none z-[100] mix-blend-screen will-change-transform"
        style={{ x: cursorX, y: cursorY }}
      />
      {/* Outer Ring */}
      <motion.div
        className="fixed top-0 left-0 w-12 h-12 border border-brand/50 rounded-full pointer-events-none z-[100] mix-blend-screen will-change-transform"
        style={{ x: cursorOuterX, y: cursorOuterY }}
        animate={{
          scale: isHovered ? 1.5 : 1,
          opacity: isHovered ? 0.8 : 0.3,
          borderWidth: isHovered ? '2px' : '1px',
        }}
        transition={{ duration: 0.2 }}
      />
    </>
  )
}

// Hero Section with 3D Canvas Animation
function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 1000], [0, 400])
  const opacity = useTransform(scrollY, [0, 500], [1, 0])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    let centerX = width >= 1024 ? width * 0.75 : width * 0.5
    let frameId: number
    let tick = 0

    // CONFIG
    const COLOR_BG = COLORS.charcoal
    const COLOR_ACCENT = COLORS.brand
    const COLOR_UI = '#444444'
    const COLOR_HIGHLIGHT = COLORS.white

    // Mouse Interaction
    let mouseX = 0
    let mouseY = 0
    let targetRotationX = 0
    let targetRotationY = 0

    // --- GEOMETRY DEFINITIONS ---

    // 1. AD SOURCES (Top Layer) y = -300
    const adNodes = [
        { x: -100, y: -300, z: 0, label: 'GOOGLE' },
        { x: 0, y: -320, z: 20, label: 'META' },
        { x: 100, y: -300, z: 0, label: 'LSA' }
    ]

    // 2. SMART WEBSITE (Upper Middle) y = -120
    const webY = -120
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
    ]

    // 3. AI ENGINE (Lower Middle) y = 80
    const aiNode = { x: 0, y: 80, z: 10, radius: 25 }

    // 4. OWNER PHONE (Bottom) y = 240
    const ownerY = 240
    const ownerElements: UIRect[] = [
        // Phone Body
        { x: 0, y: ownerY, z: 0, w: 100, h: 180, color: '#666', id: 'phone' },
        // Screen
        { x: 0, y: ownerY, z: 5, w: 90, h: 160, color: '#222', fill: true },
        // Notification Pill
        { x: 0, y: ownerY - 40, z: 10, w: 70, h: 20, color: COLOR_ACCENT, fill: true, id: 'notif' },
    ]

    interface User {
        x: number; y: number; z: number;
        targetX: number; targetY: number; targetZ: number;
        speed: number;
        state: 'spawn' | 'captured' | 'qualified' | 'delivered' | 'done';
        sourceIndex: number;
        color: string;
        trail: {x: number, y: number}[];
    }

    const users: User[] = []
    const conversions: { x: number, y: number, z: number, r: number, o: number }[] = []

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
      // Offset center to the right on large screens
      centerX = width >= 1024 ? width * 0.75 : width * 0.5
    }

    const handleMouseMove = (e: MouseEvent) => {
        mouseX = (e.clientX / width) - 0.5
        mouseY = (e.clientY / height) - 0.5
    }

    const project = (x: number, y: number, z: number) => {
        const radX = targetRotationX
        const radY = targetRotationY
        const cosX = Math.cos(radX)
        const sinX = Math.sin(radX)
        const cosY = Math.cos(radY)
        const sinY = Math.sin(radY)

        // Rotate Y
        const x1 = x * cosY - z * sinY
        const z1 = z * cosY + x * sinY

        // Rotate X
        const y2 = y * cosX - z1 * sinX
        const z2 = z1 * cosX + y * sinY

        // Perspective
        const scale = 800 / (800 + z2)
        return {
            x: centerX + x1 * scale,
            y: height/2 + y2 * scale,
            z: z2,
            scale: scale
        }
    }

    const drawRect = (rect: UIRect) => {
        const hw = rect.w / 2
        const hh = rect.h / 2

        const p1 = project(rect.x - hw, rect.y - hh, rect.z)
        const p2 = project(rect.x + hw, rect.y - hh, rect.z)
        const p3 = project(rect.x + hw, rect.y + hh, rect.z)
        const p4 = project(rect.x - hw, rect.y + hh, rect.z)

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.lineTo(p3.x, p3.y)
        ctx.lineTo(p4.x, p4.y)
        ctx.closePath()

        if (rect.fill) {
            if (rect.id === 'cta') {
                 ctx.fillStyle = `rgba(255, 31, 31, ${0.5 + Math.sin(tick * 0.1)*0.3})`
            } else if (rect.id === 'notif') {
                 ctx.fillStyle = `rgba(255, 31, 31, ${0.8 + Math.sin(tick * 0.2)*0.2})`
            } else {
                 ctx.fillStyle = rect.color === '#222' ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.05)'
            }
            ctx.fill()
        }

        ctx.strokeStyle = (rect.id === 'cta' || rect.id === 'notif') ? COLOR_ACCENT : rect.color
        ctx.lineWidth = (rect.id === 'frame' || rect.id === 'phone') ? 2 : 1
        ctx.stroke()

        // CTA GLOW
        if (rect.id === 'cta') {
            const center = project(rect.x, rect.y, rect.z)
            const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 20 * center.scale)
            grad.addColorStop(0, 'rgba(255,31,31,0.4)')
            grad.addColorStop(1, 'rgba(255,31,31,0)')
            ctx.fillStyle = grad
            ctx.fill()
        }
    }

    const drawLabel = (text: string, x: number, y: number, z: number, align: 'left' | 'right' = 'left', color: string = COLOR_HIGHLIGHT) => {
        const p = project(x, y, z)
        if (p.scale <= 0) return

        ctx.font = '10px JetBrains Mono'
        ctx.fillStyle = color
        ctx.textAlign = align

        const offsetX = align === 'left' ? 20 : -20
        const textX = p.x + offsetX

        // Line
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(textX, p.y)
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'
        ctx.stroke()

        ctx.fillText(text, textX + (align === 'left' ? 5 : -5), p.y + 3)
    }

    const draw = () => {
      tick++
      ctx.fillStyle = COLOR_BG
      ctx.fillRect(0, 0, width, height)

      // Rotation Logic (Interactive Tilt)
      targetRotationX += (mouseY * 0.5 - 0.2 - targetRotationX) * 0.05
      targetRotationY += (mouseX * 0.5 - targetRotationY) * 0.05

      // 1. DRAW AD SOURCES (Top)
      adNodes.forEach((node, i) => {
          const p = project(node.x, node.y, node.z)
          // Draw Node Box
          ctx.strokeStyle = COLOR_HIGHLIGHT
          ctx.lineWidth = 1
          ctx.strokeRect(p.x - 15 * p.scale, p.y - 10 * p.scale, 30 * p.scale, 20 * p.scale)
          // Label
          ctx.font = `${8 * p.scale}px JetBrains Mono`
          ctx.fillStyle = COLOR_ACCENT
          ctx.textAlign = 'center'
          ctx.fillText(node.label, p.x, p.y - 15 * p.scale)
      })

      // 2. DRAW SMART WEBSITE (Upper Middle)
      uiElements.forEach(drawRect)

      // 3. DRAW AI ENGINE (Lower Middle)
      const aiP = project(aiNode.x, aiNode.y, aiNode.z)
      ctx.beginPath()
      ctx.arc(aiP.x, aiP.y, aiNode.radius * aiP.scale, 0, Math.PI * 2)
      ctx.strokeStyle = COLOR_ACCENT
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.stroke()
      ctx.setLineDash([])
      // Inner rotating ring
      ctx.beginPath()
      ctx.ellipse(aiP.x, aiP.y, (aiNode.radius - 5) * aiP.scale, (aiNode.radius - 15) * aiP.scale, tick * 0.05, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 31, 31, 0.5)'
      ctx.stroke()

      // 4. DRAW OWNER PHONE (Bottom)
      ownerElements.forEach(drawRect)
      // Phone Home Button
      const phoneP = project(0, ownerY + 70, 5)
      ctx.beginPath()
      ctx.arc(phoneP.x, phoneP.y, 4 * phoneP.scale, 0, Math.PI * 2)
      ctx.strokeStyle = '#444'
      ctx.stroke()

      // 5. SPAWN PARTICLES (Traffic)
      if (tick % 8 === 0) {
          const sourceIdx = Math.floor(Math.random() * 3)
          const source = adNodes[sourceIdx]
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
          })
      }

      // 6. UPDATE & DRAW PARTICLES
      for (let i = users.length - 1; i >= 0; i--) {
          const u = users[i]

          // Move towards target
          const dx = u.targetX - u.x
          const dy = u.targetY - u.y
          const dz = u.targetZ - u.z
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)

          // Movement Logic
          if (dist < 10) {
              if (u.state === 'spawn') {
                  // Reached Website CTA -> Capture -> Send to AI
                  conversions.push({ x: u.x, y: u.y, z: u.z, r: 5, o: 0.8 }) // Tap effect
                  u.state = 'captured'
                  u.targetX = aiNode.x
                  u.targetY = aiNode.y
                  u.targetZ = aiNode.z
              } else if (u.state === 'captured') {
                  // Reached AI -> Qualify -> Send to Owner
                  u.state = 'qualified'
                  u.color = COLOR_ACCENT // Turn Red
                  u.targetX = 0
                  u.targetY = ownerY - 40 // Notification pill
                  u.targetZ = 10
                  // AI Processing Ripple
                  conversions.push({ x: aiNode.x, y: aiNode.y, z: aiNode.z, r: 10, o: 0.5 })
              } else if (u.state === 'qualified') {
                  // Reached Owner -> Done
                  conversions.push({ x: u.x, y: u.y, z: u.z, r: 15, o: 1 }) // Notification Ripple
                  u.state = 'delivered'
                  u.state = 'done'
              }
          } else {
              u.x += (dx / dist) * u.speed
              u.y += (dy / dist) * u.speed
              u.z += (dz / dist) * u.speed
          }

          if (u.state !== 'done') {
              const p = project(u.x, u.y, u.z)

              // Trail
              u.trail.push({x: p.x, y: p.y})
              if (u.trail.length > 5) u.trail.shift()

              ctx.beginPath()
              u.trail.forEach((t, idx) => {
                  if(idx === 0) ctx.moveTo(t.x, t.y)
                  else ctx.lineTo(t.x, t.y)
              })
              ctx.strokeStyle = u.color === COLOR_HIGHLIGHT ? 'rgba(255,255,255,0.2)' : 'rgba(255,31,31,0.5)'
              ctx.stroke()

              ctx.fillStyle = u.color
              ctx.beginPath()
              ctx.arc(p.x, p.y, 2 * p.scale, 0, Math.PI * 2)
              ctx.fill()
          } else {
              users.splice(i, 1)
          }
      }

      // 7. DRAW RIPPLES (Conversions/AI Processing)
      for (let i = conversions.length - 1; i >= 0; i--) {
          const c = conversions[i]
          c.r += 1.5
          c.o -= 0.05

          if (c.o <= 0) {
              conversions.splice(i, 1)
              continue
          }

          const p = project(c.x, c.y, c.z)
          ctx.beginPath()
          ctx.ellipse(p.x, p.y, c.r * p.scale, c.r * 0.6 * p.scale, 0, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 255, 255, ${c.o})`
          ctx.lineWidth = 1
          ctx.stroke()
      }

      // 8. LABELS
      drawLabel("AD TRAFFIC", -120, -300, 0, 'right')
      drawLabel("SMART WEBSITE", 100, webY, 0, 'left')
      drawLabel("AI PROCESSING", -50, 80, 10, 'right', COLOR_ACCENT)
      drawLabel("BUSINESS OWNER", 70, ownerY, 0, 'left')

      frameId = requestAnimationFrame(draw)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    draw()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <section className="relative min-h-screen w-full flex items-center overflow-hidden" style={{ backgroundColor: COLORS.charcoal }}>
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
                className="mb-8 flex items-center space-x-3 text-brand border border-brand/30 px-5 py-2 rounded-full backdrop-blur-md shadow-[0_0_25px_rgba(255,31,31,0.3)]"
                style={{
                  backgroundColor: `${COLORS.charcoal}E6`,
                  color: COLORS.brand
                }}
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

            <p className="max-w-xl text-silver font-mono text-xs md:text-sm mb-12 leading-relaxed tracking-wide backdrop-blur-sm bg-black/40 p-4 rounded-lg border border-brand/10">
            Deploy them <span className="text-white font-bold border-b border-brand">independently</span> or combine them for <span className="text-white font-bold border-b border-brand">total ecosystem dominance</span>.
            </p>

            {/* ACTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <a href="#websites" className="group relative p-6 bg-white/5 border border-white/10 hover:border-brand/50 rounded-lg text-left transition-all duration-300 hover:bg-white/10 overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity text-brand">
                        <Layout size={24} />
                    </div>
                    <div className="font-mono text-[10px] text-brand mb-2 tracking-widest">OPTION A</div>
                    <div className="font-display text-xl text-white mb-1">BUILD WEBSITE</div>
                    <div className="text-xs text-silver/60 mb-4">AI-Integrated Architecture & Automation</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:gap-4 transition-all">
                        INITIALIZE <ArrowRight size={14} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </a>

                <a href="#ads" className="group relative p-6 bg-white/5 border border-white/10 hover:border-brand/50 rounded-lg text-left transition-all duration-300 hover:bg-white/10 overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity text-brand">
                        <Zap size={24} />
                    </div>
                    <div className="font-mono text-[10px] text-brand mb-2 tracking-widest">OPTION B</div>
                    <div className="font-display text-xl text-white mb-1">RUN ADS</div>
                    <div className="text-xs text-silver/60 mb-4">Google, LSA, & Meta Traffic Injection</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:gap-4 transition-all">
                        INITIALIZE <ArrowRight size={14} />
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
  )
}

// Smart Websites Section with Interactive Network
function SmartWebsitesSection() {
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
                    stroke={hovered ? COLORS.brand : "rgba(255, 255, 255, 0.1)"}
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
};

// Services Section with Tilt Cards
function ServicesSection() {
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
};

// Automation Section (CRM)
function AutomationSection() {
  const features = [
    {
      icon: MessageSquare,
      title: "Smart CRM Integration",
      description: "GoHighLevel-powered CRM that automatically captures and nurtures every lead."
    },
    {
      icon: Phone,
      title: "Missed Call Text-Back",
      description: "62% of calls to local businesses go unanswered. We automatically text them back and book appointments."
    },
    {
      icon: Activity,
      title: "AI Lead Qualification",
      description: "Intelligent chatbots qualify leads 24/7 and route hot prospects directly to you."
    },
    {
      icon: TrendingUp,
      title: "Unified Inbox",
      description: "Manage SMS, email, Facebook, Instagram, and Google messages in one streamlined interface."
    }
  ]

  return (
    <section className="py-32 px-6 bg-gradient-to-b from-charcoal to-black border-t border-white/5 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
        <div>
          <div className="inline-block p-3 bg-brand/10 rounded-xl mb-6">
            <Activity className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">
            Never Lose a <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">Lead Again</span>
          </h2>
          <p className="text-xl text-silver mb-12 leading-relaxed">
            Generating leads is half the battle. Our all-in-one CRM ensures you capture, nurture, and convert every opportunity that comes your way.
          </p>

          <div className="space-y-8">
            {features.map((item, i) => (
              <div key={i} className="flex gap-6">
                <div className="w-12 h-12 bg-brand/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">{item.title}</h4>
                  <p className="text-silver">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-brand/20 blur-[100px] rounded-full" />
          <div className="relative bg-charcoal border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Mock CRM Dashboard */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-sm">JD</div>
                  <div>
                    <div className="text-white font-bold text-sm">John Doe</div>
                    <div className="text-xs text-silver">Hot Lead - Ready to Buy</div>
                  </div>
                </div>
                <div className="text-xs text-silver">2 min ago</div>
              </div>

              <div className="space-y-4">
                <div className="bg-charcoal/50 p-4 rounded-2xl rounded-tl-sm max-w-[80%] border border-brand/20">
                  <p className="text-sm text-white">Hi! I saw your ad and I'm interested in getting a quote.</p>
                </div>
                <div className="bg-brand/20 p-4 rounded-2xl rounded-tr-sm max-w-[80%] ml-auto border border-brand/20">
                  <p className="text-sm text-brand">Great! I'd love to help. When would be a good time for a quick call?</p>
                </div>
                <div className="bg-charcoal/50 p-4 rounded-2xl rounded-tl-sm max-w-[80%]">
                  <p className="text-sm text-white">How about tomorrow at 2pm?</p>
                </div>
                <div className="bg-brand/20 p-4 rounded-2xl rounded-tr-sm max-w-[80%] ml-auto border border-brand/20">
                  <p className="text-sm text-brand">Perfect! I've added you to my calendar. Here's the Zoom link: [meeting-link]</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Results Section
function ResultsSection() {
  return (
    <section className="py-32 px-6 bg-charcoal">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-16">
          Real Results, Real <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">Businesses</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-4xl font-bold text-brand mb-2">340%</div>
            <div className="text-white font-bold mb-2">Revenue Growth</div>
            <div className="text-silver text-sm">Average client result in 6 months</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-4xl font-bold text-brand mb-2">8.2%</div>
            <div className="text-white font-bold mb-2">Conversion Rate</div>
            <div className="text-silver text-sm">Industry-leading website performance</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-4xl font-bold text-brand mb-2">3 Weeks</div>
            <div className="text-white font-bold mb-2">Average Build Time</div>
            <div className="text-silver text-sm">From concept to live website</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-brand/10 to-red-600/10 border border-brand/20 rounded-3xl p-12">
          <blockquote className="text-2xl text-white font-display italic mb-6">
            "We went from zero to $50k/month in 3 months. The automated lead system works like magic."
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-brand/20 rounded-full flex items-center justify-center">
              <span className="text-brand font-bold">SC</span>
            </div>
            <div className="text-left">
              <div className="text-white font-bold">Sarah Chen</div>
              <div className="text-silver">HVAC Business Owner</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Onboarding Section
function OnboardingSection() {
  const steps = [
    {
      step: "01",
      title: "Discovery & Strategy",
      description: "We analyze your business, target market, and competition to build a custom growth strategy."
    },
    {
      step: "02",
      title: "Platform Setup",
      description: "We configure your ad accounts, website, CRM, and all integrations while you focus on your business."
    },
    {
      step: "03",
      title: "Launch & Optimize",
      description: "We go live and continuously optimize campaigns for maximum ROI. Full training included."
    }
  ]

  return (
    <section className="py-32 px-6 bg-gradient-to-t from-charcoal to-black border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/30 bg-brand/10 mb-6">
            <ArrowRight className="w-4 h-4 text-brand" />
            <span className="text-sm font-mono text-brand uppercase tracking-widest">Onboarding</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            3-5 Days to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">Revenue</span>
          </h2>
          <p className="text-xl text-silver max-w-2xl mx-auto">
            We handle everything. You provide access to your accounts and we build your complete marketing system.
          </p>
        </div>

        <div className="space-y-12">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex flex-col md:flex-row items-center gap-8 p-8 bg-white/5 border border-white/10 rounded-3xl"
            >
              <div className="text-6xl font-bold text-brand/30 md:order-2">{step.step}</div>
              <div className="flex-1 md:order-1">
                <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                <p className="text-silver leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Pricing Section
function PricingSection() {
  return (
    <section id="pricing" className="py-32 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/30 bg-brand/10 mb-6">
            <DollarSign className="w-4 h-4 text-brand" />
            <span className="text-sm font-mono text-brand uppercase tracking-widest">Pricing</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">Investment</span>
          </h2>
          <p className="text-xl text-silver max-w-2xl mx-auto">
            No hidden fees, no contracts. You own everything and only pay for results.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-charcoal border border-white/10 rounded-3xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Ad Spend</h3>
              <p className="text-silver text-sm">Paid directly to platforms</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-4">$X - $X /mo</div>
              <p className="text-silver text-sm">Based on your budget and goals</p>
            </div>
          </div>

          <div className="bg-charcoal border border-brand/50 rounded-3xl p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand text-black px-4 py-1 rounded-full text-sm font-bold">
              RECOMMENDED
            </div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Management Fee</h3>
              <p className="text-silver text-sm">Our strategy & optimization</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-brand mb-4">$X /mo</div>
              <ul className="text-left space-y-3 text-silver text-sm">
                <li className="flex gap-2"><Check className="text-brand w-4 h-4" /> Campaign optimization</li>
                <li className="flex gap-2"><Check className="text-brand w-4 h-4" /> Creative refresh</li>
                <li className="flex gap-2"><Check className="text-brand w-4 h-4" /> CRM access included</li>
                <li className="flex gap-2"><Check className="text-brand w-4 h-4" /> Monthly reporting</li>
              </ul>
            </div>
          </div>

          <div className="bg-charcoal border border-white/10 rounded-3xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Setup Fee</h3>
              <p className="text-silver text-sm">One-time build out</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-4">$X</div>
              <p className="text-silver text-sm">Complete system setup & training</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-silver mb-6">Ready to scale your business?</p>
          <Button
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-brand hover:bg-brand-dark text-black px-12 py-6 text-lg rounded-full font-bold transition-all hover:scale-105"
          >
            Book Strategy Call
          </Button>
        </div>
      </div>
    </section>
  )
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    {
      quote: "From zero to $50k/month in 3 months. The automated lead system works like magic.",
      author: "Mike Rodriguez",
      role: "Plumbing Business Owner",
      rating: 5
    },
    {
      quote: "I was skeptical about ads, but seeing 340% revenue growth changed my mind. Worth every penny.",
      author: "Jennifer Liu",
      role: "E-commerce Store Owner",
      rating: 5
    },
    {
      quote: "The CRM saves me 15 hours per week. My team can finally focus on customers instead of chasing leads.",
      author: "David Chen",
      role: "Service Business Owner",
      rating: 5
    }
  ]

  return (
    <section className="py-32 px-6 bg-gradient-to-b from-black to-charcoal">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/30 bg-brand/10 mb-6">
            <Users className="w-4 h-4 text-brand" />
            <span className="text-sm font-mono text-brand uppercase tracking-widest">Testimonials</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Real Owners, Real <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">Results</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-brand/50 transition-all duration-300"
            >
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonial.rating }).map((_, idx) => (
                  <div key={idx} className="w-5 h-5 bg-brand rounded-sm"></div>
                ))}
              </div>

              <blockquote className="text-lg text-white italic mb-8 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand/20 rounded-full flex items-center justify-center">
                  <span className="text-brand font-bold text-sm">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="text-white font-bold">{testimonial.author}</div>
                  <div className="text-silver text-sm">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Contact Section
function ContactSection() {
  return (
    <section id="contact" className="py-32 px-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-brand/5 to-transparent" />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-block p-4 rounded-full bg-brand/10 mb-6">
          <MessageSquare className="w-8 h-8 text-brand" />
        </div>
        <h2 className="text-5xl md:text-8xl font-bold text-white mb-12 tracking-tighter">
          READY TO SCALE?
        </h2>
        <p className="text-xl text-silver mb-12 max-w-2xl mx-auto">
          Join the exclusive group of business owners who've automated their growth. We only accept 4 new clients per quarter to ensure maximum results.
        </p>
        <Button className="h-20 px-12 text-2xl rounded-full bg-white text-black hover:bg-gray-200 font-bold shadow-2xl hover:scale-105 transition-transform">
          Book Strategy Call
          <ChevronRight className="ml-2 w-6 h-6" />
        </Button>
        <p className="mt-8 text-silver/50 text-sm">No pressure. Just strategy.</p>
      </div>
    </section>
  )
}

// Footer
function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/10 bg-charcoal">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-white font-bold text-2xl tracking-tighter">TLUCA<span className="text-brand">.SYSTEMS</span></div>
        <div className="flex gap-8 text-sm text-silver">
          <Link href="/privacy" className="hover:text-brand transition-colors">PRIVACY</Link>
          <Link href="/terms" className="hover:text-brand transition-colors">TERMS</Link>
          <Link href="/about" className="hover:text-brand transition-colors">ABOUT</Link>
        </div>
        <div className="text-silver text-xs font-mono">
          © {new Date().getFullYear()} SYSTEM ARCHITECTURE
        </div>
      </div>
    </footer>
  )
}

// Main Component
export default function TLUCALandingPage() {
  return (
    <div className="min-h-screen bg-charcoal text-white overflow-x-hidden selection:bg-brand selection:text-black">
      {/* Custom Cursor */}
      <CustomCursor />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center mix-blend-normal pointer-events-none">
        <div className="font-display font-bold text-xl tracking-tighter pointer-events-auto text-white">TLUCA<span className="text-brand">.SYSTEMS</span></div>
        <div className="hidden md:flex space-x-8 font-mono text-xs pointer-events-auto">
          <a href="#websites" className="hover:text-brand transition-colors">WEBSITES</a>
          <a href="#ads" className="hover:text-brand transition-colors">ADS</a>
          <a href="#system" className="hover:text-brand transition-colors">SYSTEMS</a>
          <a href="#pricing" className="hover:text-brand transition-colors">PRICING</a>
        </div>
      </nav>

      <main>
        <HeroSection />
        <SmartWebsitesSection />
        <ServicesSection />
        <AutomationSection />
        <ResultsSection />
        <OnboardingSection />
        <PricingSection />
        <TestimonialsSection />
        <ContactSection />
      </main>

      <Footer />

      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-[0.015] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${COLORS.charcoal};
        }
        ::-webkit-scrollbar-thumb {
          background: ${COLORS.brand};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${COLORS['brand-dark']};
        }

        /* Text glow effect */
        .text-glow {
          text-shadow: 0 0 20px rgba(255, 31, 31, 0.5);
        }

        /* Custom animations */
        @keyframes shine {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .animate-shine {
          animation: shine 3s linear infinite;
        }

        /* Font definitions */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=JetBrains+Mono:wght@400;700&family=Syncopate:wght@400;700&display=swap');

        .font-display {
          font-family: 'Syncopate', sans-serif;
        }

        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }

        /* Custom color variables */
        :root {
          --brand: ${COLORS.brand};
          --brand-dark: ${COLORS['brand-dark']};
          --charcoal: ${COLORS.charcoal};
          --silver: ${COLORS.silver};
          --white: ${COLORS.white};
        }

        /* 3D perspective */
        .perspective-1000 {
          perspective: 1000px;
        }

        .transform-style-3d {
          transform-style: preserve-3d;
        }

        .rotate-x-60 {
          transform: rotateX(60deg);
        }

        .rotate-z-45 {
          transform: rotateZ(45deg);
        }

        /* Pulse slow animation */
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  )
}