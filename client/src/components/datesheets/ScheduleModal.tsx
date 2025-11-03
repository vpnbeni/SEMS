import React, { useEffect, useState } from 'react'
import Loader from '../common/Loader'

interface SubjectOption { _id: string; name: string; code: string }

export interface ScheduleRow {
  subject: string
  examDate: string
  start: string
  end: string
  duration: number
  instructions?: string
  isOptional?: boolean
}

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (rows: ScheduleRow[]) => Promise<void>
  initialRows?: ScheduleRow[]
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onSave, initialRows }) => {
  const [rows, setRows] = useState<ScheduleRow[]>(initialRows || [])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (isOpen) setRows(initialRows || []) }, [isOpen, initialRows])

  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/subjects?isActive=true&limit=200', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        setSubjects(data?.data || [])
      } catch (e) {}
    })()
  }, [isOpen])

  const addRow = () => setRows(prev => ([...prev, { subject: '', examDate: '', start: '10:30', end: '13:30', duration: 180 }]))
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))
  const updateRow = (i: number, patch: Partial<ScheduleRow>) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const handleSave = async () => {
    setSaving(true)
    await onSave(rows)
    setSaving(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !saving && onClose()} />
        <div className="inline-block align-bottom bg-white dark:bg-secondary-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-secondary-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Manage Schedule</h3>
              <button type="button" onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <label className="block text-xs mb-1">Subject</label>
                    <select value={row.subject} onChange={e => updateRow(i, { subject: e.target.value })} className="w-full px-2 py-2 border rounded">
                      <option value="">Select subject</option>
                      {subjects.map(s => (<option key={s._id} value={s._id}>{s.code} - {s.name}</option>))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs mb-1">Exam Date</label>
                    <input type="date" value={row.examDate} onChange={e => updateRow(i, { examDate: e.target.value })} className="w-full px-2 py-2 border rounded" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs mb-1">Start</label>
                    <input type="time" value={row.start} onChange={e => updateRow(i, { start: e.target.value })} className="w-full px-2 py-2 border rounded" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs mb-1">End</label>
                    <input type="time" value={row.end} onChange={e => updateRow(i, { end: e.target.value })} className="w-full px-2 py-2 border rounded" />
                  </div>
                  <div className="col-span-1 flex gap-2">
                    <button onClick={() => removeRow(i)} className="text-red-600 hover:text-red-800">Remove</button>
                  </div>
                </div>
              ))}
              <button onClick={addRow} className="btn btn-outline btn-sm">Add Subject</button>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-secondary-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button onClick={handleSave} disabled={saving} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? (<><Loader size="sm" /><span className="ml-2">Saving...</span></>) : 'Save Schedule'}
            </button>
            <button onClick={onClose} disabled={saving} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-secondary-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScheduleModal


