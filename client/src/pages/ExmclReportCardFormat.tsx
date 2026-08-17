import React, { useEffect, useRef, useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Bold, ImagePlus, Italic, Save, Trash2, Type, Underline } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import exmclReportCardService, {
  DEFAULT_REPORT_CARD_DESIGN,
  REPORT_CARD_FONTS,
  fontFamilyToCss,
  mergeDesign,
  type ReportCardCanvasItem,
  type ReportCardDesign,
  type ReportCardFontFamily,
  type ReportCardOrientation,
  type ReportCardPageSize,
  type ReportCardStyleKey,
  type ReportCardTextStyle,
} from '@/services/exmclReportCardService'
import schoolProfileService, { type SchoolProfile } from '@/services/schoolProfileService'
import ReportCardPreview from '@/components/exmcl/ReportCardPreview'
import ReportCardCanvasLayer from '@/components/exmcl/ReportCardCanvasLayer'

const selectClassName =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white'

const segmentButton = (active: boolean) =>
  `flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
    active
      ? 'bg-blue-600 text-white shadow-sm'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-900 dark:text-slate-300 dark:hover:bg-gray-700'
  }`

const PAGE_ASPECT: Record<ReportCardPageSize, Record<ReportCardOrientation, string>> = {
  A4: { portrait: '210 / 297', landscape: '297 / 210' },
  legal: { portrait: '8.5 / 14', landscape: '14 / 8.5' },
  letter: { portrait: '8.5 / 11', landscape: '11 / 8.5' },
}

const PAGE_LABEL: Record<ReportCardPageSize, string> = {
  A4: 'A4',
  legal: 'Legal',
  letter: 'Letter',
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36]

const STYLE_LABELS: Record<ReportCardStyleKey, string> = {
  schoolName: 'School name',
  tagline: 'Tagline',
  meta: 'Address / contact',
  examTitle: 'Exam title',
  sectionHeading: 'Section heading',
  studentFields: 'Student details',
  tableHeader: 'Table header',
  tableBody: 'Table body',
  footer: 'Footer',
  signatures: 'Signatures',
}

const SAMPLE_SUBJECTS = [
  { name: 'English', maxMarks: 40, marksObtained: 34, grade: 'A2' },
  { name: 'Hindi', maxMarks: 40, marksObtained: 31, grade: 'B1' },
  { name: 'Mathematics', maxMarks: 40, marksObtained: 36, grade: 'A2' },
]

const ExmclReportCardFormat: React.FC = () => {
  const navigate = useNavigate()
  const [design, setDesign] = useState<ReportCardDesign>(DEFAULT_REPORT_CARD_DESIGN)
  const [school, setSchool] = useState<Partial<SchoolProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedStyleKey, setSelectedStyleKey] = useState<ReportCardStyleKey>('schoolName')
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [saved, profile] = await Promise.all([
          exmclReportCardService.getDesign(),
          schoolProfileService.getProfile().catch(() => null),
        ])
        if (cancelled) return
        setDesign(saved)
        if (profile) setSchool(profile)
      } catch {
        if (!cancelled) toast.error('Failed to load report card format.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const patchDesign = (patch: Partial<ReportCardDesign>) => {
    setDesign((prev) =>
      mergeDesign({
        ...prev,
        ...patch,
        signatures: { ...prev.signatures, ...(patch.signatures || {}) },
        labels: { ...prev.labels, ...(patch.labels || {}) },
        styles: { ...prev.styles, ...(patch.styles || {}) },
        columnWidths: { ...prev.columnWidths, ...(patch.columnWidths || {}) },
        canvasItems: patch.canvasItems || prev.canvasItems,
      })
    )
  }

  const updateText = (key: keyof ReportCardDesign, value: string) => {
    patchDesign({ [key]: value } as Partial<ReportCardDesign>)
  }

  const updateFlag = (key: keyof ReportCardDesign, value: boolean) => {
    patchDesign({ [key]: value } as Partial<ReportCardDesign>)
  }

  const currentStyle: ReportCardTextStyle = design.styles[selectedStyleKey]
  const selectedCanvasItem = design.canvasItems.find((item) => item.id === selectedCanvasId) || null
  const editingCanvasText = selectedCanvasItem?.type === 'text' ? selectedCanvasItem : null
  const fontControlsDisabled = selectedCanvasItem?.type === 'image'
  const activeStyle: ReportCardTextStyle = editingCanvasText
    ? {
        fontFamily: editingCanvasText.fontFamily || 'Arial',
        fontSize: editingCanvasText.fontSize,
        bold: editingCanvasText.bold,
        italic: editingCanvasText.italic,
        underline: editingCanvasText.underline,
      }
    : currentStyle

  const createCanvasId = () => `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  const addTextBox = () => {
    const nextZ = design.canvasItems.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1
    const item: ReportCardCanvasItem = {
      id: createCanvasId(),
      type: 'text',
      x: 22,
      y: 38,
      width: 18,
      height: 3,
      zIndex: nextZ,
      text: 'New text',
      imageUrl: '',
      fontFamily: 'Arial',
      fontSize: 18,
      bold: false,
      italic: false,
      underline: false,
      color: '#000000',
      align: 'left',
    }
    patchDesign({ canvasItems: [...design.canvasItems, item] })
    setSelectedCanvasId(item.id)
  }

  const addImageBox = async (file?: File) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const uploaded = await exmclReportCardService.uploadCanvasImage(file)
      if (!uploaded.url) throw new Error('Upload failed')
      const nextZ = design.canvasItems.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1
      const item: ReportCardCanvasItem = {
        id: createCanvasId(),
        type: 'image',
        x: 28,
        y: 28,
        width: 24,
        height: 16,
        zIndex: nextZ,
        text: '',
        imageUrl: uploaded.url,
        fontFamily: 'Arial',
        fontSize: 16,
        bold: false,
        italic: false,
        underline: false,
        color: '#000000',
        align: 'center',
      }
      patchDesign({ canvasItems: [...design.canvasItems, item] })
      setSelectedCanvasId(item.id)
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to add image.'))
    } finally {
      setUploadingImage(false)
    }
  }

  const updateCanvasItem = (id: string, patch: Partial<ReportCardCanvasItem>) => {
    patchDesign({
      canvasItems: design.canvasItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  const deleteSelectedCanvasItem = () => {
    if (!selectedCanvasId) return
    patchDesign({ canvasItems: design.canvasItems.filter((item) => item.id !== selectedCanvasId) })
    setSelectedCanvasId(null)
  }

  const updateCurrentStyle = (partial: Partial<ReportCardTextStyle>) => {
    if (editingCanvasText) {
      updateCanvasItem(editingCanvasText.id, partial)
      return
    }
    patchDesign({
      styles: {
        ...design.styles,
        [selectedStyleKey]: { ...design.styles[selectedStyleKey], ...partial },
      },
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const saved = await exmclReportCardService.saveDesign(design)
      setDesign(saved)
      toast.success('Report card format saved. ExmCl Report Card will use this layout.')
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to save report card format.'))
    } finally {
      setSaving(false)
    }
  }

  const pageAspect = PAGE_ASPECT[design.pageSize][design.orientation]

  return (
    <div className="p-6">
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Design Report Card</h2>
            <p className="mt-1 text-xs text-gray-500">
              Add text or pictures on the canvas, then drag to move and use the corners to resize — like Canva.
            </p>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Page size</p>
            <div className="flex gap-1">
              <button type="button" className={segmentButton(design.pageSize === 'A4')} onClick={() => patchDesign({ pageSize: 'A4' })}>A4</button>
              <button type="button" className={segmentButton(design.pageSize === 'legal')} onClick={() => patchDesign({ pageSize: 'legal' })}>Lgl</button>
              <button type="button" className={segmentButton(design.pageSize === 'letter')} onClick={() => patchDesign({ pageSize: 'letter' })}>Ltr</button>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Orientation</p>
            <div className="flex gap-1">
              <button type="button" className={segmentButton(design.orientation === 'portrait')} onClick={() => patchDesign({ orientation: 'portrait' })}>Portrait</button>
              <button type="button" className={segmentButton(design.orientation === 'landscape')} onClick={() => patchDesign({ orientation: 'landscape' })}>Landscape</button>
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">School name</span>
            <input value={design.schoolName} onChange={(e) => updateText('schoolName', e.target.value)} disabled={loading} className={`${selectClassName} mt-1`} />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tagline</span>
            <input value={design.tagline} onChange={(e) => updateText('tagline', e.target.value)} disabled={loading} className={`${selectClassName} mt-1`} />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">School Code</span>
            <input value={design.schoolCode} onChange={(e) => updateText('schoolCode', e.target.value)} disabled={loading} className={`${selectClassName} mt-1`} />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Address</span>
            <textarea value={design.address} onChange={(e) => updateText('address', e.target.value)} disabled={loading} rows={2} className={`${selectClassName} mt-1 min-h-[52px]`} />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">CBSE Aff. No</span>
            <input value={design.affiliationNo} onChange={(e) => updateText('affiliationNo', e.target.value)} disabled={loading} className={`${selectClassName} mt-1`} />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email Id</span>
            <input value={design.email} onChange={(e) => updateText('email', e.target.value)} disabled={loading} className={`${selectClassName} mt-1`} />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contact No</span>
            <input value={design.contact} onChange={(e) => updateText('contact', e.target.value)} disabled={loading} className={`${selectClassName} mt-1`} />
          </label>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Header</p>
            <Toggle label="School header" checked={design.showHeader} onChange={(value) => updateFlag('showHeader', value)} />
            <Toggle label="School logo" checked={design.showSchoolLogo} onChange={(value) => updateFlag('showSchoolLogo', value)} />
            <Toggle label="CBSE logo" checked={design.showCbseLogo} onChange={(value) => updateFlag('showCbseLogo', value)} />
            <Toggle label="Tagline" checked={design.showTagline} onChange={(value) => updateFlag('showTagline', value)} />
            <Toggle label="School Code" checked={design.showSchoolCode} onChange={(value) => updateFlag('showSchoolCode', value)} />
            <Toggle label="Address" checked={design.showAddress} onChange={(value) => updateFlag('showAddress', value)} />
            <Toggle label="CBSE Aff. No" checked={design.showAffiliation} onChange={(value) => updateFlag('showAffiliation', value)} />
            <Toggle label="Email Id" checked={design.showEmail} onChange={(value) => updateFlag('showEmail', value)} />
            <Toggle label="Contact No" checked={design.showContact} onChange={(value) => updateFlag('showContact', value)} />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Footer</p>
            <Toggle label="Attendance" checked={design.showAttendance} onChange={(value) => updateFlag('showAttendance', value)} />
            <Toggle label="Remarks" checked={design.showRemarks} onChange={(value) => updateFlag('showRemarks', value)} />
            <Toggle label="Date" checked={design.showDate} onChange={(value) => updateFlag('showDate', value)} />
            <Toggle
              label="Class Teacher sign"
              checked={design.signatures.classTeacher}
              onChange={(value) => patchDesign({ signatures: { ...design.signatures, classTeacher: value } })}
            />
            <Toggle
              label="Principal sign"
              checked={design.signatures.principal}
              onChange={(value) => patchDesign({ signatures: { ...design.signatures, principal: value } })}
            />
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
            onClick={() => navigate('/exmcl/report-card')}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-900"
          >
            Generate report cards
          </button>
        </aside>

        <section className="rounded-xl border border-gray-200 bg-slate-100 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Live preview · {PAGE_LABEL[design.pageSize]} · {design.orientation}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800">
              <button
                type="button"
                onClick={addTextBox}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700"
              >
                <Type className="h-3.5 w-3.5" />
                Add text
              </button>
              <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700">
                <ImagePlus className="h-3.5 w-3.5" />
                {uploadingImage ? 'Uploading...' : 'Add image'}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    void addImageBox(file)
                  }}
                />
              </label>
              <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-gray-600" />
              <span className="pr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {editingCanvasText ? 'Text box' : selectedCanvasItem?.type === 'image' ? 'Image' : STYLE_LABELS[selectedStyleKey]}
              </span>
              <select
                title="Font"
                aria-label="Font family"
                value={activeStyle.fontFamily}
                disabled={fontControlsDisabled}
                onChange={(event) => updateCurrentStyle({ fontFamily: event.target.value as ReportCardFontFamily })}
                className="h-7 max-w-[140px] rounded-md border border-slate-200 bg-white px-1.5 text-[11px] dark:border-gray-600 dark:bg-gray-900 dark:text-white disabled:opacity-50"
                style={{ fontFamily: fontFamilyToCss(activeStyle.fontFamily) }}
              >
                {REPORT_CARD_FONTS.map((font) => (
                  <option key={font.id} value={font.id} style={{ fontFamily: font.css }}>
                    {font.label}
                  </option>
                ))}
              </select>
              <select
                title="Font size"
                aria-label="Font size"
                value={activeStyle.fontSize}
                disabled={fontControlsDisabled}
                onChange={(event) => updateCurrentStyle({ fontSize: Number(event.target.value) })}
                className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] dark:border-gray-600 dark:bg-gray-900 dark:text-white disabled:opacity-50"
              >
                {Array.from(new Set([...FONT_SIZES, activeStyle.fontSize]))
                  .sort((a, b) => a - b)
                  .map((size) => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
              </select>
              <button
                type="button"
                title="Bold"
                disabled={fontControlsDisabled}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md disabled:opacity-40 ${activeStyle.bold ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`}
                onClick={() => updateCurrentStyle({ bold: !activeStyle.bold })}
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Italic"
                disabled={fontControlsDisabled}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md disabled:opacity-40 ${activeStyle.italic ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`}
                onClick={() => updateCurrentStyle({ italic: !activeStyle.italic })}
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Underline"
                disabled={fontControlsDisabled}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md disabled:opacity-40 ${activeStyle.underline ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`}
                onClick={() => updateCurrentStyle({ underline: !activeStyle.underline })}
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
              {editingCanvasText ? (
                <>
                  <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-gray-600" />
                  <input
                    type="color"
                    title="Text color"
                    aria-label="Text color"
                    value={editingCanvasText.color || '#000000'}
                    onChange={(event) => updateCanvasItem(editingCanvasText.id, { color: event.target.value })}
                    className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-white p-0.5 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    title="Align left"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${editingCanvasText.align === 'left' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`}
                    onClick={() => updateCanvasItem(editingCanvasText.id, { align: 'left' })}
                  >
                    <AlignLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Align center"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${editingCanvasText.align === 'center' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`}
                    onClick={() => updateCanvasItem(editingCanvasText.id, { align: 'center' })}
                  >
                    <AlignCenter className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Align right"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${editingCanvasText.align === 'right' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-gray-700'}`}
                    onClick={() => updateCanvasItem(editingCanvasText.id, { align: 'right' })}
                  >
                    <AlignRight className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : null}
              {selectedCanvasId ? (
                <button
                  type="button"
                  title="Delete selected"
                  onClick={deleteSelectedCanvasItem}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="overflow-auto">
            <div
              className="mx-auto max-w-full bg-white p-3 shadow-md dark:bg-gray-800"
              style={{
                aspectRatio: pageAspect,
                width: design.orientation === 'portrait' ? 'min(100%, 680px)' : '100%',
              }}
            >
              <div className="relative h-full">
                <ReportCardPreview
                  editable
                  design={design}
                  selectedStyleKey={selectedCanvasId ? null : selectedStyleKey}
                  onSelectStyle={(key) => {
                    setSelectedCanvasId(null)
                    setSelectedStyleKey(key)
                  }}
                  onChange={patchDesign}
                  data={{
                    examTitle: 'PERIODIC TEST – 2 (2026-27)',
                    logoUrl: school.logoUrl,
                    student: {
                      name: 'Amayra',
                      motherName: 'Unknown',
                      admNo: '4323',
                      classSection: '4th - Lily',
                      fatherName: 'Mr. Sumit',
                      gender: 'Female',
                    },
                    subjects: SAMPLE_SUBJECTS,
                    grandMax: 120,
                    grandObtained: 101,
                    percentage: '84.17',
                    overallGrade: 'A2',
                  }}
                />
                <ReportCardCanvasLayer
                  items={design.canvasItems}
                  selectedId={selectedCanvasId}
                  onSelect={setSelectedCanvasId}
                  onChange={(canvasItems) => patchDesign({ canvasItems })}
                />
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

export default ExmclReportCardFormat
