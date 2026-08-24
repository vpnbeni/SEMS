import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { FormatCanvasItem, FormatOrientation, FormatPageSize } from './types'
import { PAGE_LABEL, PAGE_SIZE_MM } from './types'
import { CanvasOverlay } from './CanvasOverlay'

const MAX_PORTRAIT_WIDTH_PX = 720
const MAX_LANDSCAPE_WIDTH_PX = 980

export const PageCanvas = ({
  pageSize,
  orientation,
  canvasItems,
  selectedCanvasId,
  onSelectCanvas,
  onCanvasChange,
  children,
}: {
  pageSize: FormatPageSize
  orientation: FormatOrientation
  canvasItems: FormatCanvasItem[]
  selectedCanvasId: string | null
  onSelectCanvas: (id: string | null) => void
  onCanvasChange: (items: FormatCanvasItem[]) => void
  children: React.ReactNode
}) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const [hostWidth, setHostWidth] = useState(0)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const update = () => setHostWidth(el.clientWidth)
    update()

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width
      if (typeof next === 'number' && next > 0) setHostWidth(next)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const paper = useMemo(() => {
    const base = PAGE_SIZE_MM[pageSize] || PAGE_SIZE_MM.A4
    const widthMm = orientation === 'landscape' ? base.height : base.width
    const heightMm = orientation === 'landscape' ? base.width : base.height

    // Scale so the widest paper size in this orientation fills the host.
    const refWidthMm =
      orientation === 'landscape'
        ? Math.max(PAGE_SIZE_MM.A4.height, PAGE_SIZE_MM.legal.height, PAGE_SIZE_MM.letter.height)
        : Math.max(PAGE_SIZE_MM.A4.width, PAGE_SIZE_MM.legal.width, PAGE_SIZE_MM.letter.width)

    const maxWidth = orientation === 'portrait' ? MAX_PORTRAIT_WIDTH_PX : MAX_LANDSCAPE_WIDTH_PX
    const available = Math.max(280, Math.min(hostWidth > 0 ? hostWidth : maxWidth, maxWidth))
    const pxPerMm = available / refWidthMm

    const width = Math.round(widthMm * pxPerMm)
    const height = Math.round(heightMm * pxPerMm)

    return { width, height, widthMm, heightMm, pxPerMm }
  }, [pageSize, orientation, hostWidth])

  return (
    <div ref={hostRef} className="w-full overflow-auto pb-3">
      <div className="flex min-h-full justify-center">
        <div
          key={`paper-${pageSize}-${orientation}-${paper.width}x${paper.height}`}
          className="box-border overflow-hidden border border-slate-400 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.18)] dark:border-gray-500 dark:bg-gray-800"
          style={{
            width: paper.width,
            height: paper.height,
          }}
          data-page-size={pageSize}
          data-orientation={orientation}
          title={`${PAGE_LABEL[pageSize]} ${orientation} · ${paper.widthMm.toFixed(1)}×${paper.heightMm.toFixed(1)} mm`}
        >
          <div className="box-border h-full w-full overflow-auto p-3">
            <div className="relative min-h-full w-full">
              {children}
              <CanvasOverlay
                items={canvasItems}
                selectedId={selectedCanvasId}
                onSelect={onSelectCanvas}
                onChange={onCanvasChange}
              />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] tabular-nums text-slate-500">
        {PAGE_LABEL[pageSize]} · {orientation} · {paper.widthMm.toFixed(0)} × {paper.heightMm.toFixed(0)} mm
        <span className="text-slate-400">
          {' '}
          ({paper.width} × {paper.height} px)
        </span>
      </p>
    </div>
  )
}
