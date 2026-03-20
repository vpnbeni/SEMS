import React, { useEffect, useMemo, useState } from 'react'
import {
  useCentreDetails,
  useCentreDetailsSummary,
  useUpdateCentreDetailsMutation,
} from '../hooks/useCentreDetails'
import './CentreDetails.css'

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
  const [hasSavedCentreDetails, setHasSavedCentreDetails] = useState(false)
  const {
    data: centreDetails,
    isLoading: loadingCentre,
  } = useCentreDetails()
  const {
    data: summaryData,
    isLoading: loadingSummary,
  } = useCentreDetailsSummary()
  const updateCentreMutation = useUpdateCentreDetailsMutation()
  const candidates = summaryData?.candidates ?? []
  const examDays = summaryData?.examDays ?? 0
  const loading = loadingSummary

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
    try {
      await updateCentreMutation.mutateAsync(form)
      setHasSavedCentreDetails(true)
    } catch (error) {
      console.error('Failed to save centre details:', error)
    }
  }

  useEffect(() => {
    if (!centreDetails) return

    setForm({
      centreNo: centreDetails.centreNo || '',
      centreName: centreDetails.centreName || '',
      centreSchoolCode: centreDetails.centreSchoolCode || '',
      centreSuperintendent: centreDetails.centreSuperintendent || '',
      centreSuperintendentContact: centreDetails.centreSuperintendentContact || '',
      deputyCentreSuperintendent: centreDetails.deputyCentreSuperintendent || '',
      deputyCentreSuperintendentContact: centreDetails.deputyCentreSuperintendentContact || '',
      centreClerk: centreDetails.centreClerk || '',
      centreClerkContact: centreDetails.centreClerkContact || '',
    })

    const hasAnySavedField = [
      centreDetails.centreNo,
      centreDetails.centreName,
      centreDetails.centreSchoolCode,
      centreDetails.centreSuperintendent,
      centreDetails.centreSuperintendentContact,
      centreDetails.deputyCentreSuperintendent,
      centreDetails.deputyCentreSuperintendentContact,
      centreDetails.centreClerk,
      centreDetails.centreClerkContact,
    ].some((value) => String(value || '').trim().length > 0)

    setHasSavedCentreDetails(Boolean(centreDetails._id) || hasAnySavedField)
  }, [centreDetails])

  return (
    <div className="cd-page">
      <div className="cd-hero">
        <div className="cd-hero-content">
          <div className="cd-hero-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 10h6M9 14h6" />
            </svg>
          </div>
          <div className="cd-hero-text">
            <h2>Centre Details</h2>
            <p>Manage your centre profile and staff contacts</p>
          </div>
          <div className="cd-hero-stats">
            <div className="cd-hero-stat">
              <span className="cd-hero-stat-label">Total Candidates</span>
              <span className="cd-hero-stat-value">{loading ? '...' : totalCandidates}</span>
            </div>
            <div className="cd-hero-stat">
              <span className="cd-hero-stat-label">Schools</span>
              <span className="cd-hero-stat-value">{loading ? '...' : tableRows.length}</span>
            </div>
            <div className="cd-hero-stat">
              <span className="cd-hero-stat-label">Exam Days</span>
              <span className="cd-hero-stat-value">{loading ? '...' : examDays}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="cd-card">
        <div className="cd-card-header">
          <div className="cd-card-header-left">
            <div className="cd-card-icon cd-card-icon--blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 10h6M9 14h6" />
              </svg>
            </div>
            <div>
              <h2 className="cd-card-title">Centre Information</h2>
              <p className="cd-card-subtitle">Manage your examination centre profile</p>
            </div>
          </div>
          <button
            type="button"
            className="cd-save-btn"
            onClick={handleSaveCentreInfo}
            disabled={updateCentreMutation.isPending || loadingCentre}
            title={hasSavedCentreDetails ? 'Update centre information' : 'Save centre information'}
          >
            {updateCentreMutation.isPending ? (
              <>
                <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : hasSavedCentreDetails ? 'Update Details' : 'Save Details'}
          </button>
        </div>

        <div className="cd-card-body">
          <div className="cd-grid-2">
            <div className="cd-field">
              <label htmlFor="centre-no" className="cd-field-label">Centre No</label>
              <input id="centre-no" title="Centre Number" className="cd-input" value={form.centreNo} onChange={(e) => handleChange('centreNo', e.target.value)} />
              <p className="cd-field-hint">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Used in seating plan generation
              </p>
            </div>
            <div className="cd-field">
              <label htmlFor="centre-name" className="cd-field-label">Centre Name</label>
              <input id="centre-name" title="Centre Name" className="cd-input" value={form.centreName} onChange={(e) => handleChange('centreName', e.target.value)} />
              <p className="cd-field-hint">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Used in seating plan generation
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="cd-field">
              <label htmlFor="centre-school-code" className="cd-field-label">School Code</label>
              <input id="centre-school-code" title="School Code" className="cd-input" value={form.centreSchoolCode} onChange={(e) => handleChange('centreSchoolCode', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28, marginBottom: 8 }}>
            <div className="cd-card-icon cd-card-icon--purple" style={{ width: 32, height: 32, borderRadius: 8 }}>
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="cd-field-label" style={{ margin: 0 }}>Staff Details</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }} />
          </div>

          <div className="cd-staff-row">
            <div className="cd-field">
              <label htmlFor="centre-superintendent" className="cd-field-label">Centre Superintendent</label>
              <input id="centre-superintendent" title="Centre Superintendent" className="cd-input" value={form.centreSuperintendent} onChange={(e) => handleChange('centreSuperintendent', e.target.value)} />
            </div>
            <div className="cd-field">
              <label htmlFor="centre-superintendent-contact" className="cd-field-label">Contact Number</label>
              <input id="centre-superintendent-contact" title="Centre Superintendent Contact Number" className="cd-input" inputMode="numeric" placeholder="10-digit mobile" value={form.centreSuperintendentContact} onChange={(e) => handleChange('centreSuperintendentContact', e.target.value)} />
            </div>
          </div>

          <div className="cd-staff-row">
            <div className="cd-field">
              <label htmlFor="deputy-centre-superintendent" className="cd-field-label">Deputy Centre Superintendent</label>
              <input id="deputy-centre-superintendent" title="Deputy Centre Superintendent" className="cd-input" value={form.deputyCentreSuperintendent} onChange={(e) => handleChange('deputyCentreSuperintendent', e.target.value)} />
            </div>
            <div className="cd-field">
              <label htmlFor="deputy-centre-superintendent-contact" className="cd-field-label">Contact Number</label>
              <input id="deputy-centre-superintendent-contact" title="Deputy Centre Superintendent Contact Number" className="cd-input" inputMode="numeric" placeholder="10-digit mobile" value={form.deputyCentreSuperintendentContact} onChange={(e) => handleChange('deputyCentreSuperintendentContact', e.target.value)} />
            </div>
          </div>

          <div className="cd-staff-row">
            <div className="cd-field">
              <label htmlFor="centre-clerk" className="cd-field-label">Centre Clerk</label>
              <input id="centre-clerk" title="Centre Clerk" className="cd-input" value={form.centreClerk} onChange={(e) => handleChange('centreClerk', e.target.value)} />
            </div>
            <div className="cd-field">
              <label htmlFor="centre-clerk-contact" className="cd-field-label">Contact Number</label>
              <input id="centre-clerk-contact" title="Centre Clerk Contact Number" className="cd-input" inputMode="numeric" placeholder="10-digit mobile" value={form.centreClerkContact} onChange={(e) => handleChange('centreClerkContact', e.target.value)} />
            </div>
          </div>

          {/* Packing & Dispatch info banner removed per request */}
        </div>
      </div>

      <div className="cd-card">
        <div className="cd-card-header">
          <div className="cd-card-header-left">
            <div className="cd-card-icon cd-card-icon--emerald">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="cd-card-title">Candidates Appearing</h2>
              <p className="cd-card-subtitle">School-wise candidate split</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 9999, background: 'rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280' }}>Total</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#111827' }}>{totalCandidates}</span>
          </div>
        </div>

        <div className="cd-table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Sr No</th>
                <th style={{ textAlign: 'left' }}>School Code</th>
                <th style={{ textAlign: 'left' }}>School Name</th>
                <th style={{ textAlign: 'left' }}>Class X Roll From</th>
                <th style={{ textAlign: 'left' }}>Class X Roll To</th>
                <th style={{ textAlign: 'right' }}>Class X</th>
                <th style={{ textAlign: 'left' }}>Class XII Roll From</th>
                <th style={{ textAlign: 'left' }}>Class XII Roll To</th>
                <th style={{ textAlign: 'right' }}>Class XII</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <svg className="animate-spin" style={{ width: 24, height: 24, color: '#667eea' }} fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 500 }}>Loading candidate summary...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && tableRows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <svg style={{ width: 40, height: 40, color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <span style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 500 }}>No candidate data found</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && tableRows.map((row) => (
                <tr key={`${row.schoolCode}-${row.schoolName}`}>
                  <td style={{ color: '#6b7280', fontWeight: 500 }}>{row.srNo}</td>
                  <td style={{ fontWeight: 600, color: '#111827' }}>{row.schoolCode}</td>
                  <td>{row.schoolName}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.classXRollFrom || <span style={{ color: '#d1d5db' }}>-</span>}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.classXRollTo || <span style={{ color: '#d1d5db' }}>-</span>}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{row.classX}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.classXIIRollFrom || <span style={{ color: '#d1d5db' }}>-</span>}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.classXIIRollTo || <span style={{ color: '#d1d5db' }}>-</span>}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{row.classXII}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cd-exam-days">
        <div className="cd-exam-days-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <div className="cd-exam-days-number">
            {loading ? (
              <span style={{ display: 'inline-block', width: 32, height: 36, borderRadius: 6, background: 'rgba(0,0,0,0.06)' }} />
            ) : examDays}
          </div>
          <div className="cd-exam-days-label">Total Exam Days</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
          Based on datesheet
        </div>
      </div>
    </div>
  )
}

export default CentreDetails
