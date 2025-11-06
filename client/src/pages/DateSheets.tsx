import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import DatesheetImportModal from '../components/datesheets/ImportModal'
import CreateDatesheetModal, { DatesheetFormData } from '../components/datesheets/CreateModal'
import ScheduleModal, { ScheduleRow } from '../components/datesheets/ScheduleModal'
import datesheetService from '../services/datesheetService'
import calendarService from '../services/calendarService'

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
    } else if (activeTab === 'centre') {
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
        dayName: entry.dayName
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
        dayName: null
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
      roomsNeeded: entry.roomsNeeded || 0
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
        roomsNeeded: entry.roomsNeeded || 0
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
        roomsNeeded: entry.roomsNeeded || 0
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

  return (
    <div className="p-6">

      {/* Action Bar */}
      <div className="flex justify-end items-center mb-6">
        <div className="flex gap-3">
        <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Import PDF
        </button>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Date Sheet
        </button>
        </div>
      </div>

      {/* Stats Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-lg border-2 transition-all ${
            activeTab === 'all'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${activeTab === 'all' ? 'bg-blue-500' : 'bg-blue-100 dark:bg-blue-900'}`}>
              <svg className={`w-6 h-6 ${activeTab === 'all' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-left flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Full Datesheet</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.fullDatesheetDays}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.fullDatesheet}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('centre')}
          className={`p-4 rounded-lg border-2 transition-all ${
            activeTab === 'centre'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${activeTab === 'centre' ? 'bg-green-500' : 'bg-green-100 dark:bg-green-900'}`}>
              <svg className={`w-6 h-6 ${activeTab === 'centre' ? 'text-white' : 'text-green-600 dark:text-green-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="text-left flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Centre Datesheet</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.centreDays}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.centre}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.centreCandidates}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('centre10th')}
          className={`p-4 rounded-lg border-2 transition-all ${
            activeTab === 'centre10th'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${activeTab === 'centre10th' ? 'bg-green-500' : 'bg-green-100 dark:bg-green-900'}`}>
              <svg className={`w-6 h-6 ${activeTab === 'centre10th' ? 'text-white' : 'text-green-600 dark:text-green-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-left flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Centre 10th Datesheet</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.centre10thDays}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.centre10th}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.centre10thCandidates}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('centre12th')}
          className={`p-4 rounded-lg border-2 transition-all ${
            activeTab === 'centre12th'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${activeTab === 'centre12th' ? 'bg-purple-500' : 'bg-purple-100 dark:bg-purple-900'}`}>
              <svg className={`w-6 h-6 ${activeTab === 'centre12th' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-left flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Centre 12th Datesheet</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.centre12thDays}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.centre12th}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.centre12thCandidates}</span>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Info Banner for Full Datesheet without CBSE data */}
      {activeTab === 'all' && cbseDatesheet.length === 0 && subjects.length > 0 && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Showing subjects without exam dates
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  To see actual exam dates and days, import a CBSE Full Datesheet PDF using the "Import PDF" button above.
                  The system will automatically parse the dates and display them here.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Datesheet Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {(loading || (activeTab === 'all' && cbseLoading) || ((activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') && centreLoading)) ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading...</div>
        ) : tableRows.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Exam Schedule Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {activeTab === 'all' 
                ? 'No exam dates available. Import a CBSE Full Datesheet PDF to see exam dates, or add subjects to see them without dates.'
                : activeTab === 'centre'
                ? 'No centre datesheet available. The centre datesheet is automatically generated based on candidate subject choices. Please ensure candidates are registered and have selected their subjects.'
                : `No exam schedule found for ${activeTab === 'centre10th' ? 'Centre 10th Datesheet' : 'Centre 12th Datesheet'}.`
              }
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Create Date Sheet
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">
                    Sr No
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                    {(activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') ? (
                      <span>Date</span>
                    ) : (
                      <button 
                        onClick={() => handleSort('date')} 
                        className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none"
                      >
                        <span>Date</span>
                        <div className="flex flex-col">
                          <svg className={`w-3 h-3 ${sortField === 'date' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg className={`w-3 h-3 -mt-1 ${sortField === 'date' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>
                    )}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                    Day
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">
                    {(activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') ? (
                      <span>Class</span>
                    ) : (
                      <button 
                        onClick={() => handleSort('class')} 
                        className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none"
                      >
                        <span>Class</span>
                        <div className="flex flex-col">
                          <svg className={`w-3 h-3 ${sortField === 'class' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg className={`w-3 h-3 -mt-1 ${sortField === 'class' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>
                    )}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                    {(activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') ? (
                      <span>Subject Code</span>
                    ) : (
                      <button 
                        onClick={() => handleSort('subjectCode')} 
                        className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none"
                      >
                        <span>Subject Code</span>
                        <div className="flex flex-col">
                          <svg className={`w-3 h-3 ${sortField === 'subjectCode' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg className={`w-3 h-3 -mt-1 ${sortField === 'subjectCode' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>
                    )}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {(activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') ? (
                      <span>Subject Name</span>
                    ) : (
                      <button 
                        onClick={() => handleSort('subjectName')} 
                        className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none"
                      >
                        <span>Subject Name</span>
                        <div className="flex flex-col">
                          <svg className={`w-3 h-3 ${sortField === 'subjectName' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg className={`w-3 h-3 -mt-1 ${sortField === 'subjectName' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>
                    )}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                    {(activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') ? (
                      <span>Duration</span>
                    ) : (
                      <button 
                        onClick={() => handleSort('duration')} 
                        className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none"
                      >
                        <span>Duration</span>
                        <div className="flex flex-col">
                          <svg className={`w-3 h-3 ${sortField === 'duration' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg className={`w-3 h-3 -mt-1 ${sortField === 'duration' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>
                    )}
                  </th>
                  {(activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') && (
                    <>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                        Candidates
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                        Rooms
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tableRows.map((row, index) => {
                  // Determine row background color and text color based on class
                  let rowClassName = "hover:bg-gray-50 dark:hover:bg-gray-700"
                  let textClassName = "text-gray-900 dark:text-white"
                  
                  // Apply color highlighting for all tabs based on class
                  if (row.class === '10th') {
                    rowClassName = "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/40"
                    textClassName = "text-green-800 dark:text-green-200"
                  } else if (row.class === '12th') {
                    rowClassName = "bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/40"
                    textClassName = "text-purple-800 dark:text-purple-200"
                  }
                  
                  // Calculate Sr No based on unique dates within the current tableRows
                  // This ensures each tab (10th, 12th) has independent Sr No counting
                  let srNo = 1
                  const currentDate = row.examDate ? new Date(row.examDate).toDateString() : null
                  
                  // Count unique dates before current row
                  const uniqueDatesBefore = new Set<string>()
                  for (let i = 0; i < index; i++) {
                    const checkDate = tableRows[i].examDate ? new Date(tableRows[i].examDate).toDateString() : null
                    if (checkDate) {
                      uniqueDatesBefore.add(checkDate)
                    }
                  }
                  
                  // If current date is already in the set, use the same Sr No as first occurrence
                  if (currentDate && uniqueDatesBefore.has(currentDate)) {
                    // Find the first row with this date
                    for (let i = 0; i < index; i++) {
                      const checkDate = tableRows[i].examDate ? new Date(tableRows[i].examDate).toDateString() : null
                      if (checkDate === currentDate) {
                        // Count unique dates before that first occurrence
                        const uniqueDatesBeforeFirst = new Set<string>()
                        for (let j = 0; j < i; j++) {
                          const prevDate = tableRows[j].examDate ? new Date(tableRows[j].examDate).toDateString() : null
                          if (prevDate) {
                            uniqueDatesBeforeFirst.add(prevDate)
                          }
                        }
                        srNo = uniqueDatesBeforeFirst.size + 1
                        break
                      }
                    }
                  } else {
                    // New date, increment Sr No
                    srNo = uniqueDatesBefore.size + 1
                  }
                  
                  return (
                  <tr key={`${row.datesheetId}-${index}`} className={rowClassName}>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium ${textClassName}`}>
                      {srNo}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium ${textClassName}`}>
                      {row.examDate ? new Date(row.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium ${textClassName}`}>
                      {row.examDate ? (row.dayName && row.dayName !== 'Unknown' ? row.dayName : getDayName(row.examDate)) : '—'}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium ${textClassName}`}>
                      {row.class}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium ${textClassName}`}>
                      {row.subjectCode}
                    </td>
                    <td className={`px-3 py-3 text-sm font-medium ${textClassName}`}>
                      {row.subjectName}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium ${textClassName}`}>
                      {formatDuration(row.duration)}
                    </td>
                    {(activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') && (
                      <>
                        <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium ${textClassName}`}>
                          {row.candidateCount || 0}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium ${textClassName}`}>
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
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>

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
            startDate: editingData.startDate?.slice(0,10),
            endDate: editingData.endDate?.slice(0,10),
            generalInstructions: editingData.generalInstructions || []
          } : undefined}
          titleText={editing ? 'Edit Date Sheet' : 'Create Date Sheet'}
          submitText={editing ? 'Update Date Sheet' : 'Create Date Sheet'}
        />
      )}

      {showScheduleModal && editingData && (
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          initialRows={(editingData.subjects || []).map((s:any)=>({
            subject: s.subject?._id || s.subject,
            examDate: s.examDate?.slice(0,10),
            start: s.timeSlot?.start,
            end: s.timeSlot?.end,
            duration: s.duration || 180,
            instructions: s.instructions,
            isOptional: s.isOptional,
          }))}
          onSave={async (rows: ScheduleRow[]) => {
            await datesheetService.update(editingData._id, { subjects: rows.map(r=>({
              subject: r.subject,
              examDate: r.examDate,
              timeSlot: { start: r.start, end: r.end },
              duration: r.duration,
              instructions: r.instructions,
              isOptional: r.isOptional,
            })) })
            setShowScheduleModal(false)
            await loadDatesheets()
          }}
        />
      )}
    </div>
  )
}

export default DateSheets