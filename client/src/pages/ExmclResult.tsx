import React, { useEffect, useMemo, useState } from 'react'
import { Tabs } from '@/components/common/Tabs'
import exmclExamService, { type ExmclExamDefinition } from '@/services/exmclExamService'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { useTimetable } from '@/contexts/TimetableContext'

type ResultTab = 'exam'

type StudentRow = {
  _id: string
  rollNumber: string
  name: string
  class: string
  section: string
}

type SubjectRow = {
  id: string
  name: string
}

const tabConfig = [{ id: 'exam' as const, label: 'Exam', color: 'indigo' as const }]

const ExmclResult: React.FC = () => {
  const { matrixClasses, matrixSections, matrixSelection, classes: timetableClasses } = useTimetable()
  const [activeTab, setActiveTab] = useState<ResultTab>('exam')
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<ExmclExamDefinition[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [marksByStudent, setMarksByStudent] = useState<Record<string, Record<string, string>>>({})
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadInitialData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [examList, studentRes] = await Promise.all([
        exmclExamService.getAll(),
        api.get('/students', { params: { page: 1, limit: 100, isActive: true } }),
      ])

      const studentList = Array.isArray(studentRes?.data?.data?.students) ? studentRes.data.data.students : []

      setExams(examList)
      setStudents(studentList)
      if (examList.length > 0) setSelectedExamId(examList[0]._id)
    } catch (error: any) {
      const message = String(error?.response?.data?.message || error?.message || 'Failed to load result setup data.')
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInitialData()
  }, [])

  const classOptions = useMemo(() => {
    return matrixClasses
      .map((item) => String(item.name || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [matrixClasses])

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return []
    const classRow = matrixClasses.find(
      (item) => String(item.name || '').trim().toLowerCase() === selectedClass.trim().toLowerCase()
    )
    if (!classRow) return []

    const allowedSections = matrixSections
      .filter((section) => Boolean(matrixSelection[classRow.id]?.[section.id]))
      .map((section) => String(section.name || '').trim())
      .filter(Boolean)

    return allowedSections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [matrixClasses, matrixSections, matrixSelection, selectedClass])

  const filteredStudents = useMemo(() => {
    const classKey = selectedClass.trim().toLowerCase()
    const sectionKey = selectedSection.trim().toLowerCase()
    return students
      .filter((item) => {
        if (!classKey || !sectionKey) return false
        return (
          String(item.class || '').trim().toLowerCase() === classKey &&
          String(item.section || '').trim().toLowerCase() === sectionKey
        )
      })
      .sort((a, b) => String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true }))
  }, [students, selectedClass, selectedSection])

  const filteredSubjects = useMemo(() => {
    if (!selectedClass) return []
    const classKey = selectedClass.trim().toLowerCase()
    const subjectNameSet = new Set<string>()

    timetableClasses.forEach((row) => {
      if (String(row.className || '').trim().toLowerCase() !== classKey) return
      ;(row.subjects || []).forEach((subjectName) => {
        const trimmed = String(subjectName || '').trim()
        if (trimmed) subjectNameSet.add(trimmed)
      })
    })

    return Array.from(subjectNameSet)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((name) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
      }))
  }, [selectedClass, timetableClasses])

  useEffect(() => {
    setSelectedSection('')
  }, [selectedClass])

  useEffect(() => {
    if (selectedClass && !classOptions.includes(selectedClass)) {
      setSelectedClass('')
      setSelectedSection('')
    }
  }, [selectedClass, classOptions])

  useEffect(() => {
    if (selectedSection && !sectionOptions.includes(selectedSection)) {
      setSelectedSection('')
    }
  }, [selectedSection, sectionOptions])

  const updateMark = (studentId: string, subjectId: string, value: string) => {
    if (value !== '' && !/^\d{0,3}(\.\d{0,2})?$/.test(value)) return
    setMarksByStudent((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: value,
      },
    }))
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <Tabs<ResultTab>
            tabs={tabConfig}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pill"
            size="sm"
            ariaLabel="Result mode"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2 lg:mx-4">
            <select
              title="Select exam"
              aria-label="Select exam"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Exam</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.code} - {exam.name}
                </option>
              ))}
            </select>
            <select
              title="Select class"
              aria-label="Select class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="min-w-[130px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Class</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            <select
              title="Select section"
              aria-label="Select section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="min-w-[140px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              disabled={!selectedClass}
            >
              <option value="">Section</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Result Entry</h3>
        </div>

        <div className="max-h-[70vh] overflow-x-auto overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading result sheet...</div>
          ) : loadError ? (
            <div className="p-10 text-center text-sm text-red-600 dark:text-red-400">
              {loadError}
            </div>
          ) : !selectedExamId || !selectedClass || !selectedSection ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Select Exam, Class, and Section to load students and enter marks.
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No subjects found for selected class. Add subjects in Timetable and map them to this class.
            </div>
          ) : (
            <table className="min-w-[1100px] w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="sticky top-0 z-40 bg-gray-50/95 backdrop-blur dark:bg-gray-900/95">
                <tr>
                  <th className="sticky left-0 z-50 w-[110px] min-w-[110px] bg-gray-50/95 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 backdrop-blur dark:bg-gray-900/95 dark:text-gray-400">
                    Adm. No.
                  </th>
                  <th className="sticky left-[110px] z-50 w-[220px] min-w-[220px] bg-gray-50/95 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 backdrop-blur dark:bg-gray-900/95 dark:text-gray-400">
                    Student Name
                  </th>
                  {filteredSubjects.map((subject) => (
                    <th
                      key={subject.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      <div>{subject.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2 + filteredSubjects.length}
                      className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500"
                    >
                      No students assigned to this class-section yet.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="sticky left-0 z-20 w-[110px] min-w-[110px] bg-white px-4 py-3 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white">
                        {student.rollNumber}
                      </td>
                      <td className="sticky left-[110px] z-20 w-[220px] min-w-[220px] bg-white px-4 py-3 text-sm text-gray-900 dark:bg-gray-800 dark:text-white">
                        {student.name}
                      </td>
                      {filteredSubjects.map((subject) => (
                        <td key={`${student._id}-${subject.id}`} className="px-4 py-2">
                          <input
                            type="text"
                            title={`Marks for ${student.name} in ${subject.name}`}
                            value={marksByStudent[student._id]?.[subject.id] ?? ''}
                            onChange={(e) => updateMark(student._id, subject.id, e.target.value)}
                            placeholder="0"
                            className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExmclResult
