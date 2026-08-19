import React from 'react'
import type { FormatCanvasItem, FormatOrientation, FormatPageSize } from './types'
import { PAGE_ASPECT } from './types'
import { CanvasOverlay } from './CanvasOverlay'

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
}) => (
  <div className="overflow-auto">
    <div
      className="mx-auto max-w-full bg-white p-3 shadow-md dark:bg-gray-800"
      style={{
        aspectRatio: PAGE_ASPECT[pageSize][orientation],
        width: orientation === 'portrait' ? 'min(100%, 680px)' : '100%',
      }}
    >
      <div className="relative h-full">
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
)
