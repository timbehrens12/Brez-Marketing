import { useEffect, useRef } from "react"

export default function MatrixHero({
  titleLeft = "SCALE",
  titleRight = "TEK",
  subtitle = "The AI Growth Operating System — built for real-time insights, automation, and intelligent scaling.",
}: {
  titleLeft?: string
  titleRight?: string
  subtitle?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    let raf = 0

    // --- Size / DPR ---
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    // --- Config (tuning knobs) ---
    const FONT = 16 // font size (smaller = denser)
    const FRAME_MS = 38 // rain cadence
    const INTRO_SPEED = 10 // px per frame for intro bar (fast)
    const INTRO_OPACITY = 0.85 // intro bar brightness
    const RAIN_OPACITY = 0.48 // rain glyph brightness
    const TRAIL_ALPHA = 0.28 // alpha fill for fading trails
    const RESET_CHANCE = 0.972 // higher = more frequent resets (more rain)

    // Full-width/katakana-style glyphs + numerals to read “Matrix”
    const GLYPHS =
      "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ012345789#@"

    // Columns/drop state
    let cols = Math.floor(window.innerWidth / FONT)
    let drops = new Array(cols).fill(1)

    // Fast one-time horizontal bar
    let phase: 0 | 1 = 0
    let introY = -FONT

    // Reduced motion
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false

    // Pre-style
    ctx.textBaseline = "top"
    ctx.font = `${FONT}px ui-monospace, SFMono-Regular, Menlo, Monaco, "JetBrains Mono", monospace`

    const drawIntro = () => {
      // fade previous frame slightly to create a subtle trail
      ctx.fillStyle = `rgba(0,0,0,${TRAIL_ALPHA + 0.05})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = `rgba(255, 0, 60, ${INTRO_OPACITY})`
      for (let i = 0; i < cols; i++) {
        const g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        ctx.fillText(g, i * FONT, introY)
      }
      introY += INTRO_SPEED // quick drop
      if (introY > window.innerHeight + FONT) phase = 1
    }

    const drawRain = () => {
      // alpha fill to make trails fade out cleanly
      ctx.fillStyle = `rgba(0,0,0,${TRAIL_ALPHA})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = `rgba(255,0,60,${RAIN_OPACITY})`
      for (let i = 0; i < cols; i++) {
        const g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        ctx.fillText(g, i * FONT, drops[i] * FONT)

        // reset when we go past bottom (with some randomness)
        if (drops[i] * FONT > window.innerHeight && Math.random() > RESET_CHANCE) drops[i] = 0
        drops[i]++
      }
    }

    let last = 0
    const tick = (t: number) => {
      if (!last) last = t
      const dt = t - last

      // Keep column count synced on width changes
      const newCols = Math.floor(window.innerWidth / FONT)
      if (newCols !== cols) {
        cols = newCols
        drops = new Array(cols).fill(1)
      }

      if (reduce) {
        // minimal updates if user prefers less motion
        if (dt >= 100) {
          last = t
          drawRain()
        }
      } else if (phase === 0) {
        // quick intro bar with no dead time
        last = t
        drawIntro()
      } else if (dt >= FRAME_MS) {
        last = t
        drawRain()
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <section className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center">
      {/* background canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* dark overlay so it stays background-y */}
      <div className="absolute inset-0 bg-black/70" />

      {/* hero content (kept minimal; actual page will render its own content above) */}
      <div className="relative z-10 text-center max-w-3xl px-6">
        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-tight">
          <span className="text-white">{titleLeft}</span>
          <span className="text-red-600">{titleRight}</span>
        </h1>
        <p className="mt-6 text-white/70 text-lg md:text-xl">{subtitle}</p>
      </div>
    </section>
  )
}


