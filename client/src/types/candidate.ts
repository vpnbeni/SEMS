export interface CandidateStats {
  totalCandidates: number
  class10th: number
  class12th: number
  byCourse: Array<{ _id: string; count: number }>
  byDepartment: Array<{ _id: string; count: number }>
}

export interface Candidate {
  _id: string
  name: string
  rollNumber: string
  schoolName?: string
  schoolCode?: string
  class?: string
  email?: string
  phone?: string
  course?: string
  semester?: number
  batch?: string
  department?: string
  status: 'active' | 'inactive' | 'graduated' | 'suspended'
  admissionDate?: string
  photoUrl?: string
  subjects?: Array<{ _id: string; name: string; code: string }>
  subjectCodes?: string[]
  importedFrom?: {
    fileName: string
    uploadDate: string
    cloudinaryUrl: string
  }
  createdAt: string
  updatedAt: string
}
