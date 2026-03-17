import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectUser } from '@/redux/slices/authSlice'
import { useAcademicSession } from '@/contexts/AcademicSessionContext'
import { useTimetable } from '@/contexts/TimetableContext'
import { isFeatureEnabledForPath } from '@/constants/featureAccess'
import { useCentreDetails } from '@/hooks/useCentreDetails'

const Header: React.FC = () => {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const isDashboardRoute = location.pathname === '/dashboard'
  const canAccessCentreDetails = isFeatureEnabledForPath('/centre-details', user?.featureToggles)
  const { currentSession } = useAcademicSession()
  const { periodsPerWeek, setPeriodsPerWeek } = useTimetable()
  const [editingPeriodsPerWeek, setEditingPeriodsPerWeek] = useState(false)
  const [draftPeriodsPerWeek, setDraftPeriodsPerWeek] = useState(periodsPerWeek)

  const isDistributionRoute = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    return (
      segments[0] === 'time-table' &&
      (segments[1] === 'period-distribution' || segments[1] === 'distribution' || segments[1] === 'period-allocation')
    )
  }, [location.pathname])

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
      case 'centre-details':
        return {
          pageTitle: 'Centre Details',
          pageSubtitle: 'Manage centre profile, candidate summary, and exam days',
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
      case 'duties':
        return {
          pageTitle: 'Duties',
          pageSubtitle: 'Assign exam functionaries to rooms for each exam day',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'undertaking':
        return {
          pageTitle: 'Undertaking Form',
          pageSubtitle: 'Download undertaking form rolled out by super admin',
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
          pageSubtitle: 'Manage subjects taught in the classes.',
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
      case 'seatingplan':
        return {
          pageTitle: 'Seating Plan',
          pageSubtitle: 'Generate and manage seating plan PDFs',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'dispatch-slip':
        return {
          pageTitle: 'Dispatch Slip',
          pageSubtitle: 'Centre datesheet (date-wise). Download a dispatch slip PDF per subject.',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'remuneration':
        return {
          pageTitle: 'Remuneration',
          pageSubtitle: 'Summary of duties assigned to each exam functionary.',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'billing':
        return {
          pageTitle: 'Billing',
          pageSubtitle: 'Manage subscription, invoices, and billing profile',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'help-support':
        return {
          pageTitle: 'Help Support',
          pageSubtitle: 'Get assistance with Cntr issues, report exam-day problems, and share feedback.',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'cbse-portals':
        return {
          pageTitle: 'CBSE Portals',
          pageSubtitle: 'Management',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'school-hub':
        return {
          pageTitle: 'School Hub',
          pageSubtitle: 'All school management modules at a glance',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'cbse-circulars':
        return {
          pageTitle: 'CBSE Circulars',
          pageSubtitle: 'Management',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'staff':
        return {
          pageTitle: 'Staff',
          pageSubtitle: 'Details of staff members working in your school',
          showBackButton: isDetailRoute,
          backTo: backToPath,
        }
      case 'time-table': {
        const subPage = segments[1] || ''
        const titleMap: Record<string, { title: string; subtitle: string }> = {
          'classes': { title: 'Classes', subtitle: 'Manage classes and sections for timetable scheduling' },
          'subjects': { title: 'Subjects', subtitle: 'Manage subjects taught in the classes.' },
          'departments': { title: 'Departments', subtitle: 'Map staff with subjects and assign subject workload by class-section' },
          'bell-timings': { title: 'Bell Timings', subtitle: 'Configure school bell timings, period durations, and break schedules' },
          'class-wise': { title: 'Class Wise Timetable', subtitle: 'View and manage timetables organized by class and section' },
          'teacher-wise': { title: 'Teacher Wise Timetable', subtitle: 'View and manage timetables organized by teacher' },
          'period-distribution': { title: 'Period Distribution', subtitle: 'Distribute periods among subjects for each class' },
          'distribution': { title: 'Period Distribution', subtitle: 'Distribute periods among subjects for each class' },
          'period-allocation': { title: 'Period Distribution', subtitle: 'Distribute periods among subjects for each class' },
        }
        const info = titleMap[subPage] || { title: 'Time Table', subtitle: 'School timetable management' }
        return {
          pageTitle: info.title,
          pageSubtitle: info.subtitle,
          showBackButton: false,
          backTo: null,
        }
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

  const dashboardDateLabel = useMemo(() => {
    const now = new Date()
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' })
    const date = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    return `${weekday}, ${date}`
  }, [])

  const { data: centreDetails } = useCentreDetails({
    enabled: isDashboardRoute && canAccessCentreDetails,
  })
  const dashboardCentreLabel = useMemo(() => {
    if (!isDashboardRoute || !canAccessCentreDetails) return ''
    const centreNo = String(centreDetails?.centreNo || '').trim()
    const centreName = String(centreDetails?.centreName || '').trim()
    return [centreNo, centreName].filter(Boolean).join(' - ')
  }, [canAccessCentreDetails, centreDetails, isDashboardRoute])

  const dashboardHeaderLabel = dashboardCentreLabel.trim()

  useEffect(() => {
    setDraftPeriodsPerWeek(periodsPerWeek)
  }, [periodsPerWeek])

  useEffect(() => {
    if (!isDistributionRoute) {
      setEditingPeriodsPerWeek(false)
    }
  }, [isDistributionRoute])

  const handleSavePeriodsPerWeek = () => {
    if (draftPeriodsPerWeek > 0) {
      setPeriodsPerWeek(draftPeriodsPerWeek)
    }
    setEditingPeriodsPerWeek(false)
  }

  return (
    <header className="h-20 flex-shrink-0 sticky top-0 z-40 glass border-b border-gray-100/80 dark:border-gray-800/80 transition-all duration-300">
      <div className="h-full px-4 md:px-8 flex items-center">
        <div className="flex items-center justify-between w-full gap-6">
          {/* Left: Page context + optional back */}
          <div className="min-w-0 flex-1 flex items-center gap-4">
            {showBackButton && backTo && (
              <button
                type="button"
                onClick={() => navigate(backTo)}
                className="p-2 bg-white/50 dark:bg-secondary-800/50 hover:bg-white dark:hover:bg-secondary-700 text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl shadow-sm hover:shadow-md border border-secondary-200 dark:border-secondary-700 transition-all duration-200 flex-shrink-0 group"
                aria-label="Go back"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            {isDashboardRoute ? (
              dashboardHeaderLabel ? (
                <div className="min-w-0 rounded-xl border border-secondary-200/70 dark:border-secondary-700 bg-white/70 dark:bg-secondary-800/40 px-3 py-2 shadow-sm">
                  <h1 className="text-base sm:text-lg md:text-2xl font-bold text-secondary-900 dark:text-white truncate tracking-tight">
                    {dashboardHeaderLabel}
                  </h1>
                </div>
              ) : canAccessCentreDetails ? (
                <button
                  type="button"
                  onClick={() => navigate('/centre-details')}
                  className="min-w-0 rounded-xl border border-dashed border-primary-300 dark:border-primary-700 bg-primary-50/60 dark:bg-primary-900/20 px-3 py-2 shadow-sm hover:bg-primary-100/60 dark:hover:bg-primary-900/40 transition-colors group"
                >
                  <span className="flex items-center gap-2 text-base sm:text-lg font-semibold text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Set up Centre Details
                  </span>
                </button>
              ) : null
            ) : (
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate tracking-tight">
                  {pageTitle}
                </h1>
                <p className="hidden sm:flex items-center gap-1.5 text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                  <span className="w-1 h-1 rounded-full bg-primary-400 flex-shrink-0" />
                  {pageSubtitle}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {isDistributionRoute && (
              <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-secondary-800/60 border border-secondary-200 dark:border-secondary-700 shadow-sm">
                <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 whitespace-nowrap">
                  Periods / Week
                </span>
                {editingPeriodsPerWeek ? (
                  <>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={draftPeriodsPerWeek}
                      aria-label="Periods per week"
                      title="Periods per week"
                      onChange={(e) => setDraftPeriodsPerWeek(parseInt(e.target.value, 10) || 0)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSavePeriodsPerWeek()
                        if (e.key === 'Escape') setEditingPeriodsPerWeek(false)
                      }}
                      className="w-14 px-2 py-1 text-xs font-semibold text-center rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-800 dark:text-secondary-100 outline-none focus:border-primary-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSavePeriodsPerWeek}
                      className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPeriodsPerWeek(false)}
                      className="text-[11px] font-semibold text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-200"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xl leading-none font-bold text-primary-600 dark:text-primary-400 min-w-7 text-center">
                      {periodsPerWeek}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftPeriodsPerWeek(periodsPerWeek)
                        setEditingPeriodsPerWeek(true)
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-secondary-200 dark:border-secondary-600 text-[11px] font-semibold text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700/50"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      Edit
                    </button>
                  </>
                )}
              </div>
            )}
            {/* Academic Session Badge */}
            {currentSession && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200/60 dark:border-primary-800/40">
                <svg className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                  {currentSession}
                </span>
              </div>
            )}
            {isDashboardRoute && (
              <div className="hidden lg:block">
                <span className="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                  {dashboardDateLabel}
                </span>
              </div>
            )}
            {/* Search */}
            <div className="hidden md:block">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500 text-secondary-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 w-28 sm:w-32 text-sm bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 rounded-xl focus:ring-0 focus:border-primary-400 focus:bg-white dark:focus:bg-gray-800 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)] transition-all duration-200 placeholder:text-gray-400 dark:text-white"
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Toggle notifications"
                title="Notifications"
                className={`relative p-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${notificationsOpen
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-800'
                  }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error-500 border border-white dark:border-secondary-800"></span>
                </span>
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-secondary-900 rounded-2xl shadow-elegant border border-secondary-100 dark:border-secondary-700 z-50 animate-fade-in-down origin-top-right ring-1 ring-black/5">
                  <div className="p-4 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center bg-secondary-50/50 dark:bg-secondary-800/50 rounded-t-2xl">
                    <h3 className="text-sm font-bold text-secondary-900 dark:text-white">Notifications</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                      3 New
                    </span>
                  </div>
                  <div className="max-h-[24rem] overflow-y-auto custom-scrollbar">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-4 border-b border-secondary-100 dark:border-secondary-800 last:border-b-0 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors group cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${notification.type === 'info' ? 'bg-primary-500' :
                            notification.type === 'warning' ? 'bg-warning-500' : 'bg-success-500'
                            }`} />
                          <div>
                            <p className="text-sm font-medium text-secondary-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                              {notification.message}
                            </p>
                            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1 font-medium">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-secondary-100 dark:border-secondary-800 bg-secondary-50/30 dark:bg-secondary-800/30 rounded-b-2xl">
                    <button className="w-full py-2 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-xl transition-colors">
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
