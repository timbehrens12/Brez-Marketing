"use client"

import React, { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight, ArrowDown, Layout, Zap, Cpu, ChevronRight,
  Target, Users, BarChart3, Check, MessageSquare, Phone,
  TrendingUp, Shield, Globe, Activity, Search, DollarSign
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Color scheme from Google AI Studio design
const COLORS = {
  brand: '#FF1F1F',       // TLUCA Red
  'brand-dark': '#8a0a0a', // Darker Red for gradients
  charcoal: '#0A0A0C',    // Background
  silver: '#C0C0C0',
  white: '#FFFFFF',
}

// Custom cursor component
function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
      setIsVisible(true)
    }

    const hideCursor = () => setIsVisible(false)

    document.addEventListener('mousemove', updatePosition)
    document.addEventListener('mouseleave', hideCursor)

    return () => {
      document.removeEventListener('mousemove', updatePosition)
      document.removeEventListener('mouseleave', hideCursor)
    }
  }, [])

  return (
    <div
      className="fixed pointer-events-none z-50 mix-blend-difference"
      style={{
        left: position.x - 12,
        top: position.y - 12,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease'
      }}
    >
      <div className="w-6 h-6 border-2 border-white rounded-full" />
    </div>
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
                <a href="#services" className="group relative p-6 bg-white/5 border border-white/10 hover:border-brand/50 rounded-lg text-left transition-all duration-300 hover:bg-white/10 overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity text-brand">
                        <Layout size={24} />
                    </div>
                    <div className="font-mono text-[10px] text-brand mb-2 tracking-widest">OPTION A</div>
                    <div className="font-display text-xl text-white mb-1">BUILD WEBSITE</div>
                    <div className="text-xs text-silver mb-4">AI-Integrated Architecture & Automation</div>
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
                    <div className="text-xs text-silver mb-4">Google, LSA, & Meta Traffic Injection</div>
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

// Smart Websites Section
function SmartWebsitesSection() {
  const features = [
    {
      icon: Layout,
      title: "AI-Integrated Architecture",
      description: "Websites that learn from your visitors and optimize conversion paths in real-time.",
      stats: "40% Higher Conversions"
    },
    {
      icon: Zap,
      title: "Automated Lead Capture",
      description: "Every visitor interaction triggers intelligent lead qualification and nurturing sequences.",
      stats: "24/7 Lead Processing"
    },
    {
      icon: Target,
      title: "Performance-Optimized Design",
      description: "Lightning-fast loading with SEO-optimized architecture that ranks higher.",
      stats: "3x Faster Load Times"
    }
  ]

  return (
    <section className="py-32 px-6 bg-gradient-to-b from-charcoal to-black border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/30 bg-brand/10 mb-6">
            <Layout className="w-4 h-4 text-brand" />
            <span className="text-sm font-mono text-brand uppercase tracking-widest">Smart Websites</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Websites That <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">Work For You</span>
          </h2>
          <p className="text-xl text-silver max-w-2xl mx-auto">
            Traditional websites just sit there. Our smart websites actively drive revenue through intelligent automation and conversion optimization.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="group relative p-8 bg-white/5 border border-white/10 rounded-2xl hover:border-brand/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-brand/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-brand" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-silver mb-6 leading-relaxed">{feature.description}</p>
                <div className="text-brand font-mono text-sm font-bold">{feature.stats}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Services Section (Google Ads, LSA, Meta)
function ServicesSection() {
  const services = [
    {
      id: 'ads',
      title: "Performance Ads",
      description: "Targeted campaigns across Google, LSA, and Meta that deliver qualified leads, not just clicks.",
      features: [
        "Google Search Ads - High-intent traffic",
        "Local Service Ads - Pay-per-lead model",
        "Meta Ads - Retargeting & lookalike audiences",
        "Advanced audience targeting",
        "Real-time bid optimization",
        "Conversion tracking & attribution"
      ],
      cta: "Start Ad Campaign"
    }
  ]

  return (
    <section id="services" className="py-32 px-6 bg-charcoal">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/30 bg-brand/10 mb-6">
            <Target className="w-4 h-4 text-brand" />
            <span className="text-sm font-mono text-brand uppercase tracking-widest">Services</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">Marketing Systems</span>
          </h2>
          <p className="text-xl text-silver max-w-2xl mx-auto">
            We don't just run ads. We build entire marketing ecosystems that capture, nurture, and convert leads into customers.
          </p>
        </div>

        {services.map((service, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-12 md:p-16"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">{service.title}</h3>
                <p className="text-lg text-silver mb-8 leading-relaxed">{service.description}</p>

                <div className="space-y-4 mb-8">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-brand flex-shrink-0" />
                      <span className="text-silver">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-brand hover:bg-brand-dark text-white px-8 py-4 rounded-full font-bold transition-all hover:scale-105"
                >
                  {service.cta}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>

              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-brand/20 to-brand-dark/20 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-24 h-24 text-brand mx-auto mb-4" />
                    <div className="text-2xl font-bold text-white mb-2">Revenue Engine</div>
                    <div className="text-silver">Traffic → Leads → Sales</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// Automation Section (CRM & AI)
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
      description: "62% of business calls go unanswered. We automatically text them back and book appointments."
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
    <section className="py-32 px-6 bg-gradient-to-b from-black to-charcoal border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/30 bg-brand/10 mb-6">
              <Activity className="w-4 h-4 text-brand" />
              <span className="text-sm font-mono text-brand uppercase tracking-widest">Automation</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">
              Never Lose a <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-600">Lead Again</span>
            </h2>
            <p className="text-xl text-silver mb-12 leading-relaxed">
              Traditional marketing stops at the ad. We ensure every lead gets captured, qualified, and converted into a paying customer.
            </p>

            <div className="space-y-8">
              {features.map((feature, i) => (
                <div key={i} className="flex gap-6">
                  <div className="w-12 h-12 bg-brand/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">{feature.title}</h4>
                    <p className="text-silver leading-relaxed">{feature.description}</p>
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
            "We went from manually chasing leads to having our CRM automatically qualify and book appointments 24/7. Our revenue doubled in the first quarter."
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
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand" /> Campaign optimization</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand" /> Creative refresh</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand" /> CRM access included</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand" /> Monthly reporting</li>
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
        <div className="font-display font-bold text-xl tracking-tighter pointer-events-auto text-white">
          TLUCA<span className="text-brand">.SYSTEMS</span>
        </div>
        <div className="hidden md:flex space-x-8 font-mono text-xs pointer-events-auto">
          <a href="#services" className="hover:text-brand transition-colors">WEBSITES</a>
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
      `}</style>
    </div>
  )
}