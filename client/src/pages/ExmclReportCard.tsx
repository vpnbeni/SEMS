import React from 'react'

const ExmclReportCard: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Report Card</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Generate the final report card PDF for printing and distribution.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ExmclReportCard
