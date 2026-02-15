import React, { useMemo, useState } from 'react'

type SchoolSummary = {
  schoolCode: string
  schoolName: string
  totalCandidates: number
  classXRollFrom: string
  classXRollTo: string
  classXTotal: number
  classXIIRollFrom: string
  classXIIRollTo: string
  classXIITotal: number
}

type ObserverDetail = {
  name: string
  schoolCode: string
  schoolName: string
}

type ExamDayDetail = {
  examDayNo: number
  date: string
  day: string
  subjectName: string
  subjectCode: string
  duration: string
  classes: 'X' | 'XII' | 'Both'
  roomsUsed: number
  examFunctionaries: number
  observerAssigned: boolean
  observerDetails: ObserverDetail[]
  sheetsUsed: number
  sheetType: string
  sheetSerialFrom: string
  sheetSerialTo: string
  hindiMediumCandidates: Array<{ rollNo: string; roomNo: string; serialNo: string }>
  pwdCandidates: Array<{ roomNo: string; rollNo: string; sheetNo: string }>
  clothColour: string
  markerColour: string
  packetsCount: number
}

const Dashboard: React.FC = () => {
  const schoolSummaries: SchoolSummary[] = [
    {
      schoolCode: '40291',
      schoolName: 'International Bharti School, Rohtak',
      totalCandidates: 126,
      classXRollFrom: '31194810',
      classXRollTo: '31194920',
      classXTotal: 64,
      classXIIRollFrom: '31683203',
      classXIIRollTo: '31683301',
      classXIITotal: 62,
    },
    {
      schoolCode: '41001',
      schoolName: 'KV Public School, Ladhot Road',
      totalCandidates: 84,
      classXRollFrom: '31194921',
      classXRollTo: '31194980',
      classXTotal: 40,
      classXIIRollFrom: '31683302',
      classXIIRollTo: '31683345',
      classXIITotal: 44,
    },
  ]

  const examDaysSummary = {
    total: 12,
    classX: 6,
    classXII: 6,
  }

  const examDayDetails: ExamDayDetail[] = [
    {
      examDayNo: 1,
      date: '2026-03-01',
      day: 'Sunday',
      subjectName: 'English Core',
      subjectCode: '301',
      duration: '3 Hours',
      classes: 'Both',
      roomsUsed: 24,
      examFunctionaries: 52,
      observerAssigned: true,
      observerDetails: [
        { name: 'Amit Verma', schoolCode: '40988', schoolName: 'Govt Sr Sec School' },
      ],
      sheetsUsed: 610,
      sheetType: 'Main Answer Sheet',
      sheetSerialFrom: 'A100001',
      sheetSerialTo: 'A100610',
      hindiMediumCandidates: [
        { rollNo: '31194825', roomNo: '7', serialNo: 'A100145' },
        { rollNo: '31194859', roomNo: '9', serialNo: 'A100188' },
      ],
      pwdCandidates: [{ roomNo: '2', rollNo: '31194844', sheetNo: 'A100102' }],
      clothColour: 'Blue',
      markerColour: 'Black',
      packetsCount: 7,
    },
    {
      examDayNo: 2,
      date: '2026-03-04',
      day: 'Wednesday',
      subjectName: 'Accountancy',
      subjectCode: '055',
      duration: '3 Hours',
      classes: 'XII',
      roomsUsed: 14,
      examFunctionaries: 30,
      observerAssigned: false,
      observerDetails: [],
      sheetsUsed: 284,
      sheetType: 'Main Answer Sheet',
      sheetSerialFrom: 'A100611',
      sheetSerialTo: 'A100894',
      hindiMediumCandidates: [],
      pwdCandidates: [{ roomNo: '5', rollNo: '31683280', sheetNo: 'A100702' }],
      clothColour: 'Green',
      markerColour: 'Blue',
      packetsCount: 3,
    },
  ]

  const [selectedExamDayNo, setSelectedExamDayNo] = useState<number>(examDayDetails[0]?.examDayNo || 1)
  const selectedExamDay = useMemo(
    () => examDayDetails.find((d) => d.examDayNo === selectedExamDayNo) || examDayDetails[0],
    [examDayDetails, selectedExamDayNo]
  )

  const upcomingExam = {
    examDayNo: 2,
    date: '2026-03-04',
    day: 'Wednesday',
    subjectName: 'Accountancy',
    subjectCode: '055',
    classes: 'XII',
    duration: '3 Hours',
    reportingTime: '09:30 AM',
    roomsPlanned: 14,
    functionariesPlanned: 30,
  }

  const totalCandidates = schoolSummaries.reduce((sum, s) => sum + s.totalCandidates, 0)
  const totalClassXCandidates = schoolSummaries.reduce((sum, s) => sum + s.classXTotal, 0)
  const totalClassXIICandidates = schoolSummaries.reduce((sum, s) => sum + s.classXIITotal, 0)
  const totalSchools = schoolSummaries.length

  return (
    <div className="overflow-x-hidden p-3 space-y-3">
      {/* Zone 2: KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 flex-shrink-0">
        <div className="card"><div className="card-content p-3"><p className="text-[11px] uppercase text-gray-500">Total Candidates</p><p className="text-xl font-bold">{totalCandidates}</p></div></div>
        <div className="card"><div className="card-content p-3"><p className="text-[11px] uppercase text-gray-500">Xth</p><p className="text-xl font-bold">{totalClassXCandidates}</p></div></div>
        <div className="card"><div className="card-content p-3"><p className="text-[11px] uppercase text-gray-500">XIIth</p><p className="text-xl font-bold">{totalClassXIICandidates}</p></div></div>
        <div className="card"><div className="card-content p-3"><p className="text-[11px] uppercase text-gray-500">Total Exam Days</p><p className="text-xl font-bold">{examDaysSummary.total}</p></div></div>
        <div className="card"><div className="card-content p-3"><p className="text-[11px] uppercase text-gray-500">Xth Days</p><p className="text-xl font-bold">{examDaysSummary.classX}</p></div></div>
        <div className="card"><div className="card-content p-3"><p className="text-[11px] uppercase text-gray-500">XIIth Days</p><p className="text-xl font-bold">{examDaysSummary.classXII}</p></div></div>
        <div className="card"><div className="card-content p-3"><p className="text-[11px] uppercase text-gray-500">Schools</p><p className="text-xl font-bold">{totalSchools}</p></div></div>
      </div>

      {/* New Overview Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 flex-shrink-0">
        <div className="card">
          <div className="card-header py-3 px-4">
            <h2 className="text-base font-semibold">Today&apos;s Exam Overview</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedExamDay.subjectName} ({selectedExamDay.subjectCode}) - Class {selectedExamDay.classes}
            </p>
          </div>
          <div className="card-content p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="rounded-md border p-2"><p className="text-gray-500">Date / Time</p><p className="font-semibold">{selectedExamDay.date} | {selectedExamDay.duration}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Total Candidates</p><p className="font-semibold">{totalCandidates}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Rooms</p><p className="font-semibold">{selectedExamDay.roomsUsed}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Exam Functionaries</p><p className="font-semibold">{selectedExamDay.examFunctionaries}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Checked In</p><p className="font-semibold">{Math.max(0, totalCandidates - 4)}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Absent</p><p className="font-semibold">{4}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Question Paper</p><p className="font-semibold">Received</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Answer Sheets</p><p className="font-semibold">Issued</p></div>
          </div>
        </div>

        <div className="card">
          <div className="card-header py-3 px-4">
            <h2 className="text-base font-semibold">Next Exam Overview</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {upcomingExam.subjectName} ({upcomingExam.subjectCode}) - Class {upcomingExam.classes}
            </p>
          </div>
          <div className="card-content p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="rounded-md border p-2"><p className="text-gray-500">Date</p><p className="font-semibold">{upcomingExam.date}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Day</p><p className="font-semibold">{upcomingExam.day}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Duration</p><p className="font-semibold">{upcomingExam.duration}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Reporting</p><p className="font-semibold">{upcomingExam.reportingTime}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Exam Functionaries</p><p className="font-semibold">{upcomingExam.functionariesPlanned}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Main Answer Sheets</p><p className="font-semibold">{selectedExamDay.sheetsUsed} Sheets</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Packets</p><p className="font-semibold">{selectedExamDay.packetsCount}</p></div>
            <div className="rounded-md border p-2"><p className="text-gray-500">Rooms Planned</p><p className="font-semibold">{upcomingExam.roomsPlanned}</p></div>
          </div>
        </div>
      </div>

      {/* Zone 3: Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Left: Today-focused blocks */}
        <div className="xl:col-span-2 flex flex-col gap-3">
          <div className="card flex-shrink-0">
            <div className="card-header py-3 px-4">
              <h2 className="text-base font-semibold">Schools Summary</h2>
            </div>
            <div className="card-content p-0">
              <div className="max-h-40 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">School Code</th>
                      <th className="px-3 py-2 text-left">School Name</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">X From-To</th>
                      <th className="px-3 py-2 text-right">X</th>
                      <th className="px-3 py-2 text-left">XII From-To</th>
                      <th className="px-3 py-2 text-right">XII</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {schoolSummaries.map((s) => (
                      <tr key={`${s.schoolCode}-${s.schoolName}`}>
                        <td className="px-3 py-2">{s.schoolCode}</td>
                        <td className="px-3 py-2">{s.schoolName}</td>
                        <td className="px-3 py-2 text-right font-semibold">{s.totalCandidates}</td>
                        <td className="px-3 py-2">{s.classXRollFrom} - {s.classXRollTo}</td>
                        <td className="px-3 py-2 text-right">{s.classXTotal}</td>
                        <td className="px-3 py-2">{s.classXIIRollFrom} - {s.classXIIRollTo}</td>
                        <td className="px-3 py-2 text-right">{s.classXIITotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header py-3 px-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Today Exam Focus</h2>
                <div className="flex flex-wrap gap-2">
                  {examDayDetails.map((d) => (
                    <button
                      key={d.examDayNo}
                      type="button"
                      onClick={() => setSelectedExamDayNo(d.examDayNo)}
                      className={`px-2.5 py-1 rounded-full text-xs border ${
                        selectedExamDayNo === d.examDayNo
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      Day {d.examDayNo}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="card-content p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                <div className="rounded-md border p-2"><p className="text-gray-500">Date</p><p className="font-semibold">{selectedExamDay.date}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Day</p><p className="font-semibold">{selectedExamDay.day}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Subject</p><p className="font-semibold">{selectedExamDay.subjectName}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Code</p><p className="font-semibold">{selectedExamDay.subjectCode}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Duration</p><p className="font-semibold">{selectedExamDay.duration}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Classes</p><p className="font-semibold">{selectedExamDay.classes}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Rooms Used</p><p className="font-semibold">{selectedExamDay.roomsUsed}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Functionaries</p><p className="font-semibold">{selectedExamDay.examFunctionaries}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Observer</p><p className="font-semibold">{selectedExamDay.observerAssigned ? 'Assigned' : 'Not assigned'}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Sheets Used</p><p className="font-semibold">{selectedExamDay.sheetsUsed}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Sheet Type</p><p className="font-semibold">{selectedExamDay.sheetType}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Serial</p><p className="font-semibold">{selectedExamDay.sheetSerialFrom} - {selectedExamDay.sheetSerialTo}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Cloth Colour</p><p className="font-semibold">{selectedExamDay.clothColour}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Marker Colour</p><p className="font-semibold">{selectedExamDay.markerColour}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Packets</p><p className="font-semibold">{selectedExamDay.packetsCount}</p></div>
                <div className="rounded-md border p-2"><p className="text-gray-500">Class-wise Days</p><p className="font-semibold">X: {examDaysSummary.classX} / XII: {examDaysSummary.classXII}</p></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="rounded-md border p-2">
                  <p className="font-semibold mb-1">Observer Details</p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {selectedExamDay.observerDetails.length > 0 ? selectedExamDay.observerDetails.map((o, i) => (
                      <p key={`${o.name}-${i}`}>{o.name} | {o.schoolCode} | {o.schoolName}</p>
                    )) : <p className="text-gray-500">No observer assigned</p>}
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="font-semibold mb-1">Hindi Medium Candidates</p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {selectedExamDay.hindiMediumCandidates.length > 0 ? selectedExamDay.hindiMediumCandidates.map((c, i) => (
                      <p key={`${c.rollNo}-${i}`}>{c.rollNo} | Room {c.roomNo} | Serial {c.serialNo}</p>
                    )) : <p className="text-gray-500">No Hindi medium candidates</p>}
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="font-semibold mb-1">PwD Candidates</p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {selectedExamDay.pwdCandidates.length > 0 ? selectedExamDay.pwdCandidates.map((c, i) => (
                      <p key={`${c.rollNo}-${i}`}>Room {c.roomNo} | {c.rollNo} | Sheet {c.sheetNo}</p>
                    )) : <p className="text-gray-500">No PwD candidates</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Next Day + Exam Days */}
        <div className="flex flex-col gap-3">
          <div className="card flex-shrink-0">
            <div className="card-header py-3 px-4">
              <h2 className="text-base font-semibold">Exam Days</h2>
            </div>
            <div className="card-content p-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border p-2 text-center"><p className="text-gray-500">Total</p><p className="text-lg font-bold">{examDaysSummary.total}</p></div>
              <div className="rounded-md border p-2 text-center"><p className="text-gray-500">Class X</p><p className="text-lg font-bold">{examDaysSummary.classX}</p></div>
              <div className="rounded-md border p-2 text-center"><p className="text-gray-500">Class XII</p><p className="text-lg font-bold">{examDaysSummary.classXII}</p></div>
            </div>
          </div>

          <div className="card">
            <div className="card-header py-3 px-4">
              <h2 className="text-base font-semibold">Upcoming Exam (Next Day)</h2>
            </div>
            <div className="card-content p-3 text-xs space-y-2">
              <div className="rounded-md border p-2"><p className="text-gray-500">Exam Day No</p><p className="font-semibold">{upcomingExam.examDayNo}</p></div>
              <div className="rounded-md border p-2"><p className="text-gray-500">Date / Day</p><p className="font-semibold">{upcomingExam.date} ({upcomingExam.day})</p></div>
              <div className="rounded-md border p-2"><p className="text-gray-500">Subject Name</p><p className="font-semibold">{upcomingExam.subjectName}</p></div>
              <div className="rounded-md border p-2"><p className="text-gray-500">Subject Code</p><p className="font-semibold">{upcomingExam.subjectCode}</p></div>
              <div className="rounded-md border p-2"><p className="text-gray-500">Classes</p><p className="font-semibold">{upcomingExam.classes}</p></div>
              <div className="rounded-md border p-2"><p className="text-gray-500">Duration</p><p className="font-semibold">{upcomingExam.duration}</p></div>
              <div className="rounded-md border p-2"><p className="text-gray-500">Reporting Time</p><p className="font-semibold">{upcomingExam.reportingTime}</p></div>
              <div className="rounded-md border p-2"><p className="text-gray-500">Rooms Planned</p><p className="font-semibold">{upcomingExam.roomsPlanned}</p></div>
              <div className="rounded-md border p-2"><p className="text-gray-500">Functionaries Planned</p><p className="font-semibold">{upcomingExam.functionariesPlanned}</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
