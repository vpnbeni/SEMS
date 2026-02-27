import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AnswerSheetEntry } from '../services/answerSheetService'
import type { CentreDatesheetEntry } from '../services/centreDatesheetService'
import {
  useAnswerSheets as useAnswerSheetsQuery,
  useCreateAnswerSheetMutation,
  useUploadExcelMutation,
  useUseSheetsMutation,
  useUpdateAnswerSheetMutation,
  useDiscardSheetsMutation,
  useSeries,
  useUpdateSeriesMutation,
} from '../hooks/useAnswerSheets'
import { useCentreDatesheetEntries } from '../hooks/useSeatingPlan'
import { Dropdown } from '../components/common/Dropdown'
import type { DropdownOption } from '../components/common/Dropdown'
import { Tabs } from '../components/common/Tabs'
import type { TabConfig } from '../components/common/Tabs'

const DEFAULT_SEQUENCE_ORDER = 999

const ANSWER_SHEET_SEQUENCE: Record<string, number> = {
  'Main-20-10': 1,
  'Main-32-10': 2,
  'Graph-40-10': 3,
  'Main-20-12': 4,
  'Main-32-12': 5,
  'Graph-40-12': 6,
  'Supplementary-16-10': 7,
  'Supplementary-16-12': 8,
  'For Blind-32-10': 9,
  'For Blind-32-12': 10,
  'Drawing Sheets-21-12': 11
}

const normalizeClassLevel = (value?: string) => String(value ?? '').replace(/\D/g, '')

const getAnswerSheetSequenceOrder = (
  entry: Pick<AnswerSheetEntry, 'answerSheetType' | 'pages' | 'class' | 'sortOrder'>
) => {
  const key = `${entry.answerSheetType}-${entry.pages}-${normalizeClassLevel(entry.class)}`
  return ANSWER_SHEET_SEQUENCE[key] ?? entry.sortOrder ?? DEFAULT_SEQUENCE_ORDER
}

const sortByAnswerSheetSequence = (a: AnswerSheetEntry, b: AnswerSheetEntry) => {
  const orderDiff = getAnswerSheetSequenceOrder(a) - getAnswerSheetSequenceOrder(b)
  if (orderDiff !== 0) return orderDiff

  const receivedDateDiff =
    new Date(b.receivedDate || 0).getTime() - new Date(a.receivedDate || 0).getTime()
  if (receivedDateDiff !== 0) return receivedDateDiff

  return (a.sortOrder ?? DEFAULT_SEQUENCE_ORDER) - (b.sortOrder ?? DEFAULT_SEQUENCE_ORDER)
}

const getEntryEditingKey = (entry: AnswerSheetEntry) => {
  if (entry._id) return entry._id
  return `${entry.answerSheetType}-${entry.pages}-${entry.colour}-${entry.class}-${entry.sortOrder ?? 'template'}`
}

const AnswerSheets: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'received' | 'used' | 'balance' | 'discarded'>('received')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ serialFrom: string; serialTo: string }>({ serialFrom: '', serialTo: '' })
  const [linkingEntry, setLinkingEntry] = useState<{ id: string; quantity: number } | null>(null)
  const [selectedDatesheetEntry, setSelectedDatesheetEntry] = useState<string>('')
  const [editingUsedEntry, setEditingUsedEntry] = useState<string | null>(null)
  const [editUsedValue, setEditUsedValue] = useState<string>('')
  const [formData, setFormData] = useState({
    answerSheetType: '',
    pages: '',
    colour: '',
    class: '',
    serialFrom: '',
    serialTo: '',
    exam: '',
    subject: ''
  })
  const [selectedClass, setSelectedClass] = useState<string | number>('')

  const { data: entries = [], isLoading: loadingList, isFetching, error: listError } = useAnswerSheetsQuery(
    { class: selectedClass || undefined }
  )
  const { data: centreDatesheetEntries = [] } = useCentreDatesheetEntries()
  const { data: savedSeries } = useSeries()
  const createMutation = useCreateAnswerSheetMutation()
  const uploadMutation = useUploadExcelMutation()
  const useSheetsMutation = useUseSheetsMutation()
  const updateMutation = useUpdateAnswerSheetMutation()
  const discardMutation = useDiscardSheetsMutation()
  const updateSeriesMutation = useUpdateSeriesMutation()

  const [seriesInput, setSeriesInput] = useState<string>('')
  const [seriesInitialized, setSeriesInitialized] = useState(false)

  // Sync saved series from server into input state (once on load)
  useEffect(() => {
    if (!seriesInitialized && savedSeries !== undefined) {
      setSeriesInput(savedSeries || '')
      setSeriesInitialized(true)
    }
  }, [savedSeries, seriesInitialized])

  const getDiscardedCount = (entry: AnswerSheetEntry) =>
    Math.max(Number(entry.discarded || 0), Number(entry.discardedSerials?.length || 0))

  const loading =
    loadingList ||
    isFetching ||
    createMutation.isPending ||
    uploadMutation.isPending ||
    useSheetsMutation.isPending ||
    updateMutation.isPending ||
    discardMutation.isPending
  const error = listError?.message ?? null

  const classOptions: DropdownOption[] = [
    { value: '', label: 'All Classes' },
    { value: '10', label: '10th' },
    { value: '12', label: '12th' }
  ]

  // Format time from 24-hour (HH:MM) to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Download Excel template (commented out - not currently used in UI)
  // const downloadTemplate = async () => {
  //   try {
  //     setLoading(true)
  //     const blob = await answerSheetService.downloadTemplate()

  //     // Generate filename with timestamp
  //     const now = new Date()
  //     const timestamp = now.toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-')
  //     const filename = `Answer_Sheets_Template_${timestamp}.xlsx`

  //     // Create download link
  //     const url = window.URL.createObjectURL(blob)
  //     const link = document.createElement('a')
  //     link.href = url
  //     link.download = filename
  //     document.body.appendChild(link)
  //     link.click()
  //     document.body.removeChild(link)
  //     window.URL.revokeObjectURL(url)

  //     alert(`Template downloaded as "${filename}".\n\nPlease:\n1. Open the file in Excel\n2. Fill in the "From" and "To" serial numbers\n3. Save the file\n4. Upload it back here`)
  //   } catch (err: any) {
  //     console.error('Error downloading template:', err)
  //     alert(err.response?.data?.error || 'Failed to download template')
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadFile(file)
    }
  }

  // Upload Excel file
  const handleUploadExcel = async () => {
    if (!uploadFile) {
      alert('Please select a file to upload')
      return
    }

    try {
      const response = await uploadMutation.mutateAsync(uploadFile)
      if (response?.success && response?.data) {
        let message = `Successfully added ${response.data.created} answer sheet entries!`
        if (response.data.skipped > 0) {
          message += `\n\nSkipped ${response.data.skipped} entries with no serial numbers (not received at centre).`
        }
        if (response.data.failed > 0) {
          message += `\n\n${response.data.failed} entries failed to import.`
        }
        alert(message)
        setShowUploadModal(false)
        setUploadFile(null)
      }
    } catch (err: any) {
      console.error('Error uploading Excel:', err)
      alert(err.response?.data?.error || err?.message || 'Failed to upload Excel file')
    }
  }

  // Calculate totals
  const totals = entries.reduce((acc, entry) => {
    acc.received += entry.total
    acc.used += entry.used
    acc.discarded += getDiscardedCount(entry)
    return acc
  }, { received: 0, used: 0, discarded: 0 })

  const balance = totals.received - totals.used - totals.discarded

  const handleAddQuantity = async () => {
    if (!formData.answerSheetType || !formData.pages || !formData.colour || !formData.class || !formData.serialFrom || !formData.serialTo) {
      alert('Please fill all required fields')
      return
    }

    const serialFrom = parseInt(formData.serialFrom.replace(/\D/g, ''))
    const serialTo = parseInt(formData.serialTo.replace(/\D/g, ''))

    if (isNaN(serialFrom) || isNaN(serialTo)) {
      alert('Please enter valid serial numbers')
      return
    }

    if (serialTo < serialFrom) {
      alert('Serial To must be greater than Serial From')
      return
    }

    try {
      await createMutation.mutateAsync({
        answerSheetType: formData.answerSheetType,
        pages: parseInt(formData.pages),
        colour: formData.colour,
        class: formData.class,
        serialFrom: formData.serialFrom,
        serialTo: formData.serialTo,
        exam: formData.exam,
        subject: formData.subject,
        used: 0,
        discarded: 0
      })
      setFormData({
        answerSheetType: '',
        pages: '',
        colour: '',
        class: '',
        serialFrom: '',
        serialTo: '',
        exam: '',
        subject: ''
      })
      setShowAddModal(false)
    } catch (err: any) {
      console.error('Error adding answer sheet:', err)
      alert(err.response?.data?.error || err?.message || 'Failed to add answer sheet')
    }
  }



  const handleSaveSeries = () => {
    updateSeriesMutation.mutate(seriesInput, {
      onError: (err: any) => {
        alert(err?.response?.data?.error || err?.message || 'Failed to save series')
      }
    })
  }

  const handleUseSheets = async (id: string, quantity: number) => {
    // Show link modal if centre datesheet entries are available
    if (centreDatesheetEntries.length > 0) {
      setLinkingEntry({ id, quantity })
      setShowLinkModal(true)
    } else {
      try {
        await useSheetsMutation.mutateAsync({ id, quantity })
      } catch (err: any) {
        console.error('Error using sheets:', err)
        alert(err.response?.data?.error || err?.message || 'Failed to mark sheets as used')
      }
    }
  }

  const handleConfirmUseSheets = async () => {
    if (!linkingEntry) return

    try {
      const datesheetEntry = centreDatesheetEntries.find(e => e._id === selectedDatesheetEntry)
      const linkData = datesheetEntry ? {
        centreDatesheetEntryId: datesheetEntry._id,
        examDate: datesheetEntry.examDate,
        subjectCode: datesheetEntry.subjectCode,
        subjectName: datesheetEntry.subjectName,
        candidateCount: datesheetEntry.candidateCount
      } : undefined

      await useSheetsMutation.mutateAsync({
        id: linkingEntry.id,
        quantity: linkingEntry.quantity,
        linkData
      })
      setShowLinkModal(false)
      setLinkingEntry(null)
      setSelectedDatesheetEntry('')
    } catch (err: any) {
      console.error('Error using sheets:', err)
      alert(err.response?.data?.error || err?.message || 'Failed to mark sheets as used')
    }
  }

  const handleSaveUsed = async (datesheetEntry: CentreDatesheetEntry) => {
    let newValue = parseInt(editUsedValue)

    if (isNaN(newValue) || newValue < 0) {
      alert('Please enter a valid number')
      return
    }

    const maxAllowed = datesheetEntry.candidateCount ?? 0
    if (maxAllowed > 0 && newValue > maxAllowed) {
      newValue = maxAllowed
      alert(`Used quantity cannot exceed the number of candidates (${maxAllowed}). Value capped to ${maxAllowed}.`)
    }

    try {
      const existingSheets = entries.filter(e =>
        e.linkedExamDate &&
        new Date(e.linkedExamDate).toDateString() === new Date(datesheetEntry.examDate).toDateString() &&
        e.linkedSubjectCode === datesheetEntry.subjectCode
      )

      const currentTotal = existingSheets.reduce((sum, e) => sum + e.used, 0)
      const difference = newValue - currentTotal

      if (difference === 0) {
        setEditingUsedEntry(null)
        setEditUsedValue('')
        return
      }

      const answerSheetType = datesheetEntry.answerSheetType
      const targetSheet = entries.find(e => {
        const bal = e.total - e.used - e.discarded
        return bal > 0 &&
          e.class === datesheetEntry.class &&
          matchesAnswerSheetType(e.answerSheetType, answerSheetType)
      })

      if (!targetSheet) {
        alert(`No available answer sheets found for ${formatAnswerSheetType(answerSheetType)} in Class ${datesheetEntry.class}`)
        return
      }

      const balance = targetSheet.total - targetSheet.used - targetSheet.discarded

      if (difference > 0) {
        if (difference > balance) {
          alert(`Not enough answer sheets available. Only ${balance} sheets remaining.`)
          return
        }

        await useSheetsMutation.mutateAsync({
          id: targetSheet._id!,
          quantity: difference,
          linkData: {
            centreDatesheetEntryId: datesheetEntry._id,
            examDate: datesheetEntry.examDate,
            subjectCode: datesheetEntry.subjectCode,
            subjectName: datesheetEntry.subjectName,
            candidateCount: datesheetEntry.candidateCount
          }
        })
      } else {
        const sorted = [...existingSheets].sort((a, b) =>
          new Date(b.receivedDate || 0).getTime() - new Date(a.receivedDate || 0).getTime()
        )
        const mostRecentSheet = sorted[0]

        if (mostRecentSheet?._id) {
          const decreaseAmount = Math.abs(difference)
          const newUsed = Math.max(0, mostRecentSheet.used - decreaseAmount)
          await updateMutation.mutateAsync({ id: mostRecentSheet._id, data: { used: newUsed } })
        }
      }

      setEditingUsedEntry(null)
      setEditUsedValue('')
    } catch (err: any) {
      console.error('Error updating used sheets:', err)
      alert(err.response?.data?.error || err?.message || 'Failed to update used sheets')
    }
  }

  // Helper function to match answer sheet types
  const matchesAnswerSheetType = (sheetType: string, requiredType: string) => {
    // Map answer sheet types to their database equivalents
    const typeMap: Record<string, string[]> = {
      '32_pages': ['Main'],
      '20_pages': ['Main'],
      '40_graph': ['Graph'],
      'none': ['Main', 'Graph', 'Supplementary']
    }

    const acceptableTypes = typeMap[requiredType] || []
    return acceptableTypes.includes(sheetType)
  }

  const handleDiscardSheets = async (id: string, quantity: number) => {
    try {
      await discardMutation.mutateAsync({ id, quantity })
    } catch (err: any) {
      console.error('Error discarding sheets:', err)
      alert(err.response?.data?.error || err?.message || 'Failed to discard sheets')
    }
  }

  // Delete entry (commented out - not currently used in UI)
  // const handleDeleteEntry = async (id: string) => {
  //   if (!confirm('Are you sure you want to delete this entry?')) {
  //     return
  //   }

  //   try {
  //     setLoading(true)
  //     await answerSheetService.deleteAnswerSheet(id)
  //     await fetchAnswerSheets()
  //   } catch (err: any) {
  //     console.error('Error deleting entry:', err)
  //     alert(err.response?.data?.error || 'Failed to delete entry')
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const handleEditClick = (entry: AnswerSheetEntry) => {
    const key = getEntryEditingKey(entry)
    setEditingEntry(key)
    setEditValues({
      serialFrom: entry.serialFrom || '',
      serialTo: entry.serialTo || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingEntry(null)
    setEditValues({ serialFrom: '', serialTo: '' })
  }

  const handleSaveEdit = async (entry: AnswerSheetEntry) => {
    try {
      if (!editValues.serialFrom || !editValues.serialTo) {
        alert('Please enter both serial numbers')
        return
      }

      const fromNum = parseInt(editValues.serialFrom.replace(/\D/g, ''))
      const toNum = parseInt(editValues.serialTo.replace(/\D/g, ''))

      if (isNaN(fromNum) || isNaN(toNum)) {
        alert('Please enter valid serial numbers')
        return
      }

      if (toNum < fromNum) {
        alert('Serial To must be greater than or equal to Serial From')
        return
      }

      if (entry._id && !entry.isTemplate) {
        await updateMutation.mutateAsync({
          id: entry._id,
          data: { serialFrom: editValues.serialFrom, serialTo: editValues.serialTo }
        })
      } else {
        const sequenceOrder = getAnswerSheetSequenceOrder(entry)
        await createMutation.mutateAsync({
          answerSheetType: entry.answerSheetType,
          pages: entry.pages,
          colour: entry.colour,
          class: entry.class,
          suffix: entry.suffix,
          sortOrder: sequenceOrder,
          serialFrom: editValues.serialFrom,
          serialTo: editValues.serialTo,
          used: 0,
          discarded: 0
        })
      }

      setEditingEntry(null)
      setEditValues({ serialFrom: '', serialTo: '' })
    } catch (err: any) {
      console.error('Error saving entry:', err)
      alert(err.response?.data?.error || err?.message || 'Failed to save entry')
    }
  }

  const classFilter = (e: { class?: string }) =>
    !selectedClass || String(e.class) === String(selectedClass)

  const getDisplaySequenceNo = (entry: AnswerSheetEntry, index: number) => {
    const sequenceOrder = getAnswerSheetSequenceOrder(entry)
    if (sequenceOrder !== DEFAULT_SEQUENCE_ORDER) {
      return sequenceOrder
    }
    return entry.sortOrder || index + 1
  }

  const getFilteredEntries = () => {
    const byClass = entries.filter(classFilter).sort(sortByAnswerSheetSequence)
    switch (activeTab) {
      case 'received':
        return byClass
      case 'used':
        return []
      case 'balance':
        return byClass.filter(e => (e.total - e.used - getDiscardedCount(e)) > 0)
      case 'discarded':
        return byClass.filter(e => getDiscardedCount(e) > 0)
      default:
        return byClass
    }
  }

  const getDiscardedRows = () => {
    const byClass = entries.filter(classFilter).sort(sortByAnswerSheetSequence)
    const rows: Array<{
      key: string
      serialNo: string
      date: string
      subject: string
      code: string
      roomNo: string
      reason: string
      entry: AnswerSheetEntry
    }> = []

    byClass.forEach((entry) => {
      const discardedSerials = entry.discardedSerials || []
      const linkedRoomNo = (entry as AnswerSheetEntry & { linkedRoomNo?: string | number }).linkedRoomNo

      discardedSerials.forEach((item, index) => {
        rows.push({
          key: `${entry._id || getEntryEditingKey(entry)}-${item.serial}-${index}`,
          serialNo: item.serial || '-',
          date: entry.linkedExamDate ? new Date(entry.linkedExamDate).toLocaleDateString('en-IN') : '-',
          subject: entry.linkedSubjectName || entry.subject || '-',
          code: entry.linkedSubjectCode || '-',
          roomNo: linkedRoomNo ? String(linkedRoomNo) : '-',
          reason: item.reason || 'Damaged/Misprinted',
          entry,
        })
      })

      const remainingDiscarded = Math.max(0, Number(entry.discarded || 0) - discardedSerials.length)
      for (let i = 0; i < remainingDiscarded; i += 1) {
        rows.push({
          key: `${entry._id || getEntryEditingKey(entry)}-count-only-${i}`,
          serialNo: '-',
          date: entry.linkedExamDate ? new Date(entry.linkedExamDate).toLocaleDateString('en-IN') : '-',
          subject: entry.linkedSubjectName || entry.subject || '-',
          code: entry.linkedSubjectCode || '-',
          roomNo: linkedRoomNo ? String(linkedRoomNo) : '-',
          reason: 'Quantity discard (serial not captured)',
          entry,
        })
      }
    })

    return rows
  }

  // Get centre datesheet entries for Used tab (optionally filtered by class)
  const getUsedTabEntries = () => {
    if (activeTab !== 'used') return []

    let list = [...centreDatesheetEntries]
    if (selectedClass) {
      list = list.filter(e => String(e.class) === String(selectedClass))
    }
    return list.sort((a, b) => {
      const dateDiff = new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
      if (dateDiff !== 0) return dateDiff
      return (b.candidateCount ?? 0) - (a.candidateCount ?? 0)
    })
  }

  // Format answer sheet type for display
  const formatAnswerSheetType = (type: string) => {
    const typeMap: Record<string, string> = {
      '32_pages': 'Main (32 Pages)',
      '20_pages': 'Main (20 Pages)',
      '40_graph': 'Graph (40 Pages)',
      'none': 'Not Specified'
    }
    return typeMap[type] || type
  }

  // Define tabs configuration
  const tabs: TabConfig<'received' | 'used' | 'balance' | 'discarded'>[] = [
    {
      id: 'received',
      label: 'Received',
      badge: totals.received,
      color: 'blue',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'used',
      label: 'Used',
      badge: totals.used,
      color: 'emerald',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    {
      id: 'balance',
      label: 'Balance',
      badge: balance,
      color: 'amber',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'discarded',
      label: 'Discarded',
      badge: totals.discarded,
      color: 'rose',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    }
  ]

  return (
    <div className="p-6">
      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Ribbon: tabs left, dropdowns right */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pill"
            size="md"
            ariaLabel="Answer sheet status"
          />
          <div className="flex items-center space-x-4 min-w-0">
            {/* Series input */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Series</label>
              <div className="flex">
                <input
                  type="text"
                  value={seriesInput}
                  onChange={(e) => setSeriesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveSeries()
                    }
                  }}
                  placeholder="e.g. GGM - 31"
                  className="w-36 px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  maxLength={50}
                />
                <button
                  type="button"
                  onClick={() => handleSaveSeries()}
                  disabled={updateSeriesMutation.isPending}
                  className="px-2.5 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-r-md border border-blue-600 hover:border-blue-700 disabled:border-blue-400 transition-colors"
                  title="Save series"
                >
                  {updateSeriesMutation.isPending ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <Dropdown
              options={classOptions}
              value={selectedClass}
              onChange={(v) => setSelectedClass(Array.isArray(v) ? v[0] ?? '' : v)}
              placeholder="All Classes"
              size="md"
              className="w-52"
              clearable={false}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'received' ? (
            // Received Tab - Special Table
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sr No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Answer Sheet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Pages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Colour
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Serial No From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Serial No To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {(() => {
                  const receivedEntries = getFilteredEntries()
                  if (loading) {
                    return (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                          </div>
                        </td>
                      </tr>
                    )
                  }
                  return receivedEntries.length > 0 ? (
                    receivedEntries.map((entry, index) => {
                      const entryKey = getEntryEditingKey(entry)
                      const isEditing = editingEntry === entryKey

                      return (
                        <tr
                          key={entry._id || index}
                          onClick={() => {
                            if (!isEditing && entry._id && !entry.isTemplate) {
                              navigate(`/answersheets/${entry._id}`)
                            }
                          }}
                          className={`${index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800'} ${!isEditing && entry._id && !entry.isTemplate ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {getDisplaySequenceNo(entry, index)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {entry.answerSheetType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {entry.pages} Pages
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${entry.colour.toLowerCase() === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              entry.colour.toLowerCase() === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                entry.colour.toLowerCase() === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  entry.colour.toLowerCase() === 'pink' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' :
                                    entry.colour.toLowerCase() === 'white' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}>
                              {entry.colour}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {entry.class}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValues.serialFrom}
                                onChange={(e) => setEditValues({ ...editValues, serialFrom: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., 1001"
                              />
                            ) : (
                              <span className={entry.serialFrom ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                                {entry.serialFrom || '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValues.serialTo}
                                onChange={(e) => setEditValues({ ...editValues, serialTo: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., 2000"
                              />
                            ) : (
                              <span className={entry.serialTo ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                                {entry.serialTo || '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {entry.total || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSaveEdit(entry)
                                  }}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                  disabled={loading}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelEdit()
                                  }}
                                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                                  disabled={loading}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditClick(entry)
                                }}
                                className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors duration-150"
                                disabled={loading}
                                title="Edit"
                                aria-label="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          {error ? (
                            <>
                              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>
                            </>
                          ) : (
                            <>
                              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                No answer sheets received yet. Click "Add Received Quantity" to start.
                              </p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          ) : (
            // Other Tabs - Summary Table
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sr No
                  </th>
                  {activeTab === 'used' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Subject Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Subject Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Answer Sheet Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Candidates
                      </th>
                    </>
                  )}
                  {activeTab === 'discarded' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Serial No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Room No
                      </th>
                    </>
                  )}
                  {activeTab !== 'used' && activeTab !== 'discarded' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Answer Sheet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Class
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Received
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Discarded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === 'used' ? 13 : activeTab === 'discarded' ? 11 : 8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                      </div>
                    </td>
                  </tr>
                ) : activeTab === 'used' ? (
                  // Used Tab - Show Centre Datesheet Entries
                  getUsedTabEntries().length > 0 ? (
                    getUsedTabEntries().map((datesheetEntry, index) => {
                      const candidateCount = datesheetEntry.candidateCount ?? 0

                      // Determine if this exam date is today or in the past
                      const examDayStart = new Date(datesheetEntry.examDate)
                      examDayStart.setHours(0, 0, 0, 0)
                      const todayStart = new Date()
                      todayStart.setHours(0, 0, 0, 0)
                      const isPastOrToday = examDayStart.getTime() <= todayStart.getTime()

                      // Received = candidate count (sheets allocated for this exam)
                      const totalReceived = candidateCount

                      // Used: for past/today exams, used = candidateCount (every candidate gets a sheet)
                      // For future exams, show whatever has been manually linked
                      let totalUsed = 0
                      if (isPastOrToday) {
                        totalUsed = candidateCount
                      } else {
                        const usedSheets = entries.filter(e =>
                          e.linkedExamDate &&
                          new Date(e.linkedExamDate).toDateString() === new Date(datesheetEntry.examDate).toDateString() &&
                          e.linkedSubjectCode === datesheetEntry.subjectCode
                        )
                        const rawTotalUsed = usedSheets.reduce((sum, e) => sum + (e.used ?? 0), 0)
                        totalUsed = candidateCount > 0 ? Math.min(rawTotalUsed, candidateCount) : rawTotalUsed
                      }

                      return (
                        <tr key={datesheetEntry._id} className={index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(datesheetEntry.examDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {datesheetEntry.class}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                            {datesheetEntry.subjectCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {datesheetEntry.subjectName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${datesheetEntry.answerSheetType === '32_pages' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              datesheetEntry.answerSheetType === '20_pages' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                datesheetEntry.answerSheetType === '40_graph' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}>
                              {formatAnswerSheetType(datesheetEntry.answerSheetType)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {datesheetEntry.candidateCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {totalReceived || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                            {isPastOrToday ? (
                              <span title="Auto-set to candidate count for completed exams">
                                {totalUsed}
                              </span>
                            ) : editingUsedEntry === datesheetEntry._id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={candidateCount > 0 ? candidateCount : undefined}
                                  value={editUsedValue}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    const num = parseInt(v, 10)
                                    if (candidateCount > 0 && !Number.isNaN(num) && num > candidateCount) {
                                      setEditUsedValue(String(candidateCount))
                                    } else {
                                      setEditUsedValue(v)
                                    }
                                  }}
                                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                  autoFocus
                                  title="Used sheets (cannot exceed candidates)"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveUsed(datesheetEntry)
                                    } else if (e.key === 'Escape') {
                                      setEditingUsedEntry(null)
                                      setEditUsedValue('')
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveUsed(datesheetEntry)}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400"
                                  disabled={loading}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUsedEntry(null)
                                    setEditUsedValue('')
                                  }}
                                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400"
                                  disabled={loading}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div
                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
                                onClick={() => {
                                  setEditingUsedEntry(datesheetEntry._id)
                                  setEditUsedValue(String(totalUsed))
                                }}
                                title="Click to edit"
                              >
                                {totalUsed || 0}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600 dark:text-gray-400">
                            -
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600 dark:text-gray-400">
                            -
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button
                              onClick={() => {
                                // Show modal to select answer sheet and mark as used
                                setSelectedDatesheetEntry(datesheetEntry._id)
                                setShowLinkModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              disabled={loading}
                            >
                              Mark Used
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            No exam schedule found. Please ensure:
                          </p>
                          <ul className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-left">
                            <li>• CBSE datesheet is imported</li>
                            <li>• Candidates have subjects linked</li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )
                ) : activeTab === 'discarded' ? (
                  getDiscardedRows().length > 0 ? (
                    getDiscardedRows().map((row, index) => {
                      const entryDiscarded = getDiscardedCount(row.entry)
                      const entryBalance = row.entry.total - row.entry.used - entryDiscarded
                      return (
                        <tr key={row.key} className={index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                            {row.serialNo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {row.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white" title={row.subject}>
                            <span className="inline-block max-w-[220px] truncate align-bottom">{row.subject}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                            {row.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {row.roomNo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {row.entry.total}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                            {row.entry.used}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                            {entryBalance}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400">
                            {entryDiscarded}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            {row.entry._id && (
                              <button
                                onClick={() => navigate(`/answersheets/${row.entry._id}`)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title={row.reason}
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            No discarded sheet records found.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                ) : (
                  // Other Tabs - Show Answer Sheets
                  getFilteredEntries().length > 0 ? (
                    getFilteredEntries().map((entry, index) => {
                      const entryDiscarded = getDiscardedCount(entry)
                      const entryBalance = entry.total - entry.used - entryDiscarded
                      return (
                        <tr key={entry._id} className={index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {getDisplaySequenceNo(entry, index)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {entry.answerSheetType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {entry.class}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {entry.total}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                            {entry.used}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                            {entryBalance}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400">
                            {entryDiscarded}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            {entryBalance > 0 && (
                              <>
                                <button
                                  onClick={() => {
                                    const qty = prompt('Enter quantity to mark as used:')
                                    if (qty && entry._id) handleUseSheets(entry._id, parseInt(qty))
                                  }}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                  disabled={loading}
                                >
                                  Use
                                </button>
                                <button
                                  onClick={() => {
                                    const qty = prompt('Enter quantity to discard:')
                                    if (qty && entry._id) handleDiscardSheets(entry._id, parseInt(qty))
                                  }}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  disabled={loading}
                                >
                                  Discard
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            No answer sheets found for this category.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upload Excel Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Upload Answer Sheets Excel
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close upload modal"
                  title="Close upload modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-2">How to use:</p>
                      <ol className="list-decimal list-inside space-y-1 mb-2">
                        <li>Click "Download Template" (file will have timestamp in name)</li>
                        <li>Open the downloaded file in Excel</li>
                        <li>Fill in "From" and "To" columns with serial numbers</li>
                        <li>Save the file with a NEW name (e.g., "Filled_Answer_Sheets.xlsx")</li>
                        <li>Upload the SAVED file here</li>
                      </ol>
                      <p className="text-xs mt-2 text-blue-700 dark:text-blue-300 font-semibold">
                        ⚠️ Important: The template is EMPTY. You must fill in serial numbers before uploading!
                      </p>
                      <p className="text-xs mt-1 text-blue-700 dark:text-blue-300">
                        💡 Tip: Save your filled file with a different name to avoid confusion.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="answer-sheet-excel-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Excel File
                  </label>
                  <input
                    id="answer-sheet-excel-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    title="Select Excel file (.xlsx or .xls) to upload"
                    aria-label="Select Excel file (.xlsx or .xls) to upload"
                  />
                  {uploadFile && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Selected: {uploadFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadExcel}
                  className="btn btn-primary"
                  disabled={loading || !uploadFile}
                >
                  {loading ? 'Uploading...' : 'Upload & Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Quantity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add Received Answer Sheets
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close add received answer sheets modal"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Answer Sheet Type *
                    </label>
                    <select
                      value={formData.answerSheetType}
                      onChange={(e) => setFormData({ ...formData, answerSheetType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      aria-label="Answer Sheet Type"
                      title="Answer Sheet Type"
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="Main">Main</option>
                      <option value="Graph">Graph</option>
                      <option value="Supplementary">Supplementary</option>
                      <option value="For Blind">For Blind</option>
                      <option value="Drawing Sheets">Drawing Sheets</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Pages *
                    </label>
                    <input
                      type="number"
                      value={formData.pages}
                      onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., 32"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Colour *
                    </label>
                    <select
                      value={formData.colour}
                      onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      aria-label="Colour"
                      title="Colour"
                      required
                    >
                      <option value="">Select Colour</option>
                      <option value="Red">Red</option>
                      <option value="Blue">Blue</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Pink">Pink</option>
                      <option value="White">White</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Class *
                    </label>
                    <input
                      type="text"
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., 10, 12, 10/12"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Serial Number From *
                    </label>
                    <input
                      type="text"
                      value={formData.serialFrom}
                      onChange={(e) => setFormData({ ...formData, serialFrom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                      placeholder="e.g., 1001 or 001001"
                      title="Supports: 1001, 001001, A1001, A001001 (leading zeros preserved)"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Leading zeros will be preserved (e.g., 001001)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Serial Number To *
                    </label>
                    <input
                      type="text"
                      value={formData.serialTo}
                      onChange={(e) => setFormData({ ...formData, serialTo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                      placeholder="e.g., 2000 or 002000"
                      title="Supports: 2000, 002000, A2000, A002000 (leading zeros preserved)"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Leading zeros will be preserved (e.g., 002000)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Exam (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.exam}
                      onChange={(e) => setFormData({ ...formData, exam: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Term 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subject (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddQuantity}
                  className="btn btn-primary"
                >
                  Add Quantity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link to Centre Datesheet Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Link Answer Sheets to Exam
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkModal(false)
                    setLinkingEntry(null)
                    setSelectedDatesheetEntry('')
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close link answer sheets to exam modal"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Select the exam for which these answer sheets will be used. This helps track answer sheet usage per subject and exam date.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Exam (Optional)
                  </label>
                  <select
                    value={selectedDatesheetEntry}
                    onChange={(e) => setSelectedDatesheetEntry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    aria-label="Select Exam (Optional)"
                    title="Select Exam (Optional)"
                  >
                    <option value="">-- Skip linking (mark as used without exam details) --</option>
                    {centreDatesheetEntries.map((entry) => (
                      <option key={entry._id} value={entry._id}>
                        {new Date(entry.examDate).toLocaleDateString('en-IN')} - {entry.dayName} - Class {entry.class} - {entry.subjectCode} {entry.subjectName} ({entry.candidateCount} candidates)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDatesheetEntry && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    {(() => {
                      const entry = centreDatesheetEntries.find(e => e._id === selectedDatesheetEntry)
                      if (!entry) return null
                      return (
                        <div className="text-sm text-green-800 dark:text-green-200">
                          <p className="font-semibold mb-2">Selected Exam Details:</p>
                          <ul className="space-y-1">
                            <li><strong>Date:</strong> {new Date(entry.examDate).toLocaleDateString('en-IN')} ({entry.dayName})</li>
                            <li><strong>Class:</strong> {entry.class}</li>
                            <li><strong>Subject:</strong> {entry.subjectCode} - {entry.subjectName}</li>
                            <li><strong>Time:</strong> {formatTime(entry.timeSlot.start)} - {formatTime(entry.timeSlot.end)}</li>
                            <li><strong>Candidates:</strong> {entry.candidateCount}</li>
                            <li><strong>Rooms Needed:</strong> {entry.roomsNeeded}</li>
                          </ul>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowLinkModal(false)
                    setLinkingEntry(null)
                    setSelectedDatesheetEntry('')
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUseSheets}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Confirm & Mark as Used'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnswerSheets
