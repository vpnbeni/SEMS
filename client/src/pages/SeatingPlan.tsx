import React, { useState, useEffect } from 'react'
import centreDatesheetService, { CentreDatesheetEntry } from '../services/centreDatesheetService'
import { seatingPlanService } from '../services/seatingPlanService'
import Loader from '../components/common/Loader'

const SeatingPlan: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mainGate' | 'roomFolderSlip' | 'roomDoorSlip' | 'cbseCopy'>('mainGate')
  const [datesheetEntries, setDatesheetEntries] = useState<CentreDatesheetEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchDatesheetEntries()
  }, [])

  const fetchDatesheetEntries = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await centreDatesheetService.getEntries()
      console.log('📊 Datesheet entries received:', response.data)
      if (response.data && response.data.length > 0) {
        console.log('📋 First entry dayName:', response.data[0].dayName)
      }
      setDatesheetEntries(response.data || [])
    } catch (err: any) {
      console.error('Error fetching datesheet entries:', err)
      setError(err.response?.data?.error || 'Failed to load datesheet entries')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const handleDownloadPDF = async (datesheetId: string, format: string) => {
    try {
      setDownloadingId(datesheetId)
      let blob: Blob
      let filename: string

      switch (format) {
        case 'mainGate':
          blob = await seatingPlanService.generateMainGate(datesheetId)
          filename = 'main-gate.pdf'
          break
        case 'roomFolderSlip':
          blob = await seatingPlanService.generateRoomFolderSlip(datesheetId)
          filename = 'room-folder-slip.pdf'
          break
        case 'roomDoorSlip':
          blob = await seatingPlanService.generateRoomDoorSlip(datesheetId)
          filename = 'room-door-slip.pdf'
          break
        case 'cbseCopy':
          blob = await seatingPlanService.generateCBSECopy(datesheetId)
          filename = 'cbse-copy.pdf'
          break
        default:
          return
      }

      seatingPlanService.downloadPDF(blob, filename)
    } catch (error) {
      console.error('Failed to download PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">
          Seating Plan
        </h1>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Manage seating arrangements and room allocations
        </p>
      </div>

      {/* Status Overview - Clickable Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setActiveTab('mainGate')}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all ${
            activeTab === 'mainGate' ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
          }`}
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
          className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all ${
            activeTab === 'roomFolderSlip' ? 'ring-2 ring-green-500' : 'hover:shadow-lg'
          }`}
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
          className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all ${
            activeTab === 'roomDoorSlip' ? 'ring-2 ring-yellow-500' : 'hover:shadow-lg'
          }`}
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
          className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all ${
            activeTab === 'cbseCopy' ? 'ring-2 ring-purple-500' : 'hover:shadow-lg'
          }`}
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
                onClick={fetchDatesheetEntries}
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
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      entry.class === '10' 
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.class === '10' 
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
                          disabled={downloadingId === entry._id}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
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
              <p className="text-secondary-600 dark:text-secondary-400">
                Main Gate seating plan content will be displayed here.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This format is designed for display at the main gate and notice boards of the examination center.
                </p>
              </div>
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
              <p className="text-secondary-600 dark:text-secondary-400">
                CBSE Copy seating plan content will be displayed here.
              </p>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  This format is designed for submission to CBSE as per their requirements.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SeatingPlan
