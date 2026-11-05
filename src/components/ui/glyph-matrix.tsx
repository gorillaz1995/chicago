"use client"

import { useCallback, useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

interface GlyphMatrixProps extends React.HTMLAttributes<HTMLCanvasElement> {
  /** Characters to randomly pick from */
  glyphs?: string
  /** Cell size in px (also font size) */
  cellSize?: number
  /** Probability (0-1) a cell mutates each tick */
  mutationRate?: number
  /** Tick interval in ms */
  interval?: number
  /** Fade out toward bottom (0 = no fade) */
  fadeBottom?: number
  /** Glyph color (any CSS color). Pass a theme-aware value from the consumer. */
  color?: string
  /** Lowest glyph opacity. The default is the stock faint grid. */
  minOpacity?: number
  /** Highest glyph opacity. The default is the stock faint grid. */
  maxOpacity?: number
  /**
   * When false the animation loop does not start.
   * Defaults to true so a plain `<GlyphMatrix />` still animates.
   */
  active?: boolean
  /**
   * Upper bound on the canvas backing-store ratio.
   * Omit it to keep the device ratio, which is the stock look.
   */
  maxDpr?: number
  /**
   * Caps the longest backing-store edge in CSS pixels.
   * Omit it to use the element's full size.
   */
  maxEdge?: number
  /** Called after each painted frame, so a texture can upload that tick only. */
  onDraw?: () => void
  /** External handle for the canvas element that holds the glyphs. */
  canvasRef?: React.RefCallback<HTMLCanvasElement>
}

/**
 * GlyphMatrix — an animated grid of subtly shifting glyphs.
 * Pass a `color` prop (e.g. driven by next-themes) to adapt it to
 * light and dark modes.
 */
export function GlyphMatrix({
  glyphs = "01·•+*/\\<>=",
  cellSize = 14,
  mutationRate = 0.04,
  interval = 90,
  className,
  fadeBottom = 0.6,
  color = "#6B7280",
  minOpacity = 0.05,
  maxOpacity = 0.5,
  active = true,
  maxDpr,
  maxEdge,
  onDraw,
  canvasRef: externalCanvasRef,
  style,
  ...props
}: GlyphMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // Latest tick listener. Kept in a ref so the parent can change it
  // without tearing down the grid.
  const onDrawRef = useRef(onDraw)
  const redrawRef = useRef<() => void>(() => {})
  // Current glyph color as RGBA (a in 0-1). Kept in a ref so a color change
  // (e.g. theme toggle) recolors the next frame without restarting the
  // animation. Defaults to #6B7280.
  const rgbaRef = useRef({ r: 107, g: 114, b: 128, a: 1 })

  onDrawRef.current = onDraw

  // One stable callback so a parent setState does not detach the canvas every render.
  const setCanvas = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node
      externalCanvasRef?.(node)
    },
    [externalCanvasRef],
  )

  // Resolve the CSS color string to RGBA (handles hex, rgb, hsl, oklch, ...).
  useEffect(() => {
    const probe = document.createElement("canvas")
    probe.width = 1
    probe.height = 1
    const probeCtx = probe.getContext("2d")
    if (!probeCtx) return
    // Seed with the default so an invalid color falls back to it: the 2d
    // context keeps the previous fillStyle when assigned an invalid value
    // instead of silently turning black.
    probeCtx.fillStyle = "#6B7280"
    probeCtx.fillStyle = color
    probeCtx.fillRect(0, 0, 1, 1)
    const data = probeCtx.getImageData(0, 0, 1, 1).data
    rgbaRef.current = { r: data[0], g: data[1], b: data[2], a: data[3] / 255 }
    // Recolor the cells already on screen. A no-op until the loop has drawn once.
    redrawRef.current()
  }, [color])

  useEffect(() => {
    // Inactive means the mouth is off screen: do not keep a frame loop alive.
    const canvas = canvasRef.current
    if (!canvas || !active) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    let cols = 0
    let rows = 0
    let cells: string[] = []
    let alphas: number[] = []
    let timer = 0
    let stopped = false

    // Rebuild the grid when the element size changes. DPR is capped so a
    // small mouth texture does not allocate a retina-sized buffer.
    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w === 0 || h === 0) return

      const device = window.devicePixelRatio || 1
      const longest = Math.max(w, h, 1)
      const fit = maxEdge ? Math.min(1, maxEdge / longest) : 1
      const dpr = Math.min(device, maxDpr ?? device) * fit

      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      cols = Math.ceil(w / cellSize)
      rows = Math.ceil(h / cellSize)

      cells = new Array(cols * rows)
        .fill(0)
        .map(() => glyphs[Math.floor(Math.random() * glyphs.length)])
      alphas = new Array(cols * rows).fill(0).map(
        () =>
          minOpacity +
          Math.random() * Math.max(0, maxOpacity - minOpacity) * (0.35 / 0.45),
      )
    }

    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w === 0 || h === 0 || cols === 0 || rows === 0) return

      ctx.clearRect(0, 0, w, h)

      ctx.font = `${cellSize - 2}px ui-monospace, SFMono-Regular, Menlo, monospace`
      ctx.textBaseline = "top"

      const { r, g, b, a: colorAlpha } = rgbaRef.current
      for (let y = 0; y < rows; y++) {
        const fade = fadeBottom > 0 ? 1 - (y / rows) * fadeBottom : 1
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x
          const a = alphas[i] * fade * colorAlpha
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
          ctx.fillText(cells[i], x * cellSize, y * cellSize)
        }
      }

      onDrawRef.current?.()
    }

    redrawRef.current = draw

    // Mutate on the tick interval only. A frame loop would wake the page at 60Hz
    // for a grid that changes a few times a second.
    const loop = () => {
      if (stopped) return

      const total = cols * rows
      if (total > 0) {
        const mutations = Math.max(1, Math.floor(total * mutationRate))

        for (let n = 0; n < mutations; n++) {
          const i = Math.floor(Math.random() * total)
            cells[i] = glyphs[Math.floor(Math.random() * glyphs.length)]
            alphas[i] =
              minOpacity + Math.random() * Math.max(0, maxOpacity - minOpacity)
        }

        draw()
      }

      timer = window.setTimeout(loop, interval)
    }

    resize()
    draw()
    timer = window.setTimeout(loop, interval)

    const ro = new ResizeObserver(() => {
      resize()
      draw()
    })
    ro.observe(canvas)

    return () => {
      stopped = true
      window.clearTimeout(timer)
      ro.disconnect()
      if (redrawRef.current === draw) redrawRef.current = () => {}
    }
  }, [glyphs, cellSize, mutationRate, interval, fadeBottom, active, maxDpr, maxEdge, minOpacity, maxOpacity])

  return (
    <canvas
      className={cn("pointer-events-none", className)}
      style={{ width: "100%", height: "100%", display: "block", ...style }}
      aria-hidden="true"
      {...props}
      ref={setCanvas}
    />
  )
}
