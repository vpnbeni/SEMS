import React, { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { GraduationCap, RefreshCw, Search, UserPlus, Users } from 'lucide-react'
import type { AppDispatch, RootState } from '../redux/store'
import {
  createStudent,
  fetchStudentStats,
  fetchStudents,
  getNextRollNumber,
} from '../redux/slices/studentSlice'

type StudentFormState = {
  rollNumber: string
  name: string
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

const CLASS_OPTIONS = ['10th', '12th'] as const
const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const
const CATEGORY_OPTIONS = ['General', 'OBC', 'SC', 'ST', 'EWS'] as const

const createInitialFormState = (): StudentFormState => ({
  rollNumber: '',
  name: '',
  email: '',
  phone: '',
  class: '10th',
  section: 'A',
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

const StudentInfo: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { students, stats, loading, pagination } = useSelector((state: RootState) => state.students)

  const [formData, setFormData] = useState<StudentFormState>(createInitialFormState)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingRollNumber, setIsGeneratingRollNumber] = useState(false)

  const deferredSearch = useDeferredValue(searchTerm)

  useEffect(() => {
    dispatch(fetchStudentStats())
  }, [dispatch])

  useEffect(() => {
    dispatch(
      fetchStudents({
        page,
        limit: 8,
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

  const totalSections = useMemo(
    () => new Set((stats?.byClassSection || []).map((entry) => `${entry._id.class}-${entry._id.section}`)).size,
    [stats]
  )

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
    setFormData(createInitialFormState())
    setFormErrors({})
    if (!options?.keepMessage) {
      setFormMessage(null)
    }
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
      setFormMessage(typeof error === 'string' ? error : 'Unable to generate a roll number right now.')
    } finally {
      setIsGeneratingRollNumber(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormMessage(null)

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await dispatch(
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

      setFormMessage('Student record created successfully.')
      resetForm({ keepMessage: true })
      dispatch(fetchStudentStats())
      dispatch(
        fetchStudents({
          page: 1,
          limit: 8,
          sort: '-createdAt',
          ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
          ...(classFilter ? { class: classFilter } : {}),
          ...(sectionFilter ? { section: sectionFilter } : {}),
        })
      )
      setPage(1)
    } catch (error) {
      setFormMessage(typeof error === 'string' ? error : 'Failed to create student.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFieldError = (field: string) =>
    formErrors[field] ? <p className="mt-1 text-xs font-medium text-rose-600">{formErrors[field]}</p> : null

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Students</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stats?.total ?? 0}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Total student records currently available in this academic session.</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Students</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stats?.activeTotal ?? 0}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Students marked active and ready for academic or exam operations.</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Class Sections</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{totalSections}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Distinct class-section combinations represented in student records.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Add Student Record</h2>
            <p className="mt-1 text-sm text-slate-500">
              Capture the required student profile details and save them directly to the database.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
            {formMessage ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                  formMessage.toLowerCase().includes('success')
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {formMessage}
              </div>
            ) : null}

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
                <label className="block text-sm font-semibold text-slate-700">Class</label>
                <select
                  name="class"
                  value={formData.class}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {CLASS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Section</label>
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleFieldChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {SECTION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
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
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Recent Student Records</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review the latest students already stored in the database and verify newly created entries.
            </p>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by student, roll number, father name, or email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  <option value="">All Classes</option>
                  {CLASS_OPTIONS.map((option) => (
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
                  {SECTION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      Section {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Loading student records...
                </div>
              ) : students.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No students found for the current filters.
                </div>
              ) : (
                students.map((student) => (
                  <div key={student._id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">{student.rollNumber}</span>
                          <span>
                            {student.class} - {student.section}
                          </span>
                          <span>{student.category}</span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          student.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <p>Guardian: {student.guardianPhone || 'Not available'}</p>
                      <p>Address: {student.fullAddress || 'Address not available'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-500">
              <span>
                Page {pagination.currentPage} of {pagination.totalPages}
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
          </div>
        </div>
      </section>
    </div>
  )
}

export default StudentInfo
