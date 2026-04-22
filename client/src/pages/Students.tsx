import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Download, Filter, RefreshCw, Search, Trash2, Upload, UserPlus, Users } from 'lucide-react'
import type { AppDispatch, RootState } from '../redux/store'
import {
  createStudent,
  deleteStudent,
  fetchStudentStats,
  fetchStudents,
  getNextRollNumber,
} from '../redux/slices/studentSlice'
import api from '../services/api'
import studentService from '../services/studentService'
import timetableService from '../services/timetableService'

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

const calculateAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) return '-'
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return '-'

  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }

  return age >= 0 ? `${age}` : '-'
}

const sortClassNames = (left: string, right: string) => {
  const leftMatch = left.match(/\d+/)
  const rightMatch = right.match(/\d+/)
  const leftNumeric = leftMatch ? Number.parseInt(leftMatch[0], 10) : Number.MAX_SAFE_INTEGER
  const rightNumeric = rightMatch ? Number.parseInt(rightMatch[0], 10) : Number.MAX_SAFE_INTEGER

  if (leftNumeric !== rightNumeric) return leftNumeric - rightNumeric
  return left.localeCompare(right)
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
      sections: Array.from(sectionSet).sort((a, b) => a.localeCompare(b)),
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [classSectionOptions, setClassSectionOptions] = useState<ClassSectionOption[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null)

  const addFormRef = useRef<HTMLDivElement | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const deferredSearch = useDeferredValue(searchTerm)

  useEffect(() => {
    dispatch(fetchStudentStats())
  }, [dispatch])

  useEffect(() => {
    let isMounted = true

    const loadClassSectionOptions = async () => {
      try {
        const state = await timetableService.getState()
        if (!isMounted) return

        const nextOptions = buildClassSectionOptions(state)
        setClassSectionOptions(nextOptions)

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
        setClassSectionOptions([])
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
        limit: 10,
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
    return () => {
      if (selectedPhotoPreview) {
        URL.revokeObjectURL(selectedPhotoPreview)
      }
    }
  }, [selectedPhotoPreview])

  const totalSections = useMemo(
    () => new Set((stats?.byClassSection || []).map((entry) => `${entry._id.class}-${entry._id.section}`)).size,
    [stats]
  )
  const classOptions = useMemo(
    () => classSectionOptions.map((option) => option.className),
    [classSectionOptions]
  )
  const sectionOptionsForSelectedClass = useMemo(
    () => classSectionOptions.find((option) => option.className === formData.class)?.sections || [],
    [classSectionOptions, formData.class]
  )
  const filterSectionOptions = useMemo(
    () => Array.from(new Set(classSectionOptions.flatMap((option) => option.sections))),
    [classSectionOptions]
  )

  const selectedCount = selectedIds.length
  const visibleStudentIds = students.map((student) => student._id)
  const allVisibleSelected = visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedIds.includes(id))

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
    dispatch(fetchStudentStats())
    dispatch(
      fetchStudents({
        page: targetPage,
        limit: 10,
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
      const createdResponse = await dispatch(
        createStudent({
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
        } as any)
      ).unwrap()

      const createdStudentId = createdResponse?.data?._id
      if (selectedPhoto && createdStudentId) {
        await uploadStudentProfilePhoto(createdStudentId, selectedPhoto)
      }

      setPageMessage({
        tone: 'success',
        text: selectedPhoto
          ? 'Student record created successfully with photograph.'
          : 'Student record created successfully.',
      })
      resetForm({ keepMessage: true })
      refreshStudentData(1)
      setPage(1)
      setShowAddForm(false)
    } catch (error: any) {
      setPageMessage({
        tone: 'error',
        text:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          (typeof error === 'string' ? error : 'Failed to create student.'),
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
        tone: createdCount > 0 ? 'success' : 'error',
        text: `Import completed. Created: ${createdCount}, Skipped: ${skippedCount}, Errors: ${errors.length}, Warnings: ${warnings.length}.${errorPreview ? ` ${errorPreview}` : ''}`,
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
    setShowAddForm((prev) => {
      const next = !prev
      if (next) {
        window.requestAnimationFrame(() => {
          addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    setIsBulkDeleting(true)
    let deletedCount = 0

    for (const id of selectedIds) {
      try {
        await dispatch(deleteStudent(id)).unwrap()
        deletedCount += 1
      } catch (_error) {
        // Keep going so one failure does not block the rest.
      }
    }

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

  return (
    <div className="space-y-6">
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Students</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stats?.total ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Students</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stats?.activeTotal ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Class Sections</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{totalSections}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Selected</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{selectedCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="w-full max-w-xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search students..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
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
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || isTemplateDownloading || isTemplateUploading}
              >
                <Download className="h-4 w-4" />
                {isTemplateDownloading ? 'Downloading...' : 'Template'}
              </button>

              <button
                onClick={() => document.getElementById('student-template-upload-input')?.click()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || isTemplateDownloading || isTemplateUploading}
              >
                <Upload className="h-4 w-4" />
                {isTemplateUploading ? 'Uploading...' : 'Upload'}
              </button>

              <button
                type="button"
                onClick={() => setShowFilterPanel((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>

              <button
                onClick={handleAddStudentClick}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                {showAddForm ? 'Hide Form' : 'Add Student'}
              </button>

              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || isBulkDeleting || selectedCount === 0}
              >
                <Trash2 className="h-4 w-4" />
                {isBulkDeleting ? 'Deleting...' : `Delete Selected${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
              </button>
            </div>
          </div>

          {showFilterPanel ? (
            <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                <select
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
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
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  <option value="">All Sections</option>
                  {filterSectionOptions.map((option) => (
                    <option key={option} value={option}>
                      Section {option}
                    </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </section>

      {showAddForm ? (
        <section ref={addFormRef} className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Add Student Record</h2>
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
                {isSubmitting ? 'Saving Student...' : 'Save Student'}
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
      ) : null}

      <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Students</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review, filter, select, and manage the student records already stored in the database.
          </p>
        </div>

        <div className="overflow-x-auto">
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
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Guardian</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No students found for the current filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(student._id)}
                        onChange={() => handleToggleSelect(student._id)}
                        aria-label={`Select ${student.name}`}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4 align-top font-semibold text-slate-900">{student.rollNumber}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-slate-900">{student.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{student.category}</div>
                    </td>
                    <td className="px-4 py-4 align-top">{student.class}</td>
                    <td className="px-4 py-4 align-top">{student.section}</td>
                    <td className="px-4 py-4 align-top">{student.gender || 'Unspecified'}</td>
                    <td className="px-4 py-4 align-top">{student.guardianPhone || '-'}</td>
                    <td className="px-4 py-4 align-top">{calculateAge(student.dateOfBirth)}</td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          student.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
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
