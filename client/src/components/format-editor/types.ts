export type FormatId = 'award-list' | 'admit-card' | 'report-card'

export type FormatPageSize = 'A4' | 'legal' | 'letter'
export type FormatOrientation = 'portrait' | 'landscape'

export type FormatFontFamily =
  | 'Arial'
  | 'Times New Roman'
  | 'Georgia'
  | 'Verdana'
  | 'Trebuchet MS'
  | 'Tahoma'
  | 'Courier New'
  | 'Comic Sans MS'
  | 'Impact'
  | 'Palatino Linotype'

export const FORMAT_FONTS: Array<{ id: FormatFontFamily; css: string; label: string }> = [
  { id: 'Arial', css: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { id: 'Times New Roman', css: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { id: 'Georgia', css: 'Georgia, serif', label: 'Georgia' },
  { id: 'Verdana', css: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { id: 'Trebuchet MS', css: '"Trebuchet MS", Helvetica, sans-serif', label: 'Trebuchet MS' },
  { id: 'Tahoma', css: 'Tahoma, Geneva, sans-serif', label: 'Tahoma' },
  { id: 'Courier New', css: '"Courier New", Courier, monospace', label: 'Courier New' },
  { id: 'Comic Sans MS', css: '"Comic Sans MS", Comic Sans, cursive', label: 'Comic Sans MS' },
  { id: 'Impact', css: 'Impact, Haettenschweiler, sans-serif', label: 'Impact' },
  { id: 'Palatino Linotype', css: '"Palatino Linotype", Palatino, serif', label: 'Palatino' },
]

export const fontFamilyToCss = (family?: string): string =>
  FORMAT_FONTS.find((font) => font.id === family)?.css || FORMAT_FONTS[0].css

export const parseFontFamily = (value?: string, fallback: FormatFontFamily = 'Arial'): FormatFontFamily =>
  FORMAT_FONTS.some((font) => font.id === value) ? (value as FormatFontFamily) : fallback

export type FormatTextStyle = {
  fontFamily: FormatFontFamily
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
}

export type FormatCanvasItemType = 'text' | 'image' | 'rect' | 'line'

export type FormatCanvasItem = {
  id: string
  type: FormatCanvasItemType
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  text: string
  imageUrl: string
  fontFamily: FormatFontFamily
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
  color: string
  align: 'left' | 'center' | 'right'
  fill: string
  stroke: string
  strokeWidth: number
}

export type FormatTemplate = {
  id: string
  label: string
  description: string
}

export type FormatDefinition = {
  id: FormatId
  label: string
  generatePath: string
  generateLabel: string
  pageSizes: FormatPageSize[]
  defaultPageSize: FormatPageSize
  defaultOrientation: FormatOrientation
  templates: FormatTemplate[]
  mergeFields: string[]
}

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36]

export const PAGE_ASPECT: Record<FormatPageSize, Record<FormatOrientation, string>> = {
  A4: { portrait: '210 / 297', landscape: '297 / 210' },
  legal: { portrait: '8.5 / 14', landscape: '14 / 8.5' },
  letter: { portrait: '8.5 / 11', landscape: '11 / 8.5' },
}

export const PAGE_LABEL: Record<FormatPageSize, string> = {
  A4: 'A4',
  legal: 'Legal',
  letter: 'Letter',
}

export const createCanvasId = () => `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export const mergeCanvasItem = (item: Partial<FormatCanvasItem>, index: number): FormatCanvasItem => {
  const type: FormatCanvasItemType =
    item.type === 'image' || item.type === 'rect' || item.type === 'line' ? item.type : 'text'
  return {
    id: String(item.id || `canvas_${index}`),
    type,
    x: Number(item.x) || 0,
    y: Number(item.y) || 0,
    width: Number(item.width) || (type === 'line' ? 30 : 18),
    height: Number(item.height) || (type === 'line' ? 0.6 : type === 'rect' ? 12 : 8),
    zIndex: Number(item.zIndex) || index + 1,
    text: String(item.text || ''),
    imageUrl: String(item.imageUrl || ''),
    fontFamily: parseFontFamily(item.fontFamily),
    fontSize: Number(item.fontSize) > 0 ? Number(item.fontSize) : 16,
    bold: Boolean(item.bold),
    italic: Boolean(item.italic),
    underline: Boolean(item.underline),
    color: String(item.color || '#000000'),
    align: item.align === 'center' || item.align === 'right' ? item.align : 'left',
    fill: String(item.fill || (type === 'rect' ? '#e2e8f0' : '#000000')),
    stroke: String(item.stroke || '#000000'),
    strokeWidth: Number(item.strokeWidth) > 0 ? Number(item.strokeWidth) : 1,
  }
}

export const mergeCanvasItems = (items?: Partial<FormatCanvasItem>[]): FormatCanvasItem[] =>
  Array.isArray(items) ? items.slice(0, 40).map(mergeCanvasItem) : []

export const createCanvasItem = (
  type: FormatCanvasItemType,
  extras: Partial<FormatCanvasItem> = {},
  zIndex = 1
): FormatCanvasItem =>
  mergeCanvasItem(
    {
      type,
      x: type === 'text' ? 22 : 28,
      y: type === 'text' ? 38 : 30,
      width: type === 'line' ? 36 : type === 'text' ? 18 : 24,
      height: type === 'line' ? 0.7 : type === 'text' ? 3 : 14,
      zIndex,
      text: type === 'text' ? 'New text' : '',
      fontSize: 18,
      fill: type === 'rect' ? '#cbd5e1' : '#111111',
      ...extras,
    },
    zIndex
  )
