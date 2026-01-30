import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const Header: React.FC = () => {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const { pageTitle, pageSubtitle, showBackButton, backTo } = useMemo(() => {
    const path = location.pathname
    const segments = path.split('/').filter(Boolean)
    const seg = (segments[0] || 'dashboard').toLowerCase()

    // Detail routes: /answersheets/:id, /candidates/:id, /exam-functionaries/:id
    const listPathsWithDetail = ['answersheets', 'candidates', 'exam-functionaries']
    const isDetailRoute =
      segments.length >= 2 &&
      listPathsWithDetail.includes(seg) &&
      segments[1] !== 'new'
    const backToPath = isDetailRoute ? `/${segments[0]}` : null

    switch (seg) {
      case 'dashboard':
        return {
          pageTitle: 'Dashboard',
          pageSubtitle: 'Welcome to Board Examination Centre Management System',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'datesheets':
        return {
          pageTitle: 'Date Sheets',
          pageSubtitle: 'Create and manage examination date sheets',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'exam-functionaries':
        return {
          pageTitle: 'Exam Functionaries',
          pageSubtitle: 'Manage examination functionaries and assignments',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'candidates':
        return {
          pageTitle: 'Candidates',
          pageSubtitle: 'Manage examination candidates and PDF imports',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'subjects':
        return {
          pageTitle: 'Subjects',
          pageSubtitle: 'Manage subjects, codes, and related settings',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'examrooms':
        return {
          pageTitle: 'Exam Room/Hall',
          pageSubtitle: 'Assign rooms and halls for examinations',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'answersheets':
        return {
          pageTitle: 'Answer Sheets',
          pageSubtitle: 'Track and manage answer sheet dispatches',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'centre-guidelines':
        return {
          pageTitle: 'Centre Guidelines',
          pageSubtitle: 'Important guidelines and instructions for examination centre management',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      default:
        return {
          pageTitle: seg
            .split('-')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' '),
          pageSubtitle: 'Management',
          showBackButton: isDetailRoute ?? false,
          backTo: backToPath,
        }
    }
  }, [location.pathname])

  const notifications = [
    { id: 1, message: 'New exam scheduled for Grade 12', time: '2 hours ago', type: 'info' },
    { id: 2, message: 'Room allocation updated', time: '4 hours ago', type: 'warning' },
    { id: 3, message: 'Teacher John Smith registered', time: '6 hours ago', type: 'success' },
  ]

  return (
    <header className="h-20 flex-shrink-0 border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-40 bg-white dark:bg-secondary-800">
      <div className="h-full px-4 md:px-6 flex items-center">
        <div className="flex items-center justify-between w-full gap-4">
          {/* Left: Page context + optional back */}
          <div className="min-w-0 flex-1 mr-2 hidden sm:flex sm:items-center sm:gap-2">
            {showBackButton && backTo && (
              <button
                type="button"
                onClick={() => navigate(backTo)}
                className="p-2 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-lg transition-colors flex-shrink-0"
                aria-label="Go back"
              >
                <svg className="w-5 h-5 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-bold text-secondary-900 dark:text-white truncate">{pageTitle}</h1>
                <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700">Live</span>
              </div>
              <p className="text-xs md:text-sm text-secondary-600 dark:text-secondary-400 truncate mt-0.5">{pageSubtitle}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Search */}
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <svg className="h-3.5 w-3.5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-8 pr-3 py-1.5 w-48 text-xs bg-secondary-50 dark:bg-secondary-800 border border-transparent rounded-lg focus:ring-0 focus:border-2 focus:border-primary-500 focus:bg-white dark:focus:bg-secondary-700 transition-all duration-200"
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-1.5 text-secondary-700 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-200 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-error-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center animate-pulse">
                  3
                </span>
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-secondary-800 rounded-xl shadow-hard border border-secondary-200 dark:border-secondary-700 z-50 animate-fade-in-down">
                  <div className="p-3 border-b border-secondary-200 dark:border-secondary-700">
                    <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-3 border-b border-secondary-100 dark:border-secondary-700 last:border-b-0 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors">
                        <p className="text-xs text-secondary-900 dark:text-white">{notification.message}</p>
                        <p className="text-[11px] text-secondary-500 dark:text-secondary-400 mt-0.5">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-secondary-200 dark:border-secondary-700">
                    <button className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close notifications */}
      {notificationsOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setNotificationsOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  )
}

export default Header