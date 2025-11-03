import React, { useState, useEffect } from 'react'
import Loader from '../common/Loader'

interface CreateDatesheetModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: DatesheetFormData) => Promise<void>
  creating: boolean
  initialData?: Partial<DatesheetFormData>
  titleText?: string
  submitText?: string
}

export interface DatesheetFormData {
  title: string
  examType: string
  class: string
  academicYear: string
  startDate: string
  endDate: string
  generalInstructions?: string[]
}

const CreateDatesheetModal: React.FC<CreateDatesheetModalProps> = ({ isOpen, onClose, onCreate, creating, initialData, titleText, submitText }) => {
  const [formData, setFormData] = useState<DatesheetFormData>({
    title: '',
    examType: 'board',
    class: '10th',
    academicYear: '',
    startDate: '',
    endDate: '',
    generalInstructions: []
  })

  const [instruction, setInstruction] = useState('')

  useEffect(() => {
    // Auto-generate academic year based on current date
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    // If month is April (3) or later, academic year is current-next, else previous-current
    const academicYear = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`
    setFormData(prev => ({ ...prev, academicYear }))
  }, [])

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        title: initialData.title ?? prev.title,
        examType: initialData.examType ?? prev.examType,
        class: initialData.class ?? prev.class,
        academicYear: initialData.academicYear ?? prev.academicYear,
        startDate: initialData.startDate ?? prev.startDate,
        endDate: initialData.endDate ?? prev.endDate,
        generalInstructions: initialData.generalInstructions ?? prev.generalInstructions
      }))
    }
  }, [initialData, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddInstruction = () => {
    if (instruction.trim()) {
      setFormData(prev => ({
        ...prev,
        generalInstructions: [...(prev.generalInstructions || []), instruction.trim()]
      }))
      setInstruction('')
    }
  }

  const handleRemoveInstruction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      generalInstructions: prev.generalInstructions?.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onCreate(formData)
  }

  const handleClose = () => {
    if (!creating) {
      setFormData({
        title: '',
        examType: 'board',
        class: '10th',
        academicYear: '',
        startDate: '',
        endDate: '',
        generalInstructions: []
      })
      setInstruction('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

        <div className="inline-block align-bottom bg-white dark:bg-secondary-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white dark:bg-secondary-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{titleText || 'Create Date Sheet'}</h3>
                <button type="button" onClick={handleClose} disabled={creating} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    maxLength={200}
                    placeholder="e.g., Board Examination 2026"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-secondary-800 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Exam Type and Class */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Exam Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="examType"
                      value={formData.examType}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-secondary-800 text-gray-900 dark:text-white"
                    >
                      <option value="board">Board</option>
                      <option value="internal">Internal</option>
                      <option value="practical">Practical</option>
                      <option value="supplementary">Supplementary</option>
                      <option value="annual">Annual</option>
                      <option value="half_yearly">Half Yearly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="class"
                      value={formData.class}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-secondary-800 text-gray-900 dark:text-white"
                    >
                      <option value="10th">Class 10</option>
                      <option value="11th">Class 11</option>
                      <option value="12th">Class 12</option>
                    </select>
                  </div>
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                    required
                    pattern="\d{4}-\d{4}"
                    placeholder="2025-2026"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-secondary-800 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Format: YYYY-YYYY (e.g., 2025-2026)</p>
                </div>

                {/* Start and End Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-secondary-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      min={formData.startDate}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-secondary-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* General Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    General Instructions
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInstruction())}
                      placeholder="Add an instruction..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-secondary-800 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddInstruction}
                      className="px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700"
                    >
                      Add
                    </button>
                  </div>
                  {formData.generalInstructions && formData.generalInstructions.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {formData.generalInstructions.map((inst, index) => (
                        <li key={index} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-secondary-800 px-3 py-2 rounded">
                          <span>{inst}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInstruction(index)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    ℹ️ After creating the date sheet, you can add subjects and their exam schedules.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-secondary-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Loader size="sm" />
                    <span className="ml-2">{submitText ? submitText : 'Creating...'}</span>
                  </>
                ) : (
                  submitText || 'Create Date Sheet'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={creating}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-secondary-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateDatesheetModal
