import React from 'react'
import { RotateCcw, Save } from 'lucide-react'
import type { FormatCanvasItem, FormatOrientation, FormatPageSize, FormatTextStyle } from './types'
import { PAGE_LABEL } from './types'
import { FormatToolbar } from './FormatToolbar'
import { PageCanvas } from './PageCanvas'

export const FormatEditorShell = ({
  title,
  description,
  pageSize,
  orientation,
  pageHint,
  inspector,
  boundLayer,
  canvasItems,
  selectedCanvasId,
  onSelectCanvas,
  onCanvasChange,
  selectionLabel,
  style,
  styleDisabled,
  selectedCanvasItem,
  onStyleChange,
  onAddText,
  onAddImage,
  onAddRect,
  onAddLine,
  onPatchCanvas,
  onDeleteCanvas,
  uploadingImage,
  loading,
  saving,
  onSave,
  generateLabel,
  onGenerate,
  onResetTemplate,
}: {
  title: string
  description: string
  pageSize: FormatPageSize
  orientation: FormatOrientation
  pageHint?: string
  inspector: React.ReactNode
  boundLayer: React.ReactNode
  canvasItems: FormatCanvasItem[]
  selectedCanvasId: string | null
  onSelectCanvas: (id: string | null) => void
  onCanvasChange: (items: FormatCanvasItem[]) => void
  selectionLabel: string
  style: FormatTextStyle
  styleDisabled?: boolean
  selectedCanvasItem: FormatCanvasItem | null
  onStyleChange: (partial: Partial<FormatTextStyle>) => void
  onAddText: () => void
  onAddImage: (file?: File) => void
  onAddRect: () => void
  onAddLine: () => void
  onPatchCanvas: (patch: Partial<FormatCanvasItem>) => void
  onDeleteCanvas: () => void
  uploadingImage?: boolean
  loading?: boolean
  saving?: boolean
  onSave: () => void
  generateLabel: string
  onGenerate: () => void
  onResetTemplate: () => void
}) => (
  <div className="p-6">
    <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        {inspector}
        <button
          type="button"
          onClick={onSave}
          disabled={loading || saving}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save format'}
        </button>
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-900"
        >
          {generateLabel}
        </button>
        <button
          type="button"
          onClick={onResetTemplate}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-gray-600 dark:text-slate-300 dark:hover:bg-gray-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to template
        </button>
      </aside>
      <section className="rounded-xl border border-gray-200 bg-slate-100 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Live preview · {PAGE_LABEL[pageSize]} · {orientation}
            {pageHint ? ` · ${pageHint}` : ''}
          </p>
          <FormatToolbar
            selectionLabel={selectionLabel}
            style={style}
            styleDisabled={styleDisabled}
            canvasItem={selectedCanvasItem}
            uploadingImage={uploadingImage}
            onStyleChange={onStyleChange}
            onAddText={onAddText}
            onAddImage={onAddImage}
            onAddRect={onAddRect}
            onAddLine={onAddLine}
            onPatchCanvas={onPatchCanvas}
            onDelete={onDeleteCanvas}
          />
        </div>
        <PageCanvas
          pageSize={pageSize}
          orientation={orientation}
          canvasItems={canvasItems}
          selectedCanvasId={selectedCanvasId}
          onSelectCanvas={onSelectCanvas}
          onCanvasChange={onCanvasChange}
        >
          {boundLayer}
        </PageCanvas>
      </section>
    </div>
  </div>
)
