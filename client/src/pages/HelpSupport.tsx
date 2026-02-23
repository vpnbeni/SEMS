import React, { useEffect, useState } from 'react'
import api from '@/services/api'
import FAQAccordion from '@/components/FAQAccordion'
import SupportForm from '@/components/SupportForm'
import FeedbackForm from '@/components/FeedbackForm'

type SystemStatus = {
  status: 'operational' | 'maintenance' | 'down'
  message: string
}

const HelpSupport: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      setLoadingStatus(true)
      try {
        const res = await api.get('/support/status')
        const data = res.data?.data ?? res.data
        if (data?.status) {
          setStatus({
            status: data.status,
            message: data.message,
          })
        }
      } finally {
        setLoadingStatus(false)
      }
    }

    fetchStatus()
  }, [])

  const getStatusStyles = () => {
    if (!status) return 'bg-gray-100 text-gray-700'
    if (status.status === 'operational') return 'bg-green-50 text-green-700'
    if (status.status === 'maintenance') return 'bg-yellow-50 text-yellow-700'
    return 'bg-red-50 text-red-700'
  }

  const getStatusLabel = () => {
    if (!status) return 'Checking system status...'
    if (status.status === 'operational') return 'All Systems Operational'
    if (status.status === 'maintenance') return 'Maintenance Mode'
    return 'Server Downtime'
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Emergency contact card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">Exam Day Emergency Contact</p>
            <p className="text-gray-600">
              For critical issues during exam hours, contact your regional CBSE coordinator as per
              the official guidelines.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <span className="text-[11px] uppercase tracking-wide text-gray-500">Reference</span>
            <span className="text-xs font-semibold text-blue-600">
              CBSE Centre Guidelines &amp; Communication
            </span>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="space-y-4 lg:col-span-2">
            <SupportForm />
            <FeedbackForm />
          </div>
          <div className="space-y-4">
            <FAQAccordion />
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpSupport

