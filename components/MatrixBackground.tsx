'use client'

import { useEffect, useRef } from "react"

export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener("resize", resize)

    const chars = "01AI▮▯▰▱░▒▓█"
    const fontSize = 14
    const speed = 40
    let columns = Math.floor(window.innerWidth / fontSize)
    let drops = new Array(columns).fill(1)

    let phase: 0 | 1 = 0
    let introY = -fontSize
    const introOpacity = 0.7

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const drawIntro = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = `rgba(255, 0, 60, ${introOpacity})`
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < columns; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(text, i * fontSize, introY)
      }

      introY += 6
      if (introY > window.innerHeight + fontSize) {
        phase = 1
      }
    }

    const drawRain = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.30)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "rgba(255, 0, 60, 0.5)"
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > window.innerHeight && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      }
    }

    let raf: number | null = null
    let last = 0

    const tick = (t: number) => {
      if (!last) last = t
      const dt = t - last
      if (dt >= speed || prefersReduced) {
        last = t

        const newCols = Math.floor(window.innerWidth / fontSize)
        if (newCols !== columns) {
          columns = newCols
          drops = new Array(columns).fill(1)
        }

        if (phase === 0 && !prefersReduced) {
          drawIntro()
        } else {
          phase = 1
          drawRain()
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-black/70" />
    </div>
  )
}

