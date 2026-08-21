import React, { useCallback, useRef } from 'react'
import type {
  ReportCardColumnKey,
  ReportCardDesign,
  ReportCardStyleKey,
  ReportCardTextStyle,
} from '@/services/exmclReportCardService'
import { fontFamilyToCss } from '@/services/exmclReportCardService'

export type ReportCardPreviewSubject = {
  name: string
  maxMarks: string | number
  marksObtained: string | number
  grade: string
}

export type ReportCardPreviewData = {
  examTitle: string
  logoUrl?: string
  student: {
    name: string
    motherName: string
    admNo: string
    classSection: string
    fatherName: string
    gender: string
  }
  subjects: ReportCardPreviewSubject[]
  grandMax: string | number
  grandObtained: string | number
  percentage: string
  overallGrade: string
}

const COLUMN_KEYS: ReportCardColumnKey[] = ['subjects', 'maxMarks', 'marksObtained', 'grade']
const MIN_COL_PCT = 10

export const styleToCss = (style?: ReportCardTextStyle): React.CSSProperties => ({
  fontFamily: fontFamilyToCss(style?.fontFamily),
  fontSize: `${style?.fontSize || 11}px`,
  fontWeight: style?.bold ? 700 : 400,
  fontStyle: style?.italic ? 'italic' : 'normal',
  textDecoration: style?.underline ? 'underline' : 'none',
})

const CbseMark = () => (
  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-teal-700 bg-teal-50 text-center text-[9px] font-bold leading-tight text-teal-800">
    CBSE
  </div>
)

const selectedClass = (selected: boolean) =>
  selected ? 'ring-2 ring-blue-400 ring-offset-1 rounded-sm' : ''

type EditableProps = {
  value: string
  onChange?: (value: string) => void
  onSelect?: () => void
  selected?: boolean
  style?: React.CSSProperties
  className?: string
  multiline?: boolean
  rows?: number
  align?: 'left' | 'center' | 'right'
  readOnly?: boolean
}

const EditableText = ({
  value,
  onChange,
  onSelect,
  selected,
  style,
  className = '',
  multiline = false,
  rows = 2,
  align = 'left',
  readOnly = false,
}: EditableProps) => {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
  const shared = `w-full bg-transparent border-0 p-0 m-0 outline-none resize-none ${alignClass} ${selectedClass(Boolean(selected))} ${className}`

  if (!onChange || readOnly) {
    return (
      <div
        className={shared}
        style={style}
        onClick={onSelect}
        role={onSelect ? 'button' : undefined}
      >
        {value}
      </div>
    )
  }

  if (multiline) {
    return (
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onSelect}
        onClick={onSelect}
        className={`${shared} leading-snug`}
        style={style}
      />
    )
  }

  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onSelect}
      onClick={onSelect}
      className={shared}
      style={style}
    />
  )
}

export const ReportCardPreview = ({
  design,
  data,
  editable = false,
  selectedStyleKey = null,
  onSelectStyle,
  onChange,
}: {
  design: ReportCardDesign
  data: ReportCardPreviewData
  editable?: boolean
  selectedStyleKey?: ReportCardStyleKey | null
  onSelectStyle?: (key: ReportCardStyleKey) => void
  onChange?: (patch: Partial<ReportCardDesign>) => void
}) => {
  const tableRef = useRef<HTMLTableElement>(null)
  const styles = design.styles
  const labels = design.labels
  const widths = design.columnWidths

  const updateField = (key: keyof ReportCardDesign, value: string) => {
    onChange?.({ [key]: value } as Partial<ReportCardDesign>)
  }

  const updateLabel = (key: keyof ReportCardDesign['labels'], value: string) => {
    onChange?.({ labels: { ...design.labels, [key]: value } })
  }

  const select = (key: ReportCardStyleKey) => {
    onSelectStyle?.(key)
  }

  const startColumnResize = useCallback(
    (boundaryIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
      if (!editable || !onChange) return
      event.preventDefault()
      event.stopPropagation()
      const table = tableRef.current
      if (!table) return
      const tableWidth = table.getBoundingClientRect().width || 1
      const leftKey = COLUMN_KEYS[boundaryIndex]
      const rightKey = COLUMN_KEYS[boundaryIndex + 1]
      if (!leftKey || !rightKey) return
      const startX = event.clientX
      const startLeft = widths[leftKey]
      const startRight = widths[rightKey]

      const onMove = (moveEvent: MouseEvent) => {
        const deltaPct = ((moveEvent.clientX - startX) / tableWidth) * 100
        let nextLeft = startLeft + deltaPct
        let nextRight = startRight - deltaPct
        if (nextLeft < MIN_COL_PCT) {
          nextRight -= MIN_COL_PCT - nextLeft
          nextLeft = MIN_COL_PCT
        }
        if (nextRight < MIN_COL_PCT) {
          nextLeft -= MIN_COL_PCT - nextRight
          nextRight = MIN_COL_PCT
        }
        onChange({
          columnWidths: {
            ...design.columnWidths,
            [leftKey]: Math.round(nextLeft * 10) / 10,
            [rightKey]: Math.round(nextRight * 10) / 10,
          },
        })
      }

      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [design.columnWidths, editable, onChange, widths]
  )

  const isLandscape = design.orientation === 'landscape'

  const examTitleBlock = (
    <div className="border-b border-black px-2 py-1.5">
      <EditableText
        value={data.examTitle}
        readOnly
        onSelect={() => select('examTitle')}
        selected={selectedStyleKey === 'examTitle'}
        align="center"
        className="uppercase tracking-wide"
        style={styleToCss(styles.examTitle)}
      />
    </div>
  )

  const studentDetailsBlock = (
    <div className="px-3 py-2">
      <EditableText
        value={labels.studentDetails}
        onChange={editable ? (value) => updateLabel('studentDetails', value) : undefined}
        onSelect={() => select('sectionHeading')}
        selected={selectedStyleKey === 'sectionHeading'}
        className="mb-2"
        style={styleToCss(styles.sectionHeading)}
      />
      <div className="grid grid-cols-2 gap-x-6" style={styleToCss(styles.studentFields)} onClick={() => select('studentFields')}>
        <div className="space-y-1.5">
          <PreviewField label="Name:" value={data.student.name} />
          <PreviewField label="Mother Name:" value={data.student.motherName} />
          <PreviewField label="Gender:" value={data.student.gender} />
        </div>
        <div className="space-y-1.5">
          <PreviewField label="Adm. No:" value={data.student.admNo} />
          <PreviewField label="Class & Section:" value={data.student.classSection} />
          <PreviewField label="Father Name:" value={data.student.fatherName} />
        </div>
      </div>
    </div>
  )

  const marksBlock = (
    <>
      <EditableText
        value={labels.scholasticArea}
        onChange={editable ? (value) => updateLabel('scholasticArea', value) : undefined}
        onSelect={() => select('sectionHeading')}
        selected={selectedStyleKey === 'sectionHeading'}
        className={isLandscape ? 'mt-0' : 'mt-3'}
        style={styleToCss(styles.sectionHeading)}
      />

      <table
        ref={tableRef}
        className="mt-1 w-full border-collapse"
        style={{ tableLayout: 'fixed' }}
      >
        <colgroup>
          {COLUMN_KEYS.map((key) => (
            <col key={key} style={{ width: `${widths[key]}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr onClick={() => select('tableHeader')} style={styleToCss(styles.tableHeader)}>
            {COLUMN_KEYS.map((key, index) => (
              <th key={key} className="relative border border-black px-2 py-1">
                <EditableText
                  value={labels[key]}
                  onChange={editable ? (value) => updateLabel(key, value) : undefined}
                  onSelect={() => select('tableHeader')}
                  selected={selectedStyleKey === 'tableHeader'}
                  align="center"
                  style={styleToCss(styles.tableHeader)}
                />
                {editable && index < COLUMN_KEYS.length - 1 ? (
                  <div
                    className="absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize hover:bg-blue-400/40"
                    onMouseDown={(event) => startColumnResize(index, event)}
                    title="Drag to resize column"
                  />
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={styleToCss(styles.tableBody)} onClick={() => select('tableBody')}>
          {data.subjects.map((subject) => (
            <tr key={subject.name}>
              <td className="border border-black px-2 py-1 text-left font-semibold">{subject.name}</td>
              <td className="border border-black px-2 py-1 text-center">{subject.maxMarks}</td>
              <td className="border border-black px-2 py-1 text-center">{subject.marksObtained}</td>
              <td className="border border-black px-2 py-1 text-center">{subject.grade}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="border border-black px-2 py-1 text-left">
              <EditableText
                value={labels.grandTotal}
                onChange={editable ? (value) => updateLabel('grandTotal', value) : undefined}
                onSelect={() => select('tableBody')}
                style={{ ...styleToCss(styles.tableBody), fontWeight: 700 }}
              />
            </td>
            <td className="border border-black px-2 py-1 text-center">{data.grandMax}</td>
            <td className="border border-black px-2 py-1 text-center">{data.grandObtained}</td>
            <td className="border border-black px-2 py-1"></td>
          </tr>
        </tbody>
      </table>
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {COLUMN_KEYS.map((key) => (
            <col key={key} style={{ width: `${widths[key]}%` }} />
          ))}
        </colgroup>
        <tbody>
          <tr onClick={() => select('tableHeader')}>
            <td className="border border-black px-2 py-1 text-center">
              <EditableText
                value={labels.percentage}
                onChange={editable ? (value) => updateLabel('percentage', value) : undefined}
                onSelect={() => select('tableHeader')}
                align="center"
                style={{ ...styleToCss(styles.tableHeader), fontStyle: 'italic' }}
              />
            </td>
            <td className="border border-black px-2 py-1 text-center" style={styleToCss(styles.tableBody)}>
              {data.percentage}%
            </td>
            <td className="border border-black px-2 py-1 text-center">
              <EditableText
                value={labels.overallGrade}
                onChange={editable ? (value) => updateLabel('overallGrade', value) : undefined}
                onSelect={() => select('tableHeader')}
                align="center"
                style={{ ...styleToCss(styles.tableHeader), fontStyle: 'italic' }}
              />
            </td>
            <td className="border border-black px-2 py-1 text-center" style={styleToCss(styles.tableBody)}>
              {data.overallGrade}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )

  const footerBlock = (
    <div className={`${isLandscape ? 'mt-2' : 'mt-3'} space-y-2`} style={styleToCss(styles.footer)} onClick={() => select('footer')}>
      {design.showAttendance ? (
        <PreviewField
          label={
            <EditableText
              value={labels.attendance}
              onChange={editable ? (value) => updateLabel('attendance', value) : undefined}
              onSelect={() => select('footer')}
              className="w-auto"
              style={styleToCss(styles.footer)}
            />
          }
          value=""
        />
      ) : null}
      {design.showRemarks ? (
        <PreviewField
          label={
            <EditableText
              value={labels.remarks}
              onChange={editable ? (value) => updateLabel('remarks', value) : undefined}
              onSelect={() => select('footer')}
              className="w-auto"
              style={styleToCss(styles.footer)}
            />
          }
          value=""
        />
      ) : null}
      {design.showDate ? (
        <PreviewField
          label={
            <EditableText
              value={labels.date}
              onChange={editable ? (value) => updateLabel('date', value) : undefined}
              onSelect={() => select('footer')}
              className="w-auto"
              style={styleToCss(styles.footer)}
            />
          }
          value=""
          short
        />
      ) : null}
    </div>
  )

  const signaturesBlock = (
    <div className={`${isLandscape ? 'mt-4' : 'mt-8'} flex justify-between px-2`} style={styleToCss(styles.signatures)} onClick={() => select('signatures')}>
      {design.signatures.classTeacher ? (
        <div className="text-center">
          <div className="mx-auto mb-1 w-[120px] border-t border-black" />
          <EditableText
            value={labels.classTeacherSign}
            onChange={editable ? (value) => updateLabel('classTeacherSign', value) : undefined}
            onSelect={() => select('signatures')}
            selected={selectedStyleKey === 'signatures'}
            align="center"
            style={styleToCss(styles.signatures)}
          />
        </div>
      ) : (
        <div />
      )}
      {design.signatures.principal ? (
        <div className="text-center">
          <div className="mx-auto mb-1 w-[120px] border-t border-black" />
          <EditableText
            value={labels.principalSign}
            onChange={editable ? (value) => updateLabel('principalSign', value) : undefined}
            onSelect={() => select('signatures')}
            selected={selectedStyleKey === 'signatures'}
            align="center"
            style={styleToCss(styles.signatures)}
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <div
      className={`flex h-full min-h-0 flex-col border-[3px] border-double border-black bg-white p-2 text-black ${
        isLandscape ? 'landscape-page' : 'portrait-page'
      }`}
      data-orientation={design.orientation}
      data-page-size={design.pageSize}
    >
      {design.showHeader ? (
        <div className="border-2 border-black px-2 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center">
              {design.showSchoolLogo ? (
                data.logoUrl ? (
                  <img src={data.logoUrl} alt="School logo" className="h-[70px] w-[70px] object-contain" />
                ) : (
                  <div className="h-[70px] w-[70px] rounded-full border border-slate-300" />
                )
              ) : null}
            </div>
            <div className="min-w-0 flex-1 text-center">
              <EditableText
                value={design.schoolName}
                onChange={editable ? (value) => updateField('schoolName', value) : undefined}
                onSelect={() => select('schoolName')}
                selected={selectedStyleKey === 'schoolName'}
                align="center"
                className="uppercase tracking-wide leading-tight"
                style={styleToCss(styles.schoolName)}
              />
              {design.showTagline ? (
                <EditableText
                  value={design.tagline}
                  onChange={editable ? (value) => updateField('tagline', value) : undefined}
                  onSelect={() => select('tagline')}
                  selected={selectedStyleKey === 'tagline'}
                  align="center"
                  className="mt-1 font-serif"
                  style={styleToCss(styles.tagline)}
                />
              ) : null}
            </div>
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center">
              {design.showCbseLogo ? <CbseMark /> : null}
            </div>
          </div>

          <div
            className={`mt-2 grid grid-cols-[1fr_1.2fr_1fr] gap-x-2 leading-snug ${selectedClass(selectedStyleKey === 'meta')}`}
            onClick={() => select('meta')}
            style={styleToCss(styles.meta)}
          >
            <div className="text-left">
              {design.showSchoolCode ? (
                <div className="flex items-baseline gap-1">
                  <strong className="shrink-0">School Code:</strong>
                  <EditableText
                    value={design.schoolCode}
                    onChange={editable ? (value) => updateField('schoolCode', value) : undefined}
                    onSelect={() => select('meta')}
                    selected={false}
                    style={styleToCss(styles.meta)}
                  />
                </div>
              ) : null}
            </div>
            <div className="row-span-2 text-center">
              {design.showAddress ? (
                <EditableText
                  value={design.address}
                  onChange={editable ? (value) => updateField('address', value) : undefined}
                  onSelect={() => select('meta')}
                  multiline
                  rows={2}
                  align="center"
                  style={styleToCss(styles.meta)}
                />
              ) : null}
            </div>
            <div className="text-right">
              {design.showAffiliation ? (
                <div className="flex items-baseline justify-end gap-1">
                  <strong className="shrink-0">CBSE Aff. No:</strong>
                  <EditableText
                    value={design.affiliationNo}
                    onChange={editable ? (value) => updateField('affiliationNo', value) : undefined}
                    onSelect={() => select('meta')}
                    selected={false}
                    align="right"
                    className="min-w-0"
                    style={styleToCss(styles.meta)}
                  />
                </div>
              ) : null}
            </div>
            <div className="text-left">
              {design.showEmail ? (
                <div className="flex items-baseline gap-1">
                  <strong className="shrink-0">Email Id:</strong>
                  <EditableText
                    value={design.email}
                    onChange={editable ? (value) => updateField('email', value) : undefined}
                    onSelect={() => select('meta')}
                    selected={false}
                    style={styleToCss(styles.meta)}
                  />
                </div>
              ) : null}
            </div>
            <div className="text-right">
              {design.showContact ? (
                <div className="flex items-baseline justify-end gap-1">
                  <strong className="shrink-0">Contact No:</strong>
                  <EditableText
                    value={design.contact}
                    onChange={editable ? (value) => updateField('contact', value) : undefined}
                    onSelect={() => select('meta')}
                    selected={false}
                    align="right"
                    className="min-w-0"
                    style={styleToCss(styles.meta)}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isLandscape ? (
        <>
          <div className="mt-2 border-2 border-black">{examTitleBlock}</div>
          <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-3">
            <div className="flex min-h-0 flex-col border-2 border-black">
              {studentDetailsBlock}
              <div className="mt-auto px-3 pb-2">
                {footerBlock}
                {signaturesBlock}
              </div>
            </div>
            <div className="min-h-0 overflow-auto border-2 border-black p-2">{marksBlock}</div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 border-2 border-black">
            {examTitleBlock}
            {studentDetailsBlock}
          </div>
          {marksBlock}
          {footerBlock}
          {signaturesBlock}
        </>
      )}
    </div>
  )
}

const PreviewField = ({
  label,
  value,
  short = false,
}: {
  label: React.ReactNode
  value: string
  short?: boolean
}) => (
  <div className="flex items-baseline gap-1.5">
    <span className="shrink-0">{label}</span>
    <span className={`min-h-[14px] border-b border-black px-1 ${short ? 'w-[120px]' : 'flex-1'}`}>
      {value}
    </span>
  </div>
)

export default ReportCardPreview
