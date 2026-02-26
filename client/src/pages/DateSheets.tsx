import React, { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Tabs } from '../components/common/Tabs'
import DatesheetImportModal from '../components/datesheets/ImportModal'
import CreateDatesheetModal, { DatesheetFormData } from '../components/datesheets/CreateModal'
import ScheduleModal, { ScheduleRow } from '../components/datesheets/ScheduleModal'
import './DateSheets.css'
import calendarService from '../services/calendarService'
import datesheetService from '../services/datesheetService'
import {
  useDatesheets,
  useCBSEDatesheet,
  useCentreDatesheet,
  useSubjects,
  useDatesheetStats,
  useImportDatesheetMutation,
  useCreateDatesheetMutation,
  useUpdateDatesheetMutation,
} from '../hooks/useDatesheets'

type DateSheetTabId = 'all' | 'centre' | 'centre10th' | 'centre12th'

const limit = 50

const DateSheets: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [importErrorMsg, setImportErrorMsg] = useState<string | undefined>()
  const [importErrorSample, setImportErrorSample] = useState<string[] | undefined>()
  const [importDebug, setImportDebug] = useState<any>(undefined)
  const [editing, setEditing] = useState<boolean>(false)
  const [editingData, setEditingData] = useState<any | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [activeTab, setActiveTab] = useState<DateSheetTabId>('centre')
  const [sortField, setSortField] = useState<'date' | 'class' | 'subjectName' | 'subjectCode' | 'duration' | null>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [isDownloadingCentrePDF, setIsDownloadingCentrePDF] = useState(false)

  const cbseParams = useMemo(() => ({
    page,
    limit,
    ...(sortField && { sortField, sortOrder }),
  }), [page, sortField, sortOrder])
  const centreParams = useMemo(() => ({
    page,
    limit,
    ...(sortField && { sortField, sortOrder }),
  }), [page, sortField, sortOrder])
  const subjectParams = useMemo(() => ({ page, limit }), [page])

  const { data: datesheets = [], isLoading: loading } = useDatesheets()
  const { data: cbseData, isLoading: cbseLoading } = useCBSEDatesheet(
    cbseParams,
    { enabled: activeTab === 'all' }
  )
  const { data: centreData, isLoading: centreLoading } = useCentreDatesheet(
    centreParams,
    { enabled: activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th' }
  )
  const { data: subjectsData } = useSubjects(
    subjectParams,
    { enabled: activeTab === 'all' }
  )
  const { data: stats = {
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
    centre12thCandidates: 0,
  } } = useDatesheetStats()

  const importMutation = useImportDatesheetMutation()
  const createMutation = useCreateDatesheetMutation()
  const updateMutation = useUpdateDatesheetMutation()

  const cbseDatesheet = cbseData?.entries ?? []
  const centreDatesheet = centreData?.entries ?? []
  const subjects = subjectsData?.subjects ?? []

  const pagination = useMemo(() => {
    if (activeTab === 'all') {
      const meta = cbseData?.meta ?? subjectsData?.meta
      return {
        page,
        pages: meta?.totalPages ?? 1,
        total: meta?.totalCount ?? 0,
        limit,
      }
    }
    if (activeTab === 'centre' || activeTab === 'centre10th' || activeTab === 'centre12th') {
      const meta = centreData?.meta
      return {
        page,
        pages: meta?.totalPages ?? 1,
        total: meta?.totalCount ?? 0,
        limit,
      }
    }
    return { page, pages: 1, total: 0, limit }
  }, [activeTab, page, cbseData?.meta, subjectsData?.meta, centreData?.meta])

  const handleTabChange = (id: DateSheetTabId) => {
    setActiveTab(id)
    setPage(1)
    setSortField('date')
    setSortOrder('asc')
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleImport = async (file: File) => {
    setImportErrorMsg(undefined)
    setImportErrorSample(undefined)
    importMutation.mutate(file, {
      onSuccess: (response) => {
        if (response?.data?.success) {
          const count = response.data?.data?.count || 0
          toast.success(`Datesheet imported successfully! Found ${count} entries.`)
          setShowImportModal(false)
          setImportErrorMsg(undefined)
          setImportErrorSample(undefined)
          setImportDebug(undefined)
        } else {
          throw new Error(response?.data?.message || 'Import failed')
        }
      },
      onError: (error: any) => {
        const msg = error.response?.data?.message || error.message || 'Failed to import datesheet'
        const sample = error.response?.data?.sample as string[] | undefined
        const debug = error.response?.data?.debug
        setImportErrorMsg(msg)
        setImportErrorSample(sample)
        setImportDebug(debug)
        if (!sample) toast.error(msg)
      },
    })
  }

  const handleCreate = async (data: DatesheetFormData) => {
    try {
      if (editing && editingData) {
        await updateMutation.mutateAsync({
          id: editingData._id,
          data: {
            title: data.title,
            examType: data.examType,
            class: data.class,
            academicYear: data.academicYear,
            startDate: data.startDate,
            endDate: data.endDate,
            generalInstructions: data.generalInstructions,
          },
        })
        toast.success('Date sheet updated successfully!')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Date sheet created successfully!')
      }
      setShowCreateModal(false)
      setEditing(false)
      setEditingData(null)
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to save date sheet'
      toast.error(msg)
    }
  }

  const downloadCentreDatesheetPDF = async () => {
    if (isDownloadingCentrePDF) return

    try {
      setIsDownloadingCentrePDF(true)
      const response = await datesheetService.getCentreDatesheet({
        page: 1,
        limit: 10000,
        sortField: 'date',
        sortOrder: 'asc',
      })

      const entries = response?.data?.data ?? []
      if (!Array.isArray(entries) || entries.length === 0) {
        toast.error('No centre datesheet entries found to download.')
        return
      }

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageHeight = doc.internal.pageSize.getHeight()
      const leftMargin = 10
      const topMargin = 15
      const bottomMargin = 12
      const headerHeight = 10
      let y = topMargin

      const formatPdfDate = (value: string | Date) => {
        const date = new Date(value)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}.${month}.${year}`
      }

      const formatPdfDay = (value: string | Date, fallbackDayName?: string) => {
        if (fallbackDayName && String(fallbackDayName).trim()) {
          return String(fallbackDayName).toUpperCase()
        }
        return String(getDayName(String(value))).toUpperCase()
      }

      const formatPdfClass = (value: string) => {
        const normalized = String(value || '').trim().toLowerCase()
        if (normalized === '10' || normalized === '10th' || normalized === 'x') return 'X'
        if (normalized === '12' || normalized === '12th' || normalized === 'xii') return 'XII'
        return String(value || '').toUpperCase()
      }

      const formatAnswerSheetForPdf = (value: string) => {
        const answerSheetConfig: Record<string, string> = {
          '32_pages': '32 Pages',
          '20_pages': '20 Pages',
          '40_graph': '40 Pages (Graph)',
          none: 'Not specified',
        }
        return answerSheetConfig[value] || answerSheetConfig.none
      }

      const grouped = entries.reduce((acc: Record<string, any[]>, entry: any) => {
        const key = new Date(entry.examDate).toISOString().slice(0, 10)
        if (!acc[key]) acc[key] = []
        acc[key].push(entry)
        return acc
      }, {})

      const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      const colWidths = {
        srNo: 10,
        date: 22,
        day: 22,
        class: 14,
        subject: 58,
        code: 14,
        duration: 18,
        answerSheetType: 34,
        candidates: 24,
        rooms: 20,
        invigilators: 21,
      }
      const colX = {
        srNo: leftMargin,
        date: leftMargin + colWidths.srNo,
        day: leftMargin + colWidths.srNo + colWidths.date,
        class: leftMargin + colWidths.srNo + colWidths.date + colWidths.day,
        subject: leftMargin + colWidths.srNo + colWidths.date + colWidths.day + colWidths.class,
        code:
          leftMargin + colWidths.srNo + colWidths.date + colWidths.day + colWidths.class + colWidths.subject,
        duration:
          leftMargin +
          colWidths.srNo +
          colWidths.date +
          colWidths.day +
          colWidths.class +
          colWidths.subject +
          colWidths.code,
        answerSheetType:
          leftMargin +
          colWidths.srNo +
          colWidths.date +
          colWidths.day +
          colWidths.class +
          colWidths.subject +
          colWidths.code +
          colWidths.duration,
        candidates:
          leftMargin +
          colWidths.srNo +
          colWidths.date +
          colWidths.day +
          colWidths.class +
          colWidths.subject +
          colWidths.code +
          colWidths.duration +
          colWidths.answerSheetType,
        rooms:
          leftMargin +
          colWidths.srNo +
          colWidths.date +
          colWidths.day +
          colWidths.class +
          colWidths.subject +
          colWidths.code +
          colWidths.duration +
          colWidths.answerSheetType +
          colWidths.candidates,
        invigilators:
          leftMargin +
          colWidths.srNo +
          colWidths.date +
          colWidths.day +
          colWidths.class +
          colWidths.subject +
          colWidths.code +
          colWidths.duration +
          colWidths.answerSheetType +
          colWidths.candidates +
          colWidths.rooms,
      }

      const drawHeaderRow = () => {
        doc.setLineWidth(0.3)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.4)

        const headerCells = [
          { x: colX.srNo, w: colWidths.srNo, label: 'Sr No' },
          { x: colX.date, w: colWidths.date, label: 'DATE' },
          { x: colX.day, w: colWidths.day, label: 'DAY' },
          { x: colX.class, w: colWidths.class, label: 'CLASS' },
          { x: colX.subject, w: colWidths.subject, label: 'SUBJECT' },
          { x: colX.code, w: colWidths.code, label: 'CODE' },
          { x: colX.duration, w: colWidths.duration, label: 'DURATION' },
          { x: colX.answerSheetType, w: colWidths.answerSheetType, label: 'ANSWERSHEET TYPE' },
          { x: colX.candidates, w: colWidths.candidates, label: 'CANDIDATES' },
          { x: colX.rooms, w: colWidths.rooms, label: 'ROOMS' },
          { x: colX.invigilators, w: colWidths.invigilators, label: 'INVIGILATORS' },
        ]

        for (const cell of headerCells) {
          doc.rect(cell.x, y, cell.w, headerHeight)
          doc.text(cell.label, cell.x + cell.w / 2, y + headerHeight / 2 + 0.9, { align: 'center' })
        }

        y += headerHeight
      }

      const drawCell = (
        x: number,
        width: number,
        rowHeight: number,
        text: string | string[],
        align: 'left' | 'center' = 'center'
      ) => {
        doc.rect(x, y, width, rowHeight)
        const textArray = Array.isArray(text) ? text : [text]
        const lineHeight = 3.5
        const textBlockHeight = textArray.length * lineHeight
        const textY = y + (rowHeight - textBlockHeight) / 2 + 3

        if (align === 'left') {
          doc.text(textArray, x + 1.5, textY)
        } else {
          doc.text(textArray, x + width / 2, textY, { align: 'center' })
        }
      }

      drawHeaderRow()

      let srNo = 1
      for (const dateKey of sortedDates) {
        const dateEntries = [...grouped[dateKey]].sort((a: any, b: any) => {
          const classA = formatPdfClass(a.subject?.class || '')
          const classB = formatPdfClass(b.subject?.class || '')
          if (classA !== classB) return classA.localeCompare(classB)
          return String(a.subject?.code || '').localeCompare(String(b.subject?.code || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        })

        for (let index = 0; index < dateEntries.length; index += 1) {
          const row = dateEntries[index]
          const subjectText = String(row.subject?.name || 'N/A').toUpperCase()
          const answerSheetText = formatAnswerSheetForPdf(String(row.answerSheet || row.answerSheetType || 'none'))
          const durationText = row.subject?.duration ? `${row.subject.duration} Hours` : 'N/A'
          const candidatesText = String(row.candidateCount || 0)
          const roomsNeeded = Number(row.roomsNeeded || 0)
          const roomsText = roomsNeeded === 0 ? 'Shared' : String(roomsNeeded)
          const invigilatorsText = roomsNeeded === 0 ? '-' : String(row.invigilatorsNeeded ?? roomsNeeded * 2)

          const subjectLines = doc.splitTextToSize(subjectText, colWidths.subject - 3)
          const answerSheetLines = doc.splitTextToSize(answerSheetText, colWidths.answerSheetType - 3)
          const rowLineCount = Math.max(subjectLines.length, answerSheetLines.length, 1)
          const rowHeight = Math.max(8, rowLineCount * 3.5 + 2.4)

          if (y + rowHeight > pageHeight - bottomMargin) {
            doc.addPage()
            y = topMargin
            drawHeaderRow()
          }

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.2)

          const showDateColumns = index === 0
          drawCell(colX.srNo, colWidths.srNo, rowHeight, showDateColumns ? String(srNo) : '')
          drawCell(colX.date, colWidths.date, rowHeight, showDateColumns ? formatPdfDate(dateKey) : '')
          drawCell(
            colX.day,
            colWidths.day,
            rowHeight,
            showDateColumns ? formatPdfDay(dateKey, row.dayName) : ''
          )
          drawCell(colX.class, colWidths.class, rowHeight, formatPdfClass(row.subject?.class || ''))
          drawCell(colX.subject, colWidths.subject, rowHeight, subjectLines, 'left')
          drawCell(colX.code, colWidths.code, rowHeight, String(row.subject?.code || ''))
          drawCell(colX.duration, colWidths.duration, rowHeight, durationText)
          drawCell(colX.answerSheetType, colWidths.answerSheetType, rowHeight, answerSheetLines, 'left')
          drawCell(colX.candidates, colWidths.candidates, rowHeight, candidatesText)
          drawCell(colX.rooms, colWidths.rooms, rowHeight, roomsText)
          drawCell(colX.invigilators, colWidths.invigilators, rowHeight, invigilatorsText)

          y += rowHeight
        }

        srNo += 1
      }

      doc.save(`centre-datesheet-datewise-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Centre datesheet PDF downloaded successfully.')
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to download centre datesheet PDF.'
      toast.error(message)
    } finally {
      setIsDownloadingCentrePDF(false)
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

    setPage(1)
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

  // Helper function to format time from 24-hour to 12-hour format
  const formatTimeTo12Hour = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Helper function to calculate end time based on start time and duration
  const calculateTimeRange = (timeSlot: any, duration: number) => {
    // If timeSlot is a string, return as is
    if (typeof timeSlot === 'string') {
      return timeSlot
    }

    // If timeSlot is an object with start and end, calculate end time based on duration
    if (timeSlot && typeof timeSlot === 'object' && timeSlot.start) {
      const startTime = timeSlot.start

      // Parse start time (format: HH:MM)
      const [hours, minutes] = startTime.split(':').map(Number)

      // Calculate end time by adding duration hours
      const endHours = hours + duration
      const endMinutes = minutes

      // Format end time
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`

      // Return formatted times in 12-hour format
      return `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(endTime)}`
    }

    return null
  }

  // Helper function to format answer sheet with colored dot
  const formatAnswerSheet = (answerSheet: string) => {
    const answerSheetConfig: Record<string, { colorClass: string; label: string }> = {
      '32_pages': { colorClass: 'answer-sheet-dot--32-pages', label: '32 Pages' },
      '20_pages': { colorClass: 'answer-sheet-dot--20-pages', label: '20 Pages' },
      '40_graph': { colorClass: 'answer-sheet-dot--40-graph', label: '40 Pages (Graph)' },
      'none': { colorClass: 'answer-sheet-dot--none', label: 'Not specified' }
    }

    const config = answerSheetConfig[answerSheet] || answerSheetConfig['none']

    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 answer-sheet-dot ${config.colorClass}`} />
        <span>{config.label}</span>
      </div>
    )
  }

  const tabConfigs = useMemo(
    () => [
      {
        id: 'all' as DateSheetTabId,
        label: 'Full Datesheet',
        color: 'blue' as const,
      },
      {
        id: 'centre' as DateSheetTabId,
        label: 'Centre Datesheet',
        color: 'emerald' as const,
      },
      {
        id: 'centre10th' as DateSheetTabId,
        label: 'Class 10th',
        color: 'indigo' as const,
      },
      {
        id: 'centre12th' as DateSheetTabId,
        label: 'Class 12th',
        color: 'purple' as const,
      },
    ],
    []
  )

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900">
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
            tabs={tabConfigs}
            activeTab={activeTab}
            onChange={handleTabChange}
            variant="pill"
            size="sm"
            ariaLabel="Date sheet views"
          />
          <div className="flex gap-3 shrink-0">
            {activeTab === 'centre' && (
              <button
                onClick={downloadCentreDatesheetPDF}
                disabled={isDownloadingCentrePDF}
                className="inline-flex items-center px-4 py-2 border border-emerald-600 shadow-sm text-sm font-medium rounded-lg text-emerald-600 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4m-5 8h18" />
                </svg>
                {isDownloadingCentrePDF ? 'Downloading...' : 'Download PDF'}
              </button>
            )}
          </div>
        </div>
        {/* Datesheet Table */}
        {(loading || (activeTab === 'all' && cbseLoading) || (['centre', 'centre10th', 'centre12th'].includes(activeTab) && centreLoading)) ? (
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
                        {(() => {
                          const timeRange = calculateTimeRange(row.timeSlot, row.duration)
                          return timeRange ? (
                            <div className="text-xs text-gray-400 font-normal mt-0.5">{timeRange}</div>
                          ) : null
                        })()}
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
                            {row.roomsNeeded === 0 ? (
                              <span className="italic text-xs text-amber-600 dark:text-amber-400">Shared</span>
                            ) : (
                              row.roomsNeeded
                            )}
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
          importing={importMutation.isPending}
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
          creating={createMutation.isPending}
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
            updateMutation.mutate(
              {
                id: editingData._id,
                data: {
                  subjects: rows.map(r => ({
                    subject: r.subject,
                    examDate: r.examDate,
                    timeSlot: { start: r.start, end: r.end },
                    duration: r.duration,
                    instructions: r.instructions,
                    isOptional: r.isOptional,
                  })),
                },
              },
              {
                onSuccess: () => setShowScheduleModal(false),
              }
            )
          }}
        />
      )}
    </div>
  )
}

export default DateSheets