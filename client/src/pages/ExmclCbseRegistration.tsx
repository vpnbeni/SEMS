import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'
import { Dropdown } from '@/components/common/Dropdown'
import type { DropdownOption, DropdownValue } from '@/components/common/Dropdown'
import api from '@/services/api'
import cbseRegistrationService, {
  type CbseRegistrationMatrix,
  type CbseRegistrationSubject,
  type CbseRegistrationStudent,
  type ClassSubjectRow,
  type ClassSubjectSlot,
} from '@/services/cbseRegistrationService'
import { useTimetable } from '@/contexts/TimetableContext'
import { sortClassNames, sortSectionNames } from '@/constants/studentClasses'
import { getCanonicalSectionName, normalizeSectionKey } from '@/constants/sectionMetadata'

type ClassSectionEntry = {
  _id?: { class?: string; section?: string }
  count?: number
  active?: number
}

const SUBJECTS_PER_STACK = 3

const subjectKey = (name: string) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')

const isCbseRegistrationClass = (className: string) => {
  const key = String(className || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  return /^(9th|10th|11th|12th|9|10|11|12|ix|x|xi|xii|class9|class10|class11|class12)$/.test(key)
}

const isSeniorClass = (className: string) => {
  const key = String(className || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  return /^(11th|12th|11|12|xi|xii|class11|class12)$/.test(key)
}

const normalizeClassNameKey = (className: string) =>
  String(className || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')

const formatSubjectLabel = (subject: { name: string; code?: string }) => {
  const code = String(subject.code || '').trim()
  return code ? `${subject.name} (${code})` : subject.name
}

const rowId = (className: string, section: string) =>
  `${String(className).trim().toLowerCase()}::${normalizeSectionKey(section)}`

const emptySlot = (): ClassSubjectSlot => ({ key: '', name: '', code: '' })

const ensureMinSlots = (subjects: ClassSubjectSlot[], min = SUBJECTS_PER_STACK) => {
  const next = [...(subjects || [])]
  while (next.length < min) next.push(emptySlot())
  return next
}

const compactSubjects = (subjects: ClassSubjectSlot[]) =>
  (subjects || []).filter((item) => item?.key && item?.name)

const mirrorNinthToTenth = (rows: ClassSubjectRow[]) => {
  const next = rows.map((row) => ({
    ...row,
    subjects: [...(row.subjects || [])],
  }))
  const ninth = next.find((row) => normalizeClassNameKey(row.className) === '9th')
  if (!ninth || compactSubjects(ninth.subjects).length === 0) return next
  return next.map((row) => {
    if (normalizeClassNameKey(row.className) !== '10th') return row
    if (compactSubjects(row.subjects).length > 0) return row
    return { ...row, subjects: [...ninth.subjects] }
  })
}

/** Fill empty 12th section rows from matching 11th section (Science/Commerce/Humanities). */
const mirrorEleventhToTwelfth = (rows: ClassSubjectRow[]) => {
  const next = rows.map((row) => ({
    ...row,
    subjects: [...(row.subjects || [])],
  }))
  const eleventhBySection = new Map<string, ClassSubjectSlot[]>()
  next.forEach((row) => {
    if (normalizeClassNameKey(row.className) !== '11th') return
    const sectionKey = normalizeSectionKey(row.section)
    if (!sectionKey) return
    const subjects = compactSubjects(row.subjects)
    if (subjects.length === 0) return
    eleventhBySection.set(sectionKey, [...row.subjects])
  })
  if (eleventhBySection.size === 0) return next
  return next.map((row) => {
    if (normalizeClassNameKey(row.className) !== '12th') return row
    if (compactSubjects(row.subjects).length > 0) return row
    const sectionKey = normalizeSectionKey(row.section)
    const source = eleventhBySection.get(sectionKey)
    if (!source) return row
    return { ...row, subjects: [...source] }
  })
}

const applyDefaultSubjectMirrors = (rows: ClassSubjectRow[]) =>
  mirrorEleventhToTwelfth(mirrorNinthToTenth(rows))

const getMirrorTargetIds = (source: ClassSubjectRow | undefined, allRows: ClassSubjectRow[]) => {
  if (!source) return [] as string[]
  const classKey = normalizeClassNameKey(source.className)
  if (classKey === '9th') {
    return allRows
      .filter((row) => normalizeClassNameKey(row.className) === '10th')
      .map((row) => rowId(row.className, row.section))
  }
  if (classKey === '11th') {
    const sectionKey = normalizeSectionKey(source.section)
    return allRows
      .filter(
        (row) =>
          normalizeClassNameKey(row.className) === '12th' &&
          normalizeSectionKey(row.section) === sectionKey
      )
      .map((row) => rowId(row.className, row.section))
  }
  return []
}

const ExmclCbseRegistration: React.FC = () => {
  const { subjects: timetableSubjects } = useTimetable()
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingClassMatrix, setLoadingClassMatrix] = useState(true)
  const [loadingStudentMatrix, setLoadingStudentMatrix] = useState(false)
  const [savingClassMatrix, setSavingClassMatrix] = useState(false)
  const [savingStudentMatrix, setSavingStudentMatrix] = useState(false)

  const [classSectionEntries, setClassSectionEntries] = useState<ClassSectionEntry[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [search, setSearch] = useState('')

  const [classRows, setClassRows] = useState<ClassSubjectRow[]>([])
  const [subjectCatalog, setSubjectCatalog] = useState<ClassSubjectSlot[]>([])

  const [students, setStudents] = useState<CbseRegistrationStudent[]>([])
  const [studentSubjects, setStudentSubjects] = useState<CbseRegistrationSubject[]>([])
  const [studentMatrix, setStudentMatrix] = useState<CbseRegistrationMatrix>({})
  const [additionalByStudent, setAdditionalByStudent] = useState<Record<string, string>>({})
  const columnClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const columnClickKeyRef = useRef<string>('')

  useEffect(() => {
    return () => {
      if (columnClickTimerRef.current) clearTimeout(columnClickTimerRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingStats(true)
      setLoadingClassMatrix(true)
      try {
        const [statsRes, classPayload] = await Promise.all([
          api.get('/students/stats', { params: { lite: true } }),
          cbseRegistrationService.getClassSubjectMatrix(),
        ])
        if (cancelled) return
        const byClassSection = Array.isArray(statsRes?.data?.data?.byClassSection)
          ? statsRes.data.data.byClassSection
          : []
        setClassSectionEntries(byClassSection)
        const rows = applyDefaultSubjectMirrors(
          classPayload.rows.map((row) => ({
            ...row,
            subjects: ensureMinSlots(row.subjects || []),
          }))
        )
        setClassRows(rows)
        setSubjectCatalog(classPayload.catalog)
      } catch (error: any) {
        if (cancelled) return
        toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load data.'))
      } finally {
        if (!cancelled) {
          setLoadingStats(false)
          setLoadingClassMatrix(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const catalogOptions = useMemo((): DropdownOption[] => {
    const byKey = new Map<string, ClassSubjectSlot>()
    subjectCatalog.forEach((row) => {
      const key = subjectKey(row.key || row.name)
      if (!key) return
      byKey.set(key, { key, name: row.name || key, code: row.code || '' })
    })
    ;(timetableSubjects || []).forEach((row) => {
      const name = String(row.name || '').trim()
      const key = subjectKey(name)
      if (!key || byKey.has(key)) return
      byKey.set(key, { key, name, code: '' })
    })
    return Array.from(byKey.values())
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((row) => ({
        value: row.key,
        label: formatSubjectLabel(row),
      }))
  }, [subjectCatalog, timetableSubjects])

  const catalogByKey = useMemo(() => {
    const map = new Map<string, ClassSubjectSlot>()
    subjectCatalog.forEach((row) => {
      const key = subjectKey(row.key || row.name)
      if (!key) return
      map.set(key, { key, name: row.name || key, code: row.code || '' })
    })
    ;(timetableSubjects || []).forEach((row) => {
      const name = String(row.name || '').trim()
      const key = subjectKey(name)
      if (!key || map.has(key)) return
      map.set(key, { key, name, code: '' })
    })
    return map
  }, [subjectCatalog, timetableSubjects])

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
      .filter((name) => Boolean(name) && isCbseRegistrationClass(name))
    return Array.from(new Set(fromStudents)).sort(sortClassNames)
  }, [populatedClassSections])

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return []
    const classKey = selectedClass.trim().toLowerCase()
    return Array.from(
      new Set(
        populatedClassSections
          .filter((entry) => String(entry?._id?.class || '').trim().toLowerCase() === classKey)
          .map((entry) => String(entry?._id?.section || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => sortSectionNames(a, b, selectedClass))
  }, [populatedClassSections, selectedClass])

  useEffect(() => {
    setSelectedSection('')
  }, [selectedClass])

  useEffect(() => {
    if (selectedClass && classOptions.length > 0 && !classOptions.includes(selectedClass)) {
      setSelectedClass('')
      setSelectedSection('')
    }
  }, [selectedClass, classOptions])

  useEffect(() => {
    if (selectedSection && sectionOptions.length > 0 && !sectionOptions.includes(selectedSection)) {
      setSelectedSection('')
    }
  }, [selectedSection, sectionOptions])

  const subjectsForSelectedClass = useMemo(() => {
    if (!selectedClass) return [] as CbseRegistrationSubject[]
    const classKey = selectedClass.trim().toLowerCase()
    const sectionKey = normalizeSectionKey(getCanonicalSectionName(selectedSection) || selectedSection)
    const matched = classRows.find((row) => {
      if (String(row.className || '').trim().toLowerCase() !== classKey) return false
      if (isSeniorClass(selectedClass)) {
        return normalizeSectionKey(row.section) === sectionKey
      }
      return true
    })
    if (!matched) return []
    return compactSubjects(matched.subjects).map((slot) => ({
      key: slot.key,
      name: slot.name,
      code: slot.code,
    }))
  }, [classRows, selectedClass, selectedSection])

  const loadStudentMatrix = useCallback(async () => {
    if (!selectedClass || !selectedSection) {
      setStudents([])
      setStudentSubjects([])
      setStudentMatrix({})
      setAdditionalByStudent({})
      return
    }
    setLoadingStudentMatrix(true)
    try {
      const payload = await cbseRegistrationService.getMatrix(selectedClass, selectedSection)
      setStudents(payload.students)
      setStudentMatrix(payload.matrix || {})
      setAdditionalByStudent(payload.additionalByStudent || {})
      setStudentSubjects(payload.subjects)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load student matrix.'))
      setStudents([])
      setStudentSubjects([])
      setStudentMatrix({})
      setAdditionalByStudent({})
    } finally {
      setLoadingStudentMatrix(false)
    }
  }, [selectedClass, selectedSection])

  useEffect(() => {
    void loadStudentMatrix()
  }, [loadStudentMatrix])

  useEffect(() => {
    if (!selectedClass || !selectedSection) return
    setStudentSubjects(subjectsForSelectedClass)
    const allowed = new Set(subjectsForSelectedClass.map((s) => s.key))
    setStudentMatrix((prev) => {
      const next: CbseRegistrationMatrix = {}
      Object.entries(prev).forEach(([studentId, keys]) => {
        next[studentId] = (keys || []).filter((key) => allowed.has(key))
      })
      return next
    })
    setAdditionalByStudent((prev) => {
      const next: Record<string, string> = {}
      Object.entries(prev).forEach(([studentId, key]) => {
        if (allowed.has(key)) next[studentId] = key
      })
      return next
    })
  }, [subjectsForSelectedClass, selectedClass, selectedSection])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((student) => {
      const roll = String(student.classRollNo ?? student.rollNumber ?? '').toLowerCase()
      return student.name.toLowerCase().includes(q) || roll.includes(q)
    })
  }, [search, students])

  const updateRowSubjects = (targetId: string, updater: (subjects: ClassSubjectSlot[]) => ClassSubjectSlot[]) => {
    setClassRows((prev) => {
      const source = prev.find((row) => rowId(row.className, row.section) === targetId)
      const mirrorIds = new Set(getMirrorTargetIds(source, prev))
      return prev.map((row) => {
        const id = rowId(row.className, row.section)
        if (id === targetId || mirrorIds.has(id)) {
          return { ...row, subjects: updater([...(row.subjects || [])]) }
        }
        return row
      })
    })
  }

  const setRowSubjectAt = (targetId: string, index: number, subjectKeyValue: string) => {
    const row = classRows.find((item) => rowId(item.className, item.section) === targetId)
    if (subjectKeyValue && row) {
      const duplicate = (row.subjects || []).some(
        (slot, i) => i !== index && slot.key && slot.key === subjectKeyValue
      )
      if (duplicate) {
        toast.error('This subject is already selected for this class/section.')
        return
      }
    }
    updateRowSubjects(targetId, (subjects) => {
      const next = ensureMinSlots(subjects, Math.max(SUBJECTS_PER_STACK, index + 1))
      if (!subjectKeyValue) {
        next[index] = emptySlot()
        return next
      }
      const picked = catalogByKey.get(subjectKeyValue)
      if (!picked) return next
      // Guard again inside updater (mirrors may copy into another row)
      const alreadyUsed = next.some((slot, i) => i !== index && slot.key === picked.key)
      if (alreadyUsed) return subjects
      next[index] = { key: picked.key, name: picked.name, code: picked.code || '' }
      return next
    })
  }

  const optionsForSlot = (rowSubjects: ClassSubjectSlot[], index: number): DropdownOption[] => {
    const used = new Set(
      (rowSubjects || [])
        .map((slot, i) => (i === index ? '' : slot.key))
        .filter(Boolean)
    )
    return catalogOptions.filter((option) => !used.has(String(option.value)))
  }

  const addSubjectToRow = (targetId: string) => {
    updateRowSubjects(targetId, (subjects) => [...ensureMinSlots(subjects), emptySlot()])
  }

  const removeSubjectFromRow = (targetId: string, index: number) => {
    updateRowSubjects(targetId, (subjects) => {
      const next = subjects.filter((_, i) => i !== index)
      return ensureMinSlots(next)
    })
  }

  const handleSaveClassMatrix = async () => {
    setSavingClassMatrix(true)
    try {
      const payloadRows = classRows.map((row) => ({
        className: row.className,
        section: row.section,
        subjects: compactSubjects(row.subjects),
      }))
      const saved = await cbseRegistrationService.saveClassSubjectMatrix({ rows: payloadRows })
      setClassRows(
        applyDefaultSubjectMirrors(
          saved.rows.map((row) => ({
            ...row,
            subjects: ensureMinSlots(row.subjects || []),
          }))
        )
      )
      setSubjectCatalog(saved.catalog)
      toast.success('Class subject matrix saved.')
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save class subject matrix.'))
    } finally {
      setSavingClassMatrix(false)
    }
  }

  const isStudentChecked = (studentId: string, key: string) =>
    Array.isArray(studentMatrix[studentId]) && studentMatrix[studentId].includes(key)

  const isAdditionalSubject = (studentId: string, key: string) =>
    additionalByStudent[studentId] === key

  const toggleStudentCell = (studentId: string, key: string) => {
    setStudentMatrix((prev) => {
      const current = new Set(prev[studentId] || [])
      if (current.has(key)) {
        current.delete(key)
        setAdditionalByStudent((addPrev) => {
          if (addPrev[studentId] !== key) return addPrev
          const next = { ...addPrev }
          delete next[studentId]
          return next
        })
      } else {
        current.add(key)
      }
      return { ...prev, [studentId]: Array.from(current) }
    })
  }

  const markAdditionalSubject = (studentId: string, key: string) => {
    if (!isStudentChecked(studentId, key)) {
      setStudentMatrix((prev) => {
        const current = new Set(prev[studentId] || [])
        current.add(key)
        return { ...prev, [studentId]: Array.from(current) }
      })
    }
    setAdditionalByStudent((prev) => {
      if (prev[studentId] === key) {
        const next = { ...prev }
        delete next[studentId]
        toast.success('Additional subject cleared.')
        return next
      }
      toast.success('Marked as additional subject (double-click again to clear).')
      return { ...prev, [studentId]: key }
    })
  }

  const toggleStudentSubjectColumn = (key: string, checked: boolean) => {
    setStudentMatrix((prev) => {
      const next = { ...prev }
      filteredStudents.forEach((student) => {
        const current = new Set(next[student._id] || [])
        if (checked) current.add(key)
        else current.delete(key)
        next[student._id] = Array.from(current)
      })
      return next
    })
    if (!checked) {
      setAdditionalByStudent((prev) => {
        const next = { ...prev }
        filteredStudents.forEach((student) => {
          if (next[student._id] === key) delete next[student._id]
        })
        return next
      })
    }
  }

  const toggleStudentRow = (studentId: string, checked: boolean) => {
    setStudentMatrix((prev) => ({
      ...prev,
      [studentId]: checked ? studentSubjects.map((row) => row.key) : [],
    }))
    if (!checked) {
      setAdditionalByStudent((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
    }
  }

  const toggleAllStudentsAllSubjects = (checked: boolean) => {
    const allKeys = studentSubjects.map((row) => row.key)
    setStudentMatrix((prev) => {
      const next = { ...prev }
      filteredStudents.forEach((student) => {
        next[student._id] = checked ? [...allKeys] : []
      })
      return next
    })
    if (!checked) {
      setAdditionalByStudent((prev) => {
        const next = { ...prev }
        filteredStudents.forEach((student) => {
          delete next[student._id]
        })
        return next
      })
    }
  }

  const markAdditionalSubjectForAll = (key: string) => {
    const allAlreadyAdditional =
      filteredStudents.length > 0 &&
      filteredStudents.every((student) => additionalByStudent[student._id] === key)

    setStudentMatrix((prev) => {
      const next = { ...prev }
      filteredStudents.forEach((student) => {
        const current = new Set(next[student._id] || [])
        current.add(key)
        next[student._id] = Array.from(current)
      })
      return next
    })

    setAdditionalByStudent((prev) => {
      const next = { ...prev }
      if (allAlreadyAdditional) {
        filteredStudents.forEach((student) => {
          if (next[student._id] === key) delete next[student._id]
        })
        toast.success('Additional subject cleared for all students.')
        return next
      }
      filteredStudents.forEach((student) => {
        next[student._id] = key
      })
      toast.success('Marked as additional subject for all students.')
      return next
    })
  }

  const handleSubjectColumnHeaderClick = (key: string, currentlyAllSelected: boolean) => {
    if (columnClickTimerRef.current && columnClickKeyRef.current === key) {
      clearTimeout(columnClickTimerRef.current)
      columnClickTimerRef.current = null
      columnClickKeyRef.current = ''
      markAdditionalSubjectForAll(key)
      return
    }
    columnClickKeyRef.current = key
    if (columnClickTimerRef.current) clearTimeout(columnClickTimerRef.current)
    columnClickTimerRef.current = setTimeout(() => {
      columnClickTimerRef.current = null
      columnClickKeyRef.current = ''
      toggleStudentSubjectColumn(key, !currentlyAllSelected)
    }, 220)
  }

  const handleSaveStudentMatrix = async () => {
    if (!selectedClass || !selectedSection) {
      toast.error('Select class and section first.')
      return
    }
    setSavingStudentMatrix(true)
    try {
      const saved = await cbseRegistrationService.saveMatrix(
        selectedClass,
        selectedSection,
        studentMatrix,
        additionalByStudent
      )
      setStudentMatrix(saved.matrix)
      setAdditionalByStudent(saved.additionalByStudent)
      toast.success('Student subject matrix saved.')
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save student matrix.'))
    } finally {
      setSavingStudentMatrix(false)
    }
  }

  const filtersReady = Boolean(selectedClass && selectedSection)
  const selectedCount = useMemo(
    () => Object.values(studentMatrix).reduce((sum, keys) => sum + (Array.isArray(keys) ? keys.length : 0), 0),
    [studentMatrix]
  )

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Class subject matrix</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Subjects stack 3 per row for each class/section. Add subjects per class. Double-click in the student
                matrix to mark an additional subject.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveClassMatrix}
              disabled={savingClassMatrix || loadingClassMatrix}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingClassMatrix ? 'Saving…' : 'Save Class Matrix'}
            </button>
          </div>

          {loadingClassMatrix ? (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading class subject matrix…</div>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-auto p-3">
              {classRows.map((row) => {
                const id = rowId(row.className, row.section)
                const subjects = ensureMinSlots(row.subjects || [])
                return (
                  <div
                    key={id}
                    className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/40"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">{row.className}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-600 dark:text-gray-300">{row.section || '—'}</span>
                        <span className="text-xs text-gray-400">
                          ({compactSubjects(subjects).length} subjects)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addSubjectToRow(id)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add subject
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {subjects.map((slot, index) => (
                        <div key={`${id}-${index}`} className="flex items-center gap-1">
                          <div className="min-w-0 flex-1">
                            <Dropdown
                              options={optionsForSlot(subjects, index)}
                              value={slot.key || ''}
                              onChange={(value: DropdownValue) =>
                                setRowSubjectAt(id, index, String(value || ''))
                              }
                              searchable
                              clearable
                              portal
                              size="sm"
                              placeholder={`Subject ${index + 1}`}
                              emptyMessage="No subjects"
                              maxHeight={260}
                              className="w-full"
                              filterFn={(option, query) => {
                                const q = query.trim().toLowerCase()
                                if (!q) return true
                                return String(option.label).toLowerCase().includes(q)
                              }}
                            />
                          </div>
                          {subjects.length > SUBJECTS_PER_STACK && (
                            <button
                              type="button"
                              onClick={() => removeSubjectFromRow(id, index)}
                              className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700"
                              title="Remove subject"
                              aria-label="Remove subject"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Student matrix
              </span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={loadingStats}
                aria-label="Select class"
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              >
                <option value="">Class</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedClass}
                aria-label="Select section"
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              >
                <option value="">{selectedClass ? 'Section' : 'Select class first'}</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students"
                aria-label="Search students"
                disabled={!filtersReady}
                className="w-[180px] shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filtersReady
                  ? `${filteredStudents.length} students · ${studentSubjects.length} subjects · ${selectedCount} selected · header dbl-click = additional for all`
                  : 'Select class & section'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSaveStudentMatrix}
              disabled={savingStudentMatrix || loadingStudentMatrix || !filtersReady || studentSubjects.length === 0}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingStudentMatrix ? 'Saving…' : 'Save Student Matrix'}
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {loadingStudentMatrix ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading student matrix…</div>
            ) : !filtersReady ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Select a class and section to mark subjects per student.
              </div>
            ) : studentSubjects.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No subjects set for {selectedClass}
                {isSeniorClass(selectedClass) ? ` / ${selectedSection}` : ''} in the class matrix above.
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No students found for {selectedClass}-{selectedSection}.
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[44px]" />
                    <col className="w-[160px]" />
                    {studentSubjects.map((subject) => (
                      <col key={subject.key} />
                    ))}
                    <col className="w-[44px]" />
                  </colgroup>
                  <thead className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="sticky left-0 z-30 border-b border-r border-gray-200 bg-gray-50 px-1.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                        Roll
                      </th>
                      <th className="sticky left-[44px] z-30 border-b border-r border-gray-200 bg-gray-50 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                        Student
                      </th>
                      {studentSubjects.map((subject) => {
                        const allSelected =
                          filteredStudents.length > 0 &&
                          filteredStudents.every((student) => isStudentChecked(student._id, subject.key))
                        const someSelected =
                          !allSelected &&
                          filteredStudents.some((student) => isStudentChecked(student._id, subject.key))
                        const allAdditional =
                          filteredStudents.length > 0 &&
                          filteredStudents.every((student) => isAdditionalSubject(student._id, subject.key))
                        return (
                          <th
                            key={subject.key}
                            className={`border-b border-gray-200 px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-normal text-gray-500 dark:border-gray-700 dark:text-gray-400 ${
                              allAdditional ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''
                            }`}
                            title={`${formatSubjectLabel(subject)} — click checkbox: all students; double-click: additional for all`}
                            onDoubleClick={() => markAdditionalSubjectForAll(subject.key)}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="max-w-full truncate px-0.5 leading-tight">{subject.name}</span>
                              {subject.code ? (
                                <span className="text-[9px] font-normal normal-case text-gray-400">{subject.code}</span>
                              ) : null}
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = someSelected
                                }}
                                onChange={() => undefined}
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleSubjectColumnHeaderClick(subject.key, allSelected)
                                }}
                                onDoubleClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                aria-label={`Toggle ${subject.name} for all students. Double-click to mark as additional for all.`}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              {allAdditional ? (
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                                  Add
                                </span>
                              ) : null}
                            </div>
                          </th>
                        )
                      })}
                      {(() => {
                        const allKeys = studentSubjects.map((s) => s.key)
                        const allSelected =
                          filteredStudents.length > 0 &&
                          allKeys.length > 0 &&
                          filteredStudents.every((student) =>
                            allKeys.every((key) => isStudentChecked(student._id, key))
                          )
                        const someSelected =
                          !allSelected &&
                          filteredStudents.some((student) =>
                            allKeys.some((key) => isStudentChecked(student._id, key))
                          )
                        return (
                          <th className="border-b border-gray-200 px-1 py-1.5 text-center text-[10px] font-semibold uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                            <div className="flex flex-col items-center gap-0.5">
                              <span>All</span>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = someSelected
                                }}
                                onChange={(e) => toggleAllStudentsAllSubjects(e.target.checked)}
                                aria-label="Toggle all subjects for all students"
                                title="Mark all subjects for all students"
                                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </div>
                          </th>
                        )
                      })()}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const allSelected =
                        studentSubjects.length > 0 &&
                        studentSubjects.every((subject) => isStudentChecked(student._id, subject.key))
                      const someSelected =
                        !allSelected &&
                        studentSubjects.some((subject) => isStudentChecked(student._id, subject.key))
                      const roll = student.classRollNo ?? student.rollNumber ?? '—'
                      return (
                        <tr key={student._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40">
                          <td className="sticky left-0 z-10 border-b border-r border-gray-100 bg-white px-1.5 py-1 text-center text-xs tabular-nums text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {roll}
                          </td>
                          <td className="sticky left-[44px] z-10 truncate border-b border-r border-gray-100 bg-white px-2 py-1 text-xs font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                            <span title={student.name}>{student.name}</span>
                          </td>
                          {studentSubjects.map((subject) => {
                            const checked = isStudentChecked(student._id, subject.key)
                            const isAdditional = isAdditionalSubject(student._id, subject.key)
                            return (
                              <td
                                key={subject.key}
                                className={`border-b border-gray-100 px-1 py-1 text-center dark:border-gray-700 ${
                                  isAdditional ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''
                                }`}
                                onDoubleClick={() => markAdditionalSubject(student._id, subject.key)}
                                title={
                                  isAdditional
                                    ? 'Additional subject — double-click to clear'
                                    : 'Double-click to mark as additional subject'
                                }
                              >
                                <div className="flex flex-col items-center gap-0.5">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleStudentCell(student._id, subject.key)}
                                    aria-label={`${student.name} — ${subject.name}`}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {isAdditional ? (
                                    <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                                      Add
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                            )
                          })}
                          <td className="border-b border-gray-100 px-1 py-1 text-center dark:border-gray-700">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someSelected
                              }}
                              onChange={(e) => toggleStudentRow(student._id, e.target.checked)}
                              aria-label={`Toggle all subjects for ${student.name}`}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ExmclCbseRegistration
