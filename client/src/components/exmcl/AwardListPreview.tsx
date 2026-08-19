import type { AwardListDesign } from '@/services/exmclAwardListService'

export type AwardListPreviewStudent = {
  rollNumber?: string
  classRollNo?: string | number
  name?: string
  fatherName?: string
}

export type AwardListPreviewData = {
  schoolName: string
  schoolAddress?: string
  logoUrl?: string
  className?: string
  section?: string
  examName?: string
  examDate?: string
  subject?: string
  maxMarks?: string | number
  subjects?: string[]
  students?: AwardListPreviewStudent[]
}

const Fill = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 items-baseline gap-1.5 text-[11px] text-slate-800">
    <span className="w-14 shrink-0 font-semibold">{label}</span>
    <span className="min-h-[16px] min-w-0 flex-1 border-b border-slate-800 px-1">{value}</span>
  </div>
)

export const AwardListPreview = ({
  design,
  data,
  compact = false,
}: {
  design: AwardListDesign
  data: AwardListPreviewData
  compact?: boolean
}) => {
  const extraMarks = Array.from({ length: design.extraMarkColumns || 0 }, (_, index) => `Marks ${index + 1}`)
  const subjectColumns = design.columns.subjects
    ? (data.subjects && data.subjects.length > 0 ? data.subjects : (data.subject?.trim() ? [data.subject.trim()] : ['Marks']))
    : []
  const students: AwardListPreviewStudent[] =
    data.students && data.students.length > 0
      ? data.students
      : Array.from({ length: 4 }, (): AwardListPreviewStudent => ({}))
  const textScale = compact ? 'text-[9px]' : 'text-[11px]'

  return (
    <div className={`min-w-0 bg-white ${compact ? 'px-1' : ''}`}>
      {design.showHeader ? (
        <div className="mb-1 text-center">
          {design.showSchoolLogo ? (
            data.logoUrl ? (
              <img src={data.logoUrl} alt="School logo" className={`mx-auto mb-1 object-contain ${compact ? 'h-8 w-8' : 'h-10 w-10'}`} />
            ) : (
              <div className={`mx-auto mb-1 border border-slate-300 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`} />
            )
          ) : null}
          <p className={`font-bold uppercase tracking-wide text-slate-900 ${compact ? 'text-[11px]' : 'text-sm'}`}>
            {data.schoolName}
          </p>
          {design.showSchoolAddress && data.schoolAddress ? (
            <p className={`mt-0.5 text-slate-700 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>{data.schoolAddress}</p>
          ) : null}
          <p className={`mt-1.5 font-bold uppercase tracking-wide text-slate-900 ${compact ? 'text-[10px]' : 'text-[12px]'}`}>
            {design.title}
          </p>
        </div>
      ) : (
        <p className="mb-1 text-center text-[12px] font-bold uppercase text-slate-900">{design.title}</p>
      )}

      {design.showInfoRow ? (
        <div className={`mb-3 mt-2 grid grid-cols-2 ${compact ? 'gap-x-4 gap-y-1' : 'gap-x-8 gap-y-1.5'}`}>
          <div className="space-y-1.5">
            {design.headerFields.class ? <Fill label="Class:" value={data.className || ''} /> : null}
            {design.headerFields.section ? <Fill label="Section:" value={data.section || ''} /> : null}
            {design.headerFields.exam ? <Fill label="Exam:" value={data.examName || ''} /> : null}
          </div>
          <div className="space-y-1.5">
            {design.headerFields.date ? <Fill label="Date:" value={data.examDate || ''} /> : null}
            {design.headerFields.subject ? <Fill label="Subject:" value={data.subject || ''} /> : null}
            {design.headerFields.mm ? <Fill label="M.M.:" value={data.maxMarks ? String(data.maxMarks) : ''} /> : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className={`min-w-full border-collapse ${textScale}`}>
          <thead>
            <tr className="bg-slate-50 text-left uppercase text-slate-600">
              {design.columns.srNo ? <th className="border border-slate-300 px-1 py-0.5">S.No</th> : null}
              {design.columns.rollNumber ? <th className="border border-slate-300 px-1 py-0.5">Adm No</th> : null}
              {design.columns.rollNo ? <th className="border border-slate-300 px-1 py-0.5">Roll No</th> : null}
              {design.columns.name ? <th className="border border-slate-300 px-1 py-0.5">Student Name</th> : null}
              {design.columns.fatherName ? <th className="border border-slate-300 px-1 py-0.5">Father Name</th> : null}
              {subjectColumns.map((subject) => (
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
{(students.length > 0 ? students : Array.from({ length: 4 }, (): AwardListPreviewStudent => ({}))).map((student, index) => (
              <tr key={`${student.rollNumber || 'row'}-${index}`}>
                {design.columns.srNo ? <td className="border border-slate-300 px-1 py-1.5">{index + 1}</td> : null}
                {design.columns.rollNumber ? <td className="border border-slate-300 px-1 py-1.5">{student.rollNumber || ''}</td> : null}
                {design.columns.rollNo ? <td className="border border-slate-300 px-1 py-1.5">{student.classRollNo || ''}</td> : null}
                {design.columns.name ? <td className="border border-slate-300 px-1 py-1.5">{student.name || ''}</td> : null}
                {design.columns.fatherName ? <td className="border border-slate-300 px-1 py-1.5">{student.fatherName || ''}</td> : null}
                {subjectColumns.map((subject) => (
                  <td key={`${index}-${subject}`} className="border border-slate-300 px-1 py-1.5"></td>
                ))}
                {extraMarks.map((label) => (
                  <td key={`${index}-${label}`} className="border border-slate-300 px-1 py-1.5"></td>
                ))}
                {design.columns.total ? <td className="border border-slate-300 px-1 py-1.5"></td> : null}
                {design.columns.grade ? <td className="border border-slate-300 px-1 py-1.5"></td> : null}
                {design.columns.checkerSign ? <td className="border border-slate-300 px-1 py-1.5"></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`mt-10 grid grid-cols-2 gap-y-10 font-semibold text-slate-800 ${compact ? 'text-[8px]' : 'text-[11px]'}`}>
        <span className="pt-6 text-left">{design.signatures.subjectTeacher ? 'Subject Teacher' : ''}</span>
        <span className="pt-6 text-right">{design.signatures.hod ? 'HOD' : ''}</span>
        <span className="pt-2 text-left">{design.signatures.examIncharge ? 'Exam Incharge' : ''}</span>
        <span className="pt-2 text-right">{design.signatures.principal ? 'Principal' : ''}</span>
      </div>
    </div>
  )
}

export default AwardListPreview
