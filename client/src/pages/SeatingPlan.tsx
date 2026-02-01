import React, { useState } from 'react'
import {
  useCentreDatesheetEntries,
  useGenerateSeatingPlanPDFMutation,
  type SeatingPlanFormat,
} from '../hooks/useSeatingPlan'
import Loader from '../components/common/Loader'

const SeatingPlan: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SeatingPlanFormat>('mainGate')

  const { data: datesheetEntries = [], isLoading: loading, error: queryError, refetch } = useCentreDatesheetEntries()
  const pdfMutation = useGenerateSeatingPlanPDFMutation({
    onError: () => {
      alert('Failed to generate PDF. Please try again.')
    },
  })

  const error = queryError?.message ?? null
  const downloadingId = pdfMutation.isPending ? pdfMutation.variables?.datesheetId ?? null : null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleDownloadPDF = (datesheetId: string, format: SeatingPlanFormat) => {
    pdfMutation.mutate({ datesheetId, format })
  }

  return (
    <div className="p-6">
      {/* Status Overview - Clickable Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setActiveTab('mainGate')}
          disabled={pdfMutation.isPending && activeTab !== 'mainGate'}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all ${activeTab === 'mainGate' ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
            } ${pdfMutation.isPending && activeTab !== 'mainGate' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Main Gate</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">View format</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('roomFolderSlip')}
          disabled={pdfMutation.isPending && activeTab !== 'roomFolderSlip'}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all ${activeTab === 'roomFolderSlip' ? 'ring-2 ring-green-500' : 'hover:shadow-lg'
            } ${pdfMutation.isPending && activeTab !== 'roomFolderSlip' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Room Folder Slip</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">View format</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('roomDoorSlip')}
          disabled={pdfMutation.isPending && activeTab !== 'roomDoorSlip'}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all ${activeTab === 'roomDoorSlip' ? 'ring-2 ring-yellow-500' : 'hover:shadow-lg'
            } ${pdfMutation.isPending && activeTab !== 'roomDoorSlip' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Room Door Slip</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">View format</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('cbseCopy')}
          disabled={pdfMutation.isPending && activeTab !== 'cbseCopy'}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all ${activeTab === 'cbseCopy' ? 'ring-2 ring-purple-500' : 'hover:shadow-lg'
            } ${pdfMutation.isPending && activeTab !== 'cbseCopy' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">CBSE Copy</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">View format</p>
            </div>
          </div>
        </button>
      </div>

      {/* Datesheet Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Examination Schedule
          </h3>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader size="lg" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Retry
              </button>
            </div>
          ) : datesheetEntries.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No datesheet entries found. Please import a datesheet first.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sr No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Subject Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Subject Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Candidates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {datesheetEntries.map((entry, index) => (
                  <tr
                    key={entry._id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${entry.class === '10'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : entry.class === '12'
                        ? 'bg-purple-50 dark:bg-purple-900/20'
                        : ''
                      }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(entry.examDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {entry.dayName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {entry.subjectCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {entry.subjectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${entry.class === '10'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : entry.class === '12'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                        Class {entry.class}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {entry.timeSlot.start} - {entry.timeSlot.end}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {entry.candidateCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownloadPDF(entry._id, activeTab)}
                          disabled={pdfMutation.isPending}
                          className={`text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 ${pdfMutation.isPending && downloadingId !== entry._id ? 'cursor-not-allowed' : ''}`}
                          title={`Download ${activeTab === 'mainGate' ? 'Main Gate' : activeTab === 'roomFolderSlip' ? 'Room Folder Slip' : activeTab === 'roomDoorSlip' ? 'Room Door Slip' : 'CBSE Copy'}`}
                        >
                          {downloadingId === entry._id ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {activeTab === 'mainGate' && 'Main Gate Format'}
            {activeTab === 'roomFolderSlip' && 'Room Folder Slip Format'}
            {activeTab === 'roomDoorSlip' && 'Room Door Slip Format'}
            {activeTab === 'cbseCopy' && 'CBSE Copy Format'}
          </h3>
        </div>

        <div className="p-6">
          {activeTab === 'mainGate' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This format is designed for display at the main gate and notice boards. All rooms are shown on a single document for easy reference.
                </p>
              </div>

              {/* Main Gate Preview */}
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-900 max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">INTERNATIONAL BHARTI SCHOOL, ROHTAK</h2>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Seating Plan CBSE Board Exam</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Centre No: 827403</p>
                </div>

                {/* Exam Details */}
                <div className="flex justify-between mb-4 text-sm font-bold text-gray-900 dark:text-white">
                  <div>
                    <p>Date: 15.02.2026 (Saturday)</p>
                    <p>Subject: English (Lang. & Lit.)</p>
                  </div>
                  <div className="text-right">
                    <p>Class: X</p>
                    <p>Code: 184</p>
                  </div>
                </div>

                {/* Room Table 1 */}
                <table className="w-full border-collapse mb-5">
                  <caption className="text-sm font-bold text-gray-900 dark:text-white p-2 border border-black dark:border-gray-400 border-b-0 bg-white dark:bg-gray-900">
                    Room No. 01 - X Rose (First Floor)
                  </caption>
                  <thead>
                    <tr>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white w-20 text-sm">Row</th>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 1</th>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 2</th>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center font-bold text-gray-900 dark:text-white text-sm">Roll No</td>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248737 + i}</td>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248745 + i}</td>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248753 + i}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Room Table 2 */}
                <table className="w-full border-collapse mb-5">
                  <caption className="text-sm font-bold text-gray-900 dark:text-white p-2 border border-black dark:border-gray-400 border-b-0 bg-white dark:bg-gray-900">
                    Room No. 02 - X Tulip (First Floor)
                  </caption>
                  <thead>
                    <tr>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white w-20 text-sm">Row</th>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 1</th>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 2</th>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center font-bold text-gray-900 dark:text-white text-sm">Roll No</td>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248761 + i}</td>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248769 + i}</td>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248777 + i}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Room Table 3 */}
                <table className="w-full border-collapse mb-5">
                  <caption className="text-sm font-bold text-gray-900 dark:text-white p-2 border border-black dark:border-gray-400 border-b-0 bg-white dark:bg-gray-900">
                    Room No. 03 - X Lotus (First Floor)
                  </caption>
                  <thead>
                    <tr>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white w-20 text-sm">Row</th>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 1</th>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 2</th>
                      <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center font-bold text-gray-900 dark:text-white text-sm">Roll No</td>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248785 + i}</td>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248793 + i}</td>
                        <td className="border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248801 + i}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer */}
                <p className="text-right font-bold text-gray-900 dark:text-white">CENTRE SUPERINTENDENT</p>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                Click the download button next to any exam to generate the Main Gate PDF with actual candidate data.
              </p>
            </div>
          )}

          {activeTab === 'roomFolderSlip' && (
            <div className="space-y-4">
              <p className="text-secondary-600 dark:text-secondary-400">
                Room Folder Slip seating plan content will be displayed here.
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  This format is designed for inclusion in room supervisor folders.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'roomDoorSlip' && (
            <div className="space-y-4">
              <p className="text-secondary-600 dark:text-secondary-400">
                Room Door Slip seating plan content will be displayed here.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This format is designed for display on examination room doors.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cbseCopy' && (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  This format is designed for submission to CBSE. Each room generates one page with 24 candidates (8 rows x 3 columns).
                </p>
              </div>

              {/* CBSE Copy Preview */}
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-900 max-w-4xl mx-auto">
                {/* Header */}
                <h2 className="text-xl font-bold text-center mb-4 text-gray-900 dark:text-white">SEATING PLAN</h2>

                {/* Info Table */}
                <table className="w-full border-collapse mb-4">
                  <tbody>
                    <tr>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold w-32 text-gray-900 dark:text-white">Name Of Centre</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>
                        International Bharti School<br />Gohana Road, Rohtak
                      </td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center w-24 text-gray-900 dark:text-white">Centre No</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center font-bold w-28 text-gray-900 dark:text-white">827403</td>
                    </tr>
                    <tr>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white">Name Of<br />Examination</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>
                        Sr. Secondary School Certificate Examination<br />2026
                      </td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Subject</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-sm text-gray-900 dark:text-white">ENGLISH (LANG. & LIT.)</td>
                    </tr>
                    <tr>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white">Date</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>15.02.2026</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Room No.</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-900 dark:text-white">01</td>
                    </tr>
                  </tbody>
                </table>

                {/* Seating Table */}
                <table className="w-full border-collapse mb-4">
                  <thead>
                    <tr>
                      <th className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white" colSpan={2}>Row 1</th>
                      <th className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white" colSpan={2}>Row 2</th>
                      <th className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white" colSpan={2}>Row 3</th>
                    </tr>
                    <tr>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Roll No</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Q.P. Code</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Roll No</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Q.P. Code</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Roll No</td>
                      <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Q.P. Code</td>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300">{17248737 + i}</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-400 dark:text-gray-500"></td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300">{17248745 + i}</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-400 dark:text-gray-500"></td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300">{17248753 + i}</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-400 dark:text-gray-500"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer Section */}
                <div className="flex justify-between mb-6 text-sm">
                  <div className="w-1/2">
                    <p className="font-bold text-gray-900 dark:text-white">Signature of Assistant</p>
                    <p className="font-bold text-gray-900 dark:text-white mb-2">Superintendent</p>
                    <p className="text-gray-700 dark:text-gray-300">1. ____________________</p>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">2. ____________________</p>
                  </div>
                  <div className="w-1/2 text-left pl-8">
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold text-gray-900 dark:text-white">Signature of Total Students Registered:</span> ________</p>
                    <p className="text-gray-700 dark:text-gray-300 mt-1"><span className="font-bold text-gray-900 dark:text-white">Present:</span> ________</p>
                    <p className="text-gray-700 dark:text-gray-300 mt-1"><span className="font-bold text-gray-900 dark:text-white">Absent:</span> ________</p>
                  </div>
                </div>

                <p className="text-right font-bold text-gray-900 dark:text-white">Signature of Centre Superintendent</p>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                Click the download button next to any exam to generate the CBSE Copy PDF with actual candidate data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SeatingPlan
