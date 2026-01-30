import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import DatesheetImportModal from '../components/datesheets/ImportModal'
import CreateDatesheetModal, { DatesheetFormData } from '../components/datesheets/CreateModal'
import ScheduleModal, { ScheduleRow } from '../components/datesheets/ScheduleModal'
import { Tabs } from '../components/common/Tabs'
import datesheetService from '../services/datesheetService'
import calendarService from '../services/calendarService'

type DateSheetTabId = 'all' | 'centre' | 'centre10th' | 'centre12th'

const DateSheets: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [importErrorMsg, setImportErrorMsg] = useState<string | undefined>()
  const [importErrorSample, setImportErrorSample] = useState<string[] | undefined>()
  const [importDebug, setImportDebug] = useState<any>(undefined)
  const [datesheets, setDatesheets] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [cbseDatesheet, setCbseDatesheet] = useState<any[]>([])
  const [cbseLoading, setCbseLoading] = useState<boolean>(false)
  const [centreDatesheet, setCentreDatesheet] = useState<any[]>([])
  const [centreLoading, setCentreLoading] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [editing, setEditing] = useState<boolean>(false)
  const [editingData, setEditingData] = useState<any | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'centre' | 'centre10th' | 'centre12th'>('all')
  const [stats, setStats] = useState({
    fullDatesheet: 0,
    fullDatesheetDays: 0,
    centre: 0,
    centreDays: 0,
    centreCandidates: 0,
    centre10th: 0,
    centre10thDays: 0,
    centre10thCandidates: 0,
    centre12th: 0,
    centre12thDays: 0,
    centre12thCandidates: 0
  })
  const [sortField, setSortField] = useState<'date' | 'class' | 'subjectName' | 'subjectCode' | 'duration' | null>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 50
  })

  const loadDatesheets = async () => {
    try {
      setLoading(true)
      const res = await datesheetService.getAll()
      const list = res.data?.data?.datesheets || []
      setDatesheets(list)

      // Calculate stats for datesheet tabs (not including full datesheet)
      const centre = list.filter((ds: any) => ds.centre).length
      const centre10th = list.filter((ds: any) => ds.centre && ds.class === '10th').length
      const centre12th = list.filter((ds: any) => ds.centre && ds.class === '12th').length

      setStats({ fullDatesheet: 0, fullDatesheetDays: 0, centre, centreDays: 0, centreCandidates: 0, centre10th, centre10thDays: 0, centre10thCandidates: 0, centre12th, centre12thDays: 0, centre12thCandidates: 0 }) // fullDatesheet will be set from CBSE datesheet or subjects
    } catch (e) {
      // silently ignore; empty state will show
    } finally {
      setLoading(false)
    }
  }

  const loadSubjects = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      const response = await fetch(`/api/subjects?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const subjectsList = data.data || []
          setSubjects(subjectsList)

          // Update pagination info
          setPagination({
            page: data.meta?.currentPage || 1,
            pages: data.meta?.totalPages || 1,
            total: data.meta?.totalCount || 0,
            limit: pagination.limit
          })

          // Update stats with total subject count for full datesheet
          setStats(prev => ({ ...prev, fullDatesheet: data.meta?.totalCount || 0 }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err)
    }
  }

  const loadCBSEDatesheet = async () => {
    try {
      setCbseLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      // Add sorting parameters if active
      if (sortField) {
        queryParams.append('sortField', sortField)
        queryParams.append('sortOrder', sortOrder)
      }

      const response = await fetch(`/api/datesheets/cbse-full?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Full API response:', data)
        if (data.success) {
          const cbseEntries = data.data || []
          setCbseDatesheet(cbseEntries)

          // Update pagination info for CBSE datesheet
          setPagination({
            page: data.meta?.currentPage || 1,
            pages: data.meta?.totalPages || 1,
            total: data.meta?.totalCount || 0,
            limit: pagination.limit
          })

          // Get unique days from API meta or statistics
          const uniqueDays = data.meta?.uniqueDates || data.datesheet?.statistics?.uniqueDates || 0
          console.log('📅 Unique days from API:', uniqueDays)

          // Update stats with CBSE datesheet count and unique days
          setStats(prev => ({
            ...prev,
            fullDatesheet: data.meta?.totalCount || 0,
            fullDatesheetDays: uniqueDays
          }))

          console.log(`✅ Loaded ${cbseEntries.length} CBSE datesheet entries`)
        }
      } else if (response.status === 404) {
        // No CBSE datesheet found, fall back to subjects
        console.log('📄 No CBSE datesheet found, using subjects as fallback')
        setCbseDatesheet([])
      } else {
        console.log('❌ CBSE API Error:', response.status, response.statusText)
        setCbseDatesheet([])
      }
    } catch (err) {
      console.error('Failed to load CBSE datesheet:', err)
      // Fall back to subjects on error
      setCbseDatesheet([])
    } finally {
      setCbseLoading(false)
    }
  }

  const loadCentreDatesheet = async () => {
    try {
      setCentreLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      // Add sorting parameters if active
      if (sortField) {
        queryParams.append('sortField', sortField)
        queryParams.append('sortOrder', sortOrder)
      }

      const response = await fetch(`/api/datesheets/centre-datesheet?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Centre datesheet API response:', data)
        if (data.success) {
          const centreEntries = data.data || []
          console.log('📊 Centre entries:', centreEntries.length, centreEntries.slice(0, 2))
          setCentreDatesheet(centreEntries)

          // Update pagination info for centre datesheet
          setPagination({
            page: data.meta?.currentPage || 1,
            pages: data.meta?.totalPages || 1,
            total: data.meta?.totalCount || 0,
            limit: pagination.limit
          })

          // Update stats with centre datesheet count
          setStats(prev => ({
            ...prev,
            centre: data.meta?.totalCount || 0,
            centreDays: data.stats?.uniqueDates || 0,
            centreCandidates: data.stats?.candidateCount || 0,
            centre10th: data.stats?.class10th || 0,
            centre10thDays: data.stats?.class10thDays || 0,
            centre10thCandidates: data.stats?.class10thCandidates || 0,
            centre12th: data.stats?.class12th || 0,
            centre12thDays: data.stats?.class12thDays || 0,
            centre12thCandidates: data.stats?.class12thCandidates || 0
          }))

          console.log(`✅ Loaded ${centreEntries.length} centre datesheet entries`)
        } else {
          console.log('❌ Centre datesheet API returned success=false:', data.message)
          setCentreDatesheet([])
        }
      } else if (response.status === 404) {
        console.log('📄 No centre datesheet data found (404)')
        const errorData = await response.json()
        console.log('Error details:', errorData)
        setCentreDatesheet([])
      } else {
        console.log('❌ Centre datesheet API Error:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.log('Error details:', errorData)
        setCentreDatesheet([])
      }
    } catch (err) {
      console.error('Failed to load centre datesheet:', err)
      setCentreDatesheet([])
    } finally {
      setCentreLoading(false)
    }
  }

  useEffect(() => {
    loadDatesheets()
    loadSubjects()
    loadCBSEDatesheet()
    loadCentreDatesheet() // Load centre datesheet stats on initial mount
  }, [])

  // Refresh data when tab changes to ensure latest subjects are shown
  useEffect(() => {
    // Reset pagination when switching tabs
    setPagination(prev => ({ ...prev, page: 1 }))

    if (activeTab === 'all') {
      loadSubjects()
    } else if (activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') {
      loadCentreDatesheet()
    }

    // Reset sorting to date when switching tabs
    setSortField('date')
    setSortOrder('asc')
  }, [activeTab])

  // Reload data when pagination changes
  useEffect(() => {
    if (activeTab === 'all') {
      loadCBSEDatesheet() // Try CBSE first, fallback to subjects
    } else if (activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') {
      loadCentreDatesheet()
    }
  }, [pagination.page])

  // Reload data when sort parameters change
  useEffect(() => {
    if (activeTab === 'all') {
      loadCBSEDatesheet()
    } else if (activeTab === 'centre') {
      loadCentreDatesheet()
    }
  }, [sortField, sortOrder])

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleImport = async (file: File) => {
    try {
      setImporting(true)
      setImportErrorMsg(undefined)
      setImportErrorSample(undefined)

      const response = await datesheetService.importFromPDF(file)

      if (response.data?.success) {
        const count = response.data?.data?.count || 0
        toast.success(`Datesheet imported successfully! Found ${count} entries.`)
        setShowImportModal(false)
        setImportErrorMsg(undefined)
        setImportErrorSample(undefined)
        setImportDebug(undefined)

        // Reload CBSE datesheet data after successful import
        await loadCBSEDatesheet()
        await loadDatesheets()
      } else {
        throw new Error(response.data?.message || 'Import failed')
      }
    } catch (error: any) {
      console.error('Import error:', error)
      const msg = error.response?.data?.message || error.message || 'Failed to import datesheet'
      const sample = error.response?.data?.sample as string[] | undefined
      const debug = error.response?.data?.debug

      setImportErrorMsg(msg)
      setImportErrorSample(sample)
      setImportDebug(debug)

      // Log debug info to console for troubleshooting
      if (debug) {
        console.log('Debug info:', debug)
      }
      if (sample) {
        console.log('Sample lines:', sample)
      }

      // Don't show toast if we're displaying error in modal
      if (!sample) {
        toast.error(msg)
      }
    } finally {
      setImporting(false)
    }
  }

  const handleCreate = async (data: DatesheetFormData) => {
    try {
      setCreating(true)
      const response = await datesheetService.create(data)

      if (response.data?.success) {
        toast.success('Date sheet created successfully!')
        setShowCreateModal(false)
        await loadDatesheets()
      } else {
        throw new Error(response.data?.message || 'Failed to create date sheet')
      }
    } catch (error: any) {
      console.error('Create error:', error)
      const msg = error.response?.data?.message || error.message || 'Failed to create date sheet'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  // Filter datesheets based on active tab
  const filteredDatesheets = datesheets.filter((ds) => {
    if (activeTab === 'all') return true
    if (activeTab === 'centre') return ds.centre
    if (activeTab === 'centre10th') return ds.centre && ds.class === '10th'
    if (activeTab === 'centre12th') return ds.centre && ds.class === '12th'
    return true
  })

  // Generate table rows based on active tab
  let tableRows: any[] = []

  if (activeTab === 'all') {
    // For "Full Datesheet" tab, show CBSE datesheet data if available, otherwise subjects
    if (cbseDatesheet.length > 0) {
      tableRows = cbseDatesheet.map((entry: any) => ({
        datesheetId: 'cbse-datesheet',
        datesheetTitle: 'CBSE Full Datesheet',
        class: entry.subject.class,
        examDate: entry.examDate,
        subjectName: entry.subject.name,
        subjectCode: entry.subject.code,
        duration: entry.subject.duration || 0,
        timeSlot: entry.timeSlot,
        dayName: entry.dayName,
        answerSheet: entry.answerSheet || 'none'
      }))
    } else {
      // Fallback to subjects if no CBSE datesheet available
      tableRows = subjects.map((subject: any) => ({
        datesheetId: 'all-subjects',
        datesheetTitle: 'Full Datesheet',
        class: subject.class,
        examDate: null,
        subjectName: subject.name,
        subjectCode: subject.code,
        duration: subject.duration || 0,
        timeSlot: null,
        dayName: null,
        answerSheet: subject.answerSheet || 'none'
      }))
    }
  } else if (activeTab === 'centre') {
    // For "Centre Datesheet" tab, show centre-specific datesheet based on candidate subject choices
    tableRows = centreDatesheet.map((entry: any) => ({
      datesheetId: 'centre-datesheet',
      datesheetTitle: 'Centre Datesheet',
      class: entry.subject.class,
      examDate: entry.examDate,
      subjectName: entry.subject.name,
      subjectCode: entry.subject.code,
      duration: entry.subject.duration || 0,
      timeSlot: entry.timeSlot,
      dayName: entry.dayName,
      candidateCount: entry.candidateCount || 0,
      roomsNeeded: entry.roomsNeeded || 0,
      answerSheet: entry.answerSheet || entry.answerSheetType || 'none'
    }))
  } else if (activeTab === 'centre10th') {
    // For "Centre 10th Datesheet" tab, show only 10th class entries from centre datesheet
    tableRows = centreDatesheet
      .filter((entry: any) => entry.subject.class === '10th')
      .map((entry: any) => ({
        datesheetId: 'centre-datesheet-10th',
        datesheetTitle: 'Centre Datesheet - 10th',
        class: entry.subject.class,
        examDate: entry.examDate,
        subjectName: entry.subject.name,
        subjectCode: entry.subject.code,
        duration: entry.subject.duration || 0,
        timeSlot: entry.timeSlot,
        dayName: entry.dayName,
        candidateCount: entry.candidateCount || 0,
        roomsNeeded: entry.roomsNeeded || 0,
        answerSheet: entry.answerSheet || entry.answerSheetType || 'none'
      }))
  } else if (activeTab === 'centre12th') {
    // For "Centre 12th Datesheet" tab, show only 12th class entries from centre datesheet
    tableRows = centreDatesheet
      .filter((entry: any) => entry.subject.class === '12th')
      .map((entry: any) => ({
        datesheetId: 'centre-datesheet-12th',
        datesheetTitle: 'Centre Datesheet - 12th',
        class: entry.subject.class,
        examDate: entry.examDate,
        subjectName: entry.subject.name,
        subjectCode: entry.subject.code,
        duration: entry.subject.duration || 0,
        timeSlot: entry.timeSlot,
        dayName: entry.dayName,
        candidateCount: entry.candidateCount || 0,
        roomsNeeded: entry.roomsNeeded || 0,
        answerSheet: entry.answerSheet || entry.answerSheetType || 'none'
      }))
  } else {
    // For other tabs, show datesheet subjects as before
    tableRows = filteredDatesheets.flatMap((ds) => {
      if (!ds.subjects || ds.subjects.length === 0) return []
      return ds.subjects.map((subject: any) => ({
        datesheetId: ds._id,
        datesheetTitle: ds.title,
        class: ds.class,
        examDate: subject.examDate,
        subjectName: subject.subject?.name || 'N/A',
        subjectCode: subject.subject?.code || 'N/A',
        duration: subject.duration || subject.subject?.duration || 0,
        timeSlot: subject.timeSlot
      }))
    })
  }

  // Apply sorting (only for non-Full Datesheet tabs, as Full Datesheet uses server-side sorting)
  if (activeTab !== 'all' && sortField) {
    tableRows = [...tableRows].sort((a, b) => {
      let comparison = 0

      if (sortField === 'date') {
        // Handle null dates
        if (!a.examDate && !b.examDate) return 0
        if (!a.examDate) return 1
        if (!b.examDate) return -1
        comparison = new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
      } else if (sortField === 'class') {
        comparison = a.class.localeCompare(b.class)
      } else if (sortField === 'subjectName') {
        comparison = a.subjectName.toLowerCase().localeCompare(b.subjectName.toLowerCase())
      } else if (sortField === 'subjectCode') {
        comparison = a.subjectCode.localeCompare(b.subjectCode)
      } else if (sortField === 'duration') {
        comparison = a.duration - b.duration
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }
  // Note: Full Datesheet tab (activeTab === 'all') uses server-side sorting, so no client-side sorting needed

  // Handle sort
  const handleSort = (field: 'date' | 'class' | 'subjectName' | 'subjectCode' | 'duration') => {
    if (sortField === field) {
      // Toggle sort order or reset to default (date)
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else {
        setSortField('date')
        setSortOrder('asc')
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }

    // Reset to first page when sorting changes
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Helper function to get day name (with fallback to calendar service)
  const getDayName = (dateString: string) => {
    // Use calendar service for client-side calculation as fallback
    // In production, this could be enhanced to use the backend calendar API
    return calendarService.getDayNameFromDate(dateString)
  }

  // Helper function to format duration
  const formatDuration = (duration: number) => {
    // Duration is always stored in hours in the Subject model (2 or 3)
    // Display as "X Hours" format
    if (!duration || duration === 0) return '—'
    return `${duration} ${duration === 1 ? 'Hour' : 'Hours'}`
  }

  // Helper function to format answer sheet with colored dot
  const formatAnswerSheet = (answerSheet: string) => {
    const answerSheetConfig: Record<string, { color: string; label: string }> = {
      '32_pages': { color: '#3B82F6', label: '32 Pages' },
      '20_pages': { color: '#10B981', label: '20 Pages' },
      '40_graph': { color: '#F59E0B', label: '40 Pages (Graph)' },
      'none': { color: '#9CA3AF', label: 'Not specified' }
    }

    const config = answerSheetConfig[answerSheet] || answerSheetConfig['none']

    return (
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: config.color }}
        />
        <span>{config.label}</span>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900">

      {/* Stats cards (display only) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Full Datesheet</p>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.fullDatesheetDays}</span>
                <span className="text-xs text-gray-400 font-medium">days</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.fullDatesheet}</span>
                <span className="text-xs text-gray-400 font-medium">sub</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Centre Datesheet</p>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.centreDays}</span>
                <span className="text-xs text-gray-400 font-medium">days</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.centre}</span>
                <span className="text-xs text-gray-400 font-medium">sub</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Class 10th</p>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.centre10thDays}</span>
                <span className="text-xs text-gray-400 font-medium">days</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.centre10thCandidates}</span>
                <span className="text-xs text-gray-400 font-medium">std</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-violet-50 text-violet-500 dark:bg-violet-900/20 dark:text-violet-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Class 12th</p>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.centre12thDays}</span>
                <span className="text-xs text-gray-400 font-medium">days</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.centre12thCandidates}</span>
                <span className="text-xs text-gray-400 font-medium">std</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner for Full Datesheet without CBSE data */}
      {activeTab === 'all' && cbseDatesheet.length === 0 && subjects.length > 0 && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200">
                Displaying Subjects (No Exam Dates Found)
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  You are currently viewing all subjects. To generate a complete schedule with exam dates and days, please import a CBSE Full Datesheet PDF.
                  The system will automatically parse and organize the dates for you.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
      }

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Ribbon: Tabs + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <Tabs<DateSheetTabId>
            tabs={[
              { id: 'all', label: 'Full Datesheet', color: 'blue' },
              { id: 'centre', label: 'Centre Datesheet', color: 'emerald' },
              { id: 'centre10th', label: 'Class 10th', color: 'indigo' },
              { id: 'centre12th', label: 'Class 12th', color: 'purple' }
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id)}
            variant="pill"
            size="sm"
            ariaLabel="Date sheet views"
          />
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-blue-600 shadow-sm text-sm font-medium rounded-lg text-blue-600 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import PDF
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Date Sheet
            </button>
          </div>
        </div>
        {/* Datesheet Table */}
        {(loading || (activeTab === 'all' && cbseLoading) || ((activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') && centreLoading)) ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">Loading datesheet data...</span>
          </div>
        ) : tableRows.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto h-24 w-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Exam Schedule Found</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
              {activeTab === 'all'
                ? 'No exam dates available. Import a CBSE Full Datesheet PDF to see exam dates, or add subjects manually.'
                : activeTab === 'centre'
                  ? 'No centre datesheet available. The centre datesheet is automatically generated based on candidate subject choices.'
                  : `No exam schedule found for ${activeTab === 'centre10th' ? 'Centre 10th Datesheet' : 'Centre 12th Datesheet'}.`
              }
            </p>
            <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Date Sheet
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50/50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                    Sr No
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32 cursor-pointer group" onClick={() => (activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') ? null : handleSort('date')}>
                    <div className="flex items-center gap-2">
                      <span>Date</span>
                      {activeTab === 'all' && (
                        <div className="inline-flex flex-col -space-y-1.5">
                          <svg className={`w-3 h-3 shrink-0 ${sortField === 'date' && sortOrder === 'asc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                          <svg className={`w-3 h-3 shrink-0 ${sortField === 'date' && sortOrder === 'desc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                    Day
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 cursor-pointer group" onClick={() => (activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') ? null : handleSort('class')}>
                    <div className="flex items-center gap-2">
                      <span>Class</span>
                      {activeTab === 'all' && (
                        <div className="inline-flex flex-col -space-y-1.5">
                          <svg className={`w-3 h-3 shrink-0 ${sortField === 'class' && sortOrder === 'asc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                          <svg className={`w-3 h-3 shrink-0 ${sortField === 'class' && sortOrder === 'desc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32 cursor-pointer group" onClick={() => (activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') ? null : handleSort('subjectCode')}>
                    <div className="flex items-center gap-2">
                      <span>Code</span>
                      {activeTab === 'all' && (
                        <div className="inline-flex flex-col -space-y-1.5">
                          <svg className={`w-3 h-3 shrink-0 ${sortField === 'subjectCode' && sortOrder === 'asc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                          <svg className={`w-3 h-3 shrink-0 ${sortField === 'subjectCode' && sortOrder === 'desc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group" onClick={() => (activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') ? null : handleSort('subjectName')}>
                    <div className="flex items-center gap-2">
                      <span>Subject</span>
                      {activeTab === 'all' && (
                        <div className="inline-flex flex-col -space-y-1.5">
                          <svg className={`w-3 h-3 shrink-0 ${sortField === 'subjectName' && sortOrder === 'asc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                          <svg className={`w-3 h-3 shrink-0 ${sortField === 'subjectName' && sortOrder === 'desc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
                    Answer Sheet
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32 cursor-pointer group" onClick={() => (activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') ? null : handleSort('duration')}>
                    <div className="flex items-center gap-2">
                      <span>Time</span>
                      {activeTab === 'all' && (
                        <div className="inline-flex flex-col -space-y-1.5">
                          <svg className={`w-3 h-3 shrink-0 ${sortField === 'duration' && sortOrder === 'asc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                          <svg className={`w-3 h-3 shrink-0 ${sortField === 'duration' && sortOrder === 'desc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </div>
                      )}
                    </div>
                  </th>
                  {(activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') && (
                    <>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                        Candidates
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                        Rooms
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tableRows.map((row, index) => {
                  let rowClassName = "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  let textClassName = "text-gray-900 dark:text-white"
                  let classBadgeColor = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

                  if (row.class === '10th') {
                    rowClassName = "bg-emerald-50/30 dark:bg-emerald-900/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-colors"
                    classBadgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-500/20";
                  } else if (row.class === '12th') {
                    rowClassName = "bg-violet-50/30 dark:bg-violet-900/10 hover:bg-violet-50/50 dark:hover:bg-violet-900/20 transition-colors"
                    classBadgeColor = "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 ring-1 ring-violet-500/20";
                  }

                  let srNo = 1
                  const currentDate = row.examDate ? new Date(row.examDate).toDateString() : null
                  const uniqueDatesBefore = new Set<string>()
                  for (let i = 0; i < index; i++) {
                    const checkDate = tableRows[i].examDate ? new Date(tableRows[i].examDate).toDateString() : null
                    if (checkDate) uniqueDatesBefore.add(checkDate)
                  }
                  if (currentDate && uniqueDatesBefore.has(currentDate)) {
                    for (let i = 0; i < index; i++) {
                      const checkDate = tableRows[i].examDate ? new Date(tableRows[i].examDate).toDateString() : null
                      if (checkDate === currentDate) {
                        const uniqueDatesBeforeFirst = new Set<string>()
                        for (let j = 0; j < i; j++) {
                          const prevDate = tableRows[j].examDate ? new Date(tableRows[j].examDate).toDateString() : null
                          if (prevDate) uniqueDatesBeforeFirst.add(prevDate)
                        }
                        srNo = uniqueDatesBeforeFirst.size + 1
                        break
                      }
                    }
                  } else {
                    srNo = uniqueDatesBefore.size + 1
                  }

                  return (
                    <tr key={`${row.datesheetId}-${index}`} className={rowClassName}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                        {String(srNo).padStart(2, '0')}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${textClassName}`}>
                        {row.examDate ? new Date(row.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {row.examDate ? (row.dayName && row.dayName !== 'Unknown' ? row.dayName : getDayName(row.examDate)) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classBadgeColor}`}>
                          {row.class}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {row.subjectCode}
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${textClassName}`}>
                        {row.subjectName}
                        {row.timeSlot && typeof row.timeSlot === 'string' ? (
                          <div className="text-xs text-gray-400 font-normal mt-0.5">{row.timeSlot}</div>
                        ) : row.timeSlot && typeof row.timeSlot === 'object' ? (
                          <div className="text-xs text-gray-400 font-normal mt-0.5">
                            {row.timeSlot.start} - {row.timeSlot.end}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatAnswerSheet(row.answerSheet || 'none')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDuration(row.duration)}
                      </td>
                      {(activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900 dark:text-white">
                            {row.candidateCount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                            {row.roomsNeeded || 0}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Pagination - Show for all tabs when there are multiple pages */}
      {!loading && !cbseLoading && !centreLoading && pagination.pages > 1 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:z-20"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Show limited page numbers with ellipsis if many pages */}
                  {/* Use an IIFE to generate pagination items */}
                  {(() => {
                    const pages: (number | string)[] = [];
                    const { page, pages: totalPages } = pagination;

                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Always show first page
                      pages.push(1);

                      // Add left ellipsis
                      if (page > 3) {
                        pages.push('...');
                      }

                      // Show current page and neighbors
                      const start = Math.max(2, page - 1);
                      const end = Math.min(totalPages - 1, page + 1);

                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }

                      // Add right ellipsis
                      if (page < totalPages - 2) {
                        pages.push('...');
                      }

                      // Always show last page
                      pages.push(totalPages);
                    }

                    return pages.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => typeof p === 'number' && handlePageChange(p)}
                        disabled={p === '...'}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium focus:z-20 transition-colors ${p === pagination.page
                            ? 'z-10 bg-blue-600 border-blue-600 text-white'
                            : p === '...'
                              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-default'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        {p}
                      </button>
                    ));
                  })()}

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:z-20"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <DatesheetImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          importing={importing}
          errorMessage={importErrorMsg}
          errorSample={importErrorSample}
          debug={importDebug}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateDatesheetModal
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setEditing(false); setEditingData(null) }}
          onCreate={handleCreate}
          creating={creating}
          initialData={editingData ? {
            title: editingData.title,
            examType: editingData.examType,
            class: editingData.class,
            academicYear: editingData.academicYear,
            startDate: editingData.startDate?.slice(0, 10),
            endDate: editingData.endDate?.slice(0, 10),
            generalInstructions: editingData.generalInstructions || []
          } : undefined}
          titleText={editing ? 'Edit Date Sheet' : 'Create Date Sheet'}
          submitText={editing ? 'Update Date Sheet' : 'Create Date Sheet'}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && editingData && (
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          initialRows={(editingData.subjects || []).map((s: any) => ({
            subject: s.subject?._id || s.subject,
            examDate: s.examDate?.slice(0, 10),
            start: s.timeSlot?.start,
            end: s.timeSlot?.end,
            duration: s.duration || 180,
            instructions: s.instructions,
            isOptional: s.isOptional,
          }))}
          onSave={async (rows: ScheduleRow[]) => {
            await datesheetService.update(editingData._id, {
              subjects: rows.map(r => ({
                subject: r.subject,
                examDate: r.examDate,
                timeSlot: { start: r.start, end: r.end },
                duration: r.duration,
                instructions: r.instructions,
                isOptional: r.isOptional,
              }))
            })
            setShowScheduleModal(false)
            await loadDatesheets()
          }}
        />
      )}
    </div>
  )
}

export default DateSheets