import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { debugSidebarCounts } from '../../utils/debugSidebar'

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()
  const [counts, setCounts] = useState({
    examFunctionaries: 50, // Default fallback values
    candidates: 507,
    subjects: 264,
    answerSheets: 7
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
        fetch('/api/subjects/stats', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
      ])

      console.log('API Results:', results) // Debug log
      
      // Call debug function in development
      if (process.env.NODE_ENV === 'development') {
        debugSidebarCounts()
      }

      const newCounts = {
        examFunctionaries: results[0].status === 'fulfilled' ? (results[0].value.data?.pagination?.totalCount || results[0].value.meta?.totalCount || 0) : 0,
        candidates: results[1].status === 'fulfilled' ? (results[1].value.total || results[1].value.meta?.totalCount || 0) : 0,
        subjects: results[2].status === 'fulfilled' ? (results[2].value.data?.total || 0) : 0,
        answerSheets: 7
      }

      console.log('Calculated counts:', newCounts) // Debug log

      // Only update if we got valid counts, otherwise keep existing/default values
      if (newCounts.examFunctionaries > 0 || newCounts.candidates > 0 || newCounts.subjects > 0) {
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
      name: 'Datesheets',
      href: '/datesheets',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      badge: null,
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
      name: 'Room Allocation',
      href: '/rooms',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Answer Sheet Dispatch',
      href: '/dispatch',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badge: counts.answerSheets.toString(),
    },
  ]

  return (
    <div className={`glass border-r border-secondary-200 dark:border-secondary-700 h-screen transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} flex flex-col overflow-hidden`}>
      {/* Logo and Header */}
      <div className={`border-b border-secondary-200 dark:border-secondary-700 transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-6'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
          <div className={`flex items-center ${isCollapsed ? 'flex-col' : ''}`}>
            <div className="flex-shrink-0">
              <div className={`bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-medium transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}`}>
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            {!isCollapsed && (
              <div className="ml-3 transition-all duration-300">
                <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
                  BECMS
                </h2>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 -mt-1">
                  Examination Management
                </p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors flex-shrink-0 ${isCollapsed ? 'w-full flex justify-center mt-2' : ''}`}
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

      {/* Navigation */}
      <nav className={`flex-1 pb-6 transition-all duration-300 ${isCollapsed ? 'mt-4 px-2' : 'mt-6 px-3'}`}>
        <div className={`space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
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

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-secondary-200 dark:border-secondary-700 mt-auto">
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl p-4 border border-primary-200 dark:border-primary-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
                  Need Help?
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-300 truncate">
                  Check our documentation
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar