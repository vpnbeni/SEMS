import api from './api'

export type ReportCardPageSize = 'A4' | 'legal' | 'letter'
export type ReportCardOrientation = 'portrait' | 'landscape'

export type ReportCardFontFamily =
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

export const REPORT_CARD_FONTS: Array<{ id: ReportCardFontFamily; css: string; label: string }> = [
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
  REPORT_CARD_FONTS.find((font) => font.id === family)?.css || REPORT_CARD_FONTS[0].css

export const parseFontFamily = (value?: string, fallback: ReportCardFontFamily = 'Arial'): ReportCardFontFamily =>
  REPORT_CARD_FONTS.some((font) => font.id === value) ? (value as ReportCardFontFamily) : fallback

export type ReportCardTextStyle = {
  fontFamily: ReportCardFontFamily
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
}

export type ReportCardStyleKey =
  | 'schoolName'
  | 'tagline'
  | 'meta'
  | 'examTitle'
  | 'sectionHeading'
  | 'studentFields'
  | 'tableHeader'
  | 'tableBody'
  | 'footer'
  | 'signatures'

export type ReportCardColumnKey = 'subjects' | 'maxMarks' | 'marksObtained' | 'grade'

export type ReportCardCanvasItem = {
  id: string
  type: 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  text: string
  imageUrl: string
  fontFamily: ReportCardFontFamily
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
  color: string
  align: 'left' | 'center' | 'right'
}

export type ReportCardDesign = {
  schoolName: string
  tagline: string
  schoolCode: string
  address: string
  affiliationNo: string
  email: string
  contact: string
  pageSize: ReportCardPageSize
  orientation: ReportCardOrientation
  showHeader: boolean
  showSchoolLogo: boolean
  showCbseLogo: boolean
  showTagline: boolean
  showSchoolCode: boolean
  showAddress: boolean
  showAffiliation: boolean
  showEmail: boolean
  showContact: boolean
  showAttendance: boolean
  showRemarks: boolean
  showDate: boolean
  signatures: {
    classTeacher: boolean
    principal: boolean
  }
  labels: {
    studentDetails: string
    scholasticArea: string
    subjects: string
    maxMarks: string
    marksObtained: string
    grade: string
    grandTotal: string
    percentage: string
    overallGrade: string
    attendance: string
    remarks: string
    date: string
    classTeacherSign: string
    principalSign: string
  }
  styles: Record<ReportCardStyleKey, ReportCardTextStyle>
  columnWidths: Record<ReportCardColumnKey, number>
  canvasItems: ReportCardCanvasItem[]
}

export const DEFAULT_REPORT_CARD_STYLES: Record<ReportCardStyleKey, ReportCardTextStyle> = {
  schoolName: { fontFamily: 'Arial', fontSize: 30, bold: true, italic: false, underline: false },
  tagline: { fontFamily: 'Arial', fontSize: 12, bold: false, italic: true, underline: false },
  meta: { fontFamily: 'Arial', fontSize: 11, bold: false, italic: false, underline: false },
  examTitle: { fontFamily: 'Arial', fontSize: 14, bold: true, italic: false, underline: false },
  sectionHeading: { fontFamily: 'Arial', fontSize: 14, bold: true, italic: true, underline: false },
  studentFields: { fontFamily: 'Arial', fontSize: 11, bold: false, italic: false, underline: false },
  tableHeader: { fontFamily: 'Arial', fontSize: 11, bold: true, italic: false, underline: false },
  tableBody: { fontFamily: 'Arial', fontSize: 11, bold: false, italic: false, underline: false },
  footer: { fontFamily: 'Arial', fontSize: 11, bold: false, italic: false, underline: false },
  signatures: { fontFamily: 'Arial', fontSize: 11, bold: false, italic: false, underline: false },
}

export const DEFAULT_REPORT_CARD_DESIGN: ReportCardDesign = {
  schoolName: 'I.B. SCHOOL',
  tagline: 'Always Learning, Learning All Ways.....',
  schoolCode: '40291',
  address: '5th Milestone, Gohana Road, Rohtak (HR) – 124001',
  affiliationNo: '530316',
  email: 'contact@ibsrohtak.com',
  contact: '7082352880, 7082355053',
  pageSize: 'A4',
  orientation: 'portrait',
  showHeader: true,
  showSchoolLogo: true,
  showCbseLogo: true,
  showTagline: true,
  showSchoolCode: true,
  showAddress: true,
  showAffiliation: true,
  showEmail: true,
  showContact: true,
  showAttendance: true,
  showRemarks: true,
  showDate: true,
  signatures: {
    classTeacher: true,
    principal: true,
  },
  labels: {
    studentDetails: 'Student Details:',
    scholasticArea: 'Scholastic Area:',
    subjects: 'Subjects',
    maxMarks: 'Maximum Marks',
    marksObtained: 'Marks Obtained',
    grade: 'Grade',
    grandTotal: 'Grand Total',
    percentage: 'Percentage',
    overallGrade: 'Overall Grade',
    attendance: 'Attendance:',
    remarks: 'Remarks:',
    date: 'Date:',
    classTeacherSign: 'Class Teacher Sign',
    principalSign: 'Principal Sign',
  },
  styles: DEFAULT_REPORT_CARD_STYLES,
  columnWidths: {
    subjects: 40,
    maxMarks: 20,
    marksObtained: 22,
    grade: 18,
  },
  canvasItems: [],
}

const mergeStyle = (
  base: ReportCardTextStyle,
  extra?: Partial<ReportCardTextStyle>
): ReportCardTextStyle => ({
  fontFamily: parseFontFamily(extra?.fontFamily, base.fontFamily),
  fontSize: Number(extra?.fontSize) > 0 ? Number(extra?.fontSize) : base.fontSize,
  bold: extra?.bold ?? base.bold,
  italic: extra?.italic ?? base.italic,
  underline: extra?.underline ?? base.underline,
})

const mergeCanvasItem = (item: Partial<ReportCardCanvasItem>, index: number): ReportCardCanvasItem => ({
  id: String(item.id || `canvas_${index}`),
  type: item.type === 'image' ? 'image' : 'text',
  x: Number(item.x) || 0,
  y: Number(item.y) || 0,
  width: Number(item.width) || 20,
  height: Number(item.height) || 8,
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
})

export const mergeDesign = (data: Partial<ReportCardDesign> = {}): ReportCardDesign => {
  const pageSize = data.pageSize === 'legal' || data.pageSize === 'letter' ? data.pageSize : 'A4'
  const styles = { ...DEFAULT_REPORT_CARD_STYLES }
  ;(Object.keys(DEFAULT_REPORT_CARD_STYLES) as ReportCardStyleKey[]).forEach((key) => {
    styles[key] = mergeStyle(DEFAULT_REPORT_CARD_STYLES[key], data.styles?.[key])
  })
  return {
    ...DEFAULT_REPORT_CARD_DESIGN,
    ...data,
    pageSize,
    orientation: data.orientation === 'landscape' ? 'landscape' : 'portrait',
    signatures: {
      ...DEFAULT_REPORT_CARD_DESIGN.signatures,
      ...(data.signatures || {}),
    },
    labels: {
      ...DEFAULT_REPORT_CARD_DESIGN.labels,
      ...(data.labels || {}),
    },
    styles,
    columnWidths: {
      ...DEFAULT_REPORT_CARD_DESIGN.columnWidths,
      ...(data.columnWidths || {}),
    },
    canvasItems: Array.isArray(data.canvasItems) ? data.canvasItems.map(mergeCanvasItem) : [],
  }
}

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const getDesign = async (): Promise<ReportCardDesign> => {
  const response = await api.get('/report-card/design')
  return mergeDesign(response?.data?.data || {})
}

const saveDesign = async (design: ReportCardDesign): Promise<ReportCardDesign> => {
  const response = await api.put('/report-card/design', { design }, { _silent: true } as any)
  return mergeDesign(response?.data?.data || design)
}

const uploadCanvasImage = async (file: File): Promise<{ url: string; publicId: string }> => {
  const formData = new FormData()
  formData.append('image', file)
  const response = await api.post('/report-card/design/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    _silent: true,
  } as any)
  return {
    url: String(response?.data?.data?.url || ''),
    publicId: String(response?.data?.data?.publicId || ''),
  }
}

const downloadSingle = async (examId: string, studentId: string, studentName: string): Promise<void> => {
  const response = await api.get('/report-card/single', {
    params: { examId, studentId },
    responseType: 'blob',
  })
  const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_')
  triggerDownload(response.data as Blob, `report-card_${safeName}.pdf`)
}

const downloadBulk = async (examId: string, className: string, section: string): Promise<void> => {
  const response = await api.get('/report-card/bulk', {
    params: { examId, class: className, section },
    responseType: 'blob',
  })
  triggerDownload(response.data as Blob, `report-cards_${className}-${section}.pdf`)
}

const previewSingle = async (examId: string, studentId: string): Promise<void> => {
  const response = await api.get('/report-card/single', {
    params: { examId, studentId },
    responseType: 'blob',
  })

  const blob = response.data as Blob
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

const exmclReportCardService = { getDesign, saveDesign, uploadCanvasImage, downloadSingle, downloadBulk, previewSingle }

export default exmclReportCardService
