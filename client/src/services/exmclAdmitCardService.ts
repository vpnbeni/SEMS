import api from './api'
import { mergeCanvasItems, type FormatCanvasItem } from '@/components/format-editor'

export type AdmitCardDesign = {
  formatId?: 'admit-card'
  templateId?: string
  title: string
  pageSize: 'A4' | 'legal'
  orientation: 'landscape' | 'portrait'
  copiesPerSheet: 1 | 2
  showHeader: boolean
  showSchoolLogo: boolean
  showSchoolAddress: boolean
  entryNote: string
  showEntryNote: boolean
  instructions: string
  showInstructions: boolean
  confirmationText: string
  showConfirmation: boolean
  disclaimer: string
  showDisclaimer: boolean
  fields: {
    photo: boolean
    rollNo: boolean
    dob: boolean
    schoolNo: boolean
    centreNo: boolean
    rollNoInWords: boolean
    exam: boolean
    name: boolean
    motherName: boolean
    fatherName: boolean
    gender: boolean
    schoolName: boolean
    examCentre: boolean
    pwdCategory: boolean
    admitCardId: boolean
    subjects: boolean
    qr: boolean
    class: boolean
    section: boolean
    admissionNo: boolean
  }
  signatures: {
    candidate: boolean
    parent: boolean
    examIncharge: boolean
    principal: boolean
    examInchargeDigital: boolean
    principalDigital: boolean
    examInchargeSignatureUrl: string
    principalSignatureUrl: string
    examInchargeSignaturePublicId: string
    principalSignaturePublicId: string
  }
  canvasItems: FormatCanvasItem[]
}

export const DEFAULT_ADMIT_CARD_DESIGN: AdmitCardDesign = {
  formatId: 'admit-card',
  templateId: 'portrait-default',
  title: 'ADMIT CARD FOR {exam}',
  pageSize: 'A4',
  orientation: 'portrait',
  copiesPerSheet: 1,
  showHeader: true,
  showSchoolLogo: true,
  showSchoolAddress: false,
  entryNote: 'LATEST ENTRY IN EXAMINATION CENTRE 30 MIN BEFORE THE EXAM START',
  showEntryNote: true,
  instructions: [
    '1. This admit card must be verified and carried to the examination centre.',
    '2. Report at least 30 minutes before the exam. Entry closes 30 minutes before start.',
    '3. Candidates with special needs should report earlier for assistance, as applicable.',
    '4. Mobile phones, smart watches, electronic gadgets, and unfair means are strictly prohibited.',
    '5. Carry only permitted stationery as instructed by the school.',
    '6. Wear school uniform unless otherwise notified.',
    '7. Sign the attendance sheet and follow invigilator instructions.',
    '8. Check all particulars including the subject(s) and the photograph before the examination.',
  ].join('\n'),
  showInstructions: true,
  confirmationText: 'ALL PARTICULARS INCLUDING THE SUBJECT(S) AND THE PHOTO CHECKED AND FOUND CORRECT',
  showConfirmation: true,
  disclaimer: 'Disclaimer: The school is not responsible for any inadvertent error that may have crept in the data being published.',
  showDisclaimer: true,
  fields: {
    photo: true,
    rollNo: true,
    dob: true,
    schoolNo: true,
    centreNo: true,
    rollNoInWords: true,
    exam: true,
    name: true,
    motherName: true,
    fatherName: true,
    gender: true,
    schoolName: true,
    examCentre: true,
    pwdCategory: true,
    admitCardId: true,
    subjects: true,
    qr: true,
    class: true,
    section: false,
    admissionNo: false,
  },
  signatures: {
    candidate: true,
    parent: true,
    examIncharge: true,
    principal: true,
    examInchargeDigital: false,
    principalDigital: false,
    examInchargeSignatureUrl: '',
    principalSignatureUrl: '',
    examInchargeSignaturePublicId: '',
    principalSignaturePublicId: '',
  },
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

export const mergeAdmitCardDesign = (data: Partial<AdmitCardDesign> = {}): AdmitCardDesign => ({
  ...DEFAULT_ADMIT_CARD_DESIGN,
  ...data,
  formatId: 'admit-card',
  templateId: data.templateId || DEFAULT_ADMIT_CARD_DESIGN.templateId,
  instructions: String(data.instructions || DEFAULT_ADMIT_CARD_DESIGN.instructions),
  fields: { ...DEFAULT_ADMIT_CARD_DESIGN.fields, ...(data.fields || {}) },
  signatures: {
    ...DEFAULT_ADMIT_CARD_DESIGN.signatures,
    ...(data.signatures || {}),
    examIncharge: data.signatures?.examIncharge ?? (data.signatures as { classTeacher?: boolean } | undefined)?.classTeacher ?? DEFAULT_ADMIT_CARD_DESIGN.signatures.examIncharge,
  },
  canvasItems: mergeCanvasItems(data.canvasItems),
})

const getDesign = async (): Promise<AdmitCardDesign> => {
  const response = await api.get('/admit-cards/design')
  return mergeAdmitCardDesign(response?.data?.data || {})
}

const saveDesign = async (design: AdmitCardDesign): Promise<AdmitCardDesign> => {
  const response = await api.put('/admit-cards/design', { design }, { _silent: true } as any)
  return mergeAdmitCardDesign(response?.data?.data || design)
}

const uploadCanvasImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData()
  formData.append('image', file)
  const response = await api.post('/admit-cards/design/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    _silent: true,
  } as any)
  return { url: String(response?.data?.data?.url || '') }
}

const uploadSignature = async (role: 'principal' | 'examIncharge', file: File): Promise<AdmitCardDesign> => {
  const formData = new FormData()
  formData.append('signature', file)
  const response = await api.post(`/admit-cards/design/signature/${role}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    _silent: true,
  } as any)
  const data = response?.data?.data || {}
  return mergeAdmitCardDesign(data)
}

const downloadAdmitCards = async (
  examId: string,
  className: string,
  section: string,
  examCode = 'exam'
): Promise<void> => {
  const response = await api.post(
    '/admit-cards',
    { examId, class: className, section },
    { responseType: 'blob', _silent: true } as any
  )

  const blob = response.data as Blob
  if (blob.type && blob.type.includes('application/json')) {
    const text = await blob.text()
    let message = 'Failed to generate admit cards.'
    try {
      const parsed = JSON.parse(text)
      message = parsed?.message || message
    } catch {
      // keep fallback
    }
    throw new Error(message)
  }

  const filename = `admit-cards_${examCode}_${className}-${section}.pdf`.replace(/\s+/g, '_')
  triggerDownload(blob, filename)
}

const exmclAdmitCardService = { getDesign, saveDesign, uploadSignature, uploadCanvasImage, downloadAdmitCards }

export default exmclAdmitCardService
