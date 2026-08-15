import React, { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import exmclExamService, { type ExmclExamDefinition } from '@/services/exmclExamService'
import exmclAdmitCardService, { type AdmitCardDesign } from '@/services/exmclAdmitCardService'
import api from '@/services/api'
import { STUDENT_CLASS_OPTIONS } from '@/constants/studentClasses'

type ClassSectionEntry = {
  _id?: { class?: string; section?: string }
}

const sortClassNames = (left: string, right: string) =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })

const selectClassName =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white'

const ExmclAdmitCards: React.FC = () => {
  const navigate = useNavigate()
  const [exams, setExams] = useState<ExmclExamDefinition[]>([])
  const [classSectionEntries, setClassSectionEntries] = useState<ClassSectionEntry[]>([])
  const [design, setDesign] = useState<AdmitCardDesign | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)

  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [examList, statsRes, savedDesign] = await Promise.all([
          exmclExamService.getAll(),
          api.get('/students/stats'),
          exmclAdmitCardService.getDesign(),
        ])
        if (cancelled) return

        const byClassSection = Array.isArray(statsRes?.data?.data?.byClassSection)
          ? statsRes.data.data.byClassSection
          : []

        setExams(examList)
        setClassSectionEntries(byClassSection)
        setDesign(savedDesign)
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

  const classOptions = useMemo(() => {
    const fromStudents = classSectionEntries
      .map((entry) => String(entry?._id?.class || '').trim())
      .filter(Boolean)
    return Array.from(new Set([...STUDENT_CLASS_OPTIONS, ...fromStudents])).sort(sortClassNames)
  }, [classSectionEntries])

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return []
    return Array.from(
      new Set(
        classSectionEntries
          .filter((entry) => String(entry?._id?.class || '').trim() === selectedClass)
          .map((entry) => String(entry?._id?.section || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [classSectionEntries, selectedClass])

  useEffect(() => {
    setSelectedSection('')
  }, [selectedClass])

  useEffect(() => {
    if (!selectedClass || !selectedSection) {
      setStudentCount(null)
      return
    }

    let cancelled = false
    setCountLoading(true)
    api
      .get('/students', {
        params: { page: 1, limit: 1, class: selectedClass, section: selectedSection, isActive: true },
      })
      .then((response) => {
        if (cancelled) return
        const total =
          response?.data?.data?.pagination?.totalItems ??
          response?.data?.data?.pagination?.totalCount ??
          0
        setStudentCount(Number(total) || 0)
      })
      .catch(() => {
        if (!cancelled) setStudentCount(null)
      })
      .finally(() => {
        if (!cancelled) setCountLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedClass, selectedSection])

  const selectedExam = exams.find((exam) => exam._id === selectedExamId)
  const canGenerate = Boolean(selectedExamId && selectedClass && selectedSection)

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
      <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Generate Admit Cards</h2>
          <p className="mt-1 text-xs text-gray-500">
            Download admit cards using the format saved under Formats.
          </p>
        </div>

        <select title="Exam" aria-label="Exam" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} disabled={loading} className={selectClassName}>
          <option value="">{loading ? 'Loading exams...' : 'Select exam'}</option>
          {exams.map((exam) => (
            <option key={exam._id} value={exam._id}>{exam.code} — {exam.name}</option>
          ))}
        </select>
        <select title="Class" aria-label="Class" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={loading} className={selectClassName}>
          <option value="">Select class</option>
          {classOptions.map((className) => (
            <option key={className} value={className}>{className}</option>
          ))}
        </select>
        <select title="Section" aria-label="Section" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={loading || !selectedClass} className={selectClassName}>
          <option value="">{selectedClass ? 'Select section' : 'Select class first'}</option>
          {sectionOptions.map((section) => (
            <option key={section} value={section}>{section}</option>
          ))}
        </select>

        <p className="text-[11px] text-slate-500">
          Format: {design?.title || 'Admit Card'} · {design?.pageSize === 'legal' ? 'Legal' : 'A4'} · {design?.orientation === 'landscape' ? 'Landscape' : 'Portrait'}
          {design?.copiesPerSheet === 2 ? ' · 2 per sheet' : ''}
          {' · '}
          <button
            type="button"
            onClick={() => navigate('/exmcl/performas/admit-card')}
            className="font-medium text-blue-600 hover:underline"
          >
            Change format
          </button>
        </p>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          {generating ? 'Generating...' : 'Download PDF'}
        </button>
        <p className="text-[11px] text-slate-500">
          {selectedClass && selectedSection
            ? countLoading
              ? 'Checking students...'
              : studentCount === null
                ? 'Unable to load student count.'
                : `${studentCount} admit card${studentCount === 1 ? '' : 's'} will be generated.`
            : 'Select exam, class, and section to generate.'}
        </p>
      </div>
    </div>
  )
}

export default ExmclAdmitCards
