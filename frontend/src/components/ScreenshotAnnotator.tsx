import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Tool = 'rect' | 'line' | 'arrow' | 'text'

type Stroke =
  | { tool: 'rect' | 'line' | 'arrow'; x0: number; y0: number; x1: number; y1: number }
  | { tool: 'text'; x: number; y: number; text: string }

type Props = {
  onExport: (file: File, title: string, annotations: Stroke[]) => void
  disabled?: boolean
  /** Load a picked file into the canvas (e.g. from parent upload control). */
  initialFile?: File | null
}

const STROKE = '#ef4444'
const STROKE_W = 2

export function ScreenshotAnnotator({ onExport, disabled, initialFile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [past, setPast] = useState<Stroke[][]>([])
  const [future, setFuture] = useState<Stroke[][]>([])
  const [current, setCurrent] = useState<Stroke | null>(null)
  const [tool, setTool] = useState<Tool>('rect')
  const [title, setTitle] = useState('Screenshot')

  const commit = useCallback((next: Stroke[]) => {
    setPast((p) => [...p, strokes])
    setStrokes(next)
    setFuture([])
  }, [strokes])

  const undo = useCallback(() => {
    if (past.length === 0) return
    const p = [...past]
    const prev = p.pop()!
    setPast(p)
    setFuture((f) => [strokes, ...f])
    setStrokes(prev)
  }, [past, strokes])

  const redo = useCallback(() => {
    if (future.length === 0) return
    const f = [...future]
    const nxt = f.shift()!
    setFuture(f)
    setPast((p) => [...p, strokes])
    setStrokes(nxt)
  }, [future, strokes])

  const redraw = useCallback(
    (list: Stroke[], draft: Stroke | null) => {
      const c = canvasRef.current
      if (!c || !img) return
      const ctx = c.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      ctx.strokeStyle = STROKE
      ctx.fillStyle = STROKE
      ctx.lineWidth = STROKE_W
      for (const s of list) {
        drawStroke(ctx, s)
      }
      if (draft) drawStroke(ctx, draft)
    },
    [img],
  )

  useEffect(() => {
    redraw(strokes, current)
  }, [redraw, strokes, current, img])

  const loadFile = useCallback((f: File | null) => {
    if (!f || !f.type.startsWith('image/')) {
      setImg(null)
      setStrokes([])
      setPast([])
      setFuture([])
      setCurrent(null)
      return
    }
    const url = URL.createObjectURL(f)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      const c = canvasRef.current
      if (c) {
        const maxW = 900
        const w = image.naturalWidth
        const h = image.naturalHeight
        const scale = w > maxW ? maxW / w : 1
        c.width = Math.floor(w * scale)
        c.height = Math.floor(h * scale)
      }
      setImg(image)
      setStrokes([])
      setPast([])
      setFuture([])
      setCurrent(null)
    }
    image.onerror = () => URL.revokeObjectURL(url)
    image.src = url
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync external file into canvas
    if (initialFile) loadFile(initialFile)
  }, [initialFile, loadFile])

  function toLocal(e: MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current
    if (!c) return { x: 0, y: 0 }
    const r = c.getBoundingClientRect()
    const scaleX = c.width / r.width
    const scaleY = c.height / r.height
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
      <p className="text-sm font-medium">Annotate screenshot</p>
      <p className="text-xs text-muted-foreground">
        Box, line, arrow, text; undo/redo. Export PNG uploads with annotation vectors in evidence metadata.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Image</Label>
          <Input
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={(e) => loadFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-1">
          <Label>Tool</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['rect', 'Box'],
                ['line', 'Line'],
                ['arrow', 'Arrow'],
                ['text', 'Text'],
              ] as const
            ).map(([t, label]) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={tool === t ? 'default' : 'secondary'}
                onClick={() => setTool(t)}
                disabled={disabled}
              >
                {label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || past.length === 0}
              onClick={() => undo()}
            >
              Undo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || future.length === 0}
              onClick={() => redo()}
            >
              Redo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || strokes.length === 0}
              onClick={() => {
                setPast([])
                setFuture([])
                setStrokes([])
                setCurrent(null)
              }}
            >
              Clear marks
            </Button>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1 sm:max-w-xs">
          <Label htmlFor="annot-title">Title for upload</Label>
          <Input id="annot-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button
          type="button"
          disabled={disabled || !img || !title.trim()}
          onClick={() => {
            const c = canvasRef.current
            if (!c) return
            const t = title.trim()
            const ann = strokes
            c.toBlob(
              (blob) => {
                if (!blob) return
                const name = `annotated-${Date.now()}.png`
                onExport(new File([blob], name, { type: 'image/png' }), t, ann)
              },
              'image/png',
              0.95,
            )
          }}
        >
          Export PNG &amp; upload
        </Button>
      </div>
      <div className="max-w-full overflow-x-auto">
        <canvas
          ref={canvasRef}
          className="max-w-full border border-border bg-muted/30"
          style={{ cursor: img && !disabled ? 'crosshair' : 'default' }}
          onMouseDown={(e) => {
            if (!img || disabled) return
            const { x, y } = toLocal(e)
            if (tool === 'text') {
              const label = window.prompt('Label / text for marker')
              if (label && label.trim()) {
                commit([...strokes, { tool: 'text', x, y, text: label.trim() }])
              }
              return
            }
            setCurrent({ tool, x0: x, y0: y, x1: x, y1: y })
          }}
          onMouseMove={(e) => {
            if (!current || current.tool === 'text') return
            const { x, y } = toLocal(e)
            setCurrent({ ...current, x1: x, y1: y })
          }}
          onMouseUp={(e) => {
            if (!current || current.tool === 'text') return
            const { x, y } = toLocal(e)
            const done = { ...current, x1: x, y1: y }
            const dx = done.x1 - done.x0
            const dy = done.y1 - done.y0
            if (Math.hypot(dx, dy) < 2) {
              setCurrent(null)
              return
            }
            commit([...strokes, done])
            setCurrent(null)
          }}
          onMouseLeave={() => {
            if (current && current.tool !== 'text') setCurrent(null)
          }}
        />
      </div>
    </div>
  )
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.tool === 'text') {
    ctx.font = '14px sans-serif'
    ctx.fillStyle = STROKE
    ctx.fillText(s.text, s.x, s.y)
    return
  }
  if (s.tool === 'line' || s.tool === 'arrow') {
    ctx.beginPath()
    ctx.moveTo(s.x0, s.y0)
    ctx.lineTo(s.x1, s.y1)
    ctx.stroke()
    if (s.tool === 'arrow') {
      const ang = Math.atan2(s.y1 - s.y0, s.x1 - s.x0)
      const sz = 10
      ctx.beginPath()
      ctx.moveTo(s.x1, s.y1)
      ctx.lineTo(s.x1 - sz * Math.cos(ang - Math.PI / 6), s.y1 - sz * Math.sin(ang - Math.PI / 6))
      ctx.lineTo(s.x1 - sz * Math.cos(ang + Math.PI / 6), s.y1 - sz * Math.sin(ang + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
    }
    return
  }
  const x = Math.min(s.x0, s.x1)
  const y = Math.min(s.y0, s.y1)
  const w = Math.abs(s.x1 - s.x0)
  const h = Math.abs(s.y1 - s.y0)
  ctx.strokeRect(x, y, w, h)
}
