import React, { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import exmclAwardListService, {
  DEFAULT_AWARD_LIST_DESIGN,
  type AwardListDesign,
} from '@/services/exmclAwardListService'
import schoolProfileService, { type SchoolProfile } from '@/services/schoolProfileService'

const SAMPLE_SUBJECTS = ['English', 'Mathematics', 'Science']
const PREVIEW_SCHOOL = {
  name: 'DELHI PUBLIC SCHOOL, ROHTAK',
  address: '0.5 Km Mile Stone, Jind Road, Rohtak',
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

type PreviewSample = {
  className: string
  section: string
  exam: string
  date: string
  subject: string
  mm: string
}

const FillLine = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) => (
  <label className="flex min-w-0 items-baseline gap-1.5 text-[11px] text-slate-800 dark:text-slate-200">
    <span className="w-14 shrink-0 font-semibold">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[16px] min-w-0 flex-1 border-0 border-b border-slate-800 bg-transparent px-1 text-[11px] outline-none dark:border-slate-400"
    />
  </label>
)

const AwardListCopy = ({
  design,
  schoolName,
  schoolAddress,
  logoUrl,
  sample,
  onSampleChange,
  compact,
}: {
  design: AwardListDesign
  schoolName: string
  schoolAddress: string
  logoUrl?: string
  sample: PreviewSample
  onSampleChange: (key: keyof PreviewSample, value: string) => void
  compact: boolean
}) => {
  const previewSubjects = design.columns.subjects
    ? (sample.subject.trim() ? [sample.subject.trim()] : SAMPLE_SUBJECTS)
    : []
  const extraMarks = Array.from({ length: design.extraMarkColumns }, (_, index) => `Marks ${index + 1}`)
  const textScale = compact ? 'text-[9px]' : 'text-[11px]'

  return (
    <div className={`min-w-0 ${compact ? 'px-1' : ''}`}>
      {design.showHeader ? (
        <div className="mb-1 text-center">
          {design.showSchoolLogo ? (
            logoUrl ? (
              <img src={logoUrl} alt="School logo" className={`mx-auto mb-1 object-contain ${compact ? 'h-8 w-8' : 'h-10 w-10'}`} />
            ) : (
              <div className={`mx-auto mb-1 border border-slate-300 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`} />
            )
          ) : null}
          <p className={`font-bold uppercase tracking-wide text-slate-900 dark:text-white ${compact ? 'text-[11px]' : 'text-sm'}`}>
            {schoolName}
          </p>
          {design.showSchoolAddress ? (
            <p className={`mt-0.5 text-slate-700 dark:text-slate-300 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>{schoolAddress}</p>
          ) : null}
          <p className={`mt-1.5 font-bold uppercase tracking-wide text-slate-900 dark:text-white ${compact ? 'text-[10px]' : 'text-[12px]'}`}>
            {design.title}
          </p>
        </div>
      ) : (
        <p className="mb-1 text-center text-[12px] font-bold uppercase text-slate-900 dark:text-white">{design.title}</p>
      )}

      {design.showInfoRow ? (
        <div className={`mb-3 mt-2 grid grid-cols-2 ${compact ? 'gap-x-4 gap-y-1' : 'gap-x-8 gap-y-1.5'}`}>
          <div className="space-y-1.5">
            {design.headerFields.class ? <FillLine label="Class:" value={sample.className} onChange={(value) => onSampleChange('className', value)} /> : null}
            {design.headerFields.section ? <FillLine label="Section:" value={sample.section} onChange={(value) => onSampleChange('section', value)} /> : null}
            {design.headerFields.exam ? <FillLine label="Exam:" value={sample.exam} onChange={(value) => onSampleChange('exam', value)} /> : null}
          </div>
          <div className="space-y-1.5">
            {design.headerFields.date ? <FillLine label="Date:" value={sample.date} onChange={(value) => onSampleChange('date', value)} /> : null}
            {design.headerFields.subject ? <FillLine label="Subject:" value={sample.subject} onChange={(value) => onSampleChange('subject', value)} /> : null}
            {design.headerFields.mm ? <FillLine label="M.M.:" value={sample.mm} onChange={(value) => onSampleChange('mm', value)} /> : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className={`min-w-full border-collapse ${textScale}`}>
          <thead>
            <tr className="bg-slate-50 text-left uppercase text-slate-600 dark:bg-gray-900 dark:text-slate-300">
              {design.columns.srNo ? <th className="border border-slate-300 px-1 py-0.5">S.No</th> : null}
              {design.columns.rollNumber ? <th className="border border-slate-300 px-1 py-0.5">Adm No</th> : null}
              {design.columns.rollNo ? <th className="border border-slate-300 px-1 py-0.5">Roll No</th> : null}
              {design.columns.name ? <th className="border border-slate-300 px-1 py-0.5">Student Name</th> : null}
              {design.columns.fatherName ? <th className="border border-slate-300 px-1 py-0.5">Father Name</th> : null}
              {previewSubjects.map((subject) => (
                <th key={subject} className="border border-slate-300 px-1 py-0.5">{subject}</th>
              ))}
              {extraMarks.map((label) => (
                <th key={label} className="border border-slate-300 px-1 py-0.5">{label}</th>
              ))}
              {design.columns.total ? <th className="border border-slate-300 px-1 py-0.5">M.O.</th> : null}
              {design.columns.grade ? <th className="border border-slate-300 px-1 py-0.5">Grade</th> : null}
              {design.columns.checkerSign ? <th className="border border-slate-300 px-1 py-0.5">Checker Sign</th> : null}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((row) => (
              <tr key={row}>
                {design.columns.srNo ? <td className="border border-slate-300 px-1 py-1.5">{row}</td> : null}
                {design.columns.rollNumber ? <td className="border border-slate-300 px-1 py-1.5"></td> : null}
                {design.columns.rollNo ? <td className="border border-slate-300 px-1 py-1.5"></td> : null}
                {design.columns.name ? <td className="border border-slate-300 px-1 py-1.5"></td> : null}
                {design.columns.fatherName ? <td className="border border-slate-300 px-1 py-1.5"></td> : null}
                {previewSubjects.map((subject) => (
                  <td key={`${row}-${subject}`} className="border border-slate-300 px-1 py-1.5"></td>
                ))}
                {extraMarks.map((label) => (
                  <td key={`${row}-${label}`} className="border border-slate-300 px-1 py-1.5"></td>
                ))}
                {design.columns.total ? <td className="border border-slate-300 px-1 py-1.5"></td> : null}
                {design.columns.grade ? <td className="border border-slate-300 px-1 py-1.5"></td> : null}
                {design.columns.checkerSign ? <td className="border border-slate-300 px-1 py-1.5"></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`mt-6 grid grid-cols-2 gap-y-5 font-semibold text-slate-800 dark:text-slate-200 ${compact ? 'text-[8px]' : 'text-[11px]'}`}>
        <span className="text-left">{design.signatures.subjectTeacher ? 'Subject Teacher' : ''}</span>
        <span className="text-right">{design.signatures.hod ? 'HOD' : ''}</span>
        <span className="text-left">{design.signatures.examIncharge ? 'Exam Incharge' : ''}</span>
        <span className="text-right">{design.signatures.principal ? 'Principal' : ''}</span>
      </div>
    </div>
  )
}

const ExmclAwardListFormat: React.FC = () => {
  const navigate = useNavigate()
  const [design, setDesign] = useState<AwardListDesign>(DEFAULT_AWARD_LIST_DESIGN)
  const [school, setSchool] = useState<Partial<SchoolProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sample, setSample] = useState<PreviewSample>({
    className: '10th',
    section: 'A',
    exam: 'Unit Test',
    date: '',
    subject: '',
    mm: '80',
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [saved, profile] = await Promise.all([
          exmclAwardListService.getDesign(),
          schoolProfileService.getProfile().catch(() => null),
        ])
        if (cancelled) return
        setDesign(saved)
        if (profile) setSchool(profile)
      } catch {
        if (!cancelled) toast.error('Failed to load award list format.')
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
  const twoUp = design.copiesPerSheet === 2
  const pageAspect = PAGE_ASPECT[design.pageSize][design.orientation]
  const copyCount = useMemo(() => (twoUp ? [0, 1] : [0]), [twoUp])

  const updateColumn = (key: keyof AwardListDesign['columns'], value: boolean) => {
    setDesign((prev) => ({ ...prev, columns: { ...prev.columns, [key]: value } }))
  }

  const updateSignature = (key: keyof AwardListDesign['signatures'], value: boolean) => {
    setDesign((prev) => ({ ...prev, signatures: { ...prev.signatures, [key]: value } }))
  }

  const updateHeaderField = (key: keyof AwardListDesign['headerFields'], value: boolean) => {
    setDesign((prev) => ({ ...prev, headerFields: { ...prev.headerFields, [key]: value } }))
  }

  const handleSampleChange = (key: keyof PreviewSample, value: string) => {
    setSample((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const saved = await exmclAwardListService.saveDesign(design)
      setDesign(saved)
      toast.success('Award list format saved. ExmCl Award List will use this layout.')
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to save award list format.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Design Award List</h2>
            <p className="mt-1 text-xs text-gray-500">
              Preview updates as you change the layout. School name and address come from Centre Details.
            </p>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Heading</span>
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
              <button type="button" className={segmentButton(design.pageSize === 'A4')} onClick={() => setDesign((prev) => ({ ...prev, pageSize: 'A4' }))}>
                A4
              </button>
              <button type="button" className={segmentButton(design.pageSize === 'legal')} onClick={() => setDesign((prev) => ({ ...prev, pageSize: 'legal' }))}>
                Lgl
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Orientation</p>
            <div className="flex gap-1">
              <button type="button" className={segmentButton(design.orientation === 'landscape')} onClick={() => setDesign((prev) => ({ ...prev, orientation: 'landscape' }))}>
                Landscape
              </button>
              <button type="button" className={segmentButton(design.orientation === 'portrait')} onClick={() => setDesign((prev) => ({ ...prev, orientation: 'portrait' }))}>
                Portrait
              </button>
            </div>
          </div>

          <Toggle
            label="2 award lists on one sheet"
            checked={twoUp}
            onChange={(value) => setDesign((prev) => ({ ...prev, copiesPerSheet: value ? 2 : 1 }))}
          />

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Header</p>
            <Toggle label="School name" checked={design.showHeader} onChange={(value) => setDesign((prev) => ({ ...prev, showHeader: value }))} />
            <Toggle label="School address" checked={design.showSchoolAddress} onChange={(value) => setDesign((prev) => ({ ...prev, showSchoolAddress: value }))} />
            <Toggle label="School logo" checked={design.showSchoolLogo} onChange={(value) => setDesign((prev) => ({ ...prev, showSchoolLogo: value }))} />
            <Toggle label="Header fields" checked={design.showInfoRow} onChange={(value) => setDesign((prev) => ({ ...prev, showInfoRow: value }))} />
          </div>

          {design.showInfoRow ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Header fields</p>
              <Toggle label="Class" checked={design.headerFields.class} onChange={(value) => updateHeaderField('class', value)} />
              <Toggle label="Section" checked={design.headerFields.section} onChange={(value) => updateHeaderField('section', value)} />
              <Toggle label="Exam" checked={design.headerFields.exam} onChange={(value) => updateHeaderField('exam', value)} />
              <Toggle label="Date" checked={design.headerFields.date} onChange={(value) => updateHeaderField('date', value)} />
              <Toggle label="Subject" checked={design.headerFields.subject} onChange={(value) => updateHeaderField('subject', value)} />
              <Toggle label="M.M." checked={design.headerFields.mm} onChange={(value) => updateHeaderField('mm', value)} />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Columns</p>
            <Toggle label="S.No" checked={design.columns.srNo} onChange={(value) => updateColumn('srNo', value)} />
            <Toggle label="Admission No" checked={design.columns.rollNumber} onChange={(value) => updateColumn('rollNumber', value)} />
            <Toggle label="Roll No" checked={design.columns.rollNo} onChange={(value) => updateColumn('rollNo', value)} />
            <Toggle label="Student Name" checked={design.columns.name} onChange={(value) => updateColumn('name', value)} />
            <Toggle label="Father Name" checked={design.columns.fatherName} onChange={(value) => updateColumn('fatherName', value)} />
            <Toggle label="Subject mark columns" checked={design.columns.subjects} onChange={(value) => updateColumn('subjects', value)} />
            <Toggle label="M.O." checked={design.columns.total} onChange={(value) => updateColumn('total', value)} />
            <Toggle label="Grade" checked={design.columns.grade} onChange={(value) => updateColumn('grade', value)} />
            <Toggle label="Checker sign" checked={design.columns.checkerSign} onChange={(value) => updateColumn('checkerSign', value)} />
            <label className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-200">
              Extra blank mark columns
              <input
                type="number"
                min={0}
                max={8}
                value={design.extraMarkColumns}
                onChange={(e) => setDesign((prev) => ({ ...prev, extraMarkColumns: Math.min(8, Math.max(0, Number(e.target.value) || 0)) }))}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signatures</p>
            <Toggle label="Subject Teacher" checked={design.signatures.subjectTeacher} onChange={(value) => updateSignature('subjectTeacher', value)} />
            <Toggle label="HOD" checked={design.signatures.hod} onChange={(value) => updateSignature('hod', value)} />
            <Toggle label="Exam Incharge" checked={design.signatures.examIncharge} onChange={(value) => updateSignature('examIncharge', value)} />
            <Toggle label="Principal" checked={design.signatures.principal} onChange={(value) => updateSignature('principal', value)} />
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
            onClick={() => navigate('/exmcl/award-list')}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-900"
          >
            Generate award list
          </button>
        </aside>

        <section className="rounded-xl border border-gray-200 bg-slate-100 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Live preview · {design.pageSize === 'legal' ? 'Legal' : 'A4'} · {design.orientation} · {twoUp ? '2 per sheet' : '1 per sheet'}
            </p>
            <p className="text-[11px] text-slate-400">Type into header lines to preview values</p>
          </div>
          <div className="overflow-auto">
            <div
              className="mx-auto max-w-full bg-white p-4 shadow-md dark:bg-gray-800"
              style={{ aspectRatio: pageAspect, width: design.orientation === 'portrait' ? 'min(100%, 520px)' : '100%' }}
            >
              <div className={twoUp ? 'flex h-full gap-3' : 'h-full'}>
                {copyCount.map((index) => (
                  <div
                    key={index}
                    className={twoUp ? 'min-w-0 flex-1 border-r border-dashed border-slate-300 pr-3 last:border-r-0 last:pr-0 last:pl-3' : ''}
                  >
                    <AwardListCopy
                      design={design}
                      schoolName={schoolName}
                      schoolAddress={schoolAddress}
                      logoUrl={school.logoUrl}
                      sample={sample}
                      onSampleChange={handleSampleChange}
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

export default ExmclAwardListFormat
