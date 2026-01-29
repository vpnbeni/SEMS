import React, { useState, useRef, useEffect } from 'react'

interface Form66Record {
  _id: string
  rollNo: string
  examDate: string
  subjectCode: string
  subject: string
  class: string
  centreNo?: string
  centreName?: string
}

interface DateGroup {
  date: string
  subjects: SubjectGroup[]
  totalRecords: number
}

interface SubjectGroup {
  code: string
  name: string
  records: Form66Record[]
  count: number
}

const Form66: React.FC = () => {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [records, setRecords] = useState<Form66Record[]>([])
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true)
      const response = await fetch('http://localhost:5000/api/form66/records')
      const data = await response.json()
      setRecords(data)
      
      // Group records by date
      const grouped = groupRecordsByDate(data)
      setDateGroups(grouped)
    } catch (error) {
      console.error('Failed to fetch records:', error)
    } finally {
      setLoadingRecords(false)
    }
  }

  const groupRecordsByDate = (records: Form66Record[]): DateGroup[] => {
    if (!records || records.length === 0) {
      return []
    }

    const dateMap = new Map<string, Map<string, Form66Record[]>>()
    
    records.forEach(record => {
      // Skip records without examDate
      if (!record.examDate) return
      
      if (!dateMap.has(record.examDate)) {
        dateMap.set(record.examDate, new Map())
      }
      
      const subjectMap = dateMap.get(record.examDate)!
      const subjectKey = `${record.subjectCode || 'Unknown'}-${record.subject || 'Unknown'}`
      
      if (!subjectMap.has(subjectKey)) {
        subjectMap.set(subjectKey, [])
      }
      
      subjectMap.get(subjectKey)!.push(record)
    })
    
    const groups: DateGroup[] = []
    
    dateMap.forEach((subjectMap, date) => {
      const subjects: SubjectGroup[] = []
      let totalRecords = 0
      
      subjectMap.forEach((records, subjectKey) => {
        const [code, ...nameParts] = subjectKey.split('-')
        const name = nameParts.join('-')
        
        subjects.push({
          code,
          name,
          records: records.sort((a, b) => a.rollNo.localeCompare(b.rollNo)),
          count: records.length
        })
        
        totalRecords += records.length
      })
      
      groups.push({
        date,
        subjects: subjects.sort((a, b) => a.code.localeCompare(b.code)),
        totalRecords
      })
    })
    
    // Sort by date
    return groups.sort((a, b) => {
      if (!a.date || !b.date) return 0
      const dateA = a.date.split('.').reverse().join('')
      const dateB = b.date.split('.').reverse().join('')
      return dateA.localeCompare(dateB)
    })
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return

    try {
      setUploading(true)
      setUploadStatus(null)

      const response = await fetch('http://localhost:5000/api/form66/paste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: pastedText })
      })

      const data = await response.json()

      if (response.ok) {
        setUploadStatus({ 
          type: 'success', 
          message: `Successfully imported! Processed ${data.count || 0} records.` 
        })
        setPastedText('')
        fetchRecords() // Refresh the records table
      } else {
        setUploadStatus({ 
          type: 'error', 
          message: data.message || 'Import failed' 
        })
      }
    } catch (error) {
      console.error('Paste import error:', error)
      setUploadStatus({ 
        type: 'error', 
        message: 'Failed to import data. Please try again.' 
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type - check both extension and MIME type
    const isPdfFile = file.name.toLowerCase().endsWith('.pdf') || 
                      file.type === 'application/pdf'
    
    if (!isPdfFile) {
      setUploadStatus({ type: 'error', message: `Please select a .pdf file. Selected: ${file.name}` })
      return
    }

    try {
      setUploading(true)
      setUploadStatus(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:5000/api/form66/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setUploadStatus({ 
          type: 'success', 
          message: `Successfully uploaded! Processed ${data.count || 0} records.` 
        })
        fetchRecords() // Refresh the records table
      } else {
        setUploadStatus({ 
          type: 'error', 
          message: data.message || 'Upload failed' 
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({ 
        type: 'error', 
        message: 'Failed to upload file. Please try again.' 
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">
            Form 66
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Upload and manage Form 66 records
          </p>
        </div>
        <button
          onClick={handleFileSelect}
          disabled={uploading}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Form 66 (.pdf)
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`rounded-lg p-4 ${
          uploadStatus.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {uploadStatus.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                uploadStatus.type === 'success' 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {uploadStatus.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Paste Text Area - Hidden for PDF workflow */}
      {/* <div className="glass rounded-xl p-6 border border-secondary-200 dark:border-secondary-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Or Paste Form 66 Text
        </h3>
        <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4">
          Open your Form 66 .txt file, copy all the text, and paste it below:
        </p>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste Form 66 text content here..."
          className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
        />
        <button
          onClick={handlePasteSubmit}
          disabled={uploading || !pastedText.trim()}
          className="mt-4 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Processing...' : 'Import Form 66 Data'}
        </button>
      </div> */}

      {/* Instructions */}
      <div className="glass rounded-xl p-6 border border-secondary-200 dark:border-secondary-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Instructions
        </h3>
        <div className="space-y-3 text-sm text-secondary-600 dark:text-secondary-400">
          <p><strong>Upload PDF File</strong></p>
          <p>1. Click the "Upload Form 66 (.pdf)" button above</p>
          <p>2. Select your Form 66 PDF file from your computer</p>
          <p>3. The system will automatically extract and parse the data</p>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            What is Form 66?
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Form 66 contains the official list of roll numbers for each exam. This data is used to generate accurate seating plans.
          </p>
        </div>
      </div>

      {/* Form 66 Records - Date-wise View */}
      <div className="glass rounded-xl p-6 border border-secondary-200 dark:border-secondary-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Form 66 Records - Date-wise View
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {records.length} total records across {dateGroups.length} exam dates
            </p>
          </div>
          <button
            onClick={fetchRecords}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loadingRecords ? (
          <div className="text-center py-8 text-gray-500">Loading records...</div>
        ) : dateGroups.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              No Form 66 records found. Import data using the upload button above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dateGroups.map((dateGroup, dateIndex) => {
              const isDateExpanded = expandedDate === dateGroup.date
              
              return (
                <div
                  key={dateIndex}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all"
                >
                  {/* Date Header */}
                  <div
                    onClick={() => setExpandedDate(isDateExpanded ? null : dateGroup.date)}
                    className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                        <div className="text-center">
                          <div className="text-white font-bold text-xl">
                            {dateGroup.date?.split('.')[0] || ''}
                          </div>
                          <div className="text-white text-xs opacity-90">
                            {dateGroup.date?.split('.')[1] || ''}.{dateGroup.date?.split('.')[2] || ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                              Exam Date: {dateGroup.date}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                {dateGroup.subjects.length} Subject{dateGroup.subjects.length !== 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {dateGroup.totalRecords} Candidate{dateGroup.totalRecords !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <button className="ml-2 flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors">
                            <svg 
                              className={`w-5 h-5 text-gray-400 transition-transform ${isDateExpanded ? 'rotate-90' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Subjects */}
                  {isDateExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                      <div className="space-y-3">
                        {dateGroup.subjects.map((subject, subjectIndex) => {
                          const subjectKey = `${dateGroup.date}-${subject.code}`
                          const isSubjectExpanded = expandedSubject === subjectKey
                          
                          return (
                            <div
                              key={subjectIndex}
                              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                              {/* Subject Header */}
                              <div
                                onClick={() => setExpandedSubject(isSubjectExpanded ? null : subjectKey)}
                                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center flex-1">
                                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mr-3">
                                      <span className="text-white font-bold text-sm">
                                        {subject.code}
                                      </span>
                                    </div>
                                    <div className="flex-1">
                                      <h5 className="font-semibold text-gray-900 dark:text-white text-sm">
                                        {subject.name}
                                      </h5>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {subject.count} candidate{subject.count !== 1 ? 's' : ''} • Subject Code: {subject.code}
                                      </p>
                                    </div>
                                  </div>
                                  <button className="ml-2 flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                                    <svg 
                                      className={`w-4 h-4 text-gray-400 transition-transform ${isSubjectExpanded ? 'rotate-90' : ''}`} 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              
                              {/* Expanded Roll Numbers */}
                              {isSubjectExpanded && (
                                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                      <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Sr No</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Roll No</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Class</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {subject.records.map((record, recordIndex) => (
                                          <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{recordIndex + 1}</td>
                                            <td className="px-3 py-2 text-sm font-mono text-gray-900 dark:text-white">{record.rollNo}</td>
                                            <td className="px-3 py-2 text-sm">
                                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                record.class === 'X' 
                                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                              }`}>
                                                Class {record.class}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Form66
