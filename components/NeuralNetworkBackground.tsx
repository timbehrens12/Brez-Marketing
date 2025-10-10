"use client"

import { useEffect, useRef } from "react"

interface Node {
  x: number
  y: number
  baseX: number
  baseY: number
  angleOffset: number
  speed: number
  radius: number
}

export function NeuralNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const nodesRef = useRef<Node[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      const { innerWidth, innerHeight, devicePixelRatio } = window
      const dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = innerWidth * dpr
      canvas.height = innerHeight * dpr
      canvas.style.width = `${innerWidth}px`
      canvas.style.height = `${innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = "lighter"
    }

    const createNodes = () => {
      const { innerWidth, innerHeight } = window
      const density = Math.round(Math.min(Math.max((innerWidth * innerHeight) / 26000, 32), 96))
      const nodes: Node[] = []

      for (let i = 0; i < density; i++) {
        const baseX = Math.random() * innerWidth
        const baseY = Math.random() * innerHeight
        nodes.push({
          x: baseX,
          y: baseY,
          baseX,
          baseY,
          angleOffset: Math.random() * Math.PI * 2,
          speed: 0.15 + Math.random() * 0.5,
          radius: 1.4 + Math.random() * 1.4
        })
      }

      nodesRef.current = nodes
    }

    resizeCanvas()
    createNodes()

    const handleResize = () => {
      resizeCanvas()
      createNodes()
    }

    window.addEventListener("resize", handleResize)

    let lastTime = 0

    const animate = (time: number) => {
      const delta = time - lastTime
      lastTime = time

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.globalCompositeOperation = "lighter"

      const nodes = nodesRef.current
      const connectionDistance = Math.min(Math.max(window.innerWidth / 6, 180), 320)

      nodes.forEach((node, index) => {
        const t = time * 0.00035 * node.speed + node.angleOffset
        node.x = node.baseX + Math.cos(t) * 22
        node.y = node.baseY + Math.sin(t * 1.4) * 22

        for (let j = index + 1; j < nodes.length; j++) {
          const other = nodes[j]
          const dx = node.x - other.x
          const dy = node.y - other.y
          const distance = Math.hypot(dx, dy)

          if (distance < connectionDistance) {
            const alpha = 0.4 * (1 - distance / connectionDistance)
            ctx.beginPath()
            ctx.strokeStyle = `rgba(255, 42, 42, ${alpha.toFixed(3)})`
            ctx.lineWidth = 0.8
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        }
      })

      nodes.forEach((node) => {
        ctx.beginPath()
        ctx.fillStyle = "rgba(255, 42, 42, 0.75)"
        ctx.shadowColor = "rgba(255, 42, 42, 0.25)"
        ctx.shadowBlur = 10
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.restore()

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  )
}
