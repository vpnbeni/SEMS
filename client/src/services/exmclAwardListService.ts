import api from './api'
import { mergeCanvasItems, type FormatCanvasItem } from '@/components/format-editor'

export type AwardListDesign = {
  formatId?: 'award-list'
  templateId?: string
  title: string
  pageSize: 'A4' | 'legal'
  orientation: 'landscape' | 'portrait'
  copiesPerSheet: 1 | 2
  showHeader: boolean
  showSchoolLogo: boolean
  showSchoolAddress: boolean
  showInfoRow: boolean
  showMaxMarks: boolean
  headerFields: {
    class: boolean
    section: boolean
    exam: boolean
    date: boolean
    subject: boolean
    mm: boolean
  }
  columns: {
    srNo: boolean
    rollNumber: boolean
    rollNo: boolean
    name: boolean
    fatherName: boolean
    subjects: boolean
    total: boolean
    grade: boolean
    checkerSign: boolean
  }
  signatures: {
    subjectTeacher: boolean
    hod: boolean
    examIncharge: boolean
    principal: boolean
  }
  extraMarkColumns: number
  canvasItems: FormatCanvasItem[]
}

export const DEFAULT_AWARD_LIST_DESIGN: AwardListDesign = {
  formatId: 'award-list',
  templateId: 'landscape-default',
  title: 'Award List',
  pageSize: 'A4',
  orientation: 'landscape',
  copiesPerSheet: 1,
  showHeader: true,
  showSchoolLogo: false,
  showSchoolAddress: true,
  showInfoRow: true,
  showMaxMarks: true,
  headerFields: {
    class: true,
    section: true,
    exam: true,
    date: true,
    subject: true,
    mm: true,
  },
  columns: {
    srNo: true,
    rollNumber: true,
    rollNo: true,
    name: true,
    fatherName: false,
    subjects: true,
    total: true,
    grade: false,
    checkerSign: true,
  },
  signatures: {
    subjectTeacher: true,
    hod: true,
    examIncharge: true,
    principal: true,
  },
  extraMarkColumns: 0,
  canvasItems: [],
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

export const mergeAwardListDesign = (data: Partial<AwardListDesign> = {}): AwardListDesign => ({
  ...DEFAULT_AWARD_LIST_DESIGN,
  ...data,
  formatId: 'award-list',
  templateId: data.templateId || DEFAULT_AWARD_LIST_DESIGN.templateId,
  columns: { ...DEFAULT_AWARD_LIST_DESIGN.columns, ...(data.columns || {}) },
  signatures: { ...DEFAULT_AWARD_LIST_DESIGN.signatures, ...(data.signatures || {}) },
  headerFields: { ...DEFAULT_AWARD_LIST_DESIGN.headerFields, ...(data.headerFields || {}) },
  canvasItems: mergeCanvasItems(data.canvasItems),
})

const getDesign = async (): Promise<AwardListDesign> => {
  const response = await api.get('/award-list/design')
  return mergeAwardListDesign(response?.data?.data || {})
}

const saveDesign = async (design: AwardListDesign): Promise<AwardListDesign> => {
  const response = await api.put('/award-list/design', { design }, { _silent: true } as any)
  return mergeAwardListDesign(response?.data?.data || design)
}

const uploadCanvasImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData()
  formData.append('image', file)
  const response = await api.post('/award-list/design/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    _silent: true,
  } as any)
  return { url: String(response?.data?.data?.url || '') }
}

const downloadAwardList = async (
  examId: string,
  className: string,
  section: string,
  examCode = 'exam',
  extras?: { subject?: string; examDate?: string }
): Promise<void> => {
  const response = await api.post(
    '/award-list',
    {
      examId,
      class: className,
      section,
      subject: extras?.subject || '',
      examDate: extras?.examDate || '',
    },
    { responseType: 'blob', _silent: true } as any
  )

  const blob = response.data as Blob
  if (blob.type && blob.type.includes('application/json')) {
    const text = await blob.text()
    let message = 'Failed to generate award list.'
    try {
      const parsed = JSON.parse(text)
      message = parsed?.message || message
    } catch {
      // keep fallback
    }
    throw new Error(message)
  }

  const filename = `award-list_${examCode}_${className}-${section}.pdf`.replace(/\s+/g, '_')
  triggerDownload(blob, filename)
}

const exmclAwardListService = { getDesign, saveDesign, uploadCanvasImage, downloadAwardList }

export default exmclAwardListService
