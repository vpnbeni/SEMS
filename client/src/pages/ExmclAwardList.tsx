import React, { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import exmclExamService, { type ExmclExamDefinition } from '@/services/exmclExamService'
import exmclAwardListService, {
  DEFAULT_AWARD_LIST_DESIGN,
  type AwardListDesign,
} from '@/services/exmclAwardListService'
import schoolProfileService, { type SchoolProfile } from '@/services/schoolProfileService'
import api from '@/services/api'
import { sortSectionNames } from '@/constants/studentClasses'
import AwardListPreview, { type AwardListPreviewStudent } from '@/components/exmcl/AwardListPreview'

type ClassSectionEntry = {
  _id?: { class?: string; section?: string }
  count?: number
  active?: number
}

const sortClassNames = (left: string, right: string) =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })

const selectClassName =
  'min-w-[140px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white'

const PAGE_ASPECT: Record<'A4' | 'legal', Record<'portrait' | 'landscape', string>> = {
  A4: { portrait: '210 / 297', landscape: '297 / 210' },
  legal: { portrait: '8.5 / 14', landscape: '14 / 8.5' },
}

const formatDisplayDate = (value: string) => {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  return String(value || '').trim()
}

const ExmclAwardList: React.FC = () => {
  const navigate = useNavigate()
  const [exams, setExams] = useState<ExmclExamDefinition[]>([])
  const [classSectionEntries, setClassSectionEntries] = useState<ClassSectionEntry[]>([])
  const [design, setDesign] = useState<AwardListDesign>(DEFAULT_AWARD_LIST_DESIGN)
  const [school, setSchool] = useState<Partial<SchoolProfile>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [previewStudents, setPreviewStudents] = useState<AwardListPreviewStudent[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [examDate, setExamDate] = useState('')
  const [subjectName, setSubjectName] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [examList, statsRes, savedDesign, profile] = await Promise.all([
          exmclExamService.getAll(),
          api.get('/students/stats', { params: { lite: true } }),
          exmclAwardListService.getDesign(),
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
        if (!cancelled) toast.error('Failed to load award list.')
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
      setPreviewStudents([])
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    api
      .get('/students', {
        params: {
          page: 1,
          limit: 500,
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
        const students = Array.isArray(response?.data?.data?.students) ? response.data.data.students : []
        setStudentCount(Number(total) || 0)
        setPreviewStudents(
          students.map((student: any) => ({
            rollNumber: student.rollNumber || '',
            classRollNo: student.classRollNo || '',
            name: student.name || '',
            fatherName: student.fatherName || '',
          }))
        )
      })
      .catch(() => {
        if (!cancelled) {
          setStudentCount(null)
          setPreviewStudents([])
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedClass, selectedSection])

  const selectedExam = exams.find((exam) => exam._id === selectedExamId)
  const canGenerate = Boolean(selectedExamId && selectedClass && selectedSection)
  const twoUp = design.copiesPerSheet === 2
  const pageAspect = PAGE_ASPECT[design.pageSize || 'A4'][design.orientation || 'landscape']
  const schoolName = String(school.name || '').trim() || 'SCHOOL NAME'
  const schoolAddress = String(school.address || '').trim()
  const copyCount = twoUp ? [0, 1] : [0]
  const previewSubjects = subjectName.trim() ? [subjectName.trim()] : ['Marks']

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Select exam, class, and section.')
      return
    }

    setGenerating(true)
    try {
      await exmclAwardListService.downloadAwardList(
        selectedExamId,
        selectedClass,
        selectedSection,
        selectedExam?.code || 'exam',
        { subject: subjectName, examDate }
      )
      toast.success('Award list PDF downloaded.')
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to generate award list PDF.'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
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
            {design.headerFields.subject ? (
              <input
                title="Subject (optional)"
                aria-label="Subject (optional)"
                placeholder="Subject (optional)"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className={`${selectClassName} min-w-[160px]`}
              />
            ) : null}
            {design.headerFields.date ? (
              <input
                type="date"
                title="Date (optional)"
                aria-label="Date (optional)"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className={selectClassName}
              />
            ) : null}
            <p className="text-[11px] text-slate-500">
              {selectedClass && selectedSection
                ? previewLoading
                  ? 'Loading students...'
                  : studentCount === null
                    ? 'Unable to load student count.'
                    : `${studentCount} student${studentCount === 1 ? '' : 's'}`
                : 'Select exam, class, and section'}
              {' · '}
              <button
                type="button"
                onClick={() => navigate('/exmcl/performas/award-list')}
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
            {subjectName.trim() ? ` · ${subjectName.trim()}` : ''}
          </p>
          {!canGenerate ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Select exam, class, and section to preview the award list.
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
                <div className={twoUp ? 'flex h-full gap-3' : 'h-full'}>
                  {copyCount.map((index) => (
                    <div
                      key={index}
                      className={twoUp ? 'min-w-0 flex-1 border-r border-dashed border-slate-300 pr-3 last:border-r-0 last:pr-0 last:pl-3' : ''}
                    >
                      <AwardListPreview
                        design={design}
                        compact={twoUp}
                        data={{
                          schoolName,
                          schoolAddress,
                          logoUrl: school.logoUrl,
                          className: selectedClass,
                          section: selectedSection,
                          examName: selectedExam?.name || '',
                          examDate: formatDisplayDate(examDate),
                          subject: subjectName,
                          maxMarks: selectedExam?.maximumMarks || '',
                          subjects: previewSubjects,
                          students: previewStudents,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExmclAwardList
