import React, { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import exmclAdmitCardService, {
  DEFAULT_ADMIT_CARD_DESIGN,
  type AdmitCardDesign,
} from '@/services/exmclAdmitCardService'
import schoolProfileService, { type SchoolProfile } from '@/services/schoolProfileService'
import AdmitCardPreview from '@/components/exmcl/AdmitCardPreview'

const PREVIEW_SCHOOL = {
  name: 'INTL BHARTI SCHOOL, ROHTAK',
  address: 'Gohana Road, Rohtak, Haryana',
  schoolCode: '40291',
}

const PAGE_ASPECT: Record<'A4' | 'legal', Record<'portrait' | 'landscape', string>> = {
  A4: { portrait: '210 / 297', landscape: '297 / 210' },
  legal: { portrait: '8.5 / 14', landscape: '14 / 8.5' },
}

const selectClassName =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white'

const segmentButton = (active: boolean) =>
  `flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
    active
      ? 'bg-blue-600 text-white shadow-sm'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-900 dark:text-slate-300 dark:hover:bg-gray-700'
  }`

const ExmclAdmitCardFormat: React.FC = () => {
  const navigate = useNavigate()
  const [design, setDesign] = useState<AdmitCardDesign>(DEFAULT_ADMIT_CARD_DESIGN)
  const [school, setSchool] = useState<Partial<SchoolProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingRole, setUploadingRole] = useState<'principal' | 'examIncharge' | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [saved, profile] = await Promise.all([
          exmclAdmitCardService.getDesign(),
          schoolProfileService.getProfile().catch(() => null),
        ])
        if (cancelled) return
        setDesign(saved)
        if (profile) setSchool(profile)
      } catch {
        if (!cancelled) toast.error('Failed to load admit card format.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const schoolName = String(school.name || '').trim() || PREVIEW_SCHOOL.name
  const schoolAddress = String(school.address || '').trim() || PREVIEW_SCHOOL.address
  const schoolCode = String(school.schoolCode || '').trim() || PREVIEW_SCHOOL.schoolCode
  const twoUp = design.copiesPerSheet === 2
  const pageAspect = PAGE_ASPECT[design.pageSize][design.orientation]
  const copyCount = useMemo(() => (twoUp ? [0, 1] : [0]), [twoUp])

  const updateField = (key: keyof AdmitCardDesign['fields'], value: boolean) => {
    setDesign((prev) => ({ ...prev, fields: { ...prev.fields, [key]: value } }))
  }

  const updateSignature = (key: keyof AdmitCardDesign['signatures'], value: boolean) => {
    setDesign((prev) => ({ ...prev, signatures: { ...prev.signatures, [key]: value } }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const saved = await exmclAdmitCardService.saveDesign(design)
      setDesign(saved)
      toast.success('Admit card format saved. ExmCl Admit Cards will use this layout.')
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to save admit card format.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSignatureUpload = async (role: 'principal' | 'examIncharge', file?: File) => {
    if (!file) return
    setUploadingRole(role)
    try {
      const saved = await exmclAdmitCardService.uploadSignature(role, file)
      setDesign((prev) => ({
        ...prev,
        signatures: {
          ...prev.signatures,
          ...saved.signatures,
          [`${role}Digital`]: true,
        },
      }))
      toast.success(`${role === 'principal' ? 'Principal' : 'Exam Incharge'} digital signature uploaded.`)
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to upload signature.'))
    } finally {
      setUploadingRole(null)
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Design Admit Card</h2>
            <p className="mt-1 text-xs text-gray-500">
              CBSE-style layout. The top heading uses the school name. Use {'{exam}'} in the title to insert the exam name.
            </p>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Title</span>
            <input
              value={design.title}
              onChange={(e) => setDesign((prev) => ({ ...prev, title: e.target.value }))}
              disabled={loading}
              className={`${selectClassName} mt-1`}
            />
          </label>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Page size</p>
            <div className="flex gap-1">
              <button type="button" className={segmentButton(design.pageSize === 'A4')} onClick={() => setDesign((prev) => ({ ...prev, pageSize: 'A4' }))}>A4</button>
              <button type="button" className={segmentButton(design.pageSize === 'legal')} onClick={() => setDesign((prev) => ({ ...prev, pageSize: 'legal' }))}>Lgl</button>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Orientation</p>
            <div className="flex gap-1">
              <button type="button" className={segmentButton(design.orientation === 'portrait')} onClick={() => setDesign((prev) => ({ ...prev, orientation: 'portrait' }))}>Portrait</button>
              <button type="button" className={segmentButton(design.orientation === 'landscape')} onClick={() => setDesign((prev) => ({ ...prev, orientation: 'landscape' }))}>Landscape</button>
            </div>
          </div>

          <Toggle
            label="2 admit cards on one sheet"
            checked={twoUp}
            onChange={(value) => setDesign((prev) => ({ ...prev, copiesPerSheet: value ? 2 : 1 }))}
          />

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Header</p>
            <Toggle label="School name" checked={design.showHeader} onChange={(value) => setDesign((prev) => ({ ...prev, showHeader: value }))} />
            <Toggle label="School logos" checked={design.showSchoolLogo} onChange={(value) => setDesign((prev) => ({ ...prev, showSchoolLogo: value }))} />
            <Toggle label="School address" checked={design.showSchoolAddress} onChange={(value) => setDesign((prev) => ({ ...prev, showSchoolAddress: value }))} />
            <Toggle label="Entry note" checked={design.showEntryNote} onChange={(value) => setDesign((prev) => ({ ...prev, showEntryNote: value }))} />
            {design.showEntryNote ? (
              <textarea
                value={design.entryNote}
                onChange={(e) => setDesign((prev) => ({ ...prev, entryNote: e.target.value }))}
                rows={2}
                className={`${selectClassName} min-h-[52px]`}
              />
            ) : null}
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fields</p>
            <Toggle label="Photo" checked={design.fields.photo} onChange={(value) => updateField('photo', value)} />
            <Toggle label="Roll No" checked={design.fields.rollNo} onChange={(value) => updateField('rollNo', value)} />
            <Toggle label="Date of Birth" checked={design.fields.dob} onChange={(value) => updateField('dob', value)} />
            <Toggle label="School No" checked={design.fields.schoolNo} onChange={(value) => updateField('schoolNo', value)} />
            <Toggle label="Centre No" checked={design.fields.centreNo} onChange={(value) => updateField('centreNo', value)} />
            <Toggle label="Roll No in words" checked={design.fields.rollNoInWords} onChange={(value) => updateField('rollNoInWords', value)} />
            <Toggle label="Examination" checked={design.fields.exam} onChange={(value) => updateField('exam', value)} />
            <Toggle label="Candidate Name" checked={design.fields.name} onChange={(value) => updateField('name', value)} />
            <Toggle label="Mother Name" checked={design.fields.motherName} onChange={(value) => updateField('motherName', value)} />
            <Toggle label="Father Name" checked={design.fields.fatherName} onChange={(value) => updateField('fatherName', value)} />
            <Toggle label="Gender" checked={design.fields.gender} onChange={(value) => updateField('gender', value)} />
            <Toggle label="Name of School" checked={design.fields.schoolName} onChange={(value) => updateField('schoolName', value)} />
            <Toggle label="Exam Centre" checked={design.fields.examCentre} onChange={(value) => updateField('examCentre', value)} />
            <Toggle label="PwD category" checked={design.fields.pwdCategory} onChange={(value) => updateField('pwdCategory', value)} />
            <Toggle label="Admit Card ID" checked={design.fields.admitCardId} onChange={(value) => updateField('admitCardId', value)} />
            <Toggle label="QR code" checked={design.fields.qr} onChange={(value) => updateField('qr', value)} />
            <Toggle label="Subject table" checked={design.fields.subjects} onChange={(value) => updateField('subjects', value)} />
            <Toggle label="Section" checked={design.fields.section} onChange={(value) => updateField('section', value)} />
            <Toggle label="Admission No" checked={design.fields.admissionNo} onChange={(value) => updateField('admissionNo', value)} />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Instructions</p>
            <Toggle label="Show instructions" checked={design.showInstructions} onChange={(value) => setDesign((prev) => ({ ...prev, showInstructions: value }))} />
            {design.showInstructions ? (
              <textarea
                value={design.instructions}
                onChange={(e) => setDesign((prev) => ({ ...prev, instructions: e.target.value }))}
                rows={6}
                className={`${selectClassName} min-h-[120px]`}
              />
            ) : null}
            <Toggle label="Confirmation line" checked={design.showConfirmation} onChange={(value) => setDesign((prev) => ({ ...prev, showConfirmation: value }))} />
            <Toggle label="Disclaimer" checked={design.showDisclaimer} onChange={(value) => setDesign((prev) => ({ ...prev, showDisclaimer: value }))} />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signatures</p>
            <Toggle label="Candidate" checked={design.signatures.candidate} onChange={(value) => updateSignature('candidate', value)} />
            <Toggle label="Parents" checked={design.signatures.parent} onChange={(value) => updateSignature('parent', value)} />
            <Toggle label="Exam Incharge" checked={design.signatures.examIncharge} onChange={(value) => updateSignature('examIncharge', value)} />
            {design.signatures.examIncharge ? (
              <div className="rounded-lg border border-slate-200 p-2 dark:border-gray-600">
                <Toggle
                  label="Digital sign — Exam Incharge"
                  checked={design.signatures.examInchargeDigital}
                  onChange={(value) => updateSignature('examInchargeDigital', value)}
                />
                {design.signatures.examInchargeDigital ? (
                  <div className="mt-2 space-y-1.5">
                    {design.signatures.examInchargeSignatureUrl ? (
                      <img src={design.signatures.examInchargeSignatureUrl} alt="Exam Incharge signature" className="h-10 max-w-full object-contain" />
                    ) : (
                      <p className="text-[11px] text-slate-500">Upload a signature image to print on every card.</p>
                    )}
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 dark:border-gray-600 dark:text-slate-200">
                      {uploadingRole === 'examIncharge' ? 'Uploading...' : 'Upload signature'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadingRole !== null}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          event.target.value = ''
                          void handleSignatureUpload('examIncharge', file)
                        }}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}
            <Toggle label="Principal" checked={design.signatures.principal} onChange={(value) => updateSignature('principal', value)} />
            {design.signatures.principal ? (
              <div className="rounded-lg border border-slate-200 p-2 dark:border-gray-600">
                <Toggle
                  label="Digital sign — Principal"
                  checked={design.signatures.principalDigital}
                  onChange={(value) => updateSignature('principalDigital', value)}
                />
                {design.signatures.principalDigital ? (
                  <div className="mt-2 space-y-1.5">
                    {design.signatures.principalSignatureUrl ? (
                      <img src={design.signatures.principalSignatureUrl} alt="Principal signature" className="h-10 max-w-full object-contain" />
                    ) : (
                      <p className="text-[11px] text-slate-500">Upload a signature image to print on every card.</p>
                    )}
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 dark:border-gray-600 dark:text-slate-200">
                      {uploadingRole === 'principal' ? 'Uploading...' : 'Upload signature'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadingRole !== null}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          event.target.value = ''
                          void handleSignatureUpload('principal', file)
                        }}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save format'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/exmcl/admit-cards')}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-900"
          >
            Generate admit cards
          </button>
        </aside>

        <section className="rounded-xl border border-gray-200 bg-slate-100 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Live preview · {design.pageSize === 'legal' ? 'Legal' : 'A4'} · {design.orientation} · {twoUp ? '2 per sheet' : '1 per sheet'}
          </p>
          <div className="overflow-auto">
            <div
              className="mx-auto max-w-full bg-white p-3 shadow-md dark:bg-gray-800"
              style={{ aspectRatio: pageAspect, width: design.orientation === 'portrait' ? 'min(100%, 640px)' : '100%' }}
            >
              <div className={twoUp ? 'flex h-full gap-2' : 'h-full'}>
                {copyCount.map((index) => (
                  <div key={index} className={twoUp ? 'min-w-0 flex-1' : ''}>
                    <AdmitCardPreview
                      design={design}
                      compact={twoUp}
                      data={{
                        schoolName,
                        schoolAddress,
                        schoolCode,
                        logoUrl: school.logoUrl,
                        examName: 'SECONDARY EXAMINATION',
                        student: {
                          name: 'Aarav Sharma',
                          fatherName: 'Rajesh Sharma',
                          gender: 'Male',
                          motherName: 'Manisha Sharma',
                          className: '10th',
                          section: 'A',
                          rollNo: 12,
                          admissionNo: '3361',
                          dateOfBirth: '24.10.2010',
                          admitCardId: 'ACUT12',
                        },
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) => (
  <label className="flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-200">
    {label}
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-3.5 w-3.5"
    />
  </label>
)

export default ExmclAdmitCardFormat
