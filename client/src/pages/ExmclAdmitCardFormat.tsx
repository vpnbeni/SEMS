import React, { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import exmclAdmitCardService, {
  DEFAULT_ADMIT_CARD_DESIGN,
  type AdmitCardDesign,
} from '@/services/exmclAdmitCardService'
import schoolProfileService, { type SchoolProfile } from '@/services/schoolProfileService'

const PREVIEW_SCHOOL = {
  name: 'INTL BHARTI SCHOOL, ROHTAK',
  address: 'Gohana Road, Rohtak, Haryana',
  schoolCode: '40291',
}

const PAGE_ASPECT: Record<'A4' | 'legal', Record<'portrait' | 'landscape', string>> = {
  A4: { portrait: '210 / 297', landscape: '297 / 210' },
  legal: { portrait: '8.5 / 14', landscape: '14 / 8.5' },
}

const SAMPLE_SUBJECTS = [
  { code: '041', name: 'MATHEMATICS STANDARD', date: '17.02.2026' },
  { code: '184', name: 'ENGLISH', date: '21.02.2026' },
  { code: '086', name: 'SCIENCE', date: '25.02.2026' },
  { code: '087', name: 'SOCIAL SCIENCE', date: '07.03.2026' },
]

const selectClassName =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white'

const segmentButton = (active: boolean) =>
  `flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
    active
      ? 'bg-blue-600 text-white shadow-sm'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-900 dark:text-slate-300 dark:hover:bg-gray-700'
  }`

const Kv = ({ label, value }: { label: string; value: string }) => (
  <div className="mb-0.5 flex gap-1.5 text-[10px] leading-tight">
    <span className="w-[118px] shrink-0 font-bold">{label}</span>
    <span className="min-w-0 flex-1 uppercase">{value}</span>
  </div>
)

const AdmitCardPreview = ({
  design,
  schoolName,
  schoolAddress,
  schoolCode,
  logoUrl,
  compact,
}: {
  design: AdmitCardDesign
  schoolName: string
  schoolAddress: string
  schoolCode: string
  logoUrl?: string
  compact: boolean
}) => {
  const cardTitle = (design.title || 'ADMIT CARD FOR {exam}').replace(/\{exam\}/gi, 'SECONDARY EXAMINATION')
  const instructionLines = String(design.instructions || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <div className={`border-2 border-slate-900 p-0.5 ${compact ? 'text-[8px]' : ''}`}>
      <div className="border border-slate-900 p-2.5">
        {design.showHeader ? (
          <div className="mb-1.5 flex items-start gap-2">
            {design.showSchoolLogo ? (
              logoUrl ? (
                <img src={logoUrl} alt="School logo" className="h-12 w-12 shrink-0 rounded-full object-contain" />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-full border border-slate-400" />
              )
            ) : null}
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[12px] font-extrabold uppercase leading-tight text-slate-900 dark:text-white">{schoolName}</p>
              {design.showSchoolAddress ? (
                <p className="mt-0.5 text-[9px] text-slate-600 dark:text-slate-300">{schoolAddress}</p>
              ) : null}
              <p className="mt-1 text-[11px] font-extrabold uppercase text-slate-900 dark:text-white">{cardTitle}</p>
              {design.showEntryNote ? (
                <p className="mt-0.5 text-[8.5px] font-extrabold uppercase">{design.entryNote}</p>
              ) : null}
            </div>
            {design.showSchoolLogo ? (
              logoUrl ? (
                <img src={logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-contain" />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-full border border-slate-400" />
              )
            ) : null}
          </div>
        ) : (
          <p className="mb-1.5 text-center text-[11px] font-extrabold uppercase">{cardTitle}</p>
        )}

        <div className="my-1.5 border-t border-slate-900" />

        <div className="flex text-[10px]">
          {design.fields.rollNo ? (
            <div className="flex-1 border-r border-slate-900 pr-2">
              <div className="font-bold">Roll No.</div>
              <div>12</div>
            </div>
          ) : null}
          {design.fields.dob ? (
            <div className="flex-1 border-r border-slate-900 px-2">
              <div className="font-bold">Date of Birth</div>
              <div>24.10.2010</div>
            </div>
          ) : null}
          {design.fields.schoolNo ? (
            <div className="flex-1 border-r border-slate-900 px-2">
              <div className="font-bold">School No.</div>
              <div>{schoolCode || '40291'}</div>
            </div>
          ) : null}
          {design.fields.centreNo ? (
            <div className="flex-1 pl-2">
              <div className="font-bold">Centre No.</div>
              <div>{schoolCode || '829259'}</div>
            </div>
          ) : null}
        </div>
        {design.fields.rollNoInWords ? (
          <p className="mt-1.5 text-[10px]"><span className="font-bold">Roll No. (In words):</span> TWELVE ONLY</p>
        ) : null}

        <div className="my-1.5 border-t border-slate-900" />

        <div className="flex gap-2">
          {design.fields.photo ? (
            <div className="w-[72px] shrink-0 text-center">
              <div className="flex h-[88px] w-[72px] items-end justify-center border border-slate-900 text-[8px] text-slate-500">Photo</div>
              <p className="mt-1 text-[8px] font-bold uppercase">Aarav Sharma</p>
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            {design.fields.exam ? <Kv label="Examination:" value="Secondary Examination - Class: 10" /> : null}
            {design.fields.name ? <Kv label="Candidate’s Name:" value="Aarav Sharma" /> : null}
            {design.fields.motherName ? <Kv label="Mother’s Name:" value="Manisha Sharma" /> : null}
            {design.fields.fatherName ? <Kv label="Father/Guardian’s Name:" value="Rajesh Sharma" /> : null}
            {design.fields.schoolName ? <Kv label="Name of School:" value={schoolName} /> : null}
            {design.fields.examCentre ? <Kv label="Exam Centre:" value={schoolName} /> : null}
            {design.fields.pwdCategory ? <Kv label="Category of PwD:" value="Not Applicable" /> : null}
            {design.fields.admitCardId ? <Kv label="Admit Card ID:" value="ACUT12" /> : null}
            {design.fields.admissionNo ? <Kv label="Admission No:" value="3361" /> : null}
            {design.fields.section ? <Kv label="Section:" value="A" /> : null}
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          {design.fields.qr ? (
            <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center border border-slate-900 text-[9px] text-slate-500">QR</div>
          ) : null}
          {design.fields.subjects ? (
            <table className="w-full border-collapse text-[8.5px]">
              <thead>
                <tr>
                  {['Sub Code', 'Subject Name', 'Medium', 'Date'].map((heading) => (
                    <th key={heading} className="border border-slate-900 px-1 py-0.5 text-left font-bold uppercase">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_SUBJECTS.map((subject) => (
                  <tr key={subject.code}>
                    <td className="border border-slate-900 px-1 py-0.5">{subject.code}</td>
                    <td className="border border-slate-900 px-1 py-0.5">{subject.name}</td>
                    <td className="border border-slate-900 px-1 py-0.5" />
                    <td className="border border-slate-900 px-1 py-0.5">{subject.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        {design.showInstructions ? (
          <>
            <div className="my-1.5 border-t border-slate-900" />
            <p className="mb-1 text-[9px] font-extrabold uppercase">Important instructions to be strictly complied with -</p>
            {instructionLines.map((line) => (
              <p key={line} className="text-[8px] leading-snug text-slate-700 dark:text-slate-300">{line}</p>
            ))}
          </>
        ) : null}

        {design.showConfirmation ? (
          <p className="mt-1.5 text-[9px] font-extrabold uppercase">{design.confirmationText}</p>
        ) : null}

        <div className="mt-4 flex justify-between gap-2 text-center text-[8px] font-semibold">
          {design.signatures.candidate ? (
            <span className="flex-1">
              <span className="mb-1 block h-8" />
              <span className="block border-t border-slate-900 pt-1">Candidate</span>
            </span>
          ) : null}
          {design.signatures.parent ? (
            <span className="flex-1">
              <span className="mb-1 block h-8" />
              <span className="block border-t border-slate-900 pt-1">Parents</span>
            </span>
          ) : null}
          {design.signatures.examIncharge ? (
            <span className="flex-1">
              <span className="mb-1 flex h-8 items-end justify-center">
                {design.signatures.examInchargeDigital && design.signatures.examInchargeSignatureUrl ? (
                  <img src={design.signatures.examInchargeSignatureUrl} alt="Exam Incharge signature" className="max-h-8 max-w-full object-contain" />
                ) : null}
              </span>
              <span className="block border-t border-slate-900 pt-1">Exam Incharge</span>
            </span>
          ) : null}
          {design.signatures.principal ? (
            <span className="flex-1">
              <span className="mb-1 flex h-8 items-end justify-center">
                {design.signatures.principalDigital && design.signatures.principalSignatureUrl ? (
                  <img src={design.signatures.principalSignatureUrl} alt="Principal signature" className="max-h-8 max-w-full object-contain" />
                ) : null}
              </span>
              <span className="block border-t border-slate-900 pt-1">Principal</span>
            </span>
          ) : null}
        </div>

        {design.showDisclaimer ? (
          <p className="mt-2 text-[8px] font-bold text-red-700 dark:text-red-400">{design.disclaimer}</p>
        ) : null}
      </div>
    </div>
  )
}

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
                      schoolName={schoolName}
                      schoolAddress={schoolAddress}
                      schoolCode={schoolCode}
                      logoUrl={school.logoUrl}
                      compact={twoUp}
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
