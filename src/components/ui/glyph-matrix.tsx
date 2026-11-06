"use client"

import { useCallback, useEffect, useImperativeHandle, useRef } from "react"

import { cn } from "@/lib/utils"

/** Imperative loop control, so a scroll controller can toggle it without a render. */
export interface GlyphMatrixHandle {
  start: () => void
  stop: () => void
}

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
   * When false the animation loop does not run.
   * Defaults to true so a plain `<GlyphMatrix />` still animates.
   */
  active?: boolean
  /**
   * When false the loop waits for `handleRef.current.start()`.
   * Defaults to true.
   */
  autoStart?: boolean
  /** Start/stop handle for the mutation loop. */
  handleRef?: React.Ref<GlyphMatrixHandle>
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

/** Grid state shared by the setup effect and the mutation loop. */
type Grid = {
  ctx: CanvasRenderingContext2D | null
  cols: number
  rows: number
  cells: string[]
  alphas: number[]
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
  autoStart = true,
  handleRef,
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
  const gridRef = useRef<Grid>({ ctx: null, cols: 0, rows: 0, cells: [], alphas: [] })
  // Imperative run flag. The loop runs only while this and `active` are both true.
  const runningRef = useRef(autoStart)
  const syncLoopRef = useRef<() => void>(() => {})

  // Keep the latest draw listener without writing a ref during render.
  useEffect(() => {
    onDrawRef.current = onDraw
  }, [onDraw])

  // One stable callback so a parent setState does not detach the canvas every render.
  const setCanvas = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node
      externalCanvasRef?.(node)
    },
    [externalCanvasRef],
  )

  useImperativeHandle(
    handleRef,
    () => ({
      start: () => {
        runningRef.current = true
        syncLoopRef.current()
      },
      stop: () => {
        runningRef.current = false
        syncLoopRef.current()
      },
    }),
    [],
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
    // Recolor the cells already on screen. A no-op until the grid exists.
    redrawRef.current()
  }, [color])

  // Grid setup and full redraws. Independent of the loop, so starting or
  // stopping it never reallocates the canvas.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const grid = gridRef.current
    grid.ctx = ctx

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

      grid.cols = Math.ceil(w / cellSize)
      grid.rows = Math.ceil(h / cellSize)

      grid.cells = new Array(grid.cols * grid.rows)
        .fill(0)
        .map(() => glyphs[Math.floor(Math.random() * glyphs.length)])
      grid.alphas = new Array(grid.cols * grid.rows).fill(0).map(
        () =>
          minOpacity +
          Math.random() * Math.max(0, maxOpacity - minOpacity) * (0.35 / 0.45),
      )
    }

    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w === 0 || h === 0 || grid.cols === 0 || grid.rows === 0) return

      ctx.clearRect(0, 0, w, h)

      ctx.font = `${cellSize - 2}px ui-monospace, SFMono-Regular, Menlo, monospace`
      ctx.textBaseline = "top"

      const { r, g, b, a: colorAlpha } = rgbaRef.current
      for (let y = 0; y < grid.rows; y++) {
        const fade = fadeBottom > 0 ? 1 - (y / grid.rows) * fadeBottom : 1
        for (let x = 0; x < grid.cols; x++) {
          const i = y * grid.cols + x
          const a = grid.alphas[i] * fade * colorAlpha
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
          ctx.fillText(grid.cells[i], x * cellSize, y * cellSize)
        }
      }

      onDrawRef.current?.()
    }

    redrawRef.current = draw

    resize()
    draw()

    const ro = new ResizeObserver(() => {
      resize()
      draw()
    })
    ro.observe(canvas)

    return () => {
      ro.disconnect()
      grid.ctx = null
      grid.cols = 0
      grid.rows = 0
      if (redrawRef.current === draw) redrawRef.current = () => {}
    }
  }, [glyphs, cellSize, fadeBottom, maxDpr, maxEdge, minOpacity, maxOpacity])

  // Mutation loop. Repaints only the cells that changed on each tick.
  useEffect(() => {
    let timer = 0
    let running = false

    const tick = () => {
      const grid = gridRef.current
      const ctx = grid.ctx
      const total = grid.cols * grid.rows

      if (ctx && total > 0) {
        const mutations = Math.max(1, Math.floor(total * mutationRate))
        const { r, g, b, a: colorAlpha } = rgbaRef.current

        ctx.font = `${cellSize - 2}px ui-monospace, SFMono-Regular, Menlo, monospace`
        ctx.textBaseline = "top"

        for (let n = 0; n < mutations; n++) {
          const i = Math.floor(Math.random() * total)
          const x = i % grid.cols
          const y = (i - x) / grid.cols

          grid.cells[i] = glyphs[Math.floor(Math.random() * glyphs.length)]
          grid.alphas[i] =
            minOpacity + Math.random() * Math.max(0, maxOpacity - minOpacity)

          const fade = fadeBottom > 0 ? 1 - (y / grid.rows) * fadeBottom : 1
          ctx.clearRect(x * cellSize, y * cellSize, cellSize, cellSize)
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${grid.alphas[i] * fade * colorAlpha})`
          ctx.fillText(grid.cells[i], x * cellSize, y * cellSize)
        }

        onDrawRef.current?.()
      }

      timer = window.setTimeout(tick, interval)
    }

    // Inactive means the mouth is off screen: do not keep a timer alive.
    const sync = () => {
      const next = active && runningRef.current
      if (next === running) return

      running = next
      window.clearTimeout(timer)
      if (next) timer = window.setTimeout(tick, interval)
    }

    syncLoopRef.current = sync
    sync()

    return () => {
      running = false
      window.clearTimeout(timer)
      if (syncLoopRef.current === sync) syncLoopRef.current = () => {}
    }
  }, [active, glyphs, cellSize, mutationRate, interval, fadeBottom, minOpacity, maxOpacity])

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
