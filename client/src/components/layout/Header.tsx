import React, { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { logout, selectUser } from '../../redux/slices/authSlice'
import type { AppDispatch } from '../../redux/store'
import { useLocation } from 'react-router-dom'

const Header: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const currentUser = useSelector(selectUser)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()

  const { pageTitle, pageSubtitle } = useMemo(() => {
    const path = location.pathname
    // Normalize base segments
    const seg = (path.split('/')[1] || 'dashboard').toLowerCase()

    switch (seg) {
      case 'dashboard':
        return {
          pageTitle: 'Dashboard',
          pageSubtitle: 'Welcome to School Examination Management System',
        }
      case 'datesheets':
        return {
          pageTitle: 'Date Sheets',
          pageSubtitle: 'Create and manage examination date sheets',
        }
      case 'exam-functionaries':
        return {
          pageTitle: 'Exam Functionaries',
          pageSubtitle: 'Manage examination functionaries and assignments',
        }
      case 'candidates':
        return {
          pageTitle: 'Candidates',
          pageSubtitle: 'Manage examination candidates and PDF imports',
        }
      case 'subjects':
        return {
          pageTitle: 'Subjects',
          pageSubtitle: 'Manage subjects, codes, and related settings',
        }
      case 'rooms':
        return {
          pageTitle: 'Room Allocation',
          pageSubtitle: 'Assign rooms for examinations',
        }
      case 'dispatch':
        return {
          pageTitle: 'Answer Sheet Dispatch',
          pageSubtitle: 'Track and manage answer sheet dispatches',
        }
      default:
        return {
          pageTitle: seg
            .split('-')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' '),
          pageSubtitle: 'Management',
        }
    }
  }, [location.pathname])

  const handleLogout = () => {
    dispatch(logout())
  }

  const notifications = [
    { id: 1, message: 'New exam scheduled for Grade 12', time: '2 hours ago', type: 'info' },
    { id: 2, message: 'Room allocation updated', time: '4 hours ago', type: 'warning' },
    { id: 3, message: 'Teacher John Smith registered', time: '6 hours ago', type: 'success' },
  ]

  return (
    <header className="border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-40 bg-gradient-to-r from-primary-600 to-primary-400">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Page context */}
          <div className="min-w-0 mr-4 hidden sm:block">
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-white truncate">{pageTitle}</h1>
              <span className="hidden md:inline text-xs px-2 py-1 rounded-full bg-white/70 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-700">Live</span>
            </div>
            <p className="mt-0.5 text-sm md:text-base text-white truncate">{pageSubtitle}</p>
          </div>

          {/* Actions and User menu */}
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 w-64 text-sm bg-secondary-50 dark:bg-secondary-800 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-secondary-700 transition-all duration-200"
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-all duration-200 transform hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 3h5l5 5H4V3z" />
                </svg>
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-error-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  3
                </span>
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-secondary-800 rounded-xl shadow-hard border border-secondary-200 dark:border-secondary-700 z-50 animate-fade-in-down">
                  <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-4 border-b border-secondary-100 dark:border-secondary-700 last:border-b-0 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors">
                        <p className="text-sm text-secondary-900 dark:text-white">{notification.message}</p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-secondary-200 dark:border-secondary-700">
                    <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button className="p-2 text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-all duration-200 transform hover:scale-110">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>

            {/* User menu */}
            <div className="relative">
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-secondary-900 dark:text-white">
                    {currentUser?.email || 'admin@sems.edu'}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    {currentUser?.role || 'Administrator'}
                  </p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-all duration-200 transform hover:scale-105"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-medium ring-2 ring-white dark:ring-secondary-800">
                      <span className="text-sm font-bold text-white">
                        {(currentUser?.email || 'A').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </button>
                  
                  {/* User Dropdown menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-secondary-800 rounded-xl shadow-hard border border-secondary-200 dark:border-secondary-700 z-50 animate-fade-in-down">
                      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                            <span className="text-lg font-bold text-white">
                              {(currentUser?.email || 'A').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-secondary-900 dark:text-white">
                              {currentUser?.email || 'admin@sems.edu'}
                            </p>
                            <p className="text-xs text-secondary-500 dark:text-secondary-400">
                              {currentUser?.role || 'Administrator'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        <a
                          href="#"
                          className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile Settings
                        </a>
                        <a
                          href="#"
                          className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Preferences
                        </a>
                        <a
                          href="#"
                          className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Help & Support
                        </a>
                      </div>
                      <div className="border-t border-secondary-200 dark:border-secondary-700">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(dropdownOpen || notificationsOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setDropdownOpen(false)
            setNotificationsOpen(false)
          }}
        />
      )}
    </header>
  )
}

export default Header