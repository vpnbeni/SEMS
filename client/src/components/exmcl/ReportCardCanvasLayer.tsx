import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { ReportCardCanvasItem } from '@/services/exmclReportCardService'
import { fontFamilyToCss } from '@/services/exmclReportCardService'

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type Handle = (typeof HANDLES)[number]

const handleClass: Record<Handle, string> = {
  nw: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  n: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  ne: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  se: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
  s: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  sw: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
}

const TEXT_PAD = 2

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const measureTextBox = (
  item: Pick<ReportCardCanvasItem, 'text' | 'fontFamily' | 'fontSize' | 'bold' | 'italic' | 'underline'>,
  canvas: DOMRect
) => {
  const probe = document.createElement('span')
  probe.textContent = item.text || 'New text'
  probe.style.cssText = [
    'position:absolute',
    'left:-9999px',
    'top:0',
    'visibility:hidden',
    'white-space:pre',
    `font-size:${item.fontSize}px`,
    `font-weight:${item.bold ? 700 : 400}`,
    `font-style:${item.italic ? 'italic' : 'normal'}`,
    `text-decoration:${item.underline ? 'underline' : 'none'}`,
    `font-family:${fontFamilyToCss(item.fontFamily)}`,
    'line-height:1.05',
    'padding:0',
    'margin:0',
  ].join(';')
  document.body.appendChild(probe)
  const widthPx = probe.offsetWidth + TEXT_PAD * 2
  const heightPx = probe.offsetHeight + TEXT_PAD * 2
  document.body.removeChild(probe)
  const width = canvas.width > 0 ? (widthPx / canvas.width) * 100 : 10
  const height = canvas.height > 0 ? (heightPx / canvas.height) * 100 : 3
  return {
    width: clamp(width, 1.2, 98),
    height: clamp(height, 1, 40),
  }
}

const sizesDiffer = (
  left: { width: number; height: number },
  right: { width: number; height: number }
) => Math.abs(left.width - right.width) > 0.2 || Math.abs(left.height - right.height) > 0.2

export const ReportCardCanvasLayer = ({
  items,
  selectedId,
  onSelect,
  onChange,
}: {
  items: ReportCardCanvasItem[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (items: ReportCardCanvasItem[]) => void
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const updateItem = useCallback(
    (id: string, patch: Partial<ReportCardCanvasItem>) => {
      onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
    },
    [items, onChange]
  )

  const fitTextItems = useCallback(
    (source: ReportCardCanvasItem[]) => {
      const canvas = canvasRef.current
      if (!canvas) return source
      const rect = canvas.getBoundingClientRect()
      if (rect.width < 20 || rect.height < 20) return source
      let changed = false
      const next = source.map((item) => {
        if (item.type !== 'text') return item
        const size = measureTextBox(item, rect)
        if (!sizesDiffer(item, size)) return item
        changed = true
        return {
          ...item,
          width: size.width,
          height: size.height,
          x: clamp(item.x, 0, 100 - size.width),
          y: clamp(item.y, 0, 100 - size.height),
        }
      })
      return changed ? next : source
    },
    []
  )

  useEffect(() => {
    const fitted = fitTextItems(items)
    if (fitted !== items) onChange(fitted)
  }, [fitTextItems, items, onChange])

  const startDrag = (id: string, event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).dataset.handle) return
    event.preventDefault()
    event.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const item = items.find((entry) => entry.id === id)
    if (!item) return
    onSelect(id)
    const startX = event.clientX
    const startY = event.clientY
    const origX = item.x
    const origY = item.y

    const onMove = (moveEvent: MouseEvent) => {
      const dx = ((moveEvent.clientX - startX) / rect.width) * 100
      const dy = ((moveEvent.clientY - startY) / rect.height) * 100
      updateItem(id, {
        x: clamp(origX + dx, 0, 100 - item.width),
        y: clamp(origY + dy, 0, 100 - item.height),
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const startResize = (id: string, handle: Handle, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const item = items.find((entry) => entry.id === id)
    if (!item) return
    const startX = event.clientX
    const startY = event.clientY
    const orig = { ...item }

    const onMove = (moveEvent: MouseEvent) => {
      const dx = ((moveEvent.clientX - startX) / rect.width) * 100
      const dy = ((moveEvent.clientY - startY) / rect.height) * 100

      if (orig.type === 'text') {
        let scale = 1
        if (handle === 'e' || handle === 'w') {
          const nextWidth = handle === 'e' ? orig.width + dx : orig.width - dx
          scale = nextWidth / Math.max(orig.width, 0.01)
        } else if (handle === 'n' || handle === 's') {
          const nextHeight = handle === 's' ? orig.height + dy : orig.height - dy
          scale = nextHeight / Math.max(orig.height, 0.01)
        } else {
          const nextWidth = handle.includes('e') ? orig.width + dx : handle.includes('w') ? orig.width - dx : orig.width
          const nextHeight = handle.includes('s') ? orig.height + dy : handle.includes('n') ? orig.height - dy : orig.height
          scale = (nextWidth / Math.max(orig.width, 0.01) + nextHeight / Math.max(orig.height, 0.01)) / 2
        }
        const fontSize = Math.round(clamp(orig.fontSize * scale, 8, 180))
        const size = measureTextBox({ ...orig, fontSize }, rect)
        let x = orig.x
        let y = orig.y
        if (handle.includes('w')) x = orig.x + orig.width - size.width
        if (handle.includes('n')) y = orig.y + orig.height - size.height
        updateItem(id, {
          fontSize,
          width: size.width,
          height: size.height,
          x: clamp(x, 0, 100 - size.width),
          y: clamp(y, 0, 100 - size.height),
        })
        return
      }

      let next = { x: orig.x, y: orig.y, width: orig.width, height: orig.height }
      if (handle.includes('e')) next.width = orig.width + dx
      if (handle.includes('s')) next.height = orig.height + dy
      if (handle.includes('w')) {
        next.x = orig.x + dx
        next.width = orig.width - dx
      }
      if (handle.includes('n')) {
        next.y = orig.y + dy
        next.height = orig.height - dy
      }
      if (next.width < 6) {
        if (handle.includes('w')) next.x = orig.x + orig.width - 6
        next.width = 6
      }
      if (next.height < 4) {
        if (handle.includes('n')) next.y = orig.y + orig.height - 4
        next.height = 4
      }
      next.x = clamp(next.x, 0, 94)
      next.y = clamp(next.y, 0, 96)
      next.width = clamp(next.width, 6, 100 - next.x)
      next.height = clamp(next.height, 4, 100 - next.y)
      updateItem(id, next)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!selectedId) return
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      event.preventDefault()
      onChange(items.filter((item) => item.id !== selectedId))
      onSelect(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, onChange, onSelect, selectedId])

  return (
    <div ref={canvasRef} className="pointer-events-none absolute inset-0 z-20">
      {items.map((item) => {
        const selected = selectedId === item.id
        const textStyle: React.CSSProperties = {
          fontSize: `${item.fontSize}px`,
          fontWeight: item.bold ? 700 : 400,
          fontStyle: item.italic ? 'italic' : 'normal',
          textDecoration: item.underline ? 'underline' : 'none',
          color: item.color || '#000',
          textAlign: item.align,
          lineHeight: 1.05,
          fontFamily: fontFamilyToCss(item.fontFamily),
          padding: TEXT_PAD,
          whiteSpace: 'pre',
        }
        return (
          <div
            key={item.id}
            className={`pointer-events-auto absolute ${selected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.width}%`,
              height: `${item.height}%`,
              zIndex: item.zIndex + (selected ? 20 : 0),
              cursor: 'move',
            }}
            onMouseDown={(event) => startDrag(item.id, event)}
          >
            {item.type === 'image' ? (
              item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-full w-full object-contain pointer-events-none" />
              ) : (
                <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-400 bg-white/80 text-[10px] text-slate-500">
                  Image
                </div>
              )
            ) : selected && editingId === item.id ? (
              <textarea
                value={item.text}
                autoFocus
                onChange={(event) => updateItem(item.id, { text: event.target.value })}
                onMouseDown={(event) => event.stopPropagation()}
                onBlur={() => {
                  setEditingId(null)
                  const canvas = canvasRef.current?.getBoundingClientRect()
                  if (!canvas) return
                  const size = measureTextBox({ ...item, text: item.text }, canvas)
                  updateItem(item.id, size)
                }}
                className="block h-full w-full resize-none overflow-hidden border-0 bg-transparent outline-none"
                style={textStyle}
              />
            ) : (
              <div
                className="block h-full w-full overflow-hidden"
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  setEditingId(item.id)
                  onSelect(item.id)
                }}
                style={textStyle}
              >
                {item.text || 'New text'}
              </div>
            )}
            {selected
              ? HANDLES.map((handle) => (
                  <div
                    key={handle}
                    data-handle={handle}
                    className={`absolute h-2.5 w-2.5 rounded-sm border border-white bg-blue-500 ${handleClass[handle]}`}
                    onMouseDown={(event) => startResize(item.id, handle, event)}
                  />
                ))
              : null}
          </div>
        )
      })}
    </div>
  )
}

export default ReportCardCanvasLayer
