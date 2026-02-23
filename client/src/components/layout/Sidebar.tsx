import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout, selectUser } from '../../redux/slices/authSlice'
import type { AppDispatch } from '../../redux/store'
import api from '../../services/api'

type SidebarCount = number | null

interface SidebarCounts {
  examFunctionaries: SidebarCount
  candidates: SidebarCount
  subjects: SidebarCount
  answerSheets: SidebarCount
  datesheetDays: SidebarCount
  rooms: SidebarCount
}

const SIDEBAR_COUNTS_STORAGE_KEY = 'sidebarCounts'
const SIDEBAR_COUNTS_TIME_KEY = 'sidebarCountsTime'
const SIDEBAR_COUNTS_CACHE_TTL_MS = 5 * 60 * 1000

const EMPTY_COUNTS: SidebarCounts = {
  examFunctionaries: null,
  candidates: null,
  subjects: null,
  answerSheets: null,
  datesheetDays: null,
  rooms: null
}

const parseCount = (value: unknown): SidebarCount => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }

  return null
}

const toBadgeValue = (value: SidebarCount): string | null => {
  if (value === null || value <= 0) {
    return null
  }
  return value.toString()
}

const normalizeCounts = (value: unknown): SidebarCounts => {
  const raw = (typeof value === 'object' && value !== null
    ? value
    : {}) as Partial<Record<keyof SidebarCounts, unknown>>

  return {
    examFunctionaries: parseCount(raw.examFunctionaries),
    candidates: parseCount(raw.candidates),
    subjects: parseCount(raw.subjects),
    answerSheets: parseCount(raw.answerSheets),
    datesheetDays: parseCount(raw.datesheetDays),
    rooms: parseCount(raw.rooms)
  }
}

const getAnswerSheetRecordCount = (answerStatsPayload: unknown): SidebarCount => {
  const byType = (answerStatsPayload as { data?: { byType?: unknown } } | null)?.data?.byType
  if (!Array.isArray(byType)) {
    return null
  }

  const total = byType.reduce((sum: number, entry: unknown) => {
    const count = parseCount((entry as { count?: unknown } | null)?.count)
    return sum + (count ?? 0)
  }, 0)

  return total
}

const isDashboardPath = (pathname: string): boolean =>
  pathname === '/dashboard' || pathname.endsWith('/dashboard')

const Sidebar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const currentUser = useSelector(selectUser)
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(() => isDashboardPath(location.pathname))
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const [counts, setCounts] = useState<SidebarCounts>(EMPTY_COUNTS)

  // Keep sidebar collapsed by default when user is on the dashboard
  useEffect(() => {
    if (isDashboardPath(location.pathname)) {
      setIsCollapsed(true)
    }
  }, [location.pathname])

  useEffect(() => {
    fetchCounts(true)
  }, [])

  // Refresh counts when location changes (user navigates)
  useEffect(() => {
    // Refresh counts after a delay when navigating to relevant pages
    const relevantPaths = ['/candidates', '/subjects', '/exam-functionaries', '/duties', '/answersheets', '/datesheets', '/examrooms']
    if (relevantPaths.some(path => location.pathname.includes(path))) {
      const timer = setTimeout(() => {
        fetchCounts(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [location.pathname])

  const handleLogout = () => {
    dispatch(logout())
  }

  const fetchCounts = async (useCache = true) => {
    try {
      // Check if we have cached counts (valid for 5 minutes)
      const cachedCounts = localStorage.getItem(SIDEBAR_COUNTS_STORAGE_KEY)
      const cacheTime = localStorage.getItem(SIDEBAR_COUNTS_TIME_KEY)

      if (useCache && cachedCounts && cacheTime) {
        const age = Date.now() - parseInt(cacheTime, 10)
        if (age < SIDEBAR_COUNTS_CACHE_TTL_MS) { // 5 minutes
          try {
            setCounts(normalizeCounts(JSON.parse(cachedCounts)))
          } catch (error) {
            console.warn('Invalid sidebar count cache, ignoring it:', error)
          }
        }
      }

      const token = localStorage.getItem('token')
      if (!token) return

      // Fetch all counts in parallel with error handling
      const results = await Promise.allSettled([
        api.get('/teachers', { params: { limit: 1 } }),
        api.get('/candidates', { params: { limit: 1 } }),
        api.get('/subjects/stats'),
        api.get('/datesheets/stats'),
        api.get('/seating-plan/rooms'),
        api.get('/answersheets/stats/summary')
      ])

      const teachers = results[0].status === 'fulfilled' ? results[0].value.data : null
      const candidates = results[1].status === 'fulfilled' ? results[1].value.data : null
      const subjects = results[2].status === 'fulfilled' ? results[2].value.data : null
      const datesheets = results[3].status === 'fulfilled' ? results[3].value.data : null
      const rooms = results[4].status === 'fulfilled' ? results[4].value.data : null
      const answerStats = results[5].status === 'fulfilled' ? results[5].value.data : null

      const newCounts: SidebarCounts = {
        examFunctionaries: parseCount(teachers?.data?.pagination?.totalCount),
        candidates: parseCount(candidates?.total),
        subjects: parseCount(subjects?.data?.total),
        answerSheets: getAnswerSheetRecordCount(answerStats),
        datesheetDays: parseCount(datesheets?.data?.centreDays ?? datesheets?.data?.fullDatesheetDays),
        rooms: parseCount(Array.isArray(rooms) ? rooms.length : null)
      }

      setCounts(newCounts)

      // Cache latest dynamic values (including zero/null)
      localStorage.setItem(SIDEBAR_COUNTS_STORAGE_KEY, JSON.stringify(newCounts))
      localStorage.setItem(SIDEBAR_COUNTS_TIME_KEY, Date.now().toString())
    } catch (error) {
      console.error('Failed to fetch counts:', error)
    }
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Centre Details',
      href: '/centre-details',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 10h6M9 14h6" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Billing',
      href: '/billing',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a5 5 0 00-10 0v2m-2 0h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Centre Guidelines',
      href: '/centre-guidelines',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'CBSE Circulars',
      href: '/cbse-circulars',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4H5m14 8H8m-3 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'CBSE Portals',
      href: '/cbse-portals',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14h14" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Datesheets',
      href: '/datesheets',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      badge: toBadgeValue(counts.datesheetDays),
    },
    {
      name: 'Exam Functionaries',
      href: '/exam-functionaries',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      badge: toBadgeValue(counts.examFunctionaries),
    },
    {
      name: 'Duties',
      href: '/duties',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 9l2 2 4-4" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Undertaking Form',
      href: '/undertaking',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Candidates',
      href: '/candidates',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: toBadgeValue(counts.candidates),
    },
    {
      name: 'Form 66',
      href: '/form66',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Seating Plan',
      href: '/seatingplan',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: null,
    },
    {
      name: 'Subjects',
      href: '/subjects',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      badge: toBadgeValue(counts.subjects),
    },
    {
      name: 'Exam Room/Hall',
      href: '/examrooms',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      badge: toBadgeValue(counts.rooms),
    },
    {
      name: 'Answer Sheets',
      href: '/answersheets',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badge: toBadgeValue(counts.answerSheets),
    },
  ]

  return (
    <div className={`glass border-r border-gray-100/80 dark:border-gray-800/80 h-[100vh] min-h-[100vh] transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'} flex flex-col overflow-hidden relative z-50`}>
      {/* Decorative background accent */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-primary-50/30 via-primary-50/10 to-transparent dark:from-primary-900/10 dark:via-transparent pointer-events-none" />

      {/* Logo and Header */}
      <div className={`flex-shrink-0 h-24 transition-all duration-300 ${isCollapsed ? 'px-0' : 'px-6'} flex items-center justify-center relative z-10`}>
        <div className={`flex items-center w-full ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
          <div className={`flex items-center min-w-0 ${isCollapsed ? 'flex-col' : 'gap-3'}`}>
            <div className={`relative flex-shrink-0 transition-transform duration-300 ${isCollapsed ? 'scale-90' : 'scale-100'}`}>
              <div className="absolute inset-0 bg-primary-500 rounded-xl blur opacity-20 dark:opacity-40 animate-pulse-slow"></div>
              <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25 w-10 h-10 ring-1 ring-white/20">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex flex-col justify-center">
                <h2 className="text-lg font-bold text-secondary-900 dark:text-white leading-none tracking-tight">
                  BECMS
                </h2>
                <p className="text-[11px] font-medium text-secondary-500 dark:text-secondary-400 leading-tight mt-1 tracking-wide uppercase">
                  Exam Management
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-all flex-shrink-0 ${isCollapsed ? 'mt-1' : ''}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Navigation - scrollable */}
      <nav className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${isCollapsed ? 'px-3' : 'px-4'} py-2`}>
        <div className={`space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`group relative flex items-center text-sm font-medium rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${isCollapsed
                  ? 'justify-center w-12 h-12 p-0'
                  : 'px-3.5 py-3'
                  } ${isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                    : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 hover:text-secondary-900 dark:hover:text-secondary-200'
                  }`}
                title={isCollapsed ? item.name : undefined}
              >
                {/* Active Sidebar Indicator */}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary-500 rounded-r-full" />
                )}

                <span className={`flex-shrink-0 transition-colors duration-200 ${isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-secondary-400 group-hover:text-secondary-600 dark:text-secondary-500 dark:group-hover:text-secondary-300'
                  }`}>
                  {item.icon}
                </span>

                {!isCollapsed && (
                  <>
                    <span className="ml-3.5 truncate font-medium">
                      {item.name}
                    </span>
                    {item.badge && (
                      <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${isActive
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                        : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400 group-hover:bg-white group-hover:shadow-sm dark:group-hover:bg-secondary-700'
                        }`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {isCollapsed && item.badge && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-primary-500 text-white border-2 border-white dark:border-secondary-900 shadow-sm z-10">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Account at bottom - fixed */}
      <div className={`flex-shrink-0 p-4 border-t border-secondary-100 dark:border-secondary-800 bg-white/50 dark:bg-secondary-900/50 backdrop-blur-sm ${isCollapsed ? 'flex justify-center px-2' : ''}`}>
        <div className="relative w-full">
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className={`w-full flex items-center rounded-xl transition-all duration-200 group outline-none ${isCollapsed ? 'justify-center p-0' : 'p-2 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-sm ring-1 ring-transparent hover:ring-secondary-200 dark:hover:ring-secondary-700'
              }`}
          >
            <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/10 ring-2 ring-white dark:ring-secondary-800 group-hover:ring-primary-100 dark:group-hover:ring-primary-900/30 transition-all">
              <span className="text-sm font-bold text-white">
                {(currentUser?.email || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left ml-3">
                <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {currentUser?.email || 'admin@becms.edu'}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                  {currentUser?.role || 'Administrator'}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <svg className={`w-4 h-4 text-secondary-400 group-hover:text-secondary-600 dark:text-secondary-500 dark:group-hover:text-secondary-300 transition-transform duration-200 ${accountDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {accountDropdownOpen && (
            <>
              {/* In-sidebar overlay: clicking nav/rest of sidebar closes dropdown */}
              <div
                className={`fixed top-0 bottom-0 z-40 ${isCollapsed ? 'left-0 w-20' : 'left-0 w-72'}`}
                onClick={() => setAccountDropdownOpen(false)}
                aria-hidden="true"
              />
              <div className={`absolute bottom-full left-0 mb-3 w-64 bg-white dark:bg-secondary-900 rounded-2xl shadow-hard border border-secondary-100 dark:border-secondary-700 z-50 animate-fade-in-up origin-bottom-left ring-1 ring-black/5 ${isCollapsed ? 'left-full ml-4 bottom-0' : ''}`}>
                <div className="p-4 border-b border-secondary-100 dark:border-secondary-800 bg-secondary-50/50 dark:bg-secondary-800/50 rounded-t-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-sm font-bold text-white">
                        {(currentUser?.email || 'A').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                        {currentUser?.email || 'admin@becms.edu'}
                      </p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                        {currentUser?.role || 'Administrator'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="py-2 px-1">
                  <a
                    href="#"
                    className="flex items-center px-3 py-2.5 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile Settings
                  </a>
                  <a
                    href="#"
                    className="flex items-center px-3 py-2.5 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Preferences
                  </a>
                  <a
                    href="#"
                    className="flex items-center px-3 py-2.5 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help & Support
                  </a>
                </div>
                <div className="p-1 border-t border-secondary-100 dark:border-secondary-800">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-xl transition-colors"
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
            className={`fixed top-0 right-0 bottom-0 z-40 ${isCollapsed ? 'left-20' : 'left-72'}`}
            onClick={() => setAccountDropdownOpen(false)}
            aria-hidden="true"
          />,
          document.body
        )}
    </div>
  )
}

export default Sidebar
