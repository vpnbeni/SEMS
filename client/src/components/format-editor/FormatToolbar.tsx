import { AlignCenter, AlignLeft, AlignRight, Bold, ImagePlus, Italic, Minus, Square, Trash2, Type, Underline } from 'lucide-react'
import type { FormatCanvasItem, FormatFontFamily, FormatTextStyle } from './types'
import { FONT_SIZES, FORMAT_FONTS, fontFamilyToCss } from './types'

export const FormatToolbar = ({
  selectionLabel,
  style,
  styleDisabled,
  canvasItem,
  uploadingImage,
  onStyleChange,
  onAddText,
  onAddImage,
  onAddRect,
  onAddLine,
  onPatchCanvas,
  onDelete,
}: {
  selectionLabel: string
  style: FormatTextStyle
  styleDisabled?: boolean
  canvasItem: FormatCanvasItem | null
  uploadingImage?: boolean
  onStyleChange: (partial: Partial<FormatTextStyle>) => void
  onAddText: () => void
  onAddImage: (file?: File) => void
  onAddRect: () => void
  onAddLine: () => void
  onPatchCanvas: (patch: Partial<FormatCanvasItem>) => void
  onDelete: () => void
}) => {
  const isText = canvasItem?.type === 'text'
  const isShape = canvasItem?.type === 'rect' || canvasItem?.type === 'line'
  const fontDisabled = Boolean(styleDisabled || canvasItem?.type === 'image' || isShape)
  const colorValue = isShape ? canvasItem.fill || canvasItem.stroke || '#000000' : canvasItem?.color || '#000000'

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800">
      <button type="button" onClick={onAddText} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700">
        <Type className="h-3.5 w-3.5" />
        Text
      </button>
      <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700">
        <ImagePlus className="h-3.5 w-3.5" />
        {uploadingImage ? 'Uploading...' : 'Image'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={uploadingImage}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            onAddImage(file)
          }}
        />
      </label>
      <button type="button" onClick={onAddRect} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700">
        <Square className="h-3.5 w-3.5" />
        Box
      </button>
      <button type="button" onClick={onAddLine} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700">
        <Minus className="h-3.5 w-3.5" />
        Line
      </button>
      <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-gray-600" />
      <span className="pr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{selectionLabel}</span>
      <select
        title="Font"
        value={style.fontFamily}
        disabled={fontDisabled}
        onChange={(event) => onStyleChange({ fontFamily: event.target.value as FormatFontFamily })}
        className="h-7 max-w-[140px] rounded-md border border-slate-200 bg-white px-1.5 text-[11px] dark:border-gray-600 dark:bg-gray-900 dark:text-white disabled:opacity-50"
        style={{ fontFamily: fontFamilyToCss(style.fontFamily) }}
      >
        {FORMAT_FONTS.map((font) => (
          <option key={font.id} value={font.id} style={{ fontFamily: font.css }}>{font.label}</option>
        ))}
      </select>
      <select
        title="Font size"
        value={style.fontSize}
        disabled={fontDisabled}
        onChange={(event) => onStyleChange({ fontSize: Number(event.target.value) })}
        className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] dark:border-gray-600 dark:bg-gray-900 dark:text-white disabled:opacity-50"
      >
        {Array.from(new Set([...FONT_SIZES, style.fontSize])).sort((a, b) => a - b).map((size) => (
          <option key={size} value={size}>{size}px</option>
        ))}
      </select>
      <button type="button" title="Bold" disabled={fontDisabled} className={`inline-flex h-7 w-7 items-center justify-center rounded-md disabled:opacity-40 ${style.bold ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`} onClick={() => onStyleChange({ bold: !style.bold })}>
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button type="button" title="Italic" disabled={fontDisabled} className={`inline-flex h-7 w-7 items-center justify-center rounded-md disabled:opacity-40 ${style.italic ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`} onClick={() => onStyleChange({ italic: !style.italic })}>
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button type="button" title="Underline" disabled={fontDisabled} className={`inline-flex h-7 w-7 items-center justify-center rounded-md disabled:opacity-40 ${style.underline ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`} onClick={() => onStyleChange({ underline: !style.underline })}>
        <Underline className="h-3.5 w-3.5" />
      </button>
      {isText || isShape ? (
        <>
          <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-gray-600" />
          <input
            type="color"
            title={isShape ? 'Colour' : 'Text colour'}
            value={colorValue}
            onChange={(event) => onPatchCanvas(isShape ? { fill: event.target.value, stroke: event.target.value, color: event.target.value } : { color: event.target.value })}
            className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-white p-0.5 dark:border-gray-600"
          />
        </>
      ) : null}
      {isText && canvasItem ? (
        <>
          <button type="button" title="Align left" className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${canvasItem.align === 'left' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`} onClick={() => onPatchCanvas({ align: 'left' })}>
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Align center" className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${canvasItem.align === 'center' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`} onClick={() => onPatchCanvas({ align: 'center' })}>
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Align right" className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${canvasItem.align === 'right' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`} onClick={() => onPatchCanvas({ align: 'right' })}>
            <AlignRight className="h-3.5 w-3.5" />
          </button>
        </>
      ) : null}
      {canvasItem ? (
        <button type="button" title="Delete selected" onClick={onDelete} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
