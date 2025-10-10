import { useEffect, useRef } from "react"

export default function MatrixHero({
  titleLeft = "SCALE",
  titleRight = "TEK",
  subtitle = "The AI Growth Operating System — built for real-time insights, automation, and intelligent scaling.",
}: {
  titleLeft?: string;
  titleRight?: string;
  subtitle?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Handle resizing
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    // Animation settings
    const chars = "01AI▮▯▰▱░▒▓█"
    const fontSize = 14
    const speed = 40 // ms per frame
    let columns = Math.floor(window.innerWidth / fontSize)
    let drops = new Array(columns).fill(1)

    // ---- Phase control ----
    // Phase 0: intro bar drop (one bright horizontal bar scans down once)
    // Phase 1: soft matrix rain
    let phase: 0 | 1 = 0
    let introY = -fontSize // starting above the top
    const introOpacity = 0.7 // brightness of the intro bar

    // Respect reduced motion
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const drawIntro = () => {
      // fade previous frame slightly darker
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // full row of characters at introY
      ctx.fillStyle = `rgba(255, 0, 60, ${introOpacity})`
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < columns; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(text, i * fontSize, introY)
      }

      introY += 6 // drop speed
      if (introY > window.innerHeight + fontSize) {
        // switch to rain
        phase = 1
      }
    }

    const drawRain = () => {
      // slightly darker trail than intro
      ctx.fillStyle = "rgba(0, 0, 0, 0.30)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "rgba(255, 0, 60, 0.5)" // dimmer code
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

        // keep columns aligned with current size
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
    <section className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center">
      {/* Matrix canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Dark overlay filter to keep it background-y */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Hero content */}
      <div className="relative z-10 text-center max-w-3xl px-6">
        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-tight">
          <span className="text-white">{titleLeft}</span>
          <span className="text-red-600">{titleRight}</span>
        </h1>
        <p className="mt-6 text-white/70 text-lg md:text-xl">{subtitle}</p>
        <div className="mt-10 flex justify-center gap-4">
          <a
            href="#"
            className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition"
          >
            Get Access
          </a>
          <a
            href="#"
            className="px-6 py-3 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/5 transition"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  )
}


