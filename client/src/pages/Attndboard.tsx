import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarDays, Clock3, UserRound, Users } from 'lucide-react'
import { MonthSwitcher } from '@/components/attnd/MonthSwitcher'
import attndService, { type AttndDashboardData } from '@/services/attndService'

const currentMonthKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const currentDateKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const formatDateLabel = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateKey
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const emptyStats = {
  strength: 0,
  todayPresent: 0,
  todayAbsent: 0,
  todayHalfDay: 0,
  monthAbsent: 0,
  monthHalfDay: 0,
  attendancePercent: 0,
}

const heatClass = (count: number, max: number) => {
  if (count <= 0) return 'bg-emerald-50 text-emerald-800'
  const ratio = count / Math.max(max, 1)
  if (ratio >= 0.7) return 'bg-rose-500 text-white'
  if (ratio >= 0.4) return 'bg-rose-200 text-rose-900'
  return 'bg-rose-50 text-rose-800'
}

const Attndboard: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AttndDashboardData | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      try {
        const payload = await attndService.getDashboard(selectedMonth, currentDateKey())
        setData(payload)
      } catch (error: any) {
        toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load Attndboard.'))
      } finally {
        setLoading(false)
      }
    }
    void loadDashboard()
  }, [selectedMonth])

  const sections = data?.sections || []
  const classMatrix = data?.classMatrix || []
  const staffMatrix = data?.staffMatrix || []
  const dailyTrend = data?.dailyTrend || []
  const staff = data?.staff || emptyStats
  const students = data?.students || emptyStats

  const maxClassAbsent = useMemo(
    () => Math.max(0, ...classMatrix.flatMap((row) => row.sections.map((cell) => cell.monthAbsent))),
    [classMatrix]
  )
  const maxStaffAbsent = useMemo(
    () => Math.max(0, ...staffMatrix.map((row) => row.monthAbsent)),
    [staffMatrix]
  )
  const maxTrend = useMemo(
    () => Math.max(1, ...dailyTrend.map((item) => item.studentAbsent + item.staffAbsent)),
    [dailyTrend]
  )

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Attndboard</h2>
            <p className="mt-1 text-sm text-slate-500">
              Attendance snapshot for {formatDateLabel(data?.date || currentDateKey())} · {data?.workingDays || 0} working days this month
            </p>
          </div>
          <MonthSwitcher value={selectedMonth} onChange={setSelectedMonth} />
        </div>

        {loading && !data ? (
          <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
            Loading Attndboard...
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<Users className="h-5 w-5" />} label="Students present" value={students.todayPresent} hint={`${students.todayAbsent} absent · ${students.todayHalfDay} half day`} tone="bg-emerald-50 text-emerald-600" />
              <StatCard icon={<Users className="h-5 w-5" />} label="Student absentees" value={students.todayAbsent} hint={`${students.monthAbsent} absences this month · ${students.attendancePercent}% attendance`} tone="bg-rose-50 text-rose-600" />
              <StatCard icon={<UserRound className="h-5 w-5" />} label="Staff present" value={staff.todayPresent} hint={`${staff.todayAbsent} absent · ${staff.todayHalfDay} half day`} tone="bg-indigo-50 text-indigo-600" />
              <StatCard icon={<UserRound className="h-5 w-5" />} label="Staff absentees" value={staff.todayAbsent} hint={`${staff.monthAbsent} absences this month · ${staff.attendancePercent}% attendance`} tone="bg-amber-50 text-amber-600" />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<Clock3 className="h-5 w-5" />} label="Student half days" value={students.monthHalfDay} hint={`${students.todayHalfDay} marked today`} tone="bg-orange-50 text-orange-600" />
              <StatCard icon={<Clock3 className="h-5 w-5" />} label="Staff half days" value={staff.monthHalfDay} hint={`${staff.todayHalfDay} marked today`} tone="bg-sky-50 text-sky-600" />
              <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Student strength" value={students.strength} hint="Active students counted in this session" tone="bg-violet-50 text-violet-600" />
              <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Staff strength" value={staff.strength} hint="Staff records counted in this session" tone="bg-slate-100 text-slate-700" />
            </section>

            <MatrixCard title="Class absence matrix" description="Month absences by class and section. Darker cells mean more absences.">
              {classMatrix.length === 0 ? (
                <p className="text-sm text-slate-500">No class attendance data for this month.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Class</th>
                        {sections.map((section) => (
                          <th key={section} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {section}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classMatrix.map((row) => (
                        <tr key={row.className}>
                          <td className="sticky left-0 bg-white px-3 py-2 font-semibold text-slate-800">{row.className}</td>
                          {sections.map((section) => {
                            const cell = row.sections.find((item) => item.section === section)
                            if (!cell) {
                              return (
                                <td key={`${row.className}-${section}`} className="px-2 py-2 text-center text-slate-300">
                                  -
                                </td>
                              )
                            }
                            return (
                              <td key={`${row.className}-${section}`} className="px-1 py-1 text-center">
                                <div
                                  className={`rounded-xl px-2 py-2 ${heatClass(cell.monthAbsent, maxClassAbsent)}`}
                                  title={`${cell.todayAbsent} absent today · ${cell.todayHalfDay} half day`}
                                >
                                  <div className="text-base font-bold">{cell.monthAbsent}</div>
                                  <div className="text-[10px] opacity-80">today {cell.todayAbsent}</div>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </MatrixCard>

            <div className="grid gap-6 xl:grid-cols-2">
              <MatrixCard title="Staff absence matrix" description="Absences grouped by staff type for this month.">
                {staffMatrix.length === 0 ? (
                  <p className="text-sm text-slate-500">No staff attendance data for this month.</p>
                ) : (
                  <div className="space-y-3">
                    {staffMatrix.map((row) => (
                      <div key={row.group} className="flex items-center gap-3">
                        <div className="w-32 shrink-0 text-sm font-medium text-slate-700">{row.group}</div>
                        <div className="flex-1 rounded-full bg-slate-100">
                          <div
                            className={`flex h-8 items-center rounded-full px-3 text-xs font-semibold ${heatClass(row.monthAbsent, maxStaffAbsent)}`}
                            style={{ width: `${Math.max(12, (row.monthAbsent / Math.max(maxStaffAbsent, 1)) * 100)}%` }}
                          >
                            {row.monthAbsent}
                          </div>
                        </div>
                        <div className="w-28 shrink-0 text-right text-xs text-slate-500">
                          today {row.todayAbsent} · HD {row.monthHalfDay}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </MatrixCard>

              <MatrixCard title="Daily absenteeism" description="Student and staff absences for each day of the selected month.">
                <div className="flex h-40 items-end gap-1 overflow-x-auto pb-2">
                  {dailyTrend.map((item) => {
                    const total = item.studentAbsent + item.staffAbsent
                    const height = item.isSunday ? 8 : Math.max(8, Math.round((total / maxTrend) * 120))
                    return (
                      <div
                        key={item.date}
                        className="flex min-w-[18px] flex-1 flex-col items-center gap-1"
                        title={`${item.date}: ${item.studentAbsent} students, ${item.staffAbsent} staff`}
                      >
                        <div className={`w-full rounded-t-md ${item.isSunday ? 'bg-slate-200' : 'bg-indigo-500'}`} style={{ height }} />
                        <span className="text-[9px] text-slate-400">{item.date.slice(-2)}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-500">Grey bars are Sundays. Hover a bar to see student and staff absences.</p>
              </MatrixCard>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const StatCard = ({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  hint: string
  tone: string
}) => (
  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      </div>
    </div>
    <p className="mt-4 text-sm text-slate-500">{hint}</p>
  </div>
)

const MatrixCard = ({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) => (
  <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 px-6 py-5">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
    <div className="px-6 py-6">{children}</div>
  </div>
)

export default Attndboard
