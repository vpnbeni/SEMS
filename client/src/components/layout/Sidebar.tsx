import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout, selectUser } from '../../redux/slices/authSlice'
import type { AppDispatch } from '../../redux/store'

const Sidebar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const currentUser = useSelector(selectUser)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const location = useLocation()
  const [counts, setCounts] = useState({
    examFunctionaries: 50, // Default fallback values
    candidates: 507,
    subjects: 264,
    answerSheets: 7,
    datesheetDays: 0
  })

  useEffect(() => {
    fetchCounts()
  }, [])

  // Refresh counts when location changes (user navigates)
  useEffect(() => {
    // Refresh counts after a delay when navigating to relevant pages
    const relevantPaths = ['/candidates', '/subjects', '/exam-functionaries']
    if (relevantPaths.some(path => location.pathname.includes(path))) {
      const timer = setTimeout(() => {
        fetchCounts()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [location.pathname])

  const handleLogout = () => {
    dispatch(logout())
  }

  const fetchCounts = async () => {
    try {
      // Check if we have cached counts (valid for 5 minutes)
      const cachedCounts = localStorage.getItem('sidebarCounts')
      const cacheTime = localStorage.getItem('sidebarCountsTime')
      
      if (cachedCounts && cacheTime) {
        const age = Date.now() - parseInt(cacheTime)
        if (age < 5 * 60 * 1000) { // 5 minutes
          setCounts(JSON.parse(cachedCounts))
          return
        }
      }

      const token = localStorage.getItem('token')
      if (!token) return

      // Fetch all counts in parallel with error handling
      const results = await Promise.allSettled([
        fetch('/api/teachers?limit=1', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/candidates?limit=1', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/subjects/stats', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/datesheets/centre-datesheet?limit=1', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
      ])

      console.log('API Results:', results) // Debug log

      const newCounts = {
        examFunctionaries: results[0].status === 'fulfilled' ? (results[0].value.data?.pagination?.totalCount || results[0].value.meta?.totalCount || 0) : 0,
        candidates: results[1].status === 'fulfilled' ? (results[1].value.total || results[1].value.meta?.totalCount || 0) : 0,
        subjects: results[2].status === 'fulfilled' ? (results[2].value.data?.total || 0) : 0,
        answerSheets: 7,
        datesheetDays: results[3].status === 'fulfilled' ? (results[3].value.stats?.uniqueDates || 0) : 0
      }

      console.log('Calculated counts:', newCounts) // Debug log

      // Only update if we got valid counts, otherwise keep existing/default values
      if (newCounts.examFunctionaries > 0 || newCounts.candidates > 0 || newCounts.subjects > 0 || newCounts.datesheetDays > 0) {
        setCounts(newCounts)
        
        // Cache the counts
        localStorage.setItem('sidebarCounts', JSON.stringify(newCounts))
        localStorage.setItem('sidebarCountsTime', Date.now().toString())
      } else {
        console.warn('API returned zero counts, keeping existing values')
      }
    } catch (error) {
      console.error('Failed to fetch counts:', error)
      // Keep the default/existing counts on error
    }
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Centre Guidelines',
      href: '/centre-guidelines',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Datesheets',
      href: '/datesheets',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      badge: counts.datesheetDays > 0 ? counts.datesheetDays.toString() : null,
    },
    {
      name: 'Exam Functionaries',
      href: '/exam-functionaries',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      badge: counts.examFunctionaries.toString(),
    },
    {
      name: 'Candidates',
      href: '/candidates',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: counts.candidates.toString(),
    },
    {
      name: 'Form 66',
      href: '/form66',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Seating Plan',
      href: '/seatingplan',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Subjects',
      href: '/subjects',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      badge: counts.subjects.toString(),
    },
    {
      name: 'Exam Room/Hall',
      href: '/examrooms',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Answer Sheets',
      href: '/answersheets',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badge: counts.answerSheets.toString(),
    },
  ]

  return (
    <div className={`glass border-r border-secondary-200 dark:border-secondary-700 h-[100vh] min-h-[100vh] transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} flex flex-col overflow-hidden`}>
      {/* Logo and Header - fixed 80px */}
      <div className={`flex-shrink-0 h-20 border-b border-secondary-200 dark:border-secondary-700 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-3'} flex items-center`}>
        <div className={`flex items-center w-full ${isCollapsed ? 'justify-center flex-col gap-1' : 'justify-between'}`}>
          <div className={`flex items-center min-w-0 ${isCollapsed ? 'flex-col' : ''}`}>
            <div className="flex-shrink-0">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-medium w-9 h-9">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            {!isCollapsed && (
              <div className="ml-2 min-w-0 transition-all duration-300">
                <h2 className="text-base font-bold text-secondary-900 dark:text-white leading-tight truncate">
                  BECMS
                </h2>
                <p className="text-[11px] text-secondary-500 dark:text-secondary-400 leading-tight truncate">
                  Examination Management
                </p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors flex-shrink-0 ${isCollapsed ? 'w-full flex justify-center' : ''}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <svg className="w-4 h-4 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-secondary-600 dark:text-secondary-400 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Navigation - scrollable */}
      <nav className={`flex-1 min-h-0 overflow-y-auto transition-all duration-300 ${isCollapsed ? 'mt-3 px-2' : 'mt-4 px-3'} pb-2`}>
        <div className={`space-y-1.5 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`group relative flex items-center text-sm font-medium rounded-xl transition-all duration-200 ${
                  isCollapsed 
                    ? 'justify-center w-12 h-12 p-0' 
                    : 'px-3 py-3'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-medium'
                    : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-white'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <span className={`flex-shrink-0 transition-all duration-200 ${isActive ? 'text-white' : 'text-secondary-500 group-hover:text-secondary-700 dark:text-secondary-400 dark:group-hover:text-secondary-200'} ${isCollapsed ? 'mx-auto' : ''}`}>
                  {item.icon}
                </span>
                
                {!isCollapsed && (
                  <>
                    <span className="ml-3 truncate transition-all duration-300">
                      {item.name}
                    </span>
                    {item.badge && (
                      <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-secondary-200 dark:bg-secondary-600 text-secondary-700 dark:text-secondary-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-900 group-hover:text-primary-700 dark:group-hover:text-primary-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {isCollapsed && item.badge && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-semibold bg-primary-500 text-white border-2 border-white dark:border-secondary-900 shadow-sm z-10">
                    {item.badge}
                  </span>
                )}

                {/* Active indicator */}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></div>
                )}
                {isActive && isCollapsed && (
                  <div className="absolute right-0 top-1 bottom-1 w-1 bg-white rounded-l-full"></div>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Account at bottom - fixed, no shrink */}
      <div className={`flex-shrink-0 p-2 border-t border-secondary-200 dark:border-secondary-700 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className="relative">
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className={`w-full flex items-center rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-all duration-200 ${
              isCollapsed ? 'justify-center p-2' : 'p-3 space-x-3'
            }`}
          >
            <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-medium ring-2 ring-white dark:ring-secondary-800">
              <span className="text-sm font-bold text-white">
                {(currentUser?.email || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                  {currentUser?.email || 'admin@sems.edu'}
                </p>
                <p className="text-xs text-secondary-600 dark:text-secondary-400 truncate">
                  {currentUser?.role || 'Administrator'}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <svg className={`w-4 h-4 text-secondary-500 flex-shrink-0 transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {accountDropdownOpen && (
            <>
              {/* In-sidebar overlay: clicking nav/rest of sidebar closes dropdown */}
              <div
                className={`fixed top-0 bottom-0 z-40 ${isCollapsed ? 'left-0 w-16' : 'left-0 w-64'}`}
                onClick={() => setAccountDropdownOpen(false)}
                aria-hidden="true"
              />
              <div className={`absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-secondary-800 rounded-xl shadow-hard border border-secondary-200 dark:border-secondary-700 z-50 animate-fade-in-down ${isCollapsed ? 'left-full ml-2 bottom-auto top-0' : ''}`}>
              <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-white">
                      {(currentUser?.email || 'A').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                      {currentUser?.email || 'admin@sems.edu'}
                    </p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
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
                  <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile Settings
                </a>
                <a
                  href="#"
                  className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Preferences
                </a>
                <a
                  href="#"
                  className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
            </>
          )}
        </div>
      </div>

      {accountDropdownOpen &&
        createPortal(
          <div
            className={`fixed top-0 right-0 bottom-0 z-40 ${isCollapsed ? 'left-16' : 'left-64'}`}
            onClick={() => setAccountDropdownOpen(false)}
            aria-hidden="true"
          />,
          document.body
        )}
    </div>
  )
}

export default Sidebar