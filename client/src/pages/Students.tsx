import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Download, Filter, LayoutGrid, RefreshCw, Search, Trash2, Upload, UserPlus, Users } from 'lucide-react'
import type { AppDispatch, RootState } from '../redux/store'
import { createStudent, bulkDeleteStudents, fetchStudentStats, fetchStudents, updateStudent } from '../redux/slices/studentSlice'
import api from '../services/api'
import studentService from '../services/studentService'
import timetableService from '../services/timetableService'
import { makeRecordService } from '../services/recordService'
import { STUDENT_CLASS_OPTIONS, sortSectionNames } from '../constants/studentClasses'
import {
  getSectionDisplayName,
  normalizeAllowedSections,
  normalizeSectionKey,
  resolveSectionAgainstAllowed,
} from '../constants/sectionMetadata'
import { getHouseHeadingTextColor, normalizeHouseColorKey } from '../constants/houseColorMetadata'

const STUDENTS_PAGE_SIZE = 250
const BULK_DELETE_TOAST_ID = 'stdnt-bulk-delete'
const BULK_DELETE_BATCH_SIZE = 50

type StudentFormState = {
  rollNumber: string
  classRollNo: string
  name: string
  gender: 'Boy' | 'Girl' | 'Other' | 'Unspecified'
  email: string
  phone: string
  penNumber: string
  class: string
  section: string
  fatherName: string
  motherName: string
  guardianPhone: string
  house: string
  houseId: string
  busNo: string
  bloodGroup: string
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
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
const actvtHousesService = makeRecordService('/actvt/houses')

type ClassSectionOption = {
  className: string
  sections: string[]
}

const createInitialFormState = (): StudentFormState => ({
  rollNumber: '',
  classRollNo: '',
  name: '',
  gender: 'Unspecified',
  email: '',
  phone: '',
  penNumber: '',
  class: '',
  section: '',
  fatherName: '',
  motherName: '',
  guardianPhone: '',
  house: '',
  houseId: '',
  busNo: '',
  bloodGroup: '',
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

const formatStudentAddress = (address?: { street?: string; city?: string; state?: string; pincode?: string } | null) => {
  if (!address) return '-'
  const parts = [address.street, address.city, address.state, address.pincode]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(', ') : '-'
}

const getStudentBloodGroup = (student: { medicalInfo?: { bloodGroup?: string } } | null | undefined) => (
  String(student?.medicalInfo?.bloodGroup || '').trim() || '-'
)

const BloodGroupDrop: React.FC<{ value?: string }> = ({ value }) => {
  const label = String(value || '').trim()
  if (!label || label === '-') {
    return <span className="text-slate-400">-</span>
  }

  return (
    <span
      className="relative inline-flex h-6 w-[18px] shrink-0 items-center justify-center"
      title={`Blood group ${label}`}
      aria-label={`Blood group ${label}`}
    >
      <svg viewBox="0 0 24 32" className="absolute inset-0 h-full w-full" aria-hidden>
        <path
          d="M12 1.5C12 1.5 3.5 13.2 3.5 20.2a8.5 8.5 0 0017 0C20.5 13.2 12 1.5 12 1.5z"
          fill="#e11d48"
        />
      </svg>
      <span className={`relative z-[1] mt-1 font-bold leading-none text-white ${label.length > 2 ? 'text-[7px]' : 'text-[8px]'}`}>
        {label}
      </span>
    </span>
  )
}

const normalizeHouseLookupKey = (value = '') => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\bhouses?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
)

const getHouseShortName = (value = '') => {
  const text = String(value || '').trim()
  if (!text) return '-'
  const withoutHouse = text.replace(/\s+houses?$/i, '').trim()
  const firstWord = (withoutHouse || text).split(/\s+/)[0] || text
  return firstWord
}

type ActivityHouseOption = { _id: string; name: string; color?: string }

const resolveStudentHouse = (
  student: { house?: string; houseId?: string | { _id?: string } | null },
  houses: ActivityHouseOption[]
) => {
  const houseId = typeof student.houseId === 'object' && student.houseId
    ? String(student.houseId._id || '')
    : String(student.houseId || '')
  if (houseId) {
    const byId = houses.find((house) => house._id === houseId)
    if (byId) return byId
  }
  const key = normalizeHouseLookupKey(student.house || '')
  if (!key) return null
  return houses.find((house) => normalizeHouseLookupKey(house.name) === key) || null
}

const mapStudentToFormState = (student: any): StudentFormState => ({
  rollNumber: String(student?.rollNumber || ''),
  classRollNo: student?.classRollNo == null || student?.classRollNo === ''
    ? ''
    : String(student.classRollNo),
  name: String(student?.name || ''),
  gender: (['Boy', 'Girl', 'Other', 'Unspecified'].includes(String(student?.gender || ''))
    ? String(student?.gender || 'Unspecified')
    : 'Unspecified') as StudentFormState['gender'],
  email: String(student?.email || ''),
  phone: String(student?.phone || ''),
  penNumber: String(student?.penNumber || ''),
  class: String(student?.class || ''),
  section: String(student?.section || ''),
  fatherName: String(student?.fatherName || ''),
  motherName: String(student?.motherName || ''),
  guardianPhone: String(student?.guardianPhone || ''),
  house: String(student?.house || ''),
  houseId: String(student?.houseId?._id || student?.houseId || ''),
  busNo: String(student?.busNo || ''),
  bloodGroup: String(student?.medicalInfo?.bloodGroup || ''),
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

      const sections = normalizeAllowedSections(
        Object.entries(matrixSelection[classId] || {})
          .filter(([, checked]) => Boolean(checked))
          .map(([sectionId]) => sectionNameById.get(sectionId) || '')
          .map((name) => name.trim())
          .filter(Boolean)
      ).sort((a, b) => sortSectionNames(a, b, className))

      if (sections.length === 0) return null
      return { className, sections }
    })
    .filter(Boolean) as ClassSectionOption[]

  return fromMatrix.sort((a, b) => sortClassNames(a.className, b.className))
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
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isTemplateDownloading, setIsTemplateDownloading] = useState(false)
  const [isTemplateUploading, setIsTemplateUploading] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [tableSortField, setTableSortField] = useState<
    | 'rollNumber'
    | 'classRollNo'
    | 'name'
    | 'class'
    | 'section'
    | 'fatherName'
    | 'motherName'
    | 'dateOfBirth'
    | 'gender'
    | 'house'
    | 'busNo'
    | 'bloodGroup'
    | 'category'
    | 'phone'
    | 'penNumber'
    | 'address'
    | null
  >(null)
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [timetableClassSectionOptions, setTimetableClassSectionOptions] = useState<ClassSectionOption[]>([])
  const [activityHouses, setActivityHouses] = useState<Array<{ _id: string; name: string; color?: string }>>([])
  const [editingSectionStudentId, setEditingSectionStudentId] = useState<string | null>(null)
  const [sectionUpdateLoadingById, setSectionUpdateLoadingById] = useState<Record<string, boolean>>({})
  const [sectionOverrideByStudentId, setSectionOverrideByStudentId] = useState<Record<string, string>>({})
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null)

  const addFormRef = useRef<HTMLDivElement | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const bulkDeleteCancelRef = useRef(false)
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
            const matchedSection = existingClass.sections.find(
              (section) => normalizeSectionKey(section) === normalizeSectionKey(prev.section)
            )
            const nextSection = matchedSection || existingClass.sections[0] || ''
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
    let isMounted = true

    const loadActivityHouses = async () => {
      try {
        const houses = await actvtHousesService.list()
        if (!isMounted) return
        setActivityHouses(
          (houses || [])
            .map((house) => ({
              _id: String(house._id || ''),
              name: String(house.name || '').trim(),
              color: house.color ? String(house.color) : undefined,
            }))
            .filter((house) => house._id && house.name)
            .sort((left, right) => left.name.localeCompare(right.name))
        )
      } catch {
        if (!isMounted) return
        setActivityHouses([])
      }
    }

    loadActivityHouses()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (activityHouses.length === 0) return

    setFormData((prev) => {
      if (prev.houseId) {
        const selected = activityHouses.find((house) => house._id === prev.houseId)
        if (!selected) return prev
        if (selected.name === prev.house) return prev
        return { ...prev, house: selected.name }
      }

      if (!prev.house) return prev
      const matched = activityHouses.find(
        (house) => house.name.toLowerCase() === prev.house.trim().toLowerCase()
      )
      if (!matched) return prev
      return { ...prev, houseId: matched._id, house: matched.name }
    })
  }, [activityHouses])

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
    () => timetableClassSectionOptions,
    [timetableClassSectionOptions]
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
      if (tableSortField === 'bloodGroup') {
        return String(student?.medicalInfo?.bloodGroup || '').toLowerCase()
      }
      if (tableSortField === 'address') {
        return formatStudentAddress(student?.address).toLowerCase()
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
        section: matchedClass?.sections.includes(prev.section)
          ? prev.section
          : matchedClass?.sections.find(
              (section) => normalizeSectionKey(section) === normalizeSectionKey(prev.section)
            ) || matchedClass?.sections[0] || '',
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

    if (!formData.rollNumber.trim()) nextErrors.rollNumber = 'Admission number is required.'
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
    if (!formData.class.trim()) nextErrors.class = 'Class is required.'
    if (!formData.section.trim()) nextErrors.section = 'Section is required.'
    const allowedSections = classSectionOptions.find((option) => option.className === formData.class)?.sections || []
    if (allowedSections.length > 0) {
      const resolvedSection = resolveSectionAgainstAllowed(formData.section, allowedSections)
      if (resolvedSection.error) nextErrors.section = resolvedSection.error
    } else if (formData.class.trim()) {
      nextErrors.section = 'Configure sections for this class in Class Section Matrix.'
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
        guardianPhone: formData.guardianPhone.trim() || formData.phone.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        penNumber: formData.penNumber.trim(),
        house: formData.house.trim(),
        houseId: formData.houseId.trim() || null,
        busNo: formData.busNo.trim(),
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
        medicalInfo: formData.bloodGroup
          ? { bloodGroup: formData.bloodGroup }
          : undefined,
      } as any
      delete payload.bloodGroup
      delete payload.classRollNo
      if (!payload.medicalInfo) {
        delete payload.medicalInfo
      }

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
      const updatedCount = result.updated ?? 0
      const skippedCount = result.skipped ?? 0
      const errors = Array.isArray(result.errors) ? result.errors : []
      const warnings = Array.isArray(result.warnings) ? result.warnings : []
      const errorPreview = errors.slice(0, 2).map((entry: any) => `Row ${entry?.row}: ${entry?.message}`).join(' | ')
      setPageMessage({
        tone: errors.length > 0 && createdCount === 0 && updatedCount === 0 ? 'error' : 'success',
        text: `Import completed. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errors.length}, Warnings: ${warnings.length}.${errorPreview ? ` ${errorPreview}` : ''}`,
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

    const idsToDelete = [...selectedIds]
    const total = idsToDelete.length
    bulkDeleteCancelRef.current = false
    setIsBulkDeleting(true)
    let deletedCount = 0
    let failedCount = 0
    let cancelled = false
    let nextIndex = 0

    const renderProgressToast = (
      done: number,
      failed: number,
      options: { complete?: boolean; cancelling?: boolean } = {}
    ) => {
      const { complete = false, cancelling = false } = options
      const processed = done + failed
      const percent = total === 0 ? 0 : Math.round((processed / total) * 100)
      const stoppedEarly = cancelling || (complete && bulkDeleteCancelRef.current)

      toast.custom(
        () => (
          <div className="flex min-w-[280px] flex-col gap-2 rounded-xl bg-slate-800 px-4 py-3 text-white shadow-lg">
            <div className="flex items-center justify-between gap-3 text-sm font-medium">
              <span>
                {cancelling && !complete
                  ? `Stopping… ${done} of ${total} deleted`
                  : `${done} of ${total} deleted`}
              </span>
              <div className="flex items-center gap-2">
                {failed > 0 ? <span className="text-rose-300">{failed} failed</span> : null}
                {!complete && !cancelling ? (
                  <button
                    type="button"
                    onClick={() => {
                      bulkDeleteCancelRef.current = true
                      renderProgressToast(done, failed, { cancelling: true })
                    }}
                    className="rounded-md px-2 py-0.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-600">
              <div
                className={`h-full rounded-full transition-all ${
                  stoppedEarly && complete
                    ? 'bg-amber-400'
                    : failed > 0 && complete
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                }`}
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

    while (nextIndex < idsToDelete.length) {
      if (bulkDeleteCancelRef.current) {
        cancelled = true
        setSelectedIds(idsToDelete.slice(nextIndex))
        break
      }

      const batch = idsToDelete.slice(nextIndex, nextIndex + BULK_DELETE_BATCH_SIZE)
      try {
        const result = await dispatch(bulkDeleteStudents(batch)).unwrap()
        const batchDeleted = Array.isArray(result.deletedIds) ? result.deletedIds.length : 0
        const batchMissing = Array.isArray(result.notFoundIds) ? result.notFoundIds.length : 0
        deletedCount += batchDeleted
        failedCount += batchMissing
        // If API returned fewer results than requested, count remainder as failed.
        const accounted = batchDeleted + batchMissing
        if (accounted < batch.length) {
          failedCount += batch.length - accounted
        }
      } catch (_error) {
        failedCount += batch.length
      }

      nextIndex += batch.length
      const stopping = bulkDeleteCancelRef.current
      renderProgressToast(deletedCount, failedCount, { cancelling: stopping })

      if (stopping) {
        cancelled = true
        setSelectedIds(idsToDelete.slice(nextIndex))
        break
      }
    }

    cancelled = cancelled || bulkDeleteCancelRef.current
    renderProgressToast(deletedCount, failedCount, { complete: true, cancelling: cancelled })
    setIsBulkDeleting(false)

    if (!cancelled) {
      setSelectedIds([])
    }

    refreshStudentData()

    if (cancelled) {
      const remainingCount = total - deletedCount - failedCount
      setPageMessage({
        tone: deletedCount > 0 ? 'success' : 'error',
        text: deletedCount > 0
          ? `Deletion stopped. ${deletedCount} student record${deletedCount === 1 ? '' : 's'} deleted${remainingCount > 0 ? `; ${remainingCount} remaining.` : '.'}`
          : 'Deletion cancelled before any records were removed.',
      })
      return
    }

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
      setPageMessage({ tone: 'success', text: `Section updated to ${getSectionDisplayName(normalizedSection)}.` })
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-[220px] shrink-0 sm:w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search students..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <input
                type="file"
                accept=".csv,.xlsx"
                id="student-template-upload-input"
                title="Upload student template file"
                aria-label="Upload student template file"
                onChange={handleUploadTemplate}
                className="hidden"
              />

              <p className="hidden max-w-[240px] text-[10px] leading-snug text-slate-500 lg:block">
                Partial sheets OK with Admission No. Re-uploads overwrite provided fields; blank cells are left as-is.
              </p>

              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || isTemplateDownloading || isTemplateUploading}
                title="Download full import template"
              >
                <Download className="h-3.5 w-3.5" />
                {isTemplateDownloading ? 'Downloading...' : 'Template'}
              </button>

              <button
                onClick={() => document.getElementById('student-template-upload-input')?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || isTemplateDownloading || isTemplateUploading}
                title="Upload template — merges by Admission No.; non-empty cells overwrite; blank cells keep existing values"
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
                      {getSectionDisplayName(option)}
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
          className={isEditModalOpen ? 'fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3' : ''}
          onClick={() => {
            if (isEditModalOpen) resetForm({ keepMessage: true })
          }}
        >
          <section
            ref={addFormRef}
            className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${isEditModalOpen ? 'mx-auto mt-3 max-w-4xl' : ''}`}
            onClick={(event) => event.stopPropagation()}
          >
          <div className="border-b border-slate-200 px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">{editingStudentId ? 'Edit Student Record' : 'Add Student Record'}</h2>
              {isEditModalOpen ? (
                <button
                  type="button"
                  onClick={() => resetForm({ keepMessage: true })}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Capture student details manually, or use the template import for bulk onboarding.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 px-4 py-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Photograph</h3>
                  <p className="text-[11px] text-slate-500">
                    JPEG, PNG, GIF, or WebP up to 5MB.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {selectedPhoto ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {selectedPhoto ? (
                    <button
                      type="button"
                      onClick={clearSelectedPhoto}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              {selectedPhoto ? (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {selectedPhotoPreview ? (
                      <img
                        src={selectedPhotoPreview}
                        alt="Selected student photograph preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400">Preview</span>
                    )}
                  </div>
                  <div className="min-w-0 text-xs text-slate-500">
                    <p className="truncate font-medium text-slate-700">{selectedPhoto.name}</p>
                    <p className="mt-0.5">{Math.max(1, Math.round(selectedPhoto.size / 1024))} KB</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Admission No.</label>
                <input
                  name="rollNumber"
                  value={formData.rollNumber}
                  onChange={handleFieldChange}
                  placeholder="e.g. 4959"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('rollNumber')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Roll No</label>
                <input
                  value={formData.classRollNo || (editingStudentId ? '—' : 'Auto-assigned')}
                  readOnly
                  disabled
                  title="Assigned automatically by class and section (alphabetical)"
                  className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-sm font-semibold text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Status</label>
                <label className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleFieldChange}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Active
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Student Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('name')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Class</label>
                <select
                  name="class"
                  value={formData.class}
                  onChange={handleFieldChange}
                  disabled={classOptions.length === 0}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
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
                <label className="block text-xs font-semibold text-slate-700">Section</label>
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleFieldChange}
                  disabled={sectionOptionsForSelectedClass.length === 0}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {sectionOptionsForSelectedClass.length === 0 ? (
                    <option value="">No sections available</option>
                  ) : (
                    sectionOptionsForSelectedClass.map((option) => (
                      <option key={option} value={option}>
                        {getSectionDisplayName(option)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('dateOfBirth')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Admission Date</label>
                <input
                  type="date"
                  name="admissionDate"
                  value={formData.admissionDate}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('admissionDate')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Student Phone</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleFieldChange}
                  inputMode="numeric"
                  maxLength={10}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('phone')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">PEN No.</label>
                <input
                  name="penNumber"
                  value={formData.penNumber}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Father Name</label>
                <input
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('fatherName')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Mother Name</label>
                <input
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('motherName')}
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700">House (ACTVT)</label>
                <details className="group relative mt-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 [&::-webkit-details-marker]:hidden">
                    {(() => {
                      const selectedHouse = activityHouses.find((house) => house._id === formData.houseId)
                      if (!selectedHouse) {
                        return <span className="text-slate-500">No house</span>
                      }
                      const tone = normalizeHouseColorKey(selectedHouse.color || '')
                      const label = getHouseShortName(selectedHouse.name)
                      if (!tone) {
                        return (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {label}
                          </span>
                        )
                      }
                      return (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: tone, color: getHouseHeadingTextColor(tone) }}
                        >
                          {label}
                        </span>
                      )
                    })()}
                    <span className="text-[10px] text-slate-400 group-open:rotate-180">▼</span>
                  </summary>

                  <div className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                    <button
                      type="button"
                      onClick={(event) => {
                        const details = (event.currentTarget.closest('details') as HTMLDetailsElement | null)
                        setFormData((prev) => ({ ...prev, houseId: '', house: '' }))
                        setFormErrors((prev) => {
                          if (!prev.house && !prev.houseId) return prev
                          const next = { ...prev }
                          delete next.house
                          delete next.houseId
                          return next
                        })
                        if (details) details.open = false
                      }}
                      className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs font-medium transition hover:bg-slate-50 ${
                        !formData.houseId ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      No house
                    </button>
                    {activityHouses.map((house) => {
                      const tone = normalizeHouseColorKey(house.color || '')
                      const label = getHouseShortName(house.name)
                      const isSelected = formData.houseId === house._id
                      return (
                        <button
                          key={house._id}
                          type="button"
                          onClick={(event) => {
                            const details = (event.currentTarget.closest('details') as HTMLDetailsElement | null)
                            setFormData((prev) => ({
                              ...prev,
                              houseId: house._id,
                              house: house.name,
                            }))
                            setFormErrors((prev) => {
                              if (!prev.house && !prev.houseId) return prev
                              const next = { ...prev }
                              delete next.house
                              delete next.houseId
                              return next
                            })
                            if (details) details.open = false
                          }}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50 ${
                            isSelected ? 'bg-slate-100' : ''
                          }`}
                        >
                          {tone ? (
                            <span
                              className="inline-flex min-w-[4.5rem] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{ backgroundColor: tone, color: getHouseHeadingTextColor(tone) }}
                              title={house.name}
                            >
                              {label}
                            </span>
                          ) : (
                            <span className="inline-flex min-w-[4.5rem] items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {label}
                            </span>
                          )}
                          <span className="truncate text-[11px] text-slate-500">{house.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </details>
                {activityHouses.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Add houses in ACTVT → Houses for inter-house competitions.
                  </p>
                ) : null}
                {renderFieldError('house')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Bus No</label>
                <input
                  name="busNo"
                  value={formData.busNo}
                  onChange={handleFieldChange}
                  placeholder="e.g. 12"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  <option value="">Select</option>
                  {BLOOD_GROUP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Guardian Phone</label>
                <input
                  name="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={handleFieldChange}
                  inputMode="numeric"
                  maxLength={10}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('guardianPhone')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Religion</label>
                <input
                  name="religion"
                  value={formData.religion}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Nationality</label>
                <input
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Aadhar Number</label>
                <input
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleFieldChange}
                  inputMode="numeric"
                  maxLength={12}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('aadharNumber')}
              </div>

              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <label className="block text-xs font-semibold text-slate-700">Street Address</label>
                <input
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('address.street')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">City</label>
                <input
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('address.city')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">State</label>
                <input
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('address.state')}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Pincode</label>
                <input
                  name="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleFieldChange}
                  inputMode="numeric"
                  maxLength={6}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
                {renderFieldError('address.pincode')}
              </div>

              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <label className="block text-xs font-semibold text-slate-700">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFieldChange}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                  placeholder="Optional notes about the student record."
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {isSubmitting ? (editingStudentId ? 'Updating...' : 'Saving...') : (editingStudentId ? 'Update Student' : 'Save Student')}
              </button>

              <button
                type="button"
                onClick={() => resetForm()}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </form>
          </section>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[min(720px,calc(100vh-260px))] overflow-auto">
          <table className="w-max border-separate border-spacing-0 text-xs leading-snug">
            <thead>
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="sticky top-0 z-20 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all visible students"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                {[
                  { label: 'Adm No.', field: 'rollNumber' as const },
                  { label: 'Roll', field: 'classRollNo' as const },
                  { label: 'Name', field: 'name' as const },
                  { label: 'Class', field: 'class' as const },
                  { label: 'Sec', field: 'section' as const },
                  { label: 'Father', field: 'fatherName' as const },
                  { label: 'Mother', field: 'motherName' as const },
                  { label: 'DOB', field: 'dateOfBirth' as const },
                  { label: 'Gender', field: 'gender' as const },
                  { label: 'House', field: 'house' as const },
                  { label: 'Bus', field: 'busNo' as const },
                  { label: 'Blood', field: 'bloodGroup' as const },
                  { label: 'Cat', field: 'category' as const },
                  { label: 'Mobile', field: 'phone' as const },
                  { label: 'PEN', field: 'penNumber' as const },
                  { label: 'Address', field: 'address' as const },
                ].map(({ label, field }) => (
                  <th
                    key={field}
                    className="sticky top-0 z-20 cursor-pointer whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-2 select-none hover:text-slate-700"
                    onClick={() => handleSort(field)}
                    title={`Sort by ${label}`}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {label}
                      {tableSortField === field ? (tableSortDirection === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={17} className="px-1.5 py-8 text-center text-slate-500">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-1.5 py-8 text-center text-slate-500">
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
                      const cell = 'whitespace-nowrap border-b border-slate-100 px-2 py-1.5 align-middle'
                      return (
                        <>
                    <td className={cell} onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(student._id)}
                        onChange={() => handleToggleSelect(student._id)}
                        aria-label={`Select ${student.name}`}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className={`${cell} font-semibold text-slate-900`}>{student.rollNumber}</td>
                    <td className={cell}>{student.classRollNo || '-'}</td>
                    <td className={`${cell} font-semibold text-slate-900`}>{student.name}</td>
                    <td className={cell}>{student.class}</td>
                    <td className={cell} onClick={(event) => event.stopPropagation()}>
                      {editingSectionStudentId === student._id ? (
                        (() => {
                          const availableSections = getSectionsForClass(String(student.class || ''))

                          return (
                            <div className="flex flex-nowrap gap-0.5">
                              {availableSections.map((sectionName) => {
                                const isCurrent = normalizeSectionKey(sectionName) === normalizeSectionKey(String(displaySection || ''))
                                return (
                                  <button
                                    key={sectionName}
                                    type="button"
                                    onClick={() => handleSectionChange(student._id, String(student.class || ''), sectionName)}
                                    disabled={Boolean(sectionUpdateLoadingById[student._id])}
                                    className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold transition ${
                                      isCurrent
                                        ? 'border-blue-300 bg-blue-600 text-white'
                                        : 'border-blue-200 bg-white text-blue-800 hover:border-blue-300 hover:bg-blue-50'
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                    title={`Set section ${getSectionDisplayName(sectionName)} for ${student.name}`}
                                    aria-label={`Set section ${getSectionDisplayName(sectionName)} for ${student.name}`}
                                  >
                                    {getSectionDisplayName(sectionName)}
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
                          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-1.5 py-0 text-[10px] font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                          title={`Change section for ${student.name}`}
                          aria-label={`Change section for ${student.name}`}
                        >
                          {sectionUpdateLoadingById[student._id] ? 'Saving...' : (getSectionDisplayName(String(displaySection || '')) || '-')}
                        </button>
                      )}
                    </td>
                    <td className={cell}>{student.fatherName || '-'}</td>
                    <td className={cell}>{student.motherName || '-'}</td>
                    <td className={cell}>{formatDate(student.dateOfBirth)}</td>
                    <td className={cell}>{formatGender(student.gender)}</td>
                    <td className={cell}>
                      {(() => {
                        const houseRecord = resolveStudentHouse(student, activityHouses)
                        const houseLabel = getHouseShortName(houseRecord?.name || student.house || '')
                        if (houseLabel === '-') return '-'
                        const tone = normalizeHouseColorKey(houseRecord?.color || '') || ''
                        if (!tone) {
                          return (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0 text-[10px] font-semibold text-slate-700">
                              {houseLabel}
                            </span>
                          )
                        }
                        return (
                          <span
                            className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold"
                            style={{
                              backgroundColor: tone,
                              color: getHouseHeadingTextColor(tone),
                            }}
                            title={houseRecord?.name || student.house}
                          >
                            {houseLabel}
                          </span>
                        )
                      })()}
                    </td>
                    <td className={cell}>{student.busNo || '-'}</td>
                    <td className={cell}>
                      <BloodGroupDrop value={getStudentBloodGroup(student)} />
                    </td>
                    <td className={cell}>{student.category || '-'}</td>
                    <td className={cell}>{student.phone || '-'}</td>
                    <td className={cell}>{student.penNumber || '-'}</td>
                    <td className="max-w-[140px] border-b border-slate-100 px-2 py-1.5 align-middle">
                      <span className="line-clamp-1 whitespace-normal" title={formatStudentAddress(student.address)}>
                        {formatStudentAddress(student.address)}
                      </span>
                    </td>
                        </>
                      )
                    })()}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
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
