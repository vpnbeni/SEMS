import React, { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

interface CandidateRow {
  schoolCode: string
  schoolName: string
  class: string
  rollNumber: string
}

interface SchoolSummaryRow {
  srNo: number
  schoolCode: string
  schoolName: string
  classXRollFrom: string
  classXRollTo: string
  classX: number
  classXIIRollFrom: string
  classXIIRollTo: string
  classXII: number
  total: number
}

interface CentreForm {
  centreNo: string
  centreName: string
  centreSchoolCode: string
  centreSuperintendent: string
  centreSuperintendentContact: string
  deputyCentreSuperintendent: string
  deputyCentreSuperintendentContact: string
  centreClerk: string
  centreClerkContact: string
}

const PAGE_LIMIT = 1000

const defaultForm: CentreForm = {
  centreNo: '',
  centreName: '',
  centreSchoolCode: '',
  centreSuperintendent: '',
  centreSuperintendentContact: '',
  deputyCentreSuperintendent: '',
  deputyCentreSuperintendentContact: '',
  centreClerk: '',
  centreClerkContact: '',
}

const sanitizePhoneInput = (value: string) => value.replace(/\D/g, '').slice(0, 10)

const compareRollNumbers = (a: string, b: string) => {
  const left = String(a || '').trim()
  const right = String(b || '').trim()
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1

  const leftNum = Number(left)
  const rightNum = Number(right)
  const bothNumeric = Number.isFinite(leftNum) && Number.isFinite(rightNum) && /^\d+$/.test(left) && /^\d+$/.test(right)
  if (bothNumeric) return leftNum - rightNum

  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
}

const CentreDetails: React.FC = () => {
  const [form, setForm] = useState<CentreForm>(defaultForm)
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCentre, setLoadingCentre] = useState(true)
  const [savingCentre, setSavingCentre] = useState(false)
  const [examDays, setExamDays] = useState<number>(0)

  useEffect(() => {
    const fetchCentreInfo = async () => {
      try {
        const res = await api.get('/centre-details')
        const data = res?.data?.data as Partial<CentreForm> | null
        if (data) {
          setForm((prev) => ({
            ...prev,
            ...data,
          }))
        }
      } catch (error) {
        console.error('Failed to fetch saved centre information:', error)
      } finally {
        setLoadingCentre(false)
      }
    }
    fetchCentreInfo()
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const allCandidates: CandidateRow[] = []
        let page = 1
        let totalPages = 1

        do {
          const res = await api.get('/candidates', {
            params: { page, limit: PAGE_LIMIT },
          })
          const body = res?.data ?? {}
          const rows = (body?.data ?? []) as Array<any>

          rows.forEach((row) => {
            allCandidates.push({
              schoolCode: String(row?.schoolCode || '').trim(),
              schoolName: String(row?.schoolName || '').trim(),
              class: String(row?.class || '').trim(),
              rollNumber: String(row?.rollNumber || '').trim(),
            })
          })

          totalPages = Number(body?.pages || 1)
          page += 1
        } while (page <= totalPages)

        setCandidates(allCandidates)

        const statsRes = await api.get('/datesheets/stats')
        const statsData = statsRes?.data?.data ?? {}
        const computedExamDays = Number(statsData?.centreDays ?? statsData?.fullDatesheetDays ?? 0)
        setExamDays(Number.isFinite(computedExamDays) ? computedExamDays : 0)
      } catch (error) {
        console.error('Failed to fetch centre details data:', error)
        setCandidates([])
        setExamDays(0)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const tableRows: SchoolSummaryRow[] = useMemo(() => {
    const grouped = new Map<string, SchoolSummaryRow>()

    for (const candidate of candidates) {
      const schoolCode = candidate.schoolCode || 'N/A'
      const schoolName = candidate.schoolName || 'N/A'
      const key = `${schoolCode}__${schoolName}`

      if (!grouped.has(key)) {
        grouped.set(key, {
          srNo: 0,
          schoolCode,
          schoolName,
          classXRollFrom: '',
          classXRollTo: '',
          classX: 0,
          classXIIRollFrom: '',
          classXIIRollTo: '',
          classXII: 0,
          total: 0,
        })
      }

      const row = grouped.get(key)!
      if (candidate.class === '10th') {
        row.classX += 1
        if (!row.classXRollFrom || compareRollNumbers(candidate.rollNumber, row.classXRollFrom) < 0) {
          row.classXRollFrom = candidate.rollNumber
        }
        if (!row.classXRollTo || compareRollNumbers(candidate.rollNumber, row.classXRollTo) > 0) {
          row.classXRollTo = candidate.rollNumber
        }
      }
      if (candidate.class === '12th') {
        row.classXII += 1
        if (!row.classXIIRollFrom || compareRollNumbers(candidate.rollNumber, row.classXIIRollFrom) < 0) {
          row.classXIIRollFrom = candidate.rollNumber
        }
        if (!row.classXIIRollTo || compareRollNumbers(candidate.rollNumber, row.classXIIRollTo) > 0) {
          row.classXIIRollTo = candidate.rollNumber
        }
      }
      row.total += 1
    }

    return Array.from(grouped.values())
      .sort((a, b) => a.schoolCode.localeCompare(b.schoolCode) || a.schoolName.localeCompare(b.schoolName))
      .map((row, idx) => ({ ...row, srNo: idx + 1 }))
  }, [candidates])

  const totalCandidates = useMemo(
    () => tableRows.reduce((sum, row) => sum + row.total, 0),
    [tableRows]
  )

  const handleChange = (key: keyof CentreForm, value: string) => {
    const isContactField = key.toLowerCase().includes('contact')
    setForm((prev) => ({
      ...prev,
      [key]: isContactField ? sanitizePhoneInput(value) : value,
    }))
  }

  const handleSaveCentreInfo = async () => {
    setSavingCentre(true)
    try {
      await api.put('/centre-details', form)
    } catch (error) {
      console.error('Failed to save centre details:', error)
    } finally {
      setSavingCentre(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="glass rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Centre Information</h2>
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSaveCentreInfo}
            disabled={savingCentre || loadingCentre}
            title="Save centre information"
          >
            {savingCentre ? 'Saving...' : 'Save Details'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="centre-no" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Centre No</label>
            <input id="centre-no" title="Centre Number" className="input w-full" value={form.centreNo} onChange={(e) => handleChange('centreNo', e.target.value)} />
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Fill carefully: this will be used in seating plan.
            </p>
          </div>
          <div>
            <label htmlFor="centre-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Centre Name</label>
            <input id="centre-name" title="Centre Name" className="input w-full" value={form.centreName} onChange={(e) => handleChange('centreName', e.target.value)} />
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Fill carefully: this will be used in seating plan.
            </p>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="centre-school-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">School Code</label>
            <input id="centre-school-code" title="School Code" className="input w-full" value={form.centreSchoolCode} onChange={(e) => handleChange('centreSchoolCode', e.target.value)} />
          </div>

          <div>
            <label htmlFor="centre-superintendent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Centre Superintendent</label>
            <input id="centre-superintendent" title="Centre Superintendent" className="input w-full" value={form.centreSuperintendent} onChange={(e) => handleChange('centreSuperintendent', e.target.value)} />
          </div>
          <div>
            <label htmlFor="centre-superintendent-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Number</label>
            <input id="centre-superintendent-contact" title="Centre Superintendent Contact Number" className="input w-full" inputMode="numeric" value={form.centreSuperintendentContact} onChange={(e) => handleChange('centreSuperintendentContact', e.target.value)} />
          </div>

          <div>
            <label htmlFor="deputy-centre-superintendent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deputy Centre Superintendent</label>
            <input id="deputy-centre-superintendent" title="Deputy Centre Superintendent" className="input w-full" value={form.deputyCentreSuperintendent} onChange={(e) => handleChange('deputyCentreSuperintendent', e.target.value)} />
          </div>
          <div>
            <label htmlFor="deputy-centre-superintendent-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Number</label>
            <input id="deputy-centre-superintendent-contact" title="Deputy Centre Superintendent Contact Number" className="input w-full" inputMode="numeric" value={form.deputyCentreSuperintendentContact} onChange={(e) => handleChange('deputyCentreSuperintendentContact', e.target.value)} />
          </div>

          <div>
            <label htmlFor="centre-clerk" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Centre Clerk</label>
            <input id="centre-clerk" title="Centre Clerk" className="input w-full" value={form.centreClerk} onChange={(e) => handleChange('centreClerk', e.target.value)} />
          </div>
          <div>
            <label htmlFor="centre-clerk-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Number</label>
            <input id="centre-clerk-contact" title="Centre Clerk Contact Number" className="input w-full" inputMode="numeric" value={form.centreClerkContact} onChange={(e) => handleChange('centreClerkContact', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="glass rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">No of candidates appearing</h2>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Total Candidates: <span className="font-semibold">{totalCandidates}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Sr No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">School Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">School Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Class X Roll From</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Class X Roll To</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Class X</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Class XII Roll From</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Class XII Roll To</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Class XII</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-500">Loading candidate summary...</td>
                </tr>
              )}
              {!loading && tableRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-500">No candidate data found.</td>
                </tr>
              )}
              {!loading && tableRows.map((row) => (
                <tr key={`${row.schoolCode}-${row.schoolName}`}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.srNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.schoolCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.schoolName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.classXRollFrom || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.classXRollTo || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">{row.classX}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.classXIIRollFrom || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.classXIIRollTo || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">{row.classXII}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No of Exam Days</h2>
        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
          {loading ? '-' : examDays}
        </p>
      </div>
    </div>
  )
}

export default CentreDetails
