import React, { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import exmclExamService, { type ExmclExamDefinition } from '@/services/exmclExamService'
import exmclAdmitCardService, {
  DEFAULT_ADMIT_CARD_DESIGN,
  type AdmitCardDesign,
} from '@/services/exmclAdmitCardService'
import schoolProfileService, { type SchoolProfile } from '@/services/schoolProfileService'
import api from '@/services/api'
import { sortSectionNames } from '@/constants/studentClasses'
import AdmitCardPreview, {
  type AdmitCardPreviewStudent,
  type AdmitCardPreviewSubject,
} from '@/components/exmcl/AdmitCardPreview'

type ClassSectionEntry = {
  _id?: { class?: string; section?: string }
  count?: number
  active?: number
}

const sortClassNames = (left: string, right: string) =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })

const selectClassName =
  'min-w-[140px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white'

const formatDate = (value?: string | Date) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getFullYear()}`
}

const PAGE_ASPECT: Record<'A4' | 'legal', Record<'portrait' | 'landscape', string>> = {
  A4: { portrait: '210 / 297', landscape: '297 / 210' },
  legal: { portrait: '8.5 / 14', landscape: '14 / 8.5' },
}

const ExmclAdmitCards: React.FC = () => {
  const navigate = useNavigate()
  const [exams, setExams] = useState<ExmclExamDefinition[]>([])
  const [classSectionEntries, setClassSectionEntries] = useState<ClassSectionEntry[]>([])
  const [design, setDesign] = useState<AdmitCardDesign>(DEFAULT_ADMIT_CARD_DESIGN)
  const [school, setSchool] = useState<Partial<SchoolProfile>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [previewStudent, setPreviewStudent] = useState<AdmitCardPreviewStudent | null>(null)
  const [previewSubjects, setPreviewSubjects] = useState<AdmitCardPreviewSubject[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [examList, statsRes, savedDesign, profile] = await Promise.all([
          exmclExamService.getAll(),
          api.get('/students/stats'),
          exmclAdmitCardService.getDesign(),
          schoolProfileService.getProfile().catch(() => null),
        ])
        if (cancelled) return

        const byClassSection = Array.isArray(statsRes?.data?.data?.byClassSection)
          ? statsRes.data.data.byClassSection
          : []

        setExams(examList)
        setClassSectionEntries(byClassSection)
        setDesign(savedDesign)
        if (profile) setSchool(profile)
        if (examList.length > 0) setSelectedExamId(examList[0]._id)
      } catch {
        if (!cancelled) toast.error('Failed to load admit cards.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const populatedClassSections = useMemo(
    () =>
      classSectionEntries.filter((entry) => {
        const enrolled = Number(entry.active ?? entry.count)
        return Number.isFinite(enrolled) ? enrolled > 0 : Boolean(entry?._id?.class)
      }),
    [classSectionEntries]
  )

  const classOptions = useMemo(() => {
    const fromStudents = populatedClassSections
      .map((entry) => String(entry?._id?.class || '').trim())
      .filter(Boolean)
    return Array.from(new Set(fromStudents)).sort(sortClassNames)
  }, [populatedClassSections])

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return []
    return Array.from(
      new Set(
        populatedClassSections
          .filter((entry) => String(entry?._id?.class || '').trim() === selectedClass)
          .map((entry) => String(entry?._id?.section || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => sortSectionNames(a, b, selectedClass))
  }, [populatedClassSections, selectedClass])

  useEffect(() => {
    setSelectedSection('')
  }, [selectedClass])

  useEffect(() => {
    if (!selectedClass || !selectedSection) {
      setStudentCount(null)
      setPreviewStudent(null)
      setPreviewSubjects([])
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    api
      .get('/students', {
        params: {
          page: 1,
          limit: 1,
          class: selectedClass,
          section: selectedSection,
          isActive: true,
          sort: 'classRollNo',
        },
      })
      .then((response) => {
        if (cancelled) return
        const total =
          response?.data?.data?.pagination?.totalItems ??
          response?.data?.data?.pagination?.totalCount ??
          0
        setStudentCount(Number(total) || 0)
        const student = Array.isArray(response?.data?.data?.students)
          ? response.data.data.students[0]
          : null
        if (!student) {
          setPreviewStudent(null)
          setPreviewSubjects([])
          return
        }

        const examCode = exams.find((exam) => exam._id === selectedExamId)?.code || 'EXM'
        setPreviewStudent({
          name: student.name || '',
          fatherName: student.fatherName || '',
          gender: student.gender && student.gender !== 'Unspecified' ? student.gender : '',
          motherName: student.motherName || '',
          className: student.class || selectedClass,
          section: student.section || selectedSection,
          rollNo: student.classRollNo || '',
          admissionNo: student.rollNumber || '',
          dateOfBirth: formatDate(student.dateOfBirth),
          photoUrl: student.profileImage || '',
          pwdCategory: String(student.medicalInfo?.specialNeeds || '').trim() || 'Not Applicable',
          admitCardId: `AC${String(examCode).replace(/\s+/g, '')}${String(student.rollNumber || student._id).slice(-6)}`.toUpperCase(),
        })
        setPreviewSubjects(
          (Array.isArray(student.subjects) ? student.subjects : [])
            .map((subject: { code?: string; name?: string }) => ({
              code: String(subject?.code || ''),
              name: String(subject?.name || '').toUpperCase(),
            }))
            .filter((subject: AdmitCardPreviewSubject) => subject.name)
        )
      })
      .catch(() => {
        if (!cancelled) {
          setStudentCount(null)
          setPreviewStudent(null)
          setPreviewSubjects([])
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedClass, selectedSection, selectedExamId, exams])

  const selectedExam = exams.find((exam) => exam._id === selectedExamId)
  const canGenerate = Boolean(selectedExamId && selectedClass && selectedSection)
  const twoUp = design.copiesPerSheet === 2
  const pageAspect = PAGE_ASPECT[design.pageSize || 'A4'][design.orientation || 'portrait']
  const schoolName = String(school.name || '').trim() || 'SCHOOL NAME'
  const schoolAddress = String(school.address || '').trim()
  const schoolCode = String(school.schoolCode || '').trim()

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Select exam, class, and section.')
      return
    }

    setGenerating(true)
    try {
      await exmclAdmitCardService.downloadAdmitCards(
        selectedExamId,
        selectedClass,
        selectedSection,
        selectedExam?.code || 'exam'
      )
      toast.success('Admit cards PDF downloaded.')
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to generate admit cards.'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1200px] space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <select
              title="Exam"
              aria-label="Exam"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              disabled={loading}
              className={`${selectClassName} min-w-[220px]`}
            >
              <option value="">{loading ? 'Loading exams...' : 'Select exam'}</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.code} — {exam.name}
                </option>
              ))}
            </select>
            <select
              title="Class"
              aria-label="Class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={loading}
              className={selectClassName}
            >
              <option value="">Class</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            <select
              title="Section"
              aria-label="Section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={loading || !selectedClass}
              className={selectClassName}
            >
              <option value="">{selectedClass ? 'Section' : 'Select class first'}</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              {selectedClass && selectedSection
                ? previewLoading
                  ? 'Loading students...'
                  : studentCount === null
                    ? 'Unable to load student count.'
                    : `${studentCount} admit card${studentCount === 1 ? '' : 's'}`
                : 'Select exam, class, and section'}
              {' · '}
              <button
                type="button"
                onClick={() => navigate('/exmcl/performas/admit-card')}
                className="font-medium text-blue-600 hover:underline"
              >
                Change format
              </button>
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-slate-100 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Live preview
            {selectedExam ? ` · ${selectedExam.name}` : ''}
            {selectedClass && selectedSection ? ` · ${selectedClass}-${selectedSection}` : ''}
            {previewStudent?.name ? ` · ${previewStudent.name}` : ''}
          </p>
          {!canGenerate ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Select exam, class, and section to preview an admit card.
            </p>
          ) : previewLoading ? (
            <p className="py-16 text-center text-sm text-slate-500">Loading preview...</p>
          ) : studentCount === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">
              No students found for class {selectedClass}, section {selectedSection}.
            </p>
          ) : (
            <div className="overflow-auto">
              <div
                className="mx-auto max-w-full bg-white p-3 shadow-md"
                style={{
                  aspectRatio: pageAspect,
                  width: design.orientation === 'portrait' ? 'min(100%, 640px)' : '100%',
                }}
              >
                <AdmitCardPreview
                  design={design}
                  compact={twoUp}
                  data={{
                    schoolName,
                    schoolAddress,
                    schoolCode,
                    logoUrl: school.logoUrl,
                    examName: selectedExam?.name || 'EXAMINATION',
                    student: previewStudent || {
                      className: selectedClass,
                      section: selectedSection,
                    },
                    subjects: previewSubjects,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExmclAdmitCards
