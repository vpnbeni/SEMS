import React from 'react'

const ExmclAwardList: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Award List</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Generate award lists for teachers to record marks after paper checking.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ExmclAwardList
