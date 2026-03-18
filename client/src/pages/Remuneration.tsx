import React, { useMemo, useCallback } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Loader from '../components/common/Loader'
import dutiesService from '../services/dutiesService'
import { useCentreDetails } from '../hooks/useCentreDetails'
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

type RemunerationRow = {
  functionaryId: string
  functionaryName: string
  oasisId: string
  functionaryType: string
  schoolCode: string
  schoolName: string
  dutyCount: number
  remuneration: number
  conveyance: number
  refreshment: number
}

type RemunerationGroup = {
  key: string
  title: string
  dutyTypes: string[]
}

const normalizeValue = (value: string | undefined) => String(value || '').trim().toLowerCase()

const REMUNERATION_GROUPS: RemunerationGroup[] = [
  { key: 'cs', title: 'Centre Superintendent', dutyTypes: ['Centre Superintendent'] },
  { key: 'dcs', title: 'Deputy Centre Superintendent', dutyTypes: ['Deputy Centre Superintendent'] },
  { key: 'inv', title: 'Invigilators', dutyTypes: ['Invigilator'] },
  { key: 'asi_cctv', title: 'ASI CCTV', dutyTypes: ['ASI (CCTV)'] },
  { key: 'asi_frisk', title: 'ASI Frisking (Male + Female)', dutyTypes: ['ASI (Frisking Male)', 'ASI (Frisking Female)'] },
  { key: 'clerk', title: 'Clerk', dutyTypes: ['Clerk'] },
  { key: 'class_iv', title: 'Class IV', dutyTypes: ['Class IV'] },
]

const DUTIES_SUMMARY_ITEMS = [
  { dutyType: 'Centre Superintendent', groupKey: 'cs' },
  { dutyType: 'Deputy Centre Superintendent', groupKey: 'dcs' },
  { dutyType: 'Invigilator', groupKey: 'inv' },
  { dutyType: 'ASI (CCTV)', groupKey: 'asi_cctv' },
  { dutyType: 'ASI (Frisking Male)', groupKey: 'asi_frisk' },
  { dutyType: 'ASI (Frisking Female)', groupKey: 'asi_frisk' },
  { dutyType: 'Clerk', groupKey: 'clerk' },
  { dutyType: 'Class IV', groupKey: 'class_iv' },
] as const

const formatMoney = (value: number) => (value ? value.toLocaleString('en-IN') : '—')
const normalizeDutyType = (value: string | undefined) => String(value || '').trim()
const hasDutyType = (teacher: Teacher | undefined, dutyType: string) => {
  if (!teacher) return false
  const target = normalizeDutyType(dutyType)
  if (!target) return false
  if (normalizeDutyType(teacher.dutyType) === target) return true
  if (!Array.isArray(teacher.dutyHistory)) return false
  return teacher.dutyHistory.some((d) => normalizeDutyType(d) === target)
}

const getDutyLabelsForGroup = (groupKey: string): string[] => {
  switch (groupKey) {
    case 'cs':
      return ['CS', 'QP Collection', 'AB Deposit']
    case 'dcs':
      return ['DCS']
    case 'inv':
      return ['Invigilator']
    case 'asi_cctv':
      return ['ASI (CCTV)']
    case 'asi_frisk':
      return ['ASI (Frisking)']
    case 'clerk':
      return ['Clerk']
    case 'class_iv':
      return ['Class IV']
    default:
      return ['—']
  }
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

const Remuneration: React.FC = () => {
  const navigate = useNavigate()
  const { data: centreDetails } = useCentreDetails()
  const { data: ratesData } = useRemunerationRates()
  const ratesByDutyType = ratesData?.byDutyType ?? {}
  const teachersQuery = useQuery({
    queryKey: ['teachers', 'all-for-remuneration'] as const,
    queryFn: async (): Promise<Teacher[]> => {
      const all: Teacher[] = []
      let page = 1
      let totalPages = 1
      do {
        const res = await teacherService.getAll({ page, limit: 100, sort: 'name' })
        all.push(...(res?.items || []))
        totalPages = Number(res?.totalPages || 1)
        page += 1
      } while (page <= totalPages)
      return all
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
  const teachers = teachersQuery.data ?? []

  const selectionQueries = useQueries({
    queries: DUTY_TABS.map((tab) => ({
      queryKey: ['duties', 'selections', tab.dutyType] as const,
      queryFn: () => dutiesService.getDutySelections(tab.dutyType),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  })

  const loadingSelections = selectionQueries.some((q) => q.isLoading)
  const selectionsError = selectionQueries.find((q) => q.error)?.error as Error | undefined

  const rows = useMemo<RemunerationRow[]>(() => {
    const selectionByDutyType = new Map<string, Record<string, boolean>>()
    DUTY_TABS.forEach((tab, index) => {
      const data = selectionQueries[index]?.data
      selectionByDutyType.set(tab.dutyType, (data && typeof data === 'object') ? data : {})
    })

    // Count duties per (functionaryId, dutyType) so duties remain valid
    // even if the functionary's current dutyType changes later.
    // Saved selections use keys like "functionaryId::dateKey".
    const dutyCountByFunctionaryAndType = new Map<string, Map<string, number>>()

    for (const tab of DUTY_TABS) {
      const selectionMap = selectionByDutyType.get(tab.dutyType) || {}
      for (const [slotKey, checked] of Object.entries(selectionMap)) {
        if (!checked) continue
        const rawFunctionaryId = slotKey.split('::')[0]
        const functionaryId = String(rawFunctionaryId || '').trim()
        if (!functionaryId) continue
        if (!dutyCountByFunctionaryAndType.has(functionaryId)) {
          dutyCountByFunctionaryAndType.set(functionaryId, new Map())
        }
        const byType = dutyCountByFunctionaryAndType.get(functionaryId)!
        byType.set(tab.dutyType, (byType.get(tab.dutyType) || 0) + 1)
      }
    }

    const teacherById = new Map<string, Teacher>()
    teachers.forEach((t) => {
      const id = String(t?._id || '').trim()
      if (!id) return
      teacherById.set(id, t)
    })

    // Only include functionaries that still exist in the fetched teacher list
    // and have at least one saved selection (no 0-duty rows).
    const computed: RemunerationRow[] = []
    for (const [functionaryId, byType] of dutyCountByFunctionaryAndType.entries()) {
      const teacher = teacherById.get(functionaryId)
      if (!teacher) continue
      for (const [dutyType, dutyCount] of byType.entries()) {
        if (!dutyCount) continue
        // Guard against stray selections saved under the wrong dutyType.
        // Only count duties for types that exist in the functionary's current dutyType or dutyHistory.
        if (!hasDutyType(teacher, dutyType)) continue
        const effectiveRate =
          dutyType === 'Centre Superintendent'
            ? (() => {
              const sums = sumRates(ratesByDutyType, ['CS', 'QP Collection', 'AB Deposit'])
              const csBase = ratesByDutyType['Centre Superintendent'] || { remuneration: 0, conveyance: 0, refreshment: 0 }
              return {
                remuneration: sums.remuneration,
                conveyance: sums.conveyance,
                refreshment: Number(csBase.refreshment || 0),
              }
            })()
            : (ratesByDutyType[dutyType] || { remuneration: 0, conveyance: 0, refreshment: 0 })
        const remuneration = dutyCount * Number(effectiveRate.remuneration || 0)
        const conveyance = dutyCount * Number(effectiveRate.conveyance || 0)
        const refreshment = dutyCount * Number(effectiveRate.refreshment || 0)
        computed.push({
          functionaryId,
          functionaryName: String(teacher.name || '').trim() || '—',
          oasisId: dutyType === 'Class IV' ? 'N/A' : (teacher.oasisId || '—'),
          functionaryType: dutyType,
          schoolCode: String(teacher.schoolCode || '').trim(),
          schoolName: String(teacher.schoolName || '').trim(),
          dutyCount,
          remuneration,
          conveyance,
          refreshment,
        })
      }
    }

    computed.sort((a, b) => {
      const nameDiff = a.functionaryName.localeCompare(b.functionaryName, undefined, { sensitivity: 'base' })
      if (nameDiff !== 0) return nameDiff
      return a.functionaryType.localeCompare(b.functionaryType, undefined, { sensitivity: 'base' })
    })

    return computed
  }, [teachers, selectionQueries, ratesByDutyType])

  const invigilatorGroups = useMemo(() => {
    const invRows = rows.filter((r) => String(r.functionaryType || '').trim() === 'Invigilator')
    const centreSchoolCode = normalizeValue(centreDetails?.centreSchoolCode)
    const centreName = normalizeValue(centreDetails?.centreName)

    const isSelf = (row: RemunerationRow) => {
      const rowSchoolCode = normalizeValue(row.schoolCode)
      const rowSchoolName = normalizeValue(row.schoolName)
      if (centreSchoolCode) return rowSchoolCode === centreSchoolCode
      if (centreName) return rowSchoolName === centreName
      return false
    }

    const selfSchool = invRows.filter(isSelf)
    const outsideSchool = invRows.filter((r) => !isSelf(r))

    return { selfSchool, outsideSchool }
  }, [centreDetails?.centreName, centreDetails?.centreSchoolCode, rows])

  const grouped = useMemo(() => {
    const byKey: Array<{ group: RemunerationGroup; rows: RemunerationRow[] }> = []
    for (const group of REMUNERATION_GROUPS) {
      const set = new Set(group.dutyTypes.map((t) => t.toLowerCase()))
      const groupRows = rows.filter((r) => set.has(String(r.functionaryType || '').toLowerCase()))
      byKey.push({ group, rows: groupRows })
    }
    return byKey
  }, [rows])

  const dutiesSummary = useMemo(() => {
    const summaryRows = DUTIES_SUMMARY_ITEMS.map(({ dutyType, groupKey }) => {
      const matchingRows = rows.filter((row) => normalizeDutyType(row.functionaryType) === dutyType)
      const dutyCount = matchingRows.reduce((sum, row) => sum + Number(row.dutyCount || 0), 0)
      const remuneration = matchingRows.reduce((sum, row) => sum + Number(row.remuneration || 0), 0)
      const conveyance = matchingRows.reduce((sum, row) => sum + Number(row.conveyance || 0), 0)
      const refreshment = matchingRows.reduce((sum, row) => sum + Number(row.refreshment || 0), 0)

      return {
        dutyType,
        groupKey,
        dutyCount,
        remuneration,
        conveyance,
        refreshment,
        total: remuneration + conveyance + refreshment,
      }
    })

    const grandTotal = summaryRows.reduce(
      (acc, row) => {
        acc.dutyCount += row.dutyCount
        acc.remuneration += row.remuneration
        acc.conveyance += row.conveyance
        acc.refreshment += row.refreshment
        acc.total += row.total
        return acc
      },
      { dutyCount: 0, remuneration: 0, conveyance: 0, refreshment: 0, total: 0 }
    )

    return { rows: summaryRows, grandTotal }
  }, [rows])

  const isLoading = teachersQuery.isLoading || loadingSelections
  const error = (teachersQuery.error as Error | null) || teachersQuery.error || selectionsError

  const openDetails = useCallback((functionaryId: string) => {
    const id = String(functionaryId || '').trim()
    if (!id) return
    navigate(`/remuneration/${id}`)
  }, [navigate])

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>, functionaryId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openDetails(functionaryId)
      }
    },
    [openDetails]
  )

  const scrollToGroup = useCallback((groupKey: string) => {
    const element = document.getElementById(`remuneration-group-${groupKey}`)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden px-6 py-10 flex items-center justify-center">
          <Loader />
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden px-6 py-10 text-center text-sm text-red-600 dark:text-red-400">
          Failed to load remuneration data.
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          No duties found yet. Assign duties in the Duties page to populate this table.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-200/70 dark:ring-gray-700/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/70 dark:border-gray-700/60 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Duties Summary
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Duty-wise totals computed from the assigned remuneration records shown below.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2.5 py-1 text-xs font-semibold">
                {dutiesSummary.grandTotal.dutyCount} duties
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50/80 dark:bg-gray-700/70 sticky top-0 backdrop-blur">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Sr No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Duty Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      No Of Duties
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
                  {dutiesSummary.rows.map((row, index) => (
                    <tr
                      key={`duties-summary-${row.dutyType}`}
                      className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/60 dark:bg-gray-700/30'}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        <button
                          type="button"
                          onClick={() => scrollToGroup(row.groupKey)}
                          className="text-left text-indigo-700 hover:text-indigo-800 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200"
                        >
                          {row.dutyType}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {row.dutyCount || '-'}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {formatMoney(row.total)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100/80 dark:bg-gray-700/60">
                    <td colSpan={2} className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      Grand Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                      {dutiesSummary.grandTotal.dutyCount || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {formatMoney(dutiesSummary.grandTotal.remuneration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {formatMoney(dutiesSummary.grandTotal.conveyance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {formatMoney(dutiesSummary.grandTotal.refreshment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                      {formatMoney(dutiesSummary.grandTotal.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {grouped.map(({ group, rows: groupRows }, groupIdx) => (
            <div id={`remuneration-group-${group.key}`} key={group.key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-200/70 dark:ring-gray-700/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200/70 dark:border-gray-700/60 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-bold shrink-0">
                    {groupIdx + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {group.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {group.key === 'inv'
                        ? `${invigilatorGroups.selfSchool.length} self • ${invigilatorGroups.outsideSchool.length} outside`
                        : `${groupRows.length} ${groupRows.length === 1 ? 'functionary' : 'functionaries'}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2.5 py-1 text-xs font-semibold">
                    {groupRows.reduce((sum, r) => sum + (r.dutyCount || 0), 0)} duties
                  </span>
                </div>
              </div>

              {groupRows.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No records found for this group.
                </div>
              ) : (
                <div className="space-y-5 p-4">
                  {group.key === 'inv' ? (
                    <>
                      {[
                        { key: 'self', title: 'Self School', rows: invigilatorGroups.selfSchool, pillClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
                        { key: 'outside', title: 'Outside School', rows: invigilatorGroups.outsideSchool, pillClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
                      ].map((sub) => (
                        <div key={sub.key} className="border border-gray-200/70 dark:border-gray-700/60 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{sub.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sub.pillClass}`}>
                                {sub.rows.length}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {sub.rows.reduce((sum, r) => sum + (r.dutyCount || 0), 0)} duties
                            </div>
                          </div>
                          {sub.rows.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                              No records found.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-white/70 dark:bg-gray-800/60 sticky top-0 backdrop-blur">
                                  <tr className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    <th className="px-6 py-3 text-left">Sr No</th>
                                    <th className="px-6 py-3 text-left">Functionary Name</th>
                                    <th className="px-6 py-3 text-left">Oasis ID</th>
                                    <th className="px-6 py-3 text-left">No of Duties</th>
                                    <th className="px-6 py-3 text-left">Remuneration</th>
                                    <th className="px-6 py-3 text-left">Conveyance</th>
                                    <th className="px-6 py-3 text-left">Refreshment</th>
                                    <th className="px-6 py-3 text-left">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {sub.rows.map((row, index) => (
                                    // total computed per row
                                    <tr
                                      key={row.functionaryId}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => openDetails(row.functionaryId)}
                                      onKeyDown={(e) => handleRowKeyDown(e, row.functionaryId)}
                                      className={`cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/60 dark:bg-gray-700/30'} hover:bg-indigo-50/60 dark:hover:bg-indigo-900/15`}
                                      title="Open details"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{index + 1}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{String(row.functionaryName || '').toUpperCase()}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">{row.oasisId}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{row.dutyCount}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatMoney(row.remuneration)}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatMoney(row.conveyance)}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatMoney(row.refreshment)}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {formatMoney(row.remuneration + row.conveyance + row.refreshment)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50/80 dark:bg-gray-700/70 sticky top-0 backdrop-blur">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Sr No
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Functionary Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Oasis ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              No of Duties
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Duty
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
                          {group.key === 'cs'
                            ? groupRows.flatMap((row, index) => {
                              const csDuties = ['CS', 'QP Collection', 'AB Deposit'] as const
                              const refreshmentPerDay = Number((ratesByDutyType['Centre Superintendent']?.refreshment ?? 0) || 0)
                              const refreshmentTotal = row.dutyCount * refreshmentPerDay
                              const csRowTotal = row.remuneration + row.conveyance + row.refreshment

                              return csDuties.map((label, subIdx) => {
                                const subRate = ratesByDutyType[label] || { remuneration: 0, conveyance: 0, refreshment: 0 }
                                const subRem = row.dutyCount * Number(subRate.remuneration || 0)
                                const subConv = row.dutyCount * Number(subRate.conveyance || 0)
                                const zebra = index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/60 dark:bg-gray-700/30'

                                return (
                                  <tr
                                    key={`${row.functionaryId}::cs-sub::${label}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openDetails(row.functionaryId)}
                                    onKeyDown={(e) => handleRowKeyDown(e, row.functionaryId)}
                                    className={`cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${zebra} hover:bg-indigo-50/60 dark:hover:bg-indigo-900/15`}
                                    title="Open details"
                                  >
                                    {subIdx === 0 && (
                                      <>
                                        <td rowSpan={csDuties.length} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                          {index + 1}
                                        </td>
                                        <td rowSpan={csDuties.length} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                          {String(row.functionaryName || '').toUpperCase()}
                                        </td>
                                        <td rowSpan={csDuties.length} className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                                          {row.oasisId}
                                        </td>
                                        <td rowSpan={csDuties.length} className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                          {row.dutyCount}
                                        </td>
                                      </>
                                    )}

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold">
                                      {label}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                      {formatMoney(subRem)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                      {formatMoney(subConv)}
                                    </td>
                                    {subIdx === 0 && (
                                      <>
                                        <td rowSpan={csDuties.length} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                          {formatMoney(refreshmentTotal)}
                                        </td>
                                        <td rowSpan={csDuties.length} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                          {formatMoney(csRowTotal)}
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                )
                              })
                            })
                            : groupRows.map((row, index) => (
                              <tr
                                key={`${row.functionaryId}::${row.functionaryType}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => openDetails(row.functionaryId)}
                                onKeyDown={(e) => handleRowKeyDown(e, row.functionaryId)}
                                className={`cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/60 dark:bg-gray-700/30'} hover:bg-indigo-50/60 dark:hover:bg-indigo-900/15`}
                                title="Open details"
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {String(row.functionaryName || '').toUpperCase()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                                  {row.oasisId}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                  {row.dutyCount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  <div className="space-y-0.5">
                                    {getDutyLabelsForGroup(group.key).map((label) => (
                                      <div key={label} className="leading-tight">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
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
                  )}
                </div>
              )}
            </div>
          ))}

        </div>
      )}
    </div>
  )
}

export default Remuneration

