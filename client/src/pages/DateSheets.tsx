import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import DatesheetImportModal from '../components/datesheets/ImportModal'
import CreateDatesheetModal, { DatesheetFormData } from '../components/datesheets/CreateModal'
import ScheduleModal, { ScheduleRow } from '../components/datesheets/ScheduleModal'
import datesheetService from '../services/datesheetService'

const DateSheets: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [importErrorMsg, setImportErrorMsg] = useState<string | undefined>()
  const [importErrorSample, setImportErrorSample] = useState<string[] | undefined>()
  const [importDebug, setImportDebug] = useState<any>(undefined)
  const [datesheets, setDatesheets] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [editing, setEditing] = useState<boolean>(false)
  const [editingData, setEditingData] = useState<any | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const loadDatesheets = async () => {
    try {
      setLoading(true)
      const res = await datesheetService.getAll()
      const list = res.data?.data?.datesheets || []
      setDatesheets(list)
    } catch (e) {
      // silently ignore; empty state will show
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDatesheets()
  }, [])

  const handleImport = async (file: File) => {
    try {
      setImporting(true)
      setImportErrorMsg(undefined)
      setImportErrorSample(undefined)
      
      const response = await datesheetService.importFromPDF(file)
      
      if (response.data?.success) {
        const count = response.data?.data?.count || 0
        toast.success(`Datesheet imported successfully! Found ${count} entries.`)
        setShowImportModal(false)
        setImportErrorMsg(undefined)
        setImportErrorSample(undefined)
        setImportDebug(undefined)
      } else {
        throw new Error(response.data?.message || 'Import failed')
      }
    } catch (error: any) {
      console.error('Import error:', error)
      const msg = error.response?.data?.message || error.message || 'Failed to import datesheet'
      const sample = error.response?.data?.sample as string[] | undefined
      const debug = error.response?.data?.debug
      
      setImportErrorMsg(msg)
      setImportErrorSample(sample)
      setImportDebug(debug)
      
      // Log debug info to console for troubleshooting
      if (debug) {
        console.log('Debug info:', debug)
      }
      if (sample) {
        console.log('Sample lines:', sample)
      }
      
      // Don't show toast if we're displaying error in modal
      if (!sample) {
        toast.error(msg)
      }
    } finally {
      setImporting(false)
    }
  }

  const handleCreate = async (data: DatesheetFormData) => {
    try {
      setCreating(true)
      const response = await datesheetService.create(data)
      
      if (response.data?.success) {
        toast.success('Date sheet created successfully!')
        setShowCreateModal(false)
        await loadDatesheets()
      } else {
        throw new Error(response.data?.message || 'Failed to create date sheet')
      }
    } catch (error: any) {
      console.error('Create error:', error)
      const msg = error.response?.data?.message || error.message || 'Failed to create date sheet'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6">

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex space-x-4">
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">All Classes</option>
            <option value="10">Class 10</option>
            <option value="11">Class 11</option>
            <option value="12">Class 12</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">All Terms</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        <div className="flex gap-3">
        <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Import PDF
        </button>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Date Sheet
        </button>
        </div>
      </div>

      {/* Date Sheets Grid */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-secondary-600">Loading...</div>
      ) : datesheets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Date Sheets Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first examination date sheet to get started with scheduling exams.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>Create Date Sheet</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datesheets.map((ds) => (
            <div key={ds._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">{ds.title}</h3>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">{ds.examType} • {ds.class} • {ds.academicYear}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${ds.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-700'}`}>{ds.status}</span>
              </div>
              <div className="mt-3 text-sm text-secondary-700 dark:text-secondary-300">
                <div>Start: {new Date(ds.startDate).toLocaleDateString()}</div>
                <div>End: {new Date(ds.endDate).toLocaleDateString()}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  disabled={ds.status === 'published'}
                  onClick={() => { setEditing(true); setEditingData(ds); setShowCreateModal(true) }}
                  className={`btn btn-outline btn-sm ${ds.status === 'published' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Edit
                </button>
                <button
                  disabled={ds.status === 'published'}
                  onClick={() => { setEditingData(ds); setShowScheduleModal(true) }}
                  className={`btn btn-outline btn-sm ${ds.status === 'published' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Manage Schedule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Generate Date Sheet
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Auto-generate based on subjects
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Import Template
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Upload from Excel/CSV
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Copy from Previous
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Use existing date sheet as template
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Import Modal */}
      {showImportModal && (
        <DatesheetImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          importing={importing}
          errorMessage={importErrorMsg}
          errorSample={importErrorSample}
          debug={importDebug}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateDatesheetModal
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setEditing(false); setEditingData(null) }}
          onCreate={handleCreate}
          creating={creating}
          initialData={editingData ? {
            title: editingData.title,
            examType: editingData.examType,
            class: editingData.class,
            academicYear: editingData.academicYear,
            startDate: editingData.startDate?.slice(0,10),
            endDate: editingData.endDate?.slice(0,10),
            generalInstructions: editingData.generalInstructions || []
          } : undefined}
          titleText={editing ? 'Edit Date Sheet' : 'Create Date Sheet'}
          submitText={editing ? 'Update Date Sheet' : 'Create Date Sheet'}
        />
      )}

      {showScheduleModal && editingData && (
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          initialRows={(editingData.subjects || []).map((s:any)=>({
            subject: s.subject?._id || s.subject,
            examDate: s.examDate?.slice(0,10),
            start: s.timeSlot?.start,
            end: s.timeSlot?.end,
            duration: s.duration || 180,
            instructions: s.instructions,
            isOptional: s.isOptional,
          }))}
          onSave={async (rows: ScheduleRow[]) => {
            await datesheetService.update(editingData._id, { subjects: rows.map(r=>({
              subject: r.subject,
              examDate: r.examDate,
              timeSlot: { start: r.start, end: r.end },
              duration: r.duration,
              instructions: r.instructions,
              isOptional: r.isOptional,
            })) })
            setShowScheduleModal(false)
            await loadDatesheets()
          }}
        />
      )}
    </div>
  )
}

export default DateSheets