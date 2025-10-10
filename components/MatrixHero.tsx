import { useEffect, useRef } from "react";

export default function MatrixHero({
  children,
}: {
  children?: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle resizing
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Animation settings - optimized for quality
    const chars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ01234567890ABCDEFZ$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
    const fontSize = 16;
    const speed = 50; // ms per frame (slower, smoother)
    let columns = Math.floor(window.innerWidth / fontSize);
    let drops = new Array(columns).fill(0).map(() => Math.random() * -100); // stagger start positions

    // ---- Phase control ----
    // Phase 0: intro bar drop (one bright horizontal bar scans down once)
    // Phase 1: soft matrix rain
    let phase: 0 | 1 = 0;
    let introY = -fontSize * 3; // starting higher above the top
    const introOpacity = 0.85; // brighter intro bar

    // Respect reduced motion
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const drawIntro = () => {
      // fade previous frame - smoother trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // full row of characters at introY with glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(255, 42, 42, 0.8)";
      ctx.fillStyle = `rgba(255, 42, 42, ${introOpacity})`;
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;

      for (let i = 0; i < columns; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, introY);
      }

      ctx.shadowBlur = 0; // reset shadow

      introY += 4; // slower drop speed
      if (introY > window.innerHeight + fontSize * 2) {
        // switch to rain with smooth transition
        phase = 1;
      }
    };

    const drawRain = () => {
      // darker trail for subtle background effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px "Courier New", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const y = drops[i] * fontSize;
        
        // Brightest character at the head
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(255, 42, 42, 0.6)";
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillText(text, i * fontSize, y);
        
        // Draw fading trail
        for (let j = 1; j < 8; j++) {
          const trailY = y - j * fontSize;
          if (trailY > 0) {
            const opacity = Math.max(0.1, 0.6 - j * 0.08);
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(255, 42, 42, ${opacity})`;
            const trailChar = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(trailChar, i * fontSize, trailY);
          }
        }
        
        ctx.shadowBlur = 0;
        
        // Reset drop when it goes off screen (increased reset frequency)
        if (drops[i] * fontSize > window.innerHeight && Math.random() > 0.95) {
          drops[i] = 0;
        }
        drops[i] += 0.5; // slower fall speed
      }
    };

    let raf: number | null = null;
    let last = 0;

    const tick = (t: number) => {
      if (!last) last = t;
      const dt = t - last;
      if (dt >= speed || prefersReduced) {
        last = t;

        // keep columns aligned with current size
        const newCols = Math.floor(window.innerWidth / fontSize);
        if (newCols !== columns) {
          columns = newCols;
          drops = new Array(columns).fill(0).map(() => Math.random() * -100);
        }

        if (phase === 0 && !prefersReduced) {
          drawIntro();
        } else {
          phase = 1;
          drawRain();
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative w-full">
      {/* Matrix canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Dark overlay filter to keep it background-y */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      {/* Hero content (passed as children) */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

