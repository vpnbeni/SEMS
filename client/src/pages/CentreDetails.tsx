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
  packingClothColor: string
  packingMarker: string
  packingClothColorClass10: string
  packingMarkerClass10: string
  packingClothColorClass12: string
  packingMarkerClass12: string
}

interface CentreDetailsResponse extends Partial<CentreForm> {
  _id?: string
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
  packingClothColor: '',
  packingMarker: '',
  packingClothColorClass10: '',
  packingMarkerClass10: '',
  packingClothColorClass12: '',
  packingMarkerClass12: '',
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
  const [hasSavedCentreDetails, setHasSavedCentreDetails] = useState(false)
  const [examDays, setExamDays] = useState<number>(0)

  useEffect(() => {
    const fetchCentreInfo = async () => {
      try {
        const res = await api.get('/centre-details')
        const data = res?.data?.data as CentreDetailsResponse | null
        if (data) {
          setForm((prev) => ({
            ...prev,
            ...data,
          }))
          const hasAnySavedField = Object.values(data).some(
            (value) => typeof value === 'string' && value.trim().length > 0
          )
          setHasSavedCentreDetails(Boolean(data._id) || hasAnySavedField)
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
      setHasSavedCentreDetails(true)
    } catch (error) {
      console.error('Failed to save centre details:', error)
    } finally {
      setSavingCentre(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 stagger-children">
      {/* Centre Information Card */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/90 shadow-elegant overflow-hidden">
        {/* Card Header with gradient accent */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-primary-50/50 via-white to-white dark:from-primary-900/10 dark:via-gray-800/90 dark:to-gray-800/90">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 10h6M9 14h6" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Centre Information</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage your examination centre profile</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary px-5 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSaveCentreInfo}
            disabled={savingCentre || loadingCentre}
            title={hasSavedCentreDetails ? 'Update centre information' : 'Save centre information'}
          >
            {savingCentre ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : hasSavedCentreDetails ? 'Update Details' : 'Save Details'}
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="centre-no" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Centre No</label>
              <input id="centre-no" title="Centre Number" className="input w-full" value={form.centreNo} onChange={(e) => handleChange('centreNo', e.target.value)} />
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Used in seating plan generation
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="centre-name" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Centre Name</label>
              <input id="centre-name" title="Centre Name" className="input w-full" value={form.centreName} onChange={(e) => handleChange('centreName', e.target.value)} />
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Used in seating plan generation
              </p>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="centre-school-code" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">School Code</label>
              <input id="centre-school-code" title="School Code" className="input w-full" value={form.centreSchoolCode} onChange={(e) => handleChange('centreSchoolCode', e.target.value)} />
            </div>

            {/* Divider */}
            <div className="md:col-span-2 flex items-center gap-3 pt-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Staff Details</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="centre-superintendent" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Centre Superintendent</label>
              <input id="centre-superintendent" title="Centre Superintendent" className="input w-full" value={form.centreSuperintendent} onChange={(e) => handleChange('centreSuperintendent', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="centre-superintendent-contact" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Number</label>
              <input id="centre-superintendent-contact" title="Centre Superintendent Contact Number" className="input w-full" inputMode="numeric" placeholder="10-digit mobile" value={form.centreSuperintendentContact} onChange={(e) => handleChange('centreSuperintendentContact', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="deputy-centre-superintendent" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deputy Centre Superintendent</label>
              <input id="deputy-centre-superintendent" title="Deputy Centre Superintendent" className="input w-full" value={form.deputyCentreSuperintendent} onChange={(e) => handleChange('deputyCentreSuperintendent', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="deputy-centre-superintendent-contact" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Number</label>
              <input id="deputy-centre-superintendent-contact" title="Deputy Centre Superintendent Contact Number" className="input w-full" inputMode="numeric" placeholder="10-digit mobile" value={form.deputyCentreSuperintendentContact} onChange={(e) => handleChange('deputyCentreSuperintendentContact', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="centre-clerk" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Centre Clerk</label>
              <input id="centre-clerk" title="Centre Clerk" className="input w-full" value={form.centreClerk} onChange={(e) => handleChange('centreClerk', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="centre-clerk-contact" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Number</label>
              <input id="centre-clerk-contact" title="Centre Clerk Contact Number" className="input w-full" inputMode="numeric" placeholder="10-digit mobile" value={form.centreClerkContact} onChange={(e) => handleChange('centreClerkContact', e.target.value)} />
            </div>

            {/* Packing details (exam day) */}
            <div className="md:col-span-2 flex items-center gap-3 pt-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Packing details (exam day)</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="packing-cloth-color"
                className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Overall cloth colour (optional)
              </label>
              <input
                id="packing-cloth-color"
                title="Default packing cloth colour"
                className="input w-full"
                placeholder="e.g. Blue"
                value={form.packingClothColor}
                onChange={(e) => handleChange('packingClothColor', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="packing-marker"
                className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Overall ink / marker (optional)
              </label>
              <input
                id="packing-marker"
                title="Default packing marker / ink colour"
                className="input w-full"
                placeholder="e.g. Red"
                value={form.packingMarker}
                onChange={(e) => handleChange('packingMarker', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
                <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">
                  Class-wise packing colours
                </div>
                <div className="grid grid-cols-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">Class</div>
                  <div className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">Colour of cloth</div>
                  <div className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">Colour of ink</div>
                </div>
                <div className="grid grid-cols-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
                  <div className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">Class X</div>
                  <div className="px-3 py-2">
                    <input
                      id="packing-cloth-color-class10"
                      title="Cloth colour for Class X packets"
                      className="input w-full text-xs"
                      placeholder="e.g. Blue"
                      value={form.packingClothColorClass10}
                      onChange={(e) => handleChange('packingClothColorClass10', e.target.value)}
                    />
                  </div>
                  <div className="px-3 py-2">
                    <input
                      id="packing-marker-class10"
                      title="Ink colour for Class X packets"
                      className="input w-full text-xs"
                      placeholder="e.g. Red"
                      value={form.packingMarkerClass10}
                      onChange={(e) => handleChange('packingMarkerClass10', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60">
                  <div className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">Class XII</div>
                  <div className="px-3 py-2">
                    <input
                      id="packing-cloth-color-class12"
                      title="Cloth colour for Class XII packets"
                      className="input w-full text-xs"
                      placeholder="e.g. Pink"
                      value={form.packingClothColorClass12}
                      onChange={(e) => handleChange('packingClothColorClass12', e.target.value)}
                    />
                  </div>
                  <div className="px-3 py-2">
                    <input
                      id="packing-marker-class12"
                      title="Ink colour for Class XII packets"
                      className="input w-full text-xs"
                      placeholder="e.g. Blue"
                      value={form.packingMarkerClass12}
                      onChange={(e) => handleChange('packingMarkerClass12', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Summary Card */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/90 shadow-elegant overflow-hidden">
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-success-50/40 via-white to-white dark:from-success-900/10 dark:via-gray-800/90 dark:to-gray-800/90">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Candidates Appearing</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">School-wise candidate split</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{totalCandidates}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sr No</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">School Code</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">School Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Class X Roll From</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Class X Roll To</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Class X</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Class XII Roll From</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Class XII Roll To</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Class XII</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="animate-spin h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-gray-400 font-medium">Loading candidate summary...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && tableRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <span className="text-sm text-gray-400 font-medium">No candidate data found</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && tableRows.map((row, idx) => (
                <tr key={`${row.schoolCode}-${row.schoolName}`} className={`transition-colors duration-150 hover:bg-primary-50/40 dark:hover:bg-primary-900/10 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800/90' : 'bg-gray-50/40 dark:bg-gray-900/20'}`}>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-medium">{row.srNo}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{row.schoolCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.schoolName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 tabular-nums">{row.classXRollFrom || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 tabular-nums">{row.classXRollTo || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-right tabular-nums font-medium">{row.classX}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 tabular-nums">{row.classXIIRollFrom || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 tabular-nums">{row.classXIIRollTo || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-right tabular-nums font-medium">{row.classXII}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white text-right tabular-nums">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exam Days Card */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/90 shadow-elegant overflow-hidden">
        <div className="flex items-center gap-5 px-6 py-5">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Exam Days</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums animate-number-in">
              {loading ? (
                <span className="inline-block w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
              ) : examDays}
            </p>
          </div>
          <div className="ml-auto hidden sm:block">
            <div className="text-xs text-gray-400 dark:text-gray-500 text-right">
              Based on datesheet
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CentreDetails
