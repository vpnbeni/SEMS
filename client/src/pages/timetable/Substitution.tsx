import React, { useEffect, useMemo, useState } from 'react'
import { useTimetable, type TimetableTeacher, type TimetableSubject } from '@/contexts/TimetableContext'

const Substitution: React.FC = () => {
  const normalize = (value: string) => value.trim().toLowerCase()

  const uniqueByNormalized = (values: string[]) => {
    const seen = new Set<string>()
    const output: string[] = []

    values.forEach((value) => {
      const trimmed = value.trim()
      if (!trimmed) return
      const key = normalize(trimmed)
      if (seen.has(key)) return
      seen.add(key)
      output.push(trimmed)
    })

    return output
  }

  const PERIODS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] as const
  const { teachers, subjects } = useTimetable()

  // Mirror `Departments.tsx`: teacher subject "matrix teachers" (id/name/subjects),
  // but here we only use the teacher names for the substitution table rows.
  const subjectNames = useMemo(() => {
    const names = (subjects as TimetableSubject[]).map((s) => s.name)
    return uniqueByNormalized(names).sort((a, b) => a.localeCompare(b))
  }, [subjects])

  const subjectAliasMap = useMemo(() => {
    const map = new Map<string, string>()
    subjectNames.forEach((name) => map.set(normalize(name), name))
    return map
  }, [subjectNames])

  const matrixTeachers = useMemo<Array<TimetableTeacher>>(() => {
    return teachers.map((teacher) => {
      const resolvedSubjects = uniqueByNormalized(
        (teacher.subjects || [])
          .map((subject) => subjectAliasMap.get(normalize(subject)) || '')
          .filter(Boolean)
      )

      return {
        id: teacher.id,
        name: teacher.name,
        shortName: teacher.shortName,
        subjects: resolvedSubjects,
      }
    })
  }, [teachers, subjectAliasMap])

  const [periodByTeacherId, setPeriodByTeacherId] = useState<Record<string, boolean[]>>({})

  useEffect(() => {
    setPeriodByTeacherId((prev) => {
      const next: Record<string, boolean[]> = { ...prev }

      // Ensure every current teacher has an array (preserve any existing selections).
      matrixTeachers.forEach((t) => {
        if (!next[t.id]) {
          next[t.id] = Array.from({ length: PERIODS.length }).map(() => false)
        }
      })

      // Remove stale teachers to keep state clean.
      const currentIds = new Set(matrixTeachers.map((t) => t.id))
      Object.keys(next).forEach((teacherId) => {
        if (!currentIds.has(teacherId)) delete next[teacherId]
      })

      return next
    })
  }, [matrixTeachers])

  const setPeriodEnabled = (teacherId: string, periodIdx: number, enabled: boolean) => {
    setPeriodByTeacherId((prev) => {
      const current = prev[teacherId] ?? Array.from({ length: PERIODS.length }).map(() => false)
      const next = current.map((v, idx) => (idx === periodIdx ? enabled : v))
      return { ...prev, [teacherId]: next }
    })
  }

  return (
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-sky-50/40">
          <h2 className="text-base font-semibold text-slate-900">Substitution Schedule</h2>
          <p className="mt-1 text-xs text-slate-600">
            Enter a substitute teacher name per row and mark the periods (I to VIII) they will handle.
          </p>
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-secondary-50 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold border-b border-secondary-200 sticky top-0 left-0 bg-secondary-50 z-30">
                  Sr No
                </th>
                <th className="px-3 py-2 text-left font-semibold border-b border-secondary-200 sticky top-0 left-[92px] bg-secondary-50 z-20">
                  Teacher Name
                </th>
                {PERIODS.map((p) => (
                  <th
                    key={p}
                    className="px-3 py-2 text-center font-semibold border-b border-secondary-200"
                  >
                    {p}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {matrixTeachers.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-600" colSpan={PERIODS.length + 2}>
                    Add timetable teachers to see substitution rows.
                  </td>
                </tr>
              ) : (
                matrixTeachers.map((teacher, rowIdx) => (
                  <tr
                    key={teacher.id}
                    className="odd:bg-white even:bg-secondary-50/30 dark:odd:bg-secondary-900 dark:even:bg-secondary-800/60"
                  >
                    <td className="px-3 py-3 border-b border-secondary-100 sticky left-0 bg-white dark:bg-secondary-900 z-10">
                      {rowIdx + 1}
                    </td>

                    <td className="px-3 py-3 border-b border-secondary-100 sticky left-[92px] bg-white dark:bg-secondary-900 z-10">
                      <div className="font-medium text-slate-900">{teacher.name}</div>
                      {teacher.shortName ? (
                        <div className="text-xs text-slate-500">{teacher.shortName}</div>
                      ) : null}
                    </td>

                    {PERIODS.map((_, periodIdx) => {
                      const enabled = periodByTeacherId[teacher.id]?.[periodIdx] ?? false
                      return (
                        <td
                          key={periodIdx}
                          className="px-3 py-3 border-b border-secondary-100 text-center"
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setPeriodEnabled(teacher.id, periodIdx, e.target.checked)}
                            title={`Teacher ${rowIdx + 1} Period ${PERIODS[periodIdx]}`}
                            aria-label={`Teacher ${rowIdx + 1} Period ${PERIODS[periodIdx]}`}
                            className="h-4 w-4 accent-emerald-600"
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
  )
}

export default Substitution
