import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Download, Filter, LayoutGrid, RefreshCw, Search, Trash2, Upload, UserPlus, Users } from 'lucide-react'
import type { AppDispatch, RootState } from '../redux/store'
import {
  createStudent,
  deleteStudent,
  fetchStudentStats,
  fetchStudents,
  getNextRollNumber,
  updateStudent,
} from '../redux/slices/studentSlice'
import api from '../services/api'
import studentService from '../services/studentService'
import timetableService from '../services/timetableService'
import { STUDENT_CLASS_OPTIONS, sortSectionNames } from '../constants/studentClasses'

const STUDENTS_PAGE_SIZE = 250
const BULK_DELETE_TOAST_ID = 'stdnt-bulk-delete'

type StudentFormState = {
  rollNumber: string
  name: string
  gender: 'Boy' | 'Girl' | 'Other' | 'Unspecified'
  email: string
  phone: string
  class: string
  section: string
  fatherName: string
  motherName: string
  guardianPhone: string
  address: {
    street: string
    city: string
    state: string
    pincode: string
  }
  dateOfBirth: string
  admissionDate: string
  aadharNumber: string
  category: string
  religion: string
  nationality: string
  notes: string
  isActive: boolean
}

const CATEGORY_OPTIONS = ['General', 'OBC', 'SC', 'ST', 'EWS'] as const
const GENDER_OPTIONS = ['Boy', 'Girl', 'Other', 'Unspecified'] as const

type ClassSectionOption = {
  className: string
  sections: string[]
}

const createInitialFormState = (): StudentFormState => ({
  rollNumber: '',
  name: '',
  gender: 'Unspecified',
  email: '',
  phone: '',
  class: '',
  section: '',
  fatherName: '',
  motherName: '',
  guardianPhone: '',
  address: {
    street: '',
    city: '',
    state: '',
    pincode: '',
  },
  dateOfBirth: '',
  admissionDate: new Date().toISOString().slice(0, 10),
  aadharNumber: '',
  category: 'General',
  religion: '',
  nationality: 'Indian',
  notes: '',
  isActive: true,
})

const formatDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-GB')
}

const formatGender = (value?: string) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'male') return 'Boy'
  if (normalized === 'female') return 'Girl'
  if (normalized === 'boy') return 'Boy'
  if (normalized === 'girl') return 'Girl'
  if (normalized === 'other') return 'Other'
  if (normalized === 'unspecified' || !normalized) return 'Unspecified'
  return value || 'Unspecified'
}

const mapStudentToFormState = (student: any): StudentFormState => ({
  rollNumber: String(student?.rollNumber || ''),
  name: String(student?.name || ''),
  gender: (['Boy', 'Girl', 'Other', 'Unspecified'].includes(String(student?.gender || ''))
    ? String(student?.gender || 'Unspecified')
    : 'Unspecified') as StudentFormState['gender'],
  email: String(student?.email || ''),
  phone: String(student?.phone || ''),
  class: String(student?.class || ''),
  section: String(student?.section || ''),
  fatherName: String(student?.fatherName || ''),
  motherName: String(student?.motherName || ''),
  guardianPhone: String(student?.guardianPhone || ''),
  address: {
    street: String(student?.address?.street || ''),
    city: String(student?.address?.city || ''),
    state: String(student?.address?.state || ''),
    pincode: String(student?.address?.pincode || ''),
  },
  dateOfBirth: String(student?.dateOfBirth || '').slice(0, 10),
  admissionDate: String(student?.admissionDate || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
  aadharNumber: String(student?.aadharNumber || ''),
  category: String(student?.category || 'General'),
  religion: String(student?.religion || ''),
  nationality: String(student?.nationality || 'Indian'),
  notes: String(student?.notes || ''),
  isActive: student?.isActive !== false,
})

const sortClassNames = (left: string, right: string) => {
  const leftMatch = left.match(/\d+/)
  const rightMatch = right.match(/\d+/)
  const leftNumeric = leftMatch ? Number.parseInt(leftMatch[0], 10) : Number.MAX_SAFE_INTEGER
  const rightNumeric = rightMatch ? Number.parseInt(rightMatch[0], 10) : Number.MAX_SAFE_INTEGER

  if (leftNumeric !== rightNumeric) return leftNumeric - rightNumeric
  return left.localeCompare(right)
}

const mergeClassSectionOptions = (
  sources: Array<ClassSectionOption[] | undefined>
): ClassSectionOption[] => {
  const merged = new Map<string, Set<string>>()

  sources.forEach((source) => {
    (source || []).forEach((option) => {
      const className = String(option.className || '').trim()
      if (!className) return
      if (!merged.has(className)) merged.set(className, new Set())
      option.sections.forEach((section) => {
        const normalized = String(section || '').trim()
        if (normalized) merged.get(className)!.add(normalized)
      })
    })
  })

  return Array.from(merged.entries())
    .map(([className, sectionSet]) => ({
      className,
      sections: Array.from(sectionSet).sort((a, b) => sortSectionNames(a, b, className)),
    }))
    .sort((a, b) => sortClassNames(a.className, b.className))
}

const buildClassSectionOptionsFromStats = (stats: RootState['students']['stats']): ClassSectionOption[] => {
  const byClass = new Map<string, Set<string>>()

  ;(stats?.byClassSection || []).forEach((entry) => {
    const className = String(entry?._id?.class || '').trim()
    const section = String(entry?._id?.section || '').trim()
    if (!className) return
    if (!byClass.has(className)) byClass.set(className, new Set())
    if (section) byClass.get(className)!.add(section)
  })

  return Array.from(byClass.entries())
    .map(([className, sectionSet]) => ({
      className,
      sections: Array.from(sectionSet).sort((a, b) => sortSectionNames(a, b, className)),
    }))
    .sort((a, b) => sortClassNames(a.className, b.className))
}

const buildClassSectionOptions = (state: Awaited<ReturnType<typeof timetableService.getState>>): ClassSectionOption[] => {
  const matrixClasses = Array.isArray(state?.matrixClasses) ? state.matrixClasses : []
  const matrixSections = Array.isArray(state?.matrixSections) ? state.matrixSections : []
  const matrixSelection = state?.matrixSelection ?? {}

  const sectionNameById = new Map(
    matrixSections
      .map((section) => ({
        id: String(section.id || '').trim(),
        name: String(section.name || '').trim(),
      }))
      .filter((section) => section.id && section.name)
      .map((section) => [section.id, section.name])
  )

  const fromMatrix = matrixClasses
    .map((item) => {
      const classId = String(item.id || '').trim()
      const className = String(item.name || '').trim()
      if (!classId || !className) return null

      const sections = Object.entries(matrixSelection[classId] || {})
        .filter(([, checked]) => Boolean(checked))
        .map(([sectionId]) => sectionNameById.get(sectionId) || '')
        .map((name) => name.trim())
        .filter(Boolean)
        .sort((a, b) => sortSectionNames(a, b, className))

      if (sections.length === 0) return null
      return { className, sections }
    })
    .filter(Boolean) as ClassSectionOption[]

  if (fromMatrix.length > 0) {
    return fromMatrix.sort((a, b) => sortClassNames(a.className, b.className))
  }

  const fallbackMap = new Map<string, Set<string>>()
  ;(state?.classes || []).forEach((item) => {
    const className = String(item.className || '').trim()
    const section = String(item.section || '').trim().toUpperCase()
    if (!className || !section) return
    if (!fallbackMap.has(className)) fallbackMap.set(className, new Set())
    fallbackMap.get(className)!.add(section)
  })

  return Array.from(fallbackMap.entries())
    .map(([className, sectionSet]) => ({
      className,
      sections: Array.from(sectionSet).sort((a, b) => sortSectionNames(a, b, className)),
    }))
    .sort((a, b) => sortClassNames(a.className, b.className))
}

const Students: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { students, stats, loading, pagination } = useSelector((state: RootState) => state.students)

  const [formData, setFormData] = useState<StudentFormState>(createInitialFormState)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [pageMessage, setPageMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingRollNumber, setIsGeneratingRollNumber] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isTemplateDownloading, setIsTemplateDownloading] = useState(false)
  const [isTemplateUploading, setIsTemplateUploading] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [tableSortField, setTableSortField] = useState<'rollNumber' | 'classRollNo' | 'name' | 'class' | 'section' | 'fatherName' | 'dateOfBirth' | 'gender' | 'category' | 'phone' | 'penNumber' | null>(null)
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [timetableClassSectionOptions, setTimetableClassSectionOptions] = useState<ClassSectionOption[]>([])
  const [editingSectionStudentId, setEditingSectionStudentId] = useState<string | null>(null)
  const [sectionUpdateLoadingById, setSectionUpdateLoadingById] = useState<Record<string, boolean>>({})
  const [sectionOverrideByStudentId, setSectionOverrideByStudentId] = useState<Record<string, string>>({})
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null)

  const addFormRef = useRef<HTMLDivElement | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const deferredSearch = useDeferredValue(searchTerm)

  useEffect(() => {
    dispatch(fetchStudentStats({
      ...(classFilter ? { class: classFilter } : {}),
      ...(sectionFilter ? { section: sectionFilter } : {}),
    }))
  }, [classFilter, dispatch, sectionFilter])

  useEffect(() => {
    let isMounted = true

    const loadClassSectionOptions = async () => {
      try {
        const state = await timetableService.getState()
        if (!isMounted) return

        const nextOptions = buildClassSectionOptions(state)
        setTimetableClassSectionOptions(nextOptions)

        if (nextOptions.length === 0) return

        setFormData((prev) => {
          const existingClass = nextOptions.find((option) => option.className === prev.class)
          if (existingClass) {
            const nextSection = existingClass.sections.includes(prev.section)
              ? prev.section
              : (existingClass.sections[0] || '')
            return {
              ...prev,
              section: nextSection,
            }
          }

          return {
            ...prev,
            class: nextOptions[0].className,
            section: nextOptions[0].sections[0] || '',
          }
        })
      } catch {
        if (!isMounted) return
        setTimetableClassSectionOptions([])
      }
    }

    loadClassSectionOptions()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    dispatch(
      fetchStudents({
        page,
        limit: STUDENTS_PAGE_SIZE,
        sort: '-createdAt',
        ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
        ...(classFilter ? { class: classFilter } : {}),
        ...(sectionFilter ? { section: sectionFilter } : {}),
      })
    )
  }, [classFilter, deferredSearch, dispatch, page, sectionFilter])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, classFilter, sectionFilter])

  useEffect(() => {
    setSelectedIds([])
  }, [students])

  useEffect(() => {
    setSectionOverrideByStudentId({})
  }, [students])

  useEffect(() => {
    return () => {
      if (selectedPhotoPreview) {
        URL.revokeObjectURL(selectedPhotoPreview)
      }
    }
  }, [selectedPhotoPreview])

  useEffect(() => {
    if (!pageMessage) return

    const timeoutId = window.setTimeout(
      () => setPageMessage(null),
      pageMessage.tone === 'error' ? 8000 : 5000
    )

    return () => window.clearTimeout(timeoutId)
  }, [pageMessage])

  const classSectionOptions = useMemo(
    () => mergeClassSectionOptions([
      timetableClassSectionOptions,
      buildClassSectionOptionsFromStats(stats),
    ]),
    [stats, timetableClassSectionOptions]
  )

  const totalClasses = useMemo(
    () => (
      new Set(
        (stats?.byClassSection || [])
          .map((entry) => String(entry?._id?.class || '').trim())
          .filter(Boolean)
      ).size
    ),
    [stats]
  )
  const totalSections = useMemo(
    () => (
      new Set(
        (stats?.byClassSection || [])
          .map((entry) => String(entry?._id?.section || '').trim())
          .filter(Boolean)
      ).size
    ),
    [stats]
  )
  const totalClassSections = useMemo(
    () => (
      new Set(
        (stats?.byClassSection || [])
          .map((entry) => `${String(entry?._id?.class || '').trim()}::${String(entry?._id?.section || '').trim()}`)
          .filter((key) => key !== '::')
      ).size
    ),
    [stats]
  )
  const boysCount = useMemo(
    () => (stats?.byGender || []).find((entry) => entry._id === 'Boy')?.count ?? 0,
    [stats]
  )
  const girlsCount = useMemo(
    () => (stats?.byGender || []).find((entry) => entry._id === 'Girl')?.count ?? 0,
    [stats]
  )
  const classOptions = useMemo(() => {
    const names = new Set<string>([
      ...STUDENT_CLASS_OPTIONS,
      ...classSectionOptions.map((option) => option.className),
    ])
    return Array.from(names).filter(Boolean).sort(sortClassNames)
  }, [classSectionOptions])
  const sectionOptionsForSelectedClass = useMemo(
    () => classSectionOptions.find((option) => option.className === formData.class)?.sections || [],
    [classSectionOptions, formData.class]
  )
  const filterSectionOptions = useMemo(
    () => {
      if (!classFilter) {
        return Array.from(new Set(classSectionOptions.flatMap((option) => option.sections)))
          .sort((a, b) => a.localeCompare(b))
      }

      return classSectionOptions.find((option) => option.className === classFilter)?.sections || []
    },
    [classSectionOptions, classFilter]
  )

  useEffect(() => {
    if (!sectionFilter) return
    if (filterSectionOptions.includes(sectionFilter)) return
    setSectionFilter('')
  }, [filterSectionOptions, sectionFilter])

  const selectedCount = selectedIds.length
  const sortedStudents = useMemo(() => {
    if (!tableSortField) return students

    const getSortableValue = (student: any) => {
      if (tableSortField === 'section') return sectionOverrideByStudentId[student._id] ?? student.section ?? ''
      if (tableSortField === 'dateOfBirth') {
        const parsed = new Date(student.dateOfBirth || '').getTime()
        return Number.isNaN(parsed) ? 0 : parsed
      }
      if (tableSortField === 'classRollNo') {
        return Number(student.classRollNo) || 0
      }
      return String(student?.[tableSortField] ?? '').toLowerCase()
    }

    return [...students].sort((a, b) => {
      const left = getSortableValue(a)
      const right = getSortableValue(b)
      if (left < right) return tableSortDirection === 'asc' ? -1 : 1
      if (left > right) return tableSortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [students, tableSortDirection, tableSortField, sectionOverrideByStudentId])

  const visibleStudentIds = sortedStudents.map((student) => student._id)
  const allVisibleSelected = visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedIds.includes(id))

  const handleSort = (field: NonNullable<typeof tableSortField>) => {
    if (tableSortField === field) {
      setTableSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setTableSortField(field)
    setTableSortDirection('asc')
  }

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = event.target
    const checked = type === 'checkbox' ? (event.target as HTMLInputElement).checked : undefined

    if (name.startsWith('address.')) {
      const addressKey = name.split('.')[1] as keyof StudentFormState['address']
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressKey]: value,
        },
      }))
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
      return
    }

    if (name === 'class') {
      const matchedClass = classSectionOptions.find((option) => option.className === value)
      setFormData((prev) => ({
        ...prev,
        class: value,
        section: matchedClass?.sections.includes(prev.section) ? prev.section : (matchedClass?.sections[0] || ''),
      }))
      setFormErrors((prev) => ({ ...prev, class: '', section: '' }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setFormErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}

    if (!formData.rollNumber.trim()) nextErrors.rollNumber = 'Roll number is required.'
    if (!formData.name.trim()) nextErrors.name = 'Student name is required.'
    if (!formData.fatherName.trim()) nextErrors.fatherName = 'Father name is required.'
    if (!formData.motherName.trim()) nextErrors.motherName = 'Mother name is required.'
    if (!formData.guardianPhone.trim()) nextErrors.guardianPhone = 'Guardian phone is required.'
    if (!/^\d{10}$/.test(formData.guardianPhone.trim())) nextErrors.guardianPhone = 'Enter a valid 10-digit guardian phone.'
    if (formData.phone.trim() && !/^\d{10}$/.test(formData.phone.trim())) nextErrors.phone = 'Enter a valid 10-digit contact number.'
    if (!formData.dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required.'
    if (!formData.admissionDate) nextErrors.admissionDate = 'Admission date is required.'
    if (!formData.address.street.trim()) nextErrors['address.street'] = 'Street address is required.'
    if (!formData.address.city.trim()) nextErrors['address.city'] = 'City is required.'
    if (!formData.address.state.trim()) nextErrors['address.state'] = 'State is required.'
    if (!/^\d{6}$/.test(formData.address.pincode.trim())) nextErrors['address.pincode'] = 'Enter a valid 6-digit pincode.'
    if (formData.aadharNumber.trim() && !/^\d{12}$/.test(formData.aadharNumber.trim())) {
      nextErrors.aadharNumber = 'Enter a valid 12-digit Aadhar number.'
    }

    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const resetForm = (options?: { keepMessage?: boolean }) => {
    const nextForm = createInitialFormState()
    if (classSectionOptions.length > 0) {
      nextForm.class = classSectionOptions[0].className
      nextForm.section = classSectionOptions[0].sections[0] || ''
    }
    setFormData(nextForm)
    setFormErrors({})
    setSelectedPhoto(null)
    if (selectedPhotoPreview) {
      URL.revokeObjectURL(selectedPhotoPreview)
      setSelectedPhotoPreview(null)
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
    if (!options?.keepMessage) {
      setPageMessage(null)
    }
    setEditingStudentId(null)
    setIsEditModalOpen(false)
  }

  const uploadStudentProfilePhoto = async (studentId: string, file: File) => {
    const photoFormData = new FormData()
    photoFormData.append('profileImage', file)
    await api.post(`/students/${studentId}/profile-image`, photoFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  const refreshStudentData = (targetPage = page) => {
    dispatch(fetchStudentStats({
      ...(classFilter ? { class: classFilter } : {}),
      ...(sectionFilter ? { section: sectionFilter } : {}),
    }))
    dispatch(
      fetchStudents({
        page: targetPage,
        limit: STUDENTS_PAGE_SIZE,
        sort: '-createdAt',
        ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
        ...(classFilter ? { class: classFilter } : {}),
        ...(sectionFilter ? { section: sectionFilter } : {}),
      })
    )
  }

  const handleGenerateRollNumber = async () => {
    if (!formData.class || !formData.section) return

    setIsGeneratingRollNumber(true)
    try {
      const response = await dispatch(
        getNextRollNumber({ className: formData.class, section: formData.section })
      ).unwrap()

      setFormData((prev) => ({
        ...prev,
        rollNumber: response.data.rollNumber,
      }))
      setFormErrors((prev) => ({ ...prev, rollNumber: '' }))
    } catch (error) {
      setPageMessage({
        tone: 'error',
        text: typeof error === 'string' ? error : 'Unable to generate a roll number right now.',
      })
    } finally {
      setIsGeneratingRollNumber(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPageMessage(null)

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        rollNumber: formData.rollNumber.trim().toUpperCase(),
        name: formData.name.trim(),
        fatherName: formData.fatherName.trim(),
        motherName: formData.motherName.trim(),
        guardianPhone: formData.guardianPhone.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        aadharNumber: formData.aadharNumber.trim(),
        religion: formData.religion.trim(),
        nationality: formData.nationality.trim() || 'Indian',
        notes: formData.notes.trim(),
        address: {
          street: formData.address.street.trim(),
          city: formData.address.city.trim(),
          state: formData.address.state.trim(),
          pincode: formData.address.pincode.trim(),
        },
      } as any

      let targetStudentId = editingStudentId || ''
      if (editingStudentId) {
        const updatedResponse = await dispatch(updateStudent({ id: editingStudentId, data: payload })).unwrap()
        targetStudentId = String(updatedResponse?.data?._id || editingStudentId)
      } else {
        const createdResponse = await dispatch(createStudent(payload)).unwrap()
        targetStudentId = String(createdResponse?.data?._id || '')
      }

      if (selectedPhoto && targetStudentId) {
        await uploadStudentProfilePhoto(targetStudentId, selectedPhoto)
      }

      setPageMessage({
        tone: 'success',
        text: editingStudentId
          ? 'Student record updated successfully.'
          : (selectedPhoto
            ? 'Student record created successfully with photograph.'
            : 'Student record created successfully.'),
      })
      resetForm({ keepMessage: true })
      refreshStudentData(1)
      setPage(1)
      setShowAddForm(false)
      setIsEditModalOpen(false)
    } catch (error: any) {
      setPageMessage({
        tone: 'error',
        text:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          (typeof error === 'string' ? error : (editingStudentId ? 'Failed to update student.' : 'Failed to create student.')),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setPageMessage({ tone: 'error', text: 'Please select an image file for the photograph.' })
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPageMessage({ tone: 'error', text: 'Photograph size must be less than 5MB.' })
      event.target.value = ''
      return
    }

    if (selectedPhotoPreview) {
      URL.revokeObjectURL(selectedPhotoPreview)
    }

    const nextPreview = URL.createObjectURL(file)
    setSelectedPhoto(file)
    setSelectedPhotoPreview(nextPreview)
  }

  const clearSelectedPhoto = () => {
    setSelectedPhoto(null)
    if (selectedPhotoPreview) {
      URL.revokeObjectURL(selectedPhotoPreview)
      setSelectedPhotoPreview(null)
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      setIsTemplateDownloading(true)
      const blob = await studentService.downloadImportTemplate('xlsx')
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `students_template_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (_error) {
      setPageMessage({ tone: 'error', text: 'Failed to download the student template.' })
    } finally {
      setIsTemplateDownloading(false)
    }
  }

  const handleUploadTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''
    if (!selectedFile) return

    try {
      setIsTemplateUploading(true)
      const response = await studentService.uploadImportTemplate(selectedFile)
      const result = response?.data ?? {}
      const createdCount = result.created ?? 0
      const skippedCount = result.skipped ?? 0
      const errors = Array.isArray(result.errors) ? result.errors : []
      const warnings = Array.isArray(result.warnings) ? result.warnings : []
      const errorPreview = errors.slice(0, 2).map((entry: any) => `Row ${entry?.row}: ${entry?.message}`).join(' | ')
      setPageMessage({
        tone: errors.length > 0 && createdCount === 0 ? 'error' : 'success',
        text: `Import completed. Created: ${createdCount}, Skipped (already exist): ${skippedCount}, Errors: ${errors.length}, Warnings: ${warnings.length}.${errorPreview ? ` ${errorPreview}` : ''}`,
      })
      refreshStudentData(1)
      setPage(1)
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to upload student template file.'

      setPageMessage({ tone: 'error', text: message })
    } finally {
      setIsTemplateUploading(false)
    }
  }

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleStudentIds.includes(id)))
      return
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleStudentIds])))
  }

  const handleToggleSelect = (studentId: string) => {
    setSelectedIds((prev) => (
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    ))
  }

  const handleAddStudentClick = () => {
    setEditingStudentId(null)
    setIsEditModalOpen(false)
    setShowAddForm((prev) => {
      const next = !prev
      if (next) {
        resetForm({ keepMessage: true })
        window.requestAnimationFrame(() => {
          addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || isBulkDeleting) return

    const total = selectedIds.length
    setIsBulkDeleting(true)
    let deletedCount = 0
    let failedCount = 0

    const renderProgressToast = (done: number, failed: number, complete = false) => {
      const processed = done + failed
      const percent = total === 0 ? 0 : Math.round((processed / total) * 100)

      toast.custom(
        () => (
          <div className="flex min-w-[280px] flex-col gap-2 rounded-xl bg-slate-800 px-4 py-3 text-white shadow-lg">
            <div className="flex items-center justify-between gap-3 text-sm font-medium">
              <span>{done} of {total} deleted</span>
              {failed > 0 ? <span className="text-rose-300">{failed} failed</span> : null}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-600">
              <div
                className={`h-full rounded-full transition-all ${failed > 0 && complete ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ),
        {
          id: BULK_DELETE_TOAST_ID,
          duration: complete ? 3500 : Infinity,
        }
      )
    }

    renderProgressToast(0, 0)

    for (const id of selectedIds) {
      try {
        await dispatch(deleteStudent({ id, silent: true })).unwrap()
        deletedCount += 1
      } catch (_error) {
        failedCount += 1
      }
      renderProgressToast(deletedCount, failedCount)
    }

    renderProgressToast(deletedCount, failedCount, true)
    setIsBulkDeleting(false)
    setSelectedIds([])
    refreshStudentData()
    setPageMessage({
      tone: deletedCount > 0 ? 'success' : 'error',
      text: deletedCount > 0
        ? `${deletedCount} student record${deletedCount === 1 ? '' : 's'} deleted successfully.`
        : 'No selected students could be deleted.',
    })
  }

  const renderFieldError = (field: string) =>
    formErrors[field] ? <p className="mt-1 text-xs font-medium text-rose-600">{formErrors[field]}</p> : null

  const handleEditStudentRow = (student: any) => {
    setEditingStudentId(student._id)
    setIsEditModalOpen(true)
    setFormData(mapStudentToFormState(student))
    setFormErrors({})
    setShowAddForm(false)
  }

  const getSectionsForClass = (className: string) => (
    classSectionOptions.find((option) => option.className === className)?.sections || []
  )

  const handleSectionChange = async (studentId: string, className: string, nextSection: string) => {
    const normalizedSection = String(nextSection || '').trim()
    if (!studentId || !normalizedSection) return

    setSectionUpdateLoadingById((prev) => ({ ...prev, [studentId]: true }))
    try {
      await api.put(`/students/${studentId}`, { class: className, section: normalizedSection })
      setSectionOverrideByStudentId((prev) => ({ ...prev, [studentId]: normalizedSection }))
      setPageMessage({ tone: 'success', text: `Section updated to ${normalizedSection}.` })
      dispatch(
        fetchStudents({
          page,
          limit: STUDENTS_PAGE_SIZE,
          sort: '-createdAt',
          ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
          ...(classFilter ? { class: classFilter } : {}),
          ...(sectionFilter ? { section: sectionFilter } : {}),
        })
      )
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to update section.'
      setPageMessage({ tone: 'error', text: message })
    } finally {
      setSectionUpdateLoadingById((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      setEditingSectionStudentId(null)
    }
  }

  return (
    <div className="space-y-3">
      {pageMessage ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            pageMessage.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {pageMessage.text}
        </div>
      ) : null}

      <div className="space-y-2">
      <section className="flex flex-wrap gap-3">
        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium leading-tight text-slate-500">Total Students</p>
            <p className="text-lg font-semibold leading-tight tracking-tight text-slate-900">{stats?.total ?? 0}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <RefreshCw className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium leading-tight text-slate-500">Active Students</p>
            <p className="text-lg font-semibold leading-tight tracking-tight text-slate-900">{stats?.activeTotal ?? 0}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium leading-tight text-slate-500">Boys</p>
            <p className="text-lg font-semibold leading-tight tracking-tight text-slate-900">{boysCount}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium leading-tight text-slate-500">Girls</p>
            <p className="text-lg font-semibold leading-tight tracking-tight text-slate-900">{girlsCount}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium leading-tight text-slate-500">Classes</p>
            <p className="text-lg font-semibold leading-tight tracking-tight text-slate-900">{totalClasses}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium leading-tight text-slate-500">Sections</p>
            <p className="text-lg font-semibold leading-tight tracking-tight text-slate-900">{totalSections}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium leading-tight text-slate-500">Class × Section</p>
            <p className="text-lg font-semibold leading-tight tracking-tight text-slate-900">{totalClassSections}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-2.5">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="w-full max-w-sm">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search students..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                accept=".csv,.xlsx"
                id="student-template-upload-input"
                title="Upload student template file"
                aria-label="Upload student template file"
                onChange={handleUploadTemplate}
                className="hidden"
              />

              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || isTemplateDownloading || isTemplateUploading}
              >
                <Download className="h-3.5 w-3.5" />
                {isTemplateDownloading ? 'Downloading...' : 'Template'}
              </button>

              <button
                onClick={() => document.getElementById('student-template-upload-input')?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || isTemplateDownloading || isTemplateUploading}
              >
                <Upload className="h-3.5 w-3.5" />
                {isTemplateUploading ? 'Uploading...' : 'Upload'}
              </button>

              <button
                type="button"
                onClick={() => setShowFilterPanel((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
              </button>

              <button
                onClick={handleAddStudentClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {showAddForm ? 'Hide Form' : 'Add Student'}
              </button>

              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || isBulkDeleting || selectedCount === 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isBulkDeleting ? 'Deleting...' : `Delete Selected${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
              </button>
            </div>
          </div>

          {showFilterPanel ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
                <select
                  value={classFilter}
                  onChange={(event) => {
                    setClassFilter(event.target.value)
                    setSectionFilter('')
                  }}
                  className="w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  <option value="">All Classes</option>
                  {classOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                ))}
              </select>

                <select
                  value={sectionFilter}
                  onChange={(event) => setSectionFilter(event.target.value)}
                  className="w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  <option value="">All Sections</option>
                  {filterSectionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setClassFilter('')
                  setSectionFilter('')
                }}
                disabled={!classFilter && !sectionFilter}
                className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear Filters
              </button>
            </div>
          ) : null}
        </div>
      </section>
      </div>

      {(showAddForm || isEditModalOpen) ? (
        <div
          className={isEditModalOpen ? 'fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4' : ''}
          onClick={() => {
            if (isEditModalOpen) resetForm({ keepMessage: true })
          }}
        >
          <section
            ref={addFormRef}
            className={`rounded-[30px] border border-slate-200 bg-white shadow-sm ${isEditModalOpen ? 'mx-auto mt-6 max-w-6xl' : ''}`}
            onClick={(event) => event.stopPropagation()}
          >
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">{editingStudentId ? 'Edit Student Record' : 'Add Student Record'}</h2>
              {isEditModalOpen ? (
                <button
                  type="button"
                  onClick={() => resetForm({ keepMessage: true })}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Capture student details manually, or use the template import for bulk onboarding.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
            <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Photograph</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload a student photo to save with the record. JPEG, PNG, GIF, or WebP up to 5MB.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    <Upload className="h-4 w-4" />
                    {selectedPhoto ? 'Change Photograph' : 'Upload Photograph'}
                  </button>
                  {selectedPhoto ? (
                    <button
                      type="button"
                      onClick={clearSelectedPhoto}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              {selectedPhoto ? (
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    {selectedPhotoPreview ? (
                      <img
                        src={selectedPhotoPreview}
                        alt="Selected student photograph preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Preview</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    <p className="font-medium text-slate-700">{selectedPhoto.name}</p>
                    <p className="mt-1">{Math.max(1, Math.round(selectedPhoto.size / 1024))} KB</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">Roll Number</label>
                <div className="mt-2 flex gap-2">
                  <input
                    name="rollNumber"
                    value={formData.rollNumber}
                    onChange={handleFieldChange}
                    placeholder="10THA001"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRollNumber}
                    disabled={isGeneratingRollNumber}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGeneratingRollNumber ? 'animate-spin' : ''}`} />
                    Suggest
                  </button>
                </div>
                {renderFieldError('rollNumber')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Status</label>
                <label className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleFieldChange}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Keep this student active
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Student Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('name')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Class</label>
                <select
                  name="class"
                  value={formData.class}
                  onChange={handleFieldChange}
                  disabled={classOptions.length === 0}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {classOptions.length === 0 ? (
                    <option value="">No classes configured</option>
                  ) : (
                    classOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Section</label>
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleFieldChange}
                  disabled={sectionOptionsForSelectedClass.length === 0}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {sectionOptionsForSelectedClass.length === 0 ? (
                    <option value="">No sections available</option>
                  ) : (
                    sectionOptionsForSelectedClass.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('dateOfBirth')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Admission Date</label>
                <input
                  type="date"
                  name="admissionDate"
                  value={formData.admissionDate}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('admissionDate')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Student Phone</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleFieldChange}
                  inputMode="numeric"
                  maxLength={10}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('phone')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Father Name</label>
                <input
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('fatherName')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Mother Name</label>
                <input
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('motherName')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Guardian Phone</label>
                <input
                  name="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={handleFieldChange}
                  inputMode="numeric"
                  maxLength={10}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('guardianPhone')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Religion</label>
                <input
                  name="religion"
                  value={formData.religion}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Nationality</label>
                <input
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Aadhar Number</label>
                <input
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleFieldChange}
                  inputMode="numeric"
                  maxLength={12}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('aadharNumber')}
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label className="block text-sm font-semibold text-slate-700">Street Address</label>
                <input
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('address.street')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">City</label>
                <input
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('address.city')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">State</label>
                <input
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('address.state')}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Pincode</label>
                <input
                  name="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleFieldChange}
                  inputMode="numeric"
                  maxLength={6}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('address.pincode')}
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label className="block text-sm font-semibold text-slate-700">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFieldChange}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                  placeholder="Optional notes about the student record."
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {isSubmitting ? (editingStudentId ? 'Updating Student...' : 'Saving Student...') : (editingStudentId ? 'Update Student' : 'Save Student')}
              </button>

              <button
                type="button"
                onClick={() => resetForm()}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Reset Form
              </button>
            </div>
          </form>
          </section>
        </div>
      ) : null}

      <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto overflow-y-auto max-h-[960px]">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all visible students"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                {[
                  { label: 'Admission No', field: 'rollNumber' as const },
                  { label: 'Roll No', field: 'classRollNo' as const },
                  { label: 'Student Name', field: 'name' as const },
                  { label: 'Class', field: 'class' as const },
                  { label: 'Section', field: 'section' as const },
                  { label: 'Father Name', field: 'fatherName' as const },
                  { label: 'Date Of Birth', field: 'dateOfBirth' as const },
                  { label: 'Gender', field: 'gender' as const },
                  { label: 'Category', field: 'category' as const },
                  { label: 'Mobile Number', field: 'phone' as const },
                  { label: 'PEN Number', field: 'penNumber' as const },
                ].map(({ label, field }) => (
                  <th
                    key={field}
                    className="cursor-pointer px-4 py-3 select-none hover:text-slate-700"
                    onClick={() => handleSort(field)}
                    title={`Sort by ${label}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {tableSortField === field ? (tableSortDirection === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    No students found for the current filters.
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student) => (
                  <tr
                    key={student._id}
                    className="cursor-pointer hover:bg-slate-50/80"
                    onClick={() => handleEditStudentRow(student)}
                  >
                    {(() => {
                      const displaySection = sectionOverrideByStudentId[student._id] ?? student.section
                      return (
                        <>
                    <td className="px-4 py-4 align-top" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(student._id)}
                        onChange={() => handleToggleSelect(student._id)}
                        aria-label={`Select ${student.name}`}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4 align-top font-semibold text-slate-900">{student.rollNumber}</td>
                    <td className="px-4 py-4 align-top">{student.classRollNo || '-'}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-slate-900">{student.name}</div>
                    </td>
                    <td className="px-4 py-4 align-top">{student.class}</td>
                    <td className="px-4 py-4 align-top" onClick={(event) => event.stopPropagation()}>
                      {editingSectionStudentId === student._id ? (
                        (() => {
                          const availableSections = getSectionsForClass(String(student.class || ''))

                          return (
                            <div className="flex flex-wrap gap-1">
                              {availableSections.map((sectionName) => {
                                const isCurrent = sectionName === String(displaySection || '')
                                return (
                                  <button
                                    key={sectionName}
                                    type="button"
                                    onClick={() => handleSectionChange(student._id, String(student.class || ''), sectionName)}
                                    disabled={Boolean(sectionUpdateLoadingById[student._id])}
                                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                                      isCurrent
                                        ? 'border-blue-300 bg-blue-600 text-white'
                                        : 'border-blue-200 bg-white text-blue-800 hover:border-blue-300 hover:bg-blue-50'
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                    title={`Set section ${sectionName} for ${student.name}`}
                                    aria-label={`Set section ${sectionName} for ${student.name}`}
                                  >
                                    {sectionName}
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingSectionStudentId(student._id)}
                          disabled={Boolean(sectionUpdateLoadingById[student._id])}
                          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                          title={`Change section for ${student.name}`}
                          aria-label={`Change section for ${student.name}`}
                        >
                          {sectionUpdateLoadingById[student._id] ? 'Saving...' : (displaySection || '-')}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">{student.fatherName || '-'}</td>
                    <td className="px-4 py-4 align-top">{formatDate(student.dateOfBirth)}</td>
                    <td className="px-4 py-4 align-top">{formatGender(student.gender)}</td>
                    <td className="px-4 py-4 align-top">{student.category || '-'}</td>
                    <td className="px-4 py-4 align-top">{student.phone || '-'}</td>
                    <td className="px-4 py-4 align-top">{student.penNumber || '-'}</td>
                        </>
                      )
                    })()}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm text-slate-500">
          <span>
            Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalItems} students
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={!pagination.hasPrevPage}
              className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => (pagination.hasNextPage ? prev + 1 : prev))}
              disabled={!pagination.hasNextPage}
              className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Students
