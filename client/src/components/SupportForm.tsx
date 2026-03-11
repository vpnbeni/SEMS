import React, { useState, useEffect } from 'react'
import { useCreateSupportTicketMutation } from '@/hooks/useSupport'

type SupportFormProps = {
  onSubmitted?: () => void
}

type ModuleOption = 'Candidates' | 'Seating Plan' | 'Duties' | 'Answer Sheets' | 'Reports'

const moduleOptions: ModuleOption[] = ['Candidates', 'Seating Plan', 'Duties', 'Answer Sheets', 'Reports']

const SupportForm: React.FC<SupportFormProps> = ({ onSubmitted }) => {
  const [centreCode, setCentreCode] = useState('')
  const [examDate, setExamDate] = useState('')
  const [module, setModule] = useState<ModuleOption>('Candidates')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submitTicketMutation = useCreateSupportTicketMutation()
  const submitting = submitTicketMutation.isPending

  useEffect(() => {
    const stored = localStorage.getItem('centreSchoolCode') || localStorage.getItem('centreCode')
    if (stored) setCentreCode(stored)
  }, [])

  const validate = () => {
    const next: Record<string, string> = {}
    if (!centreCode.trim()) next.centreCode = 'Centre code is required'
    if (!examDate) next.examDate = 'Exam date is required'
    if (!description.trim()) next.description = 'Please describe the issue'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      let screenshotUrl: string | undefined
      if (screenshot) {
        // In this version we assume screenshot is already uploaded elsewhere; you can extend this to use an upload endpoint.
        screenshotUrl = screenshot.name
      }
      await submitTicketMutation.mutateAsync({
        centreCode: centreCode.trim(),
        examDate,
        module,
        description: description.trim(),
        screenshot: screenshotUrl,
      })
      setDescription('')
      setScreenshot(null)
      if (!localStorage.getItem('centreSchoolCode') && centreCode.trim()) {
        localStorage.setItem('centreSchoolCode', centreCode.trim())
      }
      if (onSubmitted) onSubmitted()
    } catch {
      // API interceptor already shows message.
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold text-gray-900">Report an Issue</h2>
      <p className="text-xs text-gray-500">
        Share exam-day issues with the board support team. Include as much detail as possible.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Centre Code</label>
          <input
            type="text"
            value={centreCode}
            onChange={(e) => setCentreCode(e.target.value)}
            title="Centre code"
            placeholder="Enter centre code"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.centreCode && <p className="mt-1 text-[11px] text-red-500">{errors.centreCode}</p>}
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Exam Date</label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            title="Exam date"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.examDate && <p className="mt-1 text-[11px] text-red-500">{errors.examDate}</p>}
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Module</label>
          <select
            value={module}
            onChange={(e) => setModule(e.target.value as ModuleOption)}
            title="Module"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {moduleOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Screenshot (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
            title="Screenshot"
            className="w-full text-xs"
          />
        </div>
      </div>

      <div className="text-xs">
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
          placeholder="Describe the issue, steps to reproduce, and any error messages."
        />
        {errors.description && <p className="mt-1 text-[11px] text-red-500">{errors.description}</p>}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Issue'}
        </button>
      </div>
    </form>
  )
}

export default SupportForm
