import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import exmclReportCardService, {
  DEFAULT_REPORT_CARD_DESIGN,
  mergeDesign,
  type ReportCardDesign,
  type ReportCardOrientation,
  type ReportCardPageSize,
  type ReportCardStyleKey,
  type ReportCardTextStyle,
} from '@/services/exmclReportCardService'
import schoolProfileService, { type SchoolProfile } from '@/services/schoolProfileService'
import ReportCardPreview from '@/components/exmcl/ReportCardPreview'
import {
  FormatEditorShell,
  ToggleRow,
  getFormatDefinition,
  segmentButton,
  fieldClassName,
  type FormatTextStyle,
} from '@/components/format-editor'
import { useFormatCanvas } from '@/hooks/useFormatCanvas'

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

const FORMAT = getFormatDefinition('report-card')

const ExmclReportCardFormat: React.FC = () => {
  const navigate = useNavigate()
  const [design, setDesign] = useState<ReportCardDesign>(DEFAULT_REPORT_CARD_DESIGN)
  const [school, setSchool] = useState<Partial<SchoolProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedStyleKey, setSelectedStyleKey] = useState<ReportCardStyleKey>('schoolName')

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

  const canvas = useFormatCanvas(
    design.canvasItems,
    (canvasItems) => patchDesign({ canvasItems }),
    (file) => exmclReportCardService.uploadCanvasImage(file)
  )

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

  const boundStyle: ReportCardTextStyle = design.styles[selectedStyleKey]
  const activeStyle: FormatTextStyle =
    canvas.selected?.type === 'text'
      ? {
          fontFamily: canvas.selected.fontFamily,
          fontSize: canvas.selected.fontSize,
          bold: canvas.selected.bold,
          italic: canvas.selected.italic,
          underline: canvas.selected.underline,
        }
      : boundStyle

  const selectionLabel =
    canvas.selected?.type === 'text'
      ? 'Text box'
      : canvas.selected?.type === 'image'
        ? 'Image'
        : canvas.selected?.type === 'rect'
          ? 'Box'
          : canvas.selected?.type === 'line'
            ? 'Line'
            : STYLE_LABELS[selectedStyleKey]

  const handleStyleChange = (partial: Partial<FormatTextStyle>) => {
    if (canvas.selected?.type === 'text') {
      canvas.patchItem(partial)
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

  const inspector = (
    <>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Page size</p>
        <div className="flex gap-1">
          {(['A4', 'legal', 'letter'] as ReportCardPageSize[]).map((size) => (
            <button key={size} type="button" className={segmentButton(design.pageSize === size)} onClick={() => patchDesign({ pageSize: size })}>
              {size === 'legal' ? 'Lgl' : size === 'letter' ? 'Ltr' : 'A4'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Orientation</p>
        <div className="flex gap-1">
          {(['portrait', 'landscape'] as ReportCardOrientation[]).map((orientation) => (
            <button key={orientation} type="button" className={segmentButton(design.orientation === orientation)} onClick={() => patchDesign({ orientation })}>
              {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
            </button>
          ))}
        </div>
      </div>
      {([
        ['schoolName', 'School name'],
        ['tagline', 'Tagline'],
        ['schoolCode', 'School Code'],
        ['affiliationNo', 'CBSE Aff. No'],
        ['email', 'Email Id'],
        ['contact', 'Contact No'],
      ] as Array<[keyof ReportCardDesign, string]>).map(([key, label]) => (
        <label key={key} className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
          <input
            value={String(design[key] || '')}
            onChange={(event) => patchDesign({ [key]: event.target.value } as Partial<ReportCardDesign>)}
            disabled={loading}
            className={`${fieldClassName} mt-1`}
          />
        </label>
      ))}
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Address</span>
        <textarea value={design.address} onChange={(event) => patchDesign({ address: event.target.value })} disabled={loading} rows={2} className={`${fieldClassName} mt-1 min-h-[52px]`} />
      </label>
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Header</p>
        <ToggleRow label="School header" checked={design.showHeader} onChange={(value) => patchDesign({ showHeader: value })} />
        <ToggleRow label="School logo" checked={design.showSchoolLogo} onChange={(value) => patchDesign({ showSchoolLogo: value })} />
        <ToggleRow label="CBSE logo" checked={design.showCbseLogo} onChange={(value) => patchDesign({ showCbseLogo: value })} />
        <ToggleRow label="Tagline" checked={design.showTagline} onChange={(value) => patchDesign({ showTagline: value })} />
        <ToggleRow label="School Code" checked={design.showSchoolCode} onChange={(value) => patchDesign({ showSchoolCode: value })} />
        <ToggleRow label="Address" checked={design.showAddress} onChange={(value) => patchDesign({ showAddress: value })} />
        <ToggleRow label="CBSE Aff. No" checked={design.showAffiliation} onChange={(value) => patchDesign({ showAffiliation: value })} />
        <ToggleRow label="Email Id" checked={design.showEmail} onChange={(value) => patchDesign({ showEmail: value })} />
        <ToggleRow label="Contact No" checked={design.showContact} onChange={(value) => patchDesign({ showContact: value })} />
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Footer</p>
        <ToggleRow label="Attendance" checked={design.showAttendance} onChange={(value) => patchDesign({ showAttendance: value })} />
        <ToggleRow label="Remarks" checked={design.showRemarks} onChange={(value) => patchDesign({ showRemarks: value })} />
        <ToggleRow label="Date" checked={design.showDate} onChange={(value) => patchDesign({ showDate: value })} />
        <ToggleRow label="Class Teacher sign" checked={design.signatures.classTeacher} onChange={(value) => patchDesign({ signatures: { ...design.signatures, classTeacher: value } })} />
        <ToggleRow label="Principal sign" checked={design.signatures.principal} onChange={(value) => patchDesign({ signatures: { ...design.signatures, principal: value } })} />
      </div>
      <p className="text-[10px] text-slate-400">Merge fields: {FORMAT.mergeFields.join(' ')}</p>
    </>
  )

  return (
    <FormatEditorShell
      title="Design Report Card"
      description="Start from the school template, then style bound fields or add free text, images, boxes, and lines."
      pageSize={design.pageSize}
      orientation={design.orientation}
      inspector={inspector}
      boundLayer={
        <div className="h-full">
          <ReportCardPreview
            editable
            design={design}
            selectedStyleKey={canvas.selectedId ? null : selectedStyleKey}
            onSelectStyle={(key) => {
              canvas.setSelectedId(null)
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
        </div>
      }
      canvasItems={design.canvasItems}
      selectedCanvasId={canvas.selectedId}
      onSelectCanvas={canvas.setSelectedId}
      onCanvasChange={(canvasItems) => patchDesign({ canvasItems })}
      selectionLabel={selectionLabel}
      style={activeStyle}
      styleDisabled={canvas.selected?.type === 'image' || canvas.selected?.type === 'rect' || canvas.selected?.type === 'line'}
      selectedCanvasItem={canvas.selected}
      onStyleChange={handleStyleChange}
      onAddText={() => canvas.addItem('text')}
      onAddImage={canvas.addImage}
      onAddRect={() => canvas.addItem('rect')}
      onAddLine={() => canvas.addItem('line')}
      onPatchCanvas={canvas.patchItem}
      onDeleteCanvas={canvas.removeSelected}
      uploadingImage={canvas.uploading}
      loading={loading}
      saving={saving}
      onSave={() => void handleSave()}
      generateLabel={FORMAT.generateLabel}
      onGenerate={() => navigate(FORMAT.generatePath)}
      onResetTemplate={() => {
        setDesign(DEFAULT_REPORT_CARD_DESIGN)
        canvas.setSelectedId(null)
        toast.success('Reset to the IB-style report card template.')
      }}
    />
  )
}

export default ExmclReportCardFormat
