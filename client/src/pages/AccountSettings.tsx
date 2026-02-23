import React from 'react'

const AccountSettings: React.FC = () => {
  return (
    <div className="p-6 space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 max-w-3xl">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Account Settings
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Manage your account profile and preferences. (Detailed controls can be added here later.)
        </p>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
          <div className="flex items-center justify-between">
            <span className="font-medium">Email</span>
            <span className="px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              {/* The real email is shown in the sidebar header; duplicate display here as read-only for now. */}
              {localStorage.getItem('user')
                ? (() => {
                    try {
                      const parsed = JSON.parse(localStorage.getItem('user') as string)
                      return parsed?.email || '—'
                    } catch {
                      return '—'
                    }
                  })()
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountSettings

