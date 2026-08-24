import api from './api'

export type CbseRegistrationStudent = {
  _id: string
  rollNumber?: string
  classRollNo?: number | null
  name: string
}

export type ClassSubjectSlot = {
  key: string
  name: string
  code?: string
}

export type ClassSubjectRow = {
  className: string
  section: string
  subjects: ClassSubjectSlot[]
}

export type ClassSubjectMatrixPayload = {
  classes: string[]
  rows: ClassSubjectRow[]
  catalog: ClassSubjectSlot[]
  subjectsPerRow?: number
}

export type CbseRegistrationSubject = {
  key: string
  name: string
  code?: string
  _id?: string
}

export type CbseRegistrationMatrix = Record<string, string[]>

export type CbseRegistrationPayload = {
  class: string
  section: string
  students: CbseRegistrationStudent[]
  subjects: CbseRegistrationSubject[]
  matrix: CbseRegistrationMatrix
  additionalByStudent: Record<string, string>
}

const getMatrix = async (className: string, section: string): Promise<CbseRegistrationPayload> => {
  const response = await api.get('/cbse-registration', {
    params: { class: className, section },
  })
  const data = response?.data?.data || {}
  return {
    class: String(data.class || className),
    section: String(data.section || section),
    students: Array.isArray(data.students) ? data.students : [],
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    matrix: data.matrix && typeof data.matrix === 'object' ? data.matrix : {},
    additionalByStudent:
      data.additionalByStudent && typeof data.additionalByStudent === 'object'
        ? data.additionalByStudent
        : {},
  }
}

const saveMatrix = async (
  className: string,
  section: string,
  matrix: CbseRegistrationMatrix,
  additionalByStudent: Record<string, string> = {}
): Promise<{ matrix: CbseRegistrationMatrix; additionalByStudent: Record<string, string> }> => {
  const response = await api.put('/cbse-registration', {
    class: className,
    section,
    matrix,
    additionalByStudent,
  })
  const data = response?.data?.data || {}
  return {
    matrix: data.matrix && typeof data.matrix === 'object' ? data.matrix : {},
    additionalByStudent:
      data.additionalByStudent && typeof data.additionalByStudent === 'object'
        ? data.additionalByStudent
        : {},
  }
}

const normalizeClassRows = (rows: any[]): ClassSubjectRow[] =>
  (Array.isArray(rows) ? rows : []).map((row) => {
    let subjects: ClassSubjectSlot[] = []
    if (Array.isArray(row?.subjects)) {
      subjects = row.subjects
    } else if (row?.slots && typeof row.slots === 'object') {
      subjects = Object.values(row.slots).filter(Boolean) as ClassSubjectSlot[]
    }
    return {
      className: String(row?.className || ''),
      section: String(row?.section || ''),
      subjects,
    }
  })

const getClassSubjectMatrix = async (): Promise<ClassSubjectMatrixPayload> => {
  const response = await api.get('/cbse-registration/class-subjects')
  const data = response?.data?.data || {}
  return {
    classes: Array.isArray(data.classes) ? data.classes : ['9th', '10th', '11th', '12th'],
    rows: normalizeClassRows(data.rows),
    catalog: Array.isArray(data.catalog) ? data.catalog : [],
    subjectsPerRow: Number(data.subjectsPerRow) || 3,
  }
}

const saveClassSubjectMatrix = async (payload: {
  rows: ClassSubjectRow[]
}): Promise<ClassSubjectMatrixPayload> => {
  const response = await api.put('/cbse-registration/class-subjects', payload)
  const data = response?.data?.data || {}
  return {
    classes: Array.isArray(data.classes) ? data.classes : ['9th', '10th', '11th', '12th'],
    rows: normalizeClassRows(data.rows),
    catalog: Array.isArray(data.catalog) ? data.catalog : [],
    subjectsPerRow: Number(data.subjectsPerRow) || 3,
  }
}

const cbseRegistrationService = {
  getMatrix,
  saveMatrix,
  getClassSubjectMatrix,
  saveClassSubjectMatrix,
}

export default cbseRegistrationService
