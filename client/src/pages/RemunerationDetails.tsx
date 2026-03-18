import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import Loader from '../components/common/Loader'
import dutiesService from '../services/dutiesService'
import teacherService, { type Teacher } from '../services/teacherService'
import { useRemunerationRates } from '../hooks/useRemunerationRates'

const DUTY_TABS = [
  { key: 'CS', dutyType: 'Centre Superintendent' },
  { key: 'DCS', dutyType: 'Deputy Centre Superintendent' },
  { key: 'OBR', dutyType: 'Observer' },
  { key: 'ASI', dutyType: 'Invigilator' },
  { key: 'ASC', dutyType: 'ASI (CCTV)' },
  { key: 'ASFM', dutyType: 'ASI (Frisking Male)' },
  { key: 'ASFF', dutyType: 'ASI (Frisking Female)' },
  { key: 'CLR', dutyType: 'Clerk' },
  { key: 'CL4', dutyType: 'Class IV' },
] as const

const formatMoney = (value: number) => (value ? value.toLocaleString('en-IN') : '—')

const toDateKey = (value: string) => String(value || '').trim().slice(0, 10)

const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = String(dateKey || '').split('-')
  if (!year || !month || !day) return dateKey
  return `${day}.${month}.${year.slice(-2)}`
}

const getDayLabel = (dateKey: string) => {
  const d = new Date(dateKey)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { weekday: 'short' })
}

const normalizeDutyType = (value: string | undefined) => String(value || '').trim()
const hasDutyType = (teacher: Teacher | null | undefined, dutyType: string) => {
  if (!teacher) return false
  const target = normalizeDutyType(dutyType)
  if (!target) return false
  if (normalizeDutyType(teacher.dutyType) === target) return true
  if (!Array.isArray(teacher.dutyHistory)) return false
  return teacher.dutyHistory.some((d) => normalizeDutyType(d) === target)
}

const sumRates = (
  byDutyType: Record<string, { remuneration: number; conveyance: number; refreshment: number }>,
  keys: string[]
) => {
  return keys.reduce(
    (acc, key) => {
      const rate = byDutyType[key] || { remuneration: 0, conveyance: 0, refreshment: 0 }
      acc.remuneration += Number(rate.remuneration || 0)
      acc.conveyance += Number(rate.conveyance || 0)
      acc.refreshment += Number(rate.refreshment || 0)
      return acc
    },
    { remuneration: 0, conveyance: 0, refreshment: 0 }
  )
}

type DayRow = {
  dateKey: string
  dateLabel: string
  dayLabel: string
  remuneration: number
  conveyance: number
  refreshment: number
}

const RemunerationDetails: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const functionaryId = String(id || '').trim()
  const { data: ratesData } = useRemunerationRates()
  const ratesByDutyType = ratesData?.byDutyType ?? {}

  const teacherQuery = useQuery({
    queryKey: ['teacher', functionaryId] as const,
    queryFn: async (): Promise<Teacher | null> => {
      if (!functionaryId) return null
      const res = await teacherService.getById(functionaryId)
      return (res?.data?.data ?? res?.data ?? null) as Teacher | null
    },
    enabled: !!functionaryId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const selectionQueries = useQueries({
    queries: DUTY_TABS.map((tab) => ({
      queryKey: ['duties', 'selections', tab.dutyType] as const,
      queryFn: () => dutiesService.getDutySelections(tab.dutyType),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      enabled: !!functionaryId,
    })),
  })

  const isLoading = teacherQuery.isLoading || selectionQueries.some((q) => q.isLoading)
  const error = (teacherQuery.error as Error | null) || (selectionQueries.find((q) => q.error)?.error as Error | undefined)

  const sections = useMemo(() => {
    const result: Array<{ dutyType: string; days: DayRow[] }> = []
    if (!functionaryId) return result

    DUTY_TABS.forEach((tab, idx) => {
      // If the functionary was never assigned this duty type historically, don't show it
      // even if stray selections exist.
      if (!hasDutyType(teacherQuery.data, tab.dutyType)) return
      const selectionMap = selectionQueries[idx]?.data ?? {}
      const dateSet = new Set<string>()
      for (const [slotKey, checked] of Object.entries(selectionMap)) {
        if (!checked) continue
        const [funcIdRaw, dateRaw] = String(slotKey || '').split('::')
        const funcId = String(funcIdRaw || '').trim()
        if (!funcId || funcId !== functionaryId) continue
        const dateKey = toDateKey(dateRaw || '')
        if (dateKey) dateSet.add(dateKey)
      }

      const rate =
        tab.dutyType === 'Centre Superintendent'
          ? (() => {
            const sums = sumRates(ratesByDutyType, ['CS', 'QP Collection', 'AB Deposit'])
            const csBase = ratesByDutyType['Centre Superintendent'] || { remuneration: 0, conveyance: 0, refreshment: 0 }
            return {
              remuneration: sums.remuneration,
              conveyance: sums.conveyance,
              refreshment: Number(csBase.refreshment || 0),
            }
          })()
          : (ratesByDutyType[tab.dutyType] || { remuneration: 0, conveyance: 0, refreshment: 0 })
      const days: DayRow[] = Array.from(dateSet)
        .sort((a, b) => a.localeCompare(b))
        .map((dateKey) => ({
          dateKey,
          dateLabel: formatDateLabel(dateKey),
          dayLabel: getDayLabel(dateKey),
          remuneration: Number(rate.remuneration || 0),
          conveyance: Number(rate.conveyance || 0),
          refreshment: Number(rate.refreshment || 0),
        }))

      if (days.length > 0) result.push({ dutyType: tab.dutyType, days })
    })

    return result
  }, [functionaryId, selectionQueries, ratesByDutyType, teacherQuery.data])

  const overallTotals = useMemo(() => {
    let remuneration = 0
    let conveyance = 0
    let refreshment = 0

    for (const section of sections) {
      for (const day of section.days) {
        remuneration += day.remuneration
        conveyance += day.conveyance
        refreshment += day.refreshment
      }
    }

    return {
      remuneration,
      conveyance,
      refreshment,
      total: remuneration + conveyance + refreshment,
    }
  }, [sections])

  const teacher = teacherQuery.data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/remuneration')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden px-6 py-10 flex items-center justify-center">
          <Loader />
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden px-6 py-10 text-center text-sm text-red-600 dark:text-red-400">
          Failed to load remuneration details.
        </div>
      ) : !teacher ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Functionary not found.
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-200/70 dark:ring-gray-700/60 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {teacher.name || '—'}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Oasis ID:{' '}
                    <span className="font-mono text-gray-900 dark:text-white">
                      {String(teacher.oasisId || '').trim() || '—'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Remuneration', value: overallTotals.remuneration },
                    { label: 'Conveyance', value: overallTotals.conveyance },
                    { label: 'Refreshment', value: overallTotals.refreshment },
                    { label: 'Grand Total', value: overallTotals.total, emphasis: true },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-xl border border-gray-200/70 dark:border-gray-700/60 px-3 py-2 ${
                        item.emphasis ? 'bg-indigo-50/70 dark:bg-indigo-900/20' : 'bg-white/70 dark:bg-gray-800/40'
                      }`}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {item.label}
                      </div>
                      <div className={`mt-0.5 text-sm font-semibold ${item.emphasis ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
                        {formatMoney(item.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {sections.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No saved duties found for this functionary.
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.dutyType} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-200/70 dark:ring-gray-700/60 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200/70 dark:border-gray-700/60 bg-gray-50/70 dark:bg-gray-700/30 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {section.dutyType}
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-200 px-2.5 py-1 text-xs font-semibold">
                      {section.days.length} day{section.days.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50/80 dark:bg-gray-700/70 sticky top-0 backdrop-blur">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Day
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Remuneration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Conveyance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Refreshment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {section.days.map((row, idx) => (
                          <tr
                            key={row.dateKey}
                            className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/60 dark:bg-gray-700/30'} hover:bg-indigo-50/60 dark:hover:bg-indigo-900/15`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {row.dateLabel}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                              {row.dayLabel}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {formatMoney(row.remuneration)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {formatMoney(row.conveyance)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {formatMoney(row.refreshment)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {formatMoney(row.remuneration + row.conveyance + row.refreshment)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default RemunerationDetails

