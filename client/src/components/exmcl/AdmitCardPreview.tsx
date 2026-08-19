import type { AdmitCardDesign } from '@/services/exmclAdmitCardService'

export type AdmitCardPreviewStudent = {
  name?: string
  fatherName?: string
  motherName?: string
  gender?: string
  className?: string
  section?: string
  rollNo?: string | number
  admissionNo?: string
  dateOfBirth?: string
  photoUrl?: string
  pwdCategory?: string
  admitCardId?: string
}

export type AdmitCardPreviewSubject = {
  code: string
  name: string
  medium?: string
  date?: string
}

export type AdmitCardPreviewData = {
  schoolName: string
  schoolAddress?: string
  schoolCode?: string
  logoUrl?: string
  examName?: string
  student?: AdmitCardPreviewStudent
  subjects?: AdmitCardPreviewSubject[]
}

const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

const twoDigit = (value: number) => {
  if (value < 20) return ONES[value]
  const ten = Math.floor(value / 10)
  const one = value % 10
  return `${TENS[ten]}${one ? ` ${ONES[one]}` : ''}`.trim()
}

export const numberToIndianWords = (raw: string | number | undefined) => {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return String(raw || '').trim().toUpperCase()
  const n = Number(digits)
  if (!Number.isFinite(n) || n < 0) return digits
  if (n === 0) return 'ZERO ONLY'
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const hundred = n % 1000
  const threeDigit = (value: number) => {
    const h = Math.floor(value / 100)
    const rest = value % 100
    const parts = []
    if (h) parts.push(`${ONES[h]} HUNDRED`)
    if (rest) parts.push(twoDigit(rest))
    return parts.join(' ')
  }
  const parts: string[] = []
  if (crore) parts.push(`${threeDigit(crore)} CRORE`)
  if (lakh) parts.push(`${threeDigit(lakh)} LAKH`)
  if (thousand) parts.push(`${threeDigit(thousand)} THOUSAND`)
  if (hundred) parts.push(threeDigit(hundred))
  return `${parts.join(' ')} ONLY`
}

const DEFAULT_SUBJECTS: AdmitCardPreviewSubject[] = [
  { code: '041', name: 'MATHEMATICS STANDARD', date: '17.02.2026' },
  { code: '184', name: 'ENGLISH', date: '21.02.2026' },
  { code: '086', name: 'SCIENCE', date: '25.02.2026' },
  { code: '087', name: 'SOCIAL SCIENCE', date: '07.03.2026' },
]

const Kv = ({ label, value }: { label: string; value: string }) => (
  <div className="mb-0.5 flex gap-1.5 text-[10px] leading-tight">
    <span className="w-[118px] shrink-0 font-bold">{label}</span>
    <span className="min-w-0 flex-1 uppercase">{value}</span>
  </div>
)

export const AdmitCardPreview = ({
  design,
  data,
  compact = false,
}: {
  design: AdmitCardDesign
  data: AdmitCardPreviewData
  compact?: boolean
}) => {
  const student = data.student || {}
  const examName = data.examName || 'EXAMINATION'
  const cardTitle = (design.title || 'ADMIT CARD FOR {exam}').replace(/\{exam\}/gi, examName)
  const instructionLines = String(design.instructions || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const studentName = student.name || 'Student Name'
  const rollNo = student.rollNo ?? ''
  const className = student.className || ''
  const subjects = data.subjects && data.subjects.length > 0 ? data.subjects : DEFAULT_SUBJECTS
  const examinationLabel = `${examName}${className ? ` - CLASS: ${className}` : ''}`

  return (
    <div className={`border-2 border-slate-900 bg-white p-0.5 ${compact ? 'text-[8px]' : ''}`}>
      <div className="border border-slate-900 p-2.5">
        {design.showHeader ? (
          <div className="mb-1.5 flex items-start gap-2">
            {design.showSchoolLogo ? (
              data.logoUrl ? (
                <img src={data.logoUrl} alt="School logo" className="h-12 w-12 shrink-0 rounded-full object-contain" />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-full border border-slate-400" />
              )
            ) : null}
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[12px] font-extrabold uppercase leading-tight text-slate-900">{data.schoolName}</p>
              {design.showSchoolAddress && data.schoolAddress ? (
                <p className="mt-0.5 text-[9px] text-slate-600">{data.schoolAddress}</p>
              ) : null}
              <p className="mt-1 text-[11px] font-extrabold uppercase text-slate-900">{cardTitle}</p>
              {design.showEntryNote ? (
                <p className="mt-0.5 text-[8.5px] font-extrabold uppercase">{design.entryNote}</p>
              ) : null}
            </div>
            {design.showSchoolLogo ? (
              data.logoUrl ? (
                <img src={data.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-contain" />
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
              <div>{rollNo || '—'}</div>
            </div>
          ) : null}
          {design.fields.dob ? (
            <div className="flex-1 border-r border-slate-900 px-2">
              <div className="font-bold">Date of Birth</div>
              <div>{student.dateOfBirth || '—'}</div>
            </div>
          ) : null}
          {design.fields.schoolNo ? (
            <div className="flex-1 border-r border-slate-900 px-2">
              <div className="font-bold">School No.</div>
              <div>{data.schoolCode || '—'}</div>
            </div>
          ) : null}
          {design.fields.centreNo ? (
            <div className="flex-1 pl-2">
              <div className="font-bold">Centre No.</div>
              <div>{data.schoolCode || '—'}</div>
            </div>
          ) : null}
        </div>
        {design.fields.rollNoInWords ? (
          <p className="mt-1.5 text-[10px]">
            <span className="font-bold">Roll No. (In words):</span> {rollNo ? numberToIndianWords(rollNo) : '—'}
          </p>
        ) : null}

        <div className="my-1.5 border-t border-slate-900" />

        <div className="flex gap-2">
          {design.fields.photo ? (
            <div className="w-[72px] shrink-0 text-center">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="" className="h-[88px] w-[72px] border border-slate-900 object-cover" />
              ) : (
                <div className="flex h-[88px] w-[72px] items-end justify-center border border-slate-900 text-[8px] text-slate-500">Photo</div>
              )}
              <p className="mt-1 text-[8px] font-bold uppercase">{studentName}</p>
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            {design.fields.exam ? <Kv label="Examination:" value={examinationLabel} /> : null}
            {design.fields.name ? <Kv label="Candidate’s Name:" value={studentName} /> : null}
            {design.fields.motherName ? <Kv label="Mother’s Name:" value={student.motherName || '—'} /> : null}
            {design.fields.fatherName ? <Kv label="Father/Guardian’s Name:" value={student.fatherName || '—'} /> : null}
            {design.fields.gender ? <Kv label="Gender:" value={student.gender || '—'} /> : null}
            {design.fields.schoolName ? <Kv label="Name of School:" value={data.schoolName} /> : null}
            {design.fields.examCentre ? <Kv label="Exam Centre:" value={data.schoolName} /> : null}
            {design.fields.pwdCategory ? <Kv label="Category of PwD:" value={student.pwdCategory || 'Not Applicable'} /> : null}
            {design.fields.admitCardId ? <Kv label="Admit Card ID:" value={student.admitCardId || '—'} /> : null}
            {design.fields.admissionNo ? <Kv label="Admission No:" value={student.admissionNo || '—'} /> : null}
            {design.fields.section ? <Kv label="Section:" value={student.section || '—'} /> : null}
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
                {subjects.map((subject, index) => (
                  <tr key={`${subject.code}-${index}`}>
                    <td className="border border-slate-900 px-1 py-0.5">{subject.code}</td>
                    <td className="border border-slate-900 px-1 py-0.5">{subject.name}</td>
                    <td className="border border-slate-900 px-1 py-0.5">{subject.medium || ''}</td>
                    <td className="border border-slate-900 px-1 py-0.5">{subject.date || ''}</td>
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
              <p key={line} className="text-[8px] leading-snug text-slate-700">{line}</p>
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
          <p className="mt-2 text-[8px] font-bold text-red-700">{design.disclaimer}</p>
        ) : null}
      </div>
    </div>
  )
}

export default AdmitCardPreview
