import React, { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BarChart3, GraduationCap, LayoutGrid, Users } from 'lucide-react'
import type { AppDispatch, RootState } from '../redux/store'
import { fetchStudentStats } from '../redux/slices/studentSlice'

const sectionToneClasses = [
  'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
]

const StudentInfo: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { stats, loading } = useSelector((state: RootState) => state.students)

  useEffect(() => {
    dispatch(fetchStudentStats())
  }, [dispatch])

  const classSectionGroups = useMemo(() => {
    const grouped = new Map<string, Array<{ section: string; count: number; active: number }>>()

    ;(stats?.byClassSection || []).forEach((entry) => {
      const current = grouped.get(entry._id.class) || []
      current.push({
        section: entry._id.section,
        count: entry.count,
        active: entry.active,
      })
      grouped.set(entry._id.class, current)
    })

    return Array.from(grouped.entries()).map(([className, sections]) => ({
      className,
      sections: sections.sort((a, b) => a.section.localeCompare(b.section)),
      total: sections.reduce((sum, section) => sum + section.count, 0),
    }))
  }, [stats])

  const genderCounts = useMemo(() => {
    const index = new Map((stats?.byGender || []).map((entry) => [entry._id, entry.count]))
    return {
      boys: index.get('Boy') || 0,
      girls: index.get('Girl') || 0,
      other: index.get('Other') || 0,
      unspecified: index.get('Unspecified') || 0,
    }
  }, [stats])

  const ageMatrix = useMemo(() => {
    const classes = Array.from(new Set((stats?.ageMatrix || []).map((entry) => entry._id.class)))
    const ages = Array.from(new Set((stats?.ageMatrix || []).map((entry) => entry._id.age))).sort((a, b) => a - b)
    const lookup = new Map((stats?.ageMatrix || []).map((entry) => [`${entry._id.class}-${entry._id.age}`, entry.count]))

    return {
      classes,
      ages,
      lookup,
    }
  }, [stats])

  if (loading && !stats) {
    return (
      <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
        Loading student dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
          <p className="mt-4 text-sm text-slate-500">All student records available in the current session.</p>
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
          <p className="mt-4 text-sm text-slate-500">Students currently marked active for academic operations.</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Classes Tracked</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stats?.byClass?.length ?? 0}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Distinct classes currently represented in the student database.</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Sections Tracked</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stats?.byClassSection?.length ?? 0}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Class-section combinations that already contain student records.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Students by Class and Section</h2>
            <p className="mt-1 text-sm text-slate-500">
              Section-wise student counts so you can spot dense or thin cohorts at a glance.
            </p>
          </div>

          <div className="space-y-5 px-6 py-6">
            {classSectionGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                No student distribution is available yet.
              </div>
            ) : (
              classSectionGroups.map((group, groupIndex) => (
                <div key={group.className} className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">Class {group.className}</p>
                      <p className="text-sm text-slate-500">{group.total} students across {group.sections.length} sections</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sectionToneClasses[groupIndex % sectionToneClasses.length]}`}>
                      {group.sections.length} section{group.sections.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {group.sections.map((section, sectionIndex) => (
                      <div
                        key={`${group.className}-${section.section}`}
                        className={`rounded-2xl bg-white px-4 py-4 shadow-sm ${sectionToneClasses[(groupIndex + sectionIndex) % sectionToneClasses.length]}`}
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-current/70">
                          Section {section.section}
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900">{section.count}</div>
                        <div className="mt-1 text-xs text-slate-500">{section.active} active</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">Gender Split</h2>
              <p className="mt-1 text-sm text-slate-500">
                Counts of boys, girls, and records still awaiting a gender value.
              </p>
            </div>

            <div className="grid gap-4 px-6 py-6">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
                <p className="text-sm font-medium text-blue-700">Boys</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{genderCounts.boys}</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
                <p className="text-sm font-medium text-rose-700">Girls</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{genderCounts.girls}</p>
              </div>
              {(genderCounts.other > 0 || genderCounts.unspecified > 0) ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-4">
                    <p className="text-sm font-medium text-violet-700">Other</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{genderCounts.other}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm font-medium text-slate-600">Unspecified</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{genderCounts.unspecified}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">Class Snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">
                Overall headcount by class for the current academic session.
              </p>
            </div>

            <div className="space-y-3 px-6 py-6">
              {(stats?.byClass || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Class-wise student counts will appear here once records are added.
                </div>
              ) : (
                (stats?.byClass || []).map((entry, index) => (
                  <div key={entry._id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Class {entry._id}</p>
                      <p className="text-xs text-slate-500">{entry.active} active</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${sectionToneClasses[index % sectionToneClasses.length]}`}>
                      {entry.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Student Age Matrix</h2>
          <p className="mt-1 text-sm text-slate-500">
            Age distribution across classes to highlight uneven age spreads inside the same cohort.
          </p>
        </div>

        {(ageMatrix.classes.length === 0 || ageMatrix.ages.length === 0) ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Age data will populate here once students with date of birth are available.
          </div>
        ) : (
          <div className="overflow-x-auto px-6 py-6">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th className="rounded-l-2xl px-4 py-3">Age</th>
                  {ageMatrix.classes.map((className) => (
                    <th key={className} className="px-4 py-3">
                      Class {className}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
                {ageMatrix.ages.map((age) => (
                  <tr key={age}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{age}</td>
                    {ageMatrix.classes.map((className) => {
                      const count = ageMatrix.lookup.get(`${className}-${age}`) || 0
                      return (
                        <td key={`${className}-${age}`} className="px-4 py-3">
                          <span
                            className={`inline-flex min-w-[2.75rem] justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                              count > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {count}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default StudentInfo
