import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout, selectUser } from '../../redux/slices/authSlice'
import type { AppDispatch } from '../../redux/store'
import api from '../../services/api'
import { useAcademicSession } from '../../contexts/AcademicSessionContext'
import { isFeatureEnabledForPath } from '../../constants/featureAccess'
import { getAuthToken } from '../../utils/authStorage'

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

const Sidebar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const currentUser = useSelector(selectUser)
  const location = useLocation()
  const navigate = useNavigate()
  const { currentSession, clearSession } = useAcademicSession()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const [counts, setCounts] = useState<SidebarCounts>(EMPTY_COUNTS)
  const [centreLabel, setCentreLabel] = useState<string>('')
  const [centreCode, setCentreCode] = useState<string>('')
  const [centreName, setCentreName] = useState<string>('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const isPathAllowed = (href: string) => isFeatureEnabledForPath(href, currentUser?.featureToggles)
  const canAccessCentreDetails = isPathAllowed('/centre-details')

  useEffect(() => {
    fetchCounts(true)
  }, [currentUser?.featureToggles])

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

  const handleSwitchSession = () => {
    clearSession()
    // Clear cached sidebar counts since they are session-scoped
    localStorage.removeItem(SIDEBAR_COUNTS_STORAGE_KEY)
    localStorage.removeItem(SIDEBAR_COUNTS_TIME_KEY)
    navigate('/select-session')
  }

  useEffect(() => {
    const fetchCentreLabel = async () => {
      if (!canAccessCentreDetails) {
        setCentreLabel('')
        setCentreCode('')
        setCentreName('')
        return
      }

      try {
        const response = await api.get('/centre-details')
        const payload = response?.data?.data || {}
        const centreNo = String(payload?.centreNo || '').trim()
        const schoolCode = String(payload?.centreSchoolCode || '').trim()
        const centreNameValue = String(payload?.centreName || '').trim()
        const label = [schoolCode || centreNo, centreNameValue].filter(Boolean).join(' - ')
        setCentreLabel(label)
        setCentreCode(centreNo)
        setCentreName(centreNameValue)
      } catch {
        setCentreLabel('')
        setCentreCode('')
        setCentreName('')
      }
    }

    fetchCentreLabel()
  }, [canAccessCentreDetails])

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

      const token = getAuthToken()
      if (!token) return

      const teachersRequest = isPathAllowed('/exam-functionaries')
        ? api.get('/teachers', { params: { limit: 1 } })
        : Promise.resolve({ data: null })
      const candidatesRequest = isPathAllowed('/candidates')
        ? api.get('/candidates', { params: { limit: 1 } })
        : Promise.resolve({ data: null })
      const subjectsRequest = isPathAllowed('/subjects')
        ? api.get('/subjects/stats')
        : Promise.resolve({ data: null })
      const datesheetsRequest = isPathAllowed('/datesheets')
        ? api.get('/datesheets/stats')
        : Promise.resolve({ data: null })
      const roomsRequest = isPathAllowed('/examrooms')
        ? api.get('/seating-plan/rooms')
        : Promise.resolve({ data: null })
      const answerSheetsRequest = isPathAllowed('/answersheets')
        ? api.get('/answersheets/stats/summary')
        : Promise.resolve({ data: null })

      // Fetch all counts in parallel with error handling
      const results = await Promise.allSettled([
        teachersRequest,
        candidatesRequest,
        subjectsRequest,
        datesheetsRequest,
        roomsRequest,
        answerSheetsRequest
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

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))
  }

  // Navigation item type definitions
  type NavItem = {
    name: string
    href: string
    icon: React.ReactNode
    badge: string | null
  }

  type NavGroup = {
    name: string
    icon: React.ReactNode
    href?: string // optional link for the group header itself
    children: NavChild[]
  }

  type NavChild = NavItem | NavSubGroup

  type NavSubGroup = {
    name: string
    icon: React.ReactNode
    children: NavItem[]
  }

  type NavEntry = NavItem | NavGroup

  const isGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry
  const isSubGroup = (entry: NavChild): entry is NavSubGroup => 'children' in entry

  const navigation: NavEntry[] = [
    {
      name: 'School Hub',
      href: '/school-hub',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
      children: [
        {
          name: 'Time Table',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          ),
          children: [
            {
              name: 'Classes',
              href: '/time-table/classes',
              icon: (
                <svg className="w-3.5 h-3.5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                </svg>
              ),
              badge: null,
            },
            {
              name: 'Subjects',
              href: '/time-table/subjects',
              icon: (
                <svg className="w-3.5 h-3.5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              ),
              badge: null,
            },
            {
              name: 'Bell Timings',
              href: '/time-table/bell-timings',
              icon: (
                <svg className="w-3.5 h-3.5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              badge: null,
            },
            {
              name: 'Class Wise',
              href: '/time-table/class-wise',
              icon: (
                <svg className="w-3.5 h-3.5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              ),
              badge: null,
            },
            {
              name: 'Teacher Wise',
              href: '/time-table/teacher-wise',
              icon: (
                <svg className="w-3.5 h-3.5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              ),
              badge: null,
            },
            {
              name: 'Period Allocation',
              href: '/time-table/period-allocation',
              icon: (
                <svg className="w-3.5 h-3.5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
                </svg>
              ),
              badge: null,
            },
          ],
        },
      ],
    },
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
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 10h6M9 14h6" />
        </svg>
      ),
      children: [
        {
          name: 'Centre Details',
          href: '/centre-details',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 10h6M9 14h6" />
            </svg>
          ),
          badge: null,
        },
        {
          name: 'Exam Functionaries',
          href: '/exam-functionaries',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
          badge: toBadgeValue(counts.examFunctionaries),
        },
        {
          name: 'Centre Guidelines',
          href: '/centre-guidelines',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          badge: null,
        },
        {
          name: 'CBSE Circulars',
          href: '/cbse-circulars',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4H5m14 8H8m-3 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
          badge: null,
        },
        {
          name: 'CBSE Portals',
          href: '/cbse-portals',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14h14" />
            </svg>
          ),
          badge: null,
        },
        {
          name: 'Subjects',
          href: '/subjects',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
          badge: toBadgeValue(counts.subjects),
        },
        {
          name: 'Undertaking Form',
          href: '/undertaking',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          badge: null,
        },
      ],
    },
    {
      name: 'Centre Records',
      icon: (
        <svg className="w-5 h-5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      children: [
        {
          name: 'Datesheets',
          href: '/datesheets',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          badge: toBadgeValue(counts.datesheetDays),
        },
        {
          name: 'Form 66',
          href: '/form66',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          badge: null,
        },
        {
          name: 'Exam Room/Hall',
          href: '/examrooms',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
          badge: toBadgeValue(counts.rooms),
        },
        {
          name: 'Answer Sheets',
          href: '/answersheets',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          badge: toBadgeValue(counts.answerSheets),
        },
        {
          name: 'Seating Plan',
          href: '/seatingplan',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
          badge: null,
        },
        {
          name: 'Duties',
          href: '/duties',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 9l2 2 4-4" />
            </svg>
          ),
          badge: null,
        },
        {
          name: 'Attendance',
          href: '/attendance',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
          badge: null,
        },
        {
          name: 'Candidates',
          href: '/candidates',
          icon: (
            <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
          badge: toBadgeValue(counts.candidates),
        },
      ],
    },
  ]

  const filterNavChildren = (children: NavChild[]): NavChild[] => {
    const filtered: NavChild[] = []

    children.forEach((child) => {
      if (isSubGroup(child)) {
        const grandChildren = child.children.filter((item) => isPathAllowed(item.href))
        if (grandChildren.length > 0) {
          filtered.push({
            ...child,
            children: grandChildren,
          })
        }
        return
      }

      if (isPathAllowed(child.href)) {
        filtered.push(child)
      }
    })

    return filtered
  }

  const filteredNavigation: NavEntry[] = navigation.reduce<NavEntry[]>((acc, entry) => {
    if (isGroup(entry)) {
      const filteredChildren = filterNavChildren(entry.children)
      const groupHrefAllowed = entry.href ? isPathAllowed(entry.href) : false

      if (filteredChildren.length === 0 && !groupHrefAllowed) {
        return acc
      }

      acc.push({
        ...entry,
        href: groupHrefAllowed ? entry.href : undefined,
        children: filteredChildren,
      })

      return acc
    }

    if (isPathAllowed(entry.href)) {
      acc.push(entry)
    }

    return acc
  }, [])

  const canAccessBilling = isPathAllowed('/billing')
  const canAccessAccountSettings = isPathAllowed('/account-settings')
  const canAccessHelpSupport = isPathAllowed('/help-support')

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

      {/* Academic Session Indicator */}
      {currentSession && (
        <div className={`flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <button
            onClick={handleSwitchSession}
            title={isCollapsed ? `Session: ${currentSession} — Click to switch` : 'Switch academic session'}
            className={`w-full flex items-center rounded-xl border border-primary-200/50 dark:border-primary-800/50 bg-primary-50/50 dark:bg-primary-900/20 hover:bg-primary-100/60 dark:hover:bg-primary-900/30 transition-all duration-200 group ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-2.5'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0 text-primary-500 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {!isCollapsed && (
              <>
                <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 truncate">
                  {currentSession}
                </span>
                <svg className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-primary-400 dark:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Navigation - scrollable */}
      <nav className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${isCollapsed ? 'px-3' : 'px-4'} py-2`}>
        <div className={`space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {filteredNavigation.map((entry) => {
            if (isGroup(entry)) {
              const group = entry
              // Check if any child (or sub-group grandchild) is active
              const isChildActive = group.children.some(child => {
                if (isSubGroup(child)) {
                  return child.children.some(gc => location.pathname === gc.href)
                }
                return location.pathname === child.href
              })
              // Also check if the group's own href matches
              const isGroupHrefActive = group.href ? location.pathname === group.href : false
              const isAnyActive = isChildActive || isGroupHrefActive
              const isOpen = openGroups[group.name] ?? isAnyActive

              return (
                <div key={group.name}>
                  {/* Group header */}
                  <button
                    onClick={() => {
                      toggleGroup(group.name)
                      // If the group has an href and is being opened, navigate to it
                      if (group.href && !isOpen) {
                        navigate(group.href)
                      }
                    }}
                    className={`group relative flex items-center w-full text-sm font-medium rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${isCollapsed
                      ? 'justify-center w-12 h-12 p-0'
                      : 'px-3.5 py-3'
                      } ${isAnyActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 hover:text-secondary-900 dark:hover:text-secondary-200'
                      }`}
                    title={isCollapsed ? group.name : undefined}
                  >
                    {isAnyActive && !isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary-500 rounded-r-full" />
                    )}

                    <span className={`flex-shrink-0 transition-colors duration-200 ${isAnyActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-secondary-400 group-hover:text-secondary-600 dark:text-secondary-500 dark:group-hover:text-secondary-300'
                      }`}>
                      {group.icon}
                    </span>

                    {!isCollapsed && (
                      <>
                        <span className="ml-3.5 truncate font-medium">
                          {group.name}
                        </span>
                        <svg
                          className={`ml-auto w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${isAnyActive
                            ? 'text-primary-500 dark:text-primary-400'
                            : 'text-secondary-400 dark:text-secondary-500'
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>

                  {/* Group children */}
                  {isOpen && !isCollapsed && (
                    <div className="mt-1 ml-4 pl-3.5 border-l-2 border-secondary-100 dark:border-secondary-800 space-y-0.5">
                      {group.children.map((child) => {
                        if (isSubGroup(child)) {
                          // Render sub-group with its own expand/collapse
                          const subGroup = child
                          const isSubChildActive = subGroup.children.some(gc => location.pathname === gc.href)
                          const isSubOpen = openGroups[`${group.name}/${subGroup.name}`] ?? isSubChildActive

                          return (
                            <div key={subGroup.name}>
                              <button
                                onClick={() => toggleGroup(`${group.name}/${subGroup.name}`)}
                                className={`group relative flex items-center w-full text-[13px] font-medium rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 px-3 py-2 ${isSubChildActive
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                  : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 hover:text-secondary-900 dark:hover:text-secondary-200'
                                  }`}
                              >
                                <span className={`flex-shrink-0 transition-colors duration-200 ${isSubChildActive
                                  ? 'text-primary-600 dark:text-primary-400'
                                  : 'text-secondary-400 group-hover:text-secondary-600 dark:text-secondary-500 dark:group-hover:text-secondary-300'
                                  }`}>
                                  {subGroup.icon}
                                </span>
                                <span className="ml-2.5 truncate">
                                  {subGroup.name}
                                </span>
                                <svg
                                  className={`ml-auto w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isSubOpen ? 'rotate-90' : ''} ${isSubChildActive
                                    ? 'text-primary-500 dark:text-primary-400'
                                    : 'text-secondary-400 dark:text-secondary-500'
                                    }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>

                              {isSubOpen && (
                                <div className="mt-0.5 ml-3 pl-3 border-l-2 border-secondary-100 dark:border-secondary-800 space-y-0.5">
                                  {subGroup.children.map((grandChild) => {
                                    const isActive = location.pathname === grandChild.href
                                    return (
                                      <NavLink
                                        key={grandChild.name}
                                        to={grandChild.href}
                                        className={`group relative flex items-center text-[12px] font-medium rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 px-2.5 py-1.5 ${isActive
                                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                          : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 hover:text-secondary-900 dark:hover:text-secondary-200'
                                          }`}
                                      >
                                        <span className={`flex-shrink-0 transition-colors duration-200 ${isActive
                                          ? 'text-primary-600 dark:text-primary-400'
                                          : 'text-secondary-400 group-hover:text-secondary-600 dark:text-secondary-500 dark:group-hover:text-secondary-300'
                                          }`}>
                                          {grandChild.icon}
                                        </span>
                                        <span className="ml-2 truncate">
                                          {grandChild.name}
                                        </span>
                                        {grandChild.badge && (
                                          <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${isActive
                                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                                            : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400 group-hover:bg-white group-hover:shadow-sm dark:group-hover:bg-secondary-700'
                                            }`}>
                                            {grandChild.badge}
                                          </span>
                                        )}
                                      </NavLink>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        }

                        // Regular NavItem child
                        const isActive = location.pathname === child.href
                        return (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            className={`group relative flex items-center text-[13px] font-medium rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 px-3 py-2 ${isActive
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                              : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 hover:text-secondary-900 dark:hover:text-secondary-200'
                              }`}
                          >
                            <span className={`flex-shrink-0 transition-colors duration-200 ${isActive
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-secondary-400 group-hover:text-secondary-600 dark:text-secondary-500 dark:group-hover:text-secondary-300'
                              }`}>
                              {child.icon}
                            </span>
                            <span className="ml-2.5 truncate">
                              {child.name}
                            </span>
                            {child.badge && (
                              <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${isActive
                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                                : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400 group-hover:bg-white group-hover:shadow-sm dark:group-hover:bg-secondary-700'
                                }`}>
                                {child.badge}
                              </span>
                            )}
                          </NavLink>
                        )
                      })}
                    </div>
                  )}

                  {/* Collapsed mode: show children icons */}
                  {isCollapsed && isOpen && (
                    <div className="mt-1 space-y-0.5 flex flex-col items-center">
                      {group.children.map((child) => {
                        if (isSubGroup(child)) {
                          // For sub-groups in collapsed mode, show sub-group children directly
                          return child.children.map((gc) => {
                            const isActive = location.pathname === gc.href
                            return (
                              <NavLink
                                key={gc.name}
                                to={gc.href}
                                className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${isActive
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                  : 'text-secondary-400 dark:text-secondary-500 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 hover:text-secondary-600 dark:hover:text-secondary-300'
                                  }`}
                                title={gc.name}
                              >
                                {gc.icon}
                              </NavLink>
                            )
                          })
                        }

                        const isActive = location.pathname === child.href
                        return (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${isActive
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                              : 'text-secondary-400 dark:text-secondary-500 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 hover:text-secondary-600 dark:hover:text-secondary-300'
                              }`}
                            title={child.name}
                          >
                            {child.icon}
                            {child.badge && (
                              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-0.5 rounded-full text-[9px] font-bold bg-primary-500 text-white border-2 border-white dark:border-secondary-900 shadow-sm z-10">
                                {child.badge}
                              </span>
                            )}
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Regular nav item (not a group)
            const item = entry
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
                {(centreCode || currentUser?.email || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left ml-3">
                <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {centreCode || '—'}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                  {centreName || currentUser?.role || 'Administrator'}
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
                        {centreLabel || currentUser?.email || 'admin@becms.edu'}
                      </p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                        {centreCode || currentUser?.role || 'Administrator'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="py-2 px-1">
                  {canAccessAccountSettings && (
                    <NavLink
                      to="/account-settings"
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                            : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 hover:text-primary-600 dark:hover:text-primary-400'
                        }`
                      }
                    >
                      <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Account Settings
                    </NavLink>
                  )}
                  {canAccessBilling && (
                    <NavLink
                      to="/billing"
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                            : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 hover:text-primary-600 dark:hover:text-primary-400'
                        }`
                      }
                    >
                      <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a5 5 0 00-10 0v2m-2 0h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" />
                      </svg>
                      Billing
                    </NavLink>
                  )}
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
                  {canAccessHelpSupport && (
                    <NavLink
                      to="/help-support"
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                            : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 hover:text-primary-600 dark:hover:text-primary-400'
                        }`
                      }
                    >
                      <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Help & Support
                    </NavLink>
                  )}
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
