import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import toast from 'react-hot-toast'
import {
  useCentreDatesheetEntries,
  useGenerateSeatingPlanPDFMutation,
  useSeatingPlanTemplateSettings,
  useUpdateSeatingPlanTemplateSettingsMutation,
  type SeatingPlanFormat,
} from '../hooks/useSeatingPlan'
import type {
  CBSECopyTemplateSettings,
  MainGateTemplateSettings,
  RoomDoorSlipTemplateSettings,
  RoomFolderSlipTemplateSettings,
  SeatingPlanTemplateSettings,
} from '../services/seatingPlanService'
import Loader from '../components/common/Loader'
import './SeatingPlan.css'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/**
 * Toggle button wrapper that uses literal aria-pressed="true"|"false" so
 * static analysis (e.g. Microsoft Edge Tools) accepts the ARIA value.
 */
function ToggleButton({
  pressed,
  ...props
}: React.ComponentProps<'button'> & { pressed: boolean }) {
  return pressed ? (
    <button aria-pressed="true" {...props} />
  ) : (
    <button aria-pressed="false" {...props} />
  )
}

const DEFAULT_CBSE_LAYOUT_SETTINGS: CBSECopyTemplateSettings = {
  infoCol1Width: 20,
  infoCol2Width: 26,
  infoCol3Width: 26,
  infoCol4Width: 14,
  infoCol5Width: 14,
  col1Width: 23,
  col2Width: 10,
  col3Width: 23,
  col4Width: 10,
  col5Width: 23,
  col6Width: 11,
  rowHeight: 28,
  cellPaddingY: 6,
  cellPaddingX: 8,
  headerFontSize: 12,
  subHeaderFontSize: 11,
  bodyFontSize: 11,
}

const DEFAULT_MAIN_GATE_LAYOUT_SETTINGS: MainGateTemplateSettings = {
  col1Width: 16,
  col2Width: 28,
  col3Width: 28,
  col4Width: 28,
  rowHeight: 22,
}

const DEFAULT_ROOM_FOLDER_LAYOUT_SETTINGS: RoomFolderSlipTemplateSettings = {
  infoCol1Width: 14.3,
  infoCol2Width: 19.05,
  infoCol3Width: 19.05,
  infoCol4Width: 14.3,
  infoCol5Width: 9.5,
  infoCol6Width: 9.5,
  infoCol7Width: 14.3,
  col1Width: 14.14,
  col2Width: 8.08,
  col3Width: 11.11,
  col4Width: 14.14,
  col5Width: 8.08,
  col6Width: 11.11,
  col7Width: 14.14,
  col8Width: 8.08,
  col9Width: 11.12,
  rowHeight: 24,
}

const DEFAULT_ROOM_DOOR_LAYOUT_SETTINGS: RoomDoorSlipTemplateSettings = {
  infoCol1Width: 16.67,
  infoCol2Width: 20.83,
  infoCol3Width: 20.83,
  infoCol4Width: 16.67,
  infoCol5Width: 12.5,
  infoCol6Width: 12.5,
  col1Width: 33.33,
  col2Width: 33.33,
  col3Width: 33.34,
  rowHeight: 30,
}

const CBSE_COLUMN_KEYS: Array<
  'col1Width' | 'col2Width' | 'col3Width' | 'col4Width' | 'col5Width' | 'col6Width'
> = ['col1Width', 'col2Width', 'col3Width', 'col4Width', 'col5Width', 'col6Width']

const CBSE_INFO_COLUMN_KEYS: Array<
  'infoCol1Width' | 'infoCol2Width' | 'infoCol3Width' | 'infoCol4Width' | 'infoCol5Width'
> = ['infoCol1Width', 'infoCol2Width', 'infoCol3Width', 'infoCol4Width', 'infoCol5Width']

const ROOM_FOLDER_COLUMN_KEYS: Array<
  'col1Width' | 'col2Width' | 'col3Width' | 'col4Width' | 'col5Width' | 'col6Width' | 'col7Width' | 'col8Width' | 'col9Width'
> = ['col1Width', 'col2Width', 'col3Width', 'col4Width', 'col5Width', 'col6Width', 'col7Width', 'col8Width', 'col9Width']

const ROOM_DOOR_COLUMN_KEYS: Array<'col1Width' | 'col2Width' | 'col3Width'> = ['col1Width', 'col2Width', 'col3Width']
const MAIN_GATE_COLUMN_KEYS: Array<'col1Width' | 'col2Width' | 'col3Width' | 'col4Width'> = ['col1Width', 'col2Width', 'col3Width', 'col4Width']
const ROOM_FOLDER_INFO_COLUMN_KEYS: Array<
  'infoCol1Width' | 'infoCol2Width' | 'infoCol3Width' | 'infoCol4Width' | 'infoCol5Width' | 'infoCol6Width' | 'infoCol7Width'
> = ['infoCol1Width', 'infoCol2Width', 'infoCol3Width', 'infoCol4Width', 'infoCol5Width', 'infoCol6Width', 'infoCol7Width']
const ROOM_DOOR_INFO_COLUMN_KEYS: Array<
  'infoCol1Width' | 'infoCol2Width' | 'infoCol3Width' | 'infoCol4Width' | 'infoCol5Width' | 'infoCol6Width'
> = ['infoCol1Width', 'infoCol2Width', 'infoCol3Width', 'infoCol4Width', 'infoCol5Width', 'infoCol6Width']

const SeatingPlan: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SeatingPlanFormat>('mainGate')
  const [mainGateLayoutDraft, setMainGateLayoutDraft] = useState<MainGateTemplateSettings>(DEFAULT_MAIN_GATE_LAYOUT_SETTINGS)
  const [cbseLayoutDraft, setCbseLayoutDraft] = useState<CBSECopyTemplateSettings>(DEFAULT_CBSE_LAYOUT_SETTINGS)
  const [roomFolderLayoutDraft, setRoomFolderLayoutDraft] = useState<RoomFolderSlipTemplateSettings>(DEFAULT_ROOM_FOLDER_LAYOUT_SETTINGS)
  const [roomDoorLayoutDraft, setRoomDoorLayoutDraft] = useState<RoomDoorSlipTemplateSettings>(DEFAULT_ROOM_DOOR_LAYOUT_SETTINGS)
  const [templateDraftReady, setTemplateDraftReady] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewPageCount, setPreviewPageCount] = useState(0)
  const [previewRenderError, setPreviewRenderError] = useState<string | null>(null)
  const mainGateTableWrapperRef = useRef<HTMLDivElement | null>(null)
  const cbseInfoTableWrapperRef = useRef<HTMLDivElement | null>(null)
  const cbseTableWrapperRef = useRef<HTMLDivElement | null>(null)
  const roomFolderInfoTableWrapperRef = useRef<HTMLDivElement | null>(null)
  const roomFolderTableWrapperRef = useRef<HTMLDivElement | null>(null)
  const roomDoorInfoTableWrapperRef = useRef<HTMLDivElement | null>(null)
  const roomDoorTableWrapperRef = useRef<HTMLDivElement | null>(null)

  const { data: datesheetEntries = [], isLoading: loading, error: queryError, refetch } = useCentreDatesheetEntries()
  const { data: templateSettings, isLoading: loadingTemplateSettings } = useSeatingPlanTemplateSettings()
  const updateTemplateSettingsMutation = useUpdateSeatingPlanTemplateSettingsMutation()
  const saveTemplateSettings = updateTemplateSettingsMutation.mutate
  const pdfMutation = useGenerateSeatingPlanPDFMutation({
    autoDownload: false,
    onSuccess: (blob, variables) => {
      const blobUrl = URL.createObjectURL(blob)
      setPreviewPdfUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl)
        return blobUrl
      })
      setPreviewFilename(variables.filename || 'seating-plan.pdf')
      setPreviewPageCount(0)
      setPreviewRenderError(null)
      setShowPreviewDialog(true)
    },
    onError: (err) => {
      const text = String(err?.message || '')
      if (text.includes('status code 400')) {
        toast.error('Rooms are not allocated for this exam date. Please allocate rooms first in Exam Room/Hall or switch room allocation mode to Auto.')
        return
      }
      toast.error(text || 'Failed to generate PDF. Please try again.')
    },
  })

  const error = queryError?.message ?? null
  const downloadingId = pdfMutation.isPending ? pdfMutation.variables?.datesheetId ?? null : null
  const isSavingTemplateSettings = updateTemplateSettingsMutation.isPending

  useEffect(() => {
    return () => {
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl)
    }
  }, [previewPdfUrl])

  const closePreviewDialog = () => {
    setShowPreviewDialog(false)
    setPreviewPageCount(0)
    setPreviewRenderError(null)
    setPreviewFilename('')
    setPreviewPdfUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      return null
    })
  }

  useEffect(() => {
    if (!templateSettings?.cbseCopy) return
    setMainGateLayoutDraft(templateSettings.mainGate || DEFAULT_MAIN_GATE_LAYOUT_SETTINGS)
    setCbseLayoutDraft(templateSettings.cbseCopy)
    setRoomFolderLayoutDraft(templateSettings.roomFolderSlip || DEFAULT_ROOM_FOLDER_LAYOUT_SETTINGS)
    setRoomDoorLayoutDraft(templateSettings.roomDoorSlip || DEFAULT_ROOM_DOOR_LAYOUT_SETTINGS)
    setTemplateDraftReady(true)
  }, [templateSettings])

  useEffect(() => {
    if (!templateSettings || !templateDraftReady) return
    const currentSettings: SeatingPlanTemplateSettings = {
      mainGate: mainGateLayoutDraft,
      cbseCopy: cbseLayoutDraft,
      roomFolderSlip: roomFolderLayoutDraft,
      roomDoorSlip: roomDoorLayoutDraft,
    }
    const persisted = JSON.stringify(templateSettings)
    const current = JSON.stringify(currentSettings)
    if (persisted === current) return

    const timer = window.setTimeout(() => {
      saveTemplateSettings(currentSettings)
    }, 500)

    return () => window.clearTimeout(timer)
  }, [
    mainGateLayoutDraft,
    cbseLayoutDraft,
    roomFolderLayoutDraft,
    roomDoorLayoutDraft,
    templateSettings,
    templateDraftReady,
    saveTemplateSettings,
  ])

  const totalColumnWidth = useMemo(
    () => cbseLayoutDraft.col1Width
      + cbseLayoutDraft.col2Width
      + cbseLayoutDraft.col3Width
      + cbseLayoutDraft.col4Width
      + cbseLayoutDraft.col5Width
      + cbseLayoutDraft.col6Width,
    [cbseLayoutDraft]
  )
  const totalInfoColumnWidth = useMemo(
    () => cbseLayoutDraft.infoCol1Width
      + cbseLayoutDraft.infoCol2Width
      + cbseLayoutDraft.infoCol3Width
      + cbseLayoutDraft.infoCol4Width
      + cbseLayoutDraft.infoCol5Width,
    [cbseLayoutDraft]
  )
  const totalRoomFolderColumnWidth = useMemo(
    () => roomFolderLayoutDraft.col1Width
      + roomFolderLayoutDraft.col2Width
      + roomFolderLayoutDraft.col3Width
      + roomFolderLayoutDraft.col4Width
      + roomFolderLayoutDraft.col5Width
      + roomFolderLayoutDraft.col6Width
      + roomFolderLayoutDraft.col7Width
      + roomFolderLayoutDraft.col8Width
      + roomFolderLayoutDraft.col9Width,
    [roomFolderLayoutDraft]
  )
  const totalRoomFolderInfoColumnWidth = useMemo(
    () => roomFolderLayoutDraft.infoCol1Width
      + roomFolderLayoutDraft.infoCol2Width
      + roomFolderLayoutDraft.infoCol3Width
      + roomFolderLayoutDraft.infoCol4Width
      + roomFolderLayoutDraft.infoCol5Width
      + roomFolderLayoutDraft.infoCol6Width
      + roomFolderLayoutDraft.infoCol7Width,
    [roomFolderLayoutDraft]
  )
  const totalRoomDoorColumnWidth = useMemo(
    () => roomDoorLayoutDraft.col1Width + roomDoorLayoutDraft.col2Width + roomDoorLayoutDraft.col3Width,
    [roomDoorLayoutDraft]
  )
  const totalRoomDoorInfoColumnWidth = useMemo(
    () => roomDoorLayoutDraft.infoCol1Width
      + roomDoorLayoutDraft.infoCol2Width
      + roomDoorLayoutDraft.infoCol3Width
      + roomDoorLayoutDraft.infoCol4Width
      + roomDoorLayoutDraft.infoCol5Width
      + roomDoorLayoutDraft.infoCol6Width,
    [roomDoorLayoutDraft]
  )
  const totalMainGateColumnWidth = useMemo(
    () => mainGateLayoutDraft.col1Width
      + mainGateLayoutDraft.col2Width
      + mainGateLayoutDraft.col3Width
      + mainGateLayoutDraft.col4Width,
    [mainGateLayoutDraft]
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Format time from 24-hour (HH:MM) to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const handleDownloadPDF = (datesheetId: string, format: SeatingPlanFormat) => {
    const entry = datesheetEntries.find((item) => item._id === datesheetId)
    const formatLabel = format === 'mainGate'
      ? 'Main Gate'
      : format === 'roomFolderSlip'
        ? 'Room Folder Slip'
        : format === 'roomDoorSlip'
          ? 'Room Door Slip'
          : 'CBSE Copy'

    const examDate = entry
      ? (() => {
        const date = new Date(entry.examDate)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}-${month}-${year}`
      })()
      : 'Unknown Date'

    const classLabel = entry ? `Class ${entry.class}` : 'Class Unknown'
    const subjectLabel = entry
      ? entry.subjectName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim()
      : 'Subject Unknown'

    const filename = `Seating Plan - ${formatLabel} - ${examDate} - ${classLabel} - ${subjectLabel}.pdf`
    pdfMutation.mutate({ datesheetId, format, filename })
  }

  const cbseColumnWidths = useMemo(
    () => [
      cbseLayoutDraft.col1Width,
      cbseLayoutDraft.col2Width,
      cbseLayoutDraft.col3Width,
      cbseLayoutDraft.col4Width,
      cbseLayoutDraft.col5Width,
      cbseLayoutDraft.col6Width,
    ],
    [cbseLayoutDraft]
  )

  const cbseColumnBoundaries = useMemo(() => {
    let cumulative = 0
    return cbseColumnWidths.slice(0, -1).map((width) => {
      cumulative += width
      return cumulative
    })
  }, [cbseColumnWidths])

  const mainGateColumnWidths = useMemo(
    () => [
      mainGateLayoutDraft.col1Width,
      mainGateLayoutDraft.col2Width,
      mainGateLayoutDraft.col3Width,
      mainGateLayoutDraft.col4Width,
    ],
    [mainGateLayoutDraft]
  )

  const mainGateColumnBoundaries = useMemo(() => {
    let cumulative = 0
    return mainGateColumnWidths.slice(0, -1).map((width) => {
      cumulative += width
      return cumulative
    })
  }, [mainGateColumnWidths])

  const cbseInfoColumnWidths = useMemo(
    () => [
      cbseLayoutDraft.infoCol1Width,
      cbseLayoutDraft.infoCol2Width,
      cbseLayoutDraft.infoCol3Width,
      cbseLayoutDraft.infoCol4Width,
      cbseLayoutDraft.infoCol5Width,
    ],
    [cbseLayoutDraft]
  )

  const cbseInfoColumnBoundaries = useMemo(() => {
    let cumulative = 0
    return cbseInfoColumnWidths.slice(0, -1).map((width) => {
      cumulative += width
      return cumulative
    })
  }, [cbseInfoColumnWidths])

  const roomFolderColumnWidths = useMemo(
    () => [
      roomFolderLayoutDraft.col1Width,
      roomFolderLayoutDraft.col2Width,
      roomFolderLayoutDraft.col3Width,
      roomFolderLayoutDraft.col4Width,
      roomFolderLayoutDraft.col5Width,
      roomFolderLayoutDraft.col6Width,
      roomFolderLayoutDraft.col7Width,
      roomFolderLayoutDraft.col8Width,
      roomFolderLayoutDraft.col9Width,
    ],
    [roomFolderLayoutDraft]
  )

  const roomFolderColumnBoundaries = useMemo(() => {
    let cumulative = 0
    return roomFolderColumnWidths.slice(0, -1).map((width) => {
      cumulative += width
      return cumulative
    })
  }, [roomFolderColumnWidths])

  const roomFolderInfoColumnWidths = useMemo(
    () => [
      roomFolderLayoutDraft.infoCol1Width,
      roomFolderLayoutDraft.infoCol2Width,
      roomFolderLayoutDraft.infoCol3Width,
      roomFolderLayoutDraft.infoCol4Width,
      roomFolderLayoutDraft.infoCol5Width,
      roomFolderLayoutDraft.infoCol6Width,
      roomFolderLayoutDraft.infoCol7Width,
    ],
    [roomFolderLayoutDraft]
  )

  const roomFolderInfoColumnBoundaries = useMemo(() => {
    let cumulative = 0
    return roomFolderInfoColumnWidths.slice(0, -1).map((width) => {
      cumulative += width
      return cumulative
    })
  }, [roomFolderInfoColumnWidths])

  const roomDoorColumnWidths = useMemo(
    () => [roomDoorLayoutDraft.col1Width, roomDoorLayoutDraft.col2Width, roomDoorLayoutDraft.col3Width],
    [roomDoorLayoutDraft]
  )

  const roomDoorColumnBoundaries = useMemo(() => {
    let cumulative = 0
    return roomDoorColumnWidths.slice(0, -1).map((width) => {
      cumulative += width
      return cumulative
    })
  }, [roomDoorColumnWidths])

  const roomDoorInfoColumnWidths = useMemo(
    () => [
      roomDoorLayoutDraft.infoCol1Width,
      roomDoorLayoutDraft.infoCol2Width,
      roomDoorLayoutDraft.infoCol3Width,
      roomDoorLayoutDraft.infoCol4Width,
      roomDoorLayoutDraft.infoCol5Width,
      roomDoorLayoutDraft.infoCol6Width,
    ],
    [roomDoorLayoutDraft]
  )

  const roomDoorInfoColumnBoundaries = useMemo(() => {
    let cumulative = 0
    return roomDoorInfoColumnWidths.slice(0, -1).map((width) => {
      cumulative += width
      return cumulative
    })
  }, [roomDoorInfoColumnWidths])

  const startColumnResize = (boundaryIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const wrapperWidth = cbseTableWrapperRef.current?.getBoundingClientRect().width || 0
    if (!wrapperWidth) return

    const leftKey = CBSE_COLUMN_KEYS[boundaryIndex]
    const rightKey = CBSE_COLUMN_KEYS[boundaryIndex + 1]
    const initialX = event.clientX
    const initialLeft = cbseLayoutDraft[leftKey]
    const initialRight = cbseLayoutDraft[rightKey]
    const minWidth = 4

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - initialX
      const deltaPercent = (deltaPx / wrapperWidth) * 100
      const maxIncrease = initialRight - minWidth
      const maxDecrease = initialLeft - minWidth
      const boundedDelta = Math.max(-maxDecrease, Math.min(maxIncrease, deltaPercent))

      setCbseLayoutDraft((prev) => ({
        ...prev,
        [leftKey]: Number((initialLeft + boundedDelta).toFixed(2)),
        [rightKey]: Number((initialRight - boundedDelta).toFixed(2)),
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const startMainGateColumnResize = (boundaryIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const wrapperWidth = mainGateTableWrapperRef.current?.getBoundingClientRect().width || 0
    if (!wrapperWidth) return

    const leftKey = MAIN_GATE_COLUMN_KEYS[boundaryIndex]
    const rightKey = MAIN_GATE_COLUMN_KEYS[boundaryIndex + 1]
    const initialX = event.clientX
    const initialLeft = mainGateLayoutDraft[leftKey]
    const initialRight = mainGateLayoutDraft[rightKey]
    const minWidth = 8

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - initialX
      const deltaPercent = (deltaPx / wrapperWidth) * 100
      const maxIncrease = initialRight - minWidth
      const maxDecrease = initialLeft - minWidth
      const boundedDelta = Math.max(-maxDecrease, Math.min(maxIncrease, deltaPercent))

      setMainGateLayoutDraft((prev) => ({
        ...prev,
        [leftKey]: Number((initialLeft + boundedDelta).toFixed(2)),
        [rightKey]: Number((initialRight - boundedDelta).toFixed(2)),
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const startMainGateRowHeightResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const initialY = event.clientY
    const initialHeight = mainGateLayoutDraft.rowHeight

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - initialY
      const nextHeight = Math.max(16, Math.min(50, Math.round(initialHeight + deltaY)))
      setMainGateLayoutDraft((prev) => ({
        ...prev,
        rowHeight: nextHeight,
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const startInfoColumnResize = (boundaryIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const wrapperWidth = cbseInfoTableWrapperRef.current?.getBoundingClientRect().width || 0
    if (!wrapperWidth) return

    const leftKey = CBSE_INFO_COLUMN_KEYS[boundaryIndex]
    const rightKey = CBSE_INFO_COLUMN_KEYS[boundaryIndex + 1]
    const initialX = event.clientX
    const initialLeft = cbseLayoutDraft[leftKey]
    const initialRight = cbseLayoutDraft[rightKey]
    const minWidth = 6

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - initialX
      const deltaPercent = (deltaPx / wrapperWidth) * 100
      const maxIncrease = initialRight - minWidth
      const maxDecrease = initialLeft - minWidth
      const boundedDelta = Math.max(-maxDecrease, Math.min(maxIncrease, deltaPercent))

      setCbseLayoutDraft((prev) => ({
        ...prev,
        [leftKey]: Number((initialLeft + boundedDelta).toFixed(2)),
        [rightKey]: Number((initialRight - boundedDelta).toFixed(2)),
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const startRowHeightResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const initialY = event.clientY
    const initialHeight = cbseLayoutDraft.rowHeight

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - initialY
      const nextHeight = Math.max(18, Math.min(60, Math.round(initialHeight + deltaY)))
      setCbseLayoutDraft((prev) => ({
        ...prev,
        rowHeight: nextHeight,
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const startRoomFolderColumnResize = (boundaryIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const wrapperWidth = roomFolderTableWrapperRef.current?.getBoundingClientRect().width || 0
    if (!wrapperWidth) return

    const leftKey = ROOM_FOLDER_COLUMN_KEYS[boundaryIndex]
    const rightKey = ROOM_FOLDER_COLUMN_KEYS[boundaryIndex + 1]
    const initialX = event.clientX
    const initialLeft = roomFolderLayoutDraft[leftKey]
    const initialRight = roomFolderLayoutDraft[rightKey]
    const minWidth = 4

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - initialX
      const deltaPercent = (deltaPx / wrapperWidth) * 100
      const maxIncrease = initialRight - minWidth
      const maxDecrease = initialLeft - minWidth
      const boundedDelta = Math.max(-maxDecrease, Math.min(maxIncrease, deltaPercent))

      setRoomFolderLayoutDraft((prev) => ({
        ...prev,
        [leftKey]: Number((initialLeft + boundedDelta).toFixed(2)),
        [rightKey]: Number((initialRight - boundedDelta).toFixed(2)),
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const startRoomFolderInfoColumnResize = (boundaryIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const wrapperWidth = roomFolderInfoTableWrapperRef.current?.getBoundingClientRect().width || 0
    if (!wrapperWidth) return

    const leftKey = ROOM_FOLDER_INFO_COLUMN_KEYS[boundaryIndex]
    const rightKey = ROOM_FOLDER_INFO_COLUMN_KEYS[boundaryIndex + 1]
    const initialX = event.clientX
    const initialLeft = roomFolderLayoutDraft[leftKey]
    const initialRight = roomFolderLayoutDraft[rightKey]
    const minWidth = 4

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - initialX
      const deltaPercent = (deltaPx / wrapperWidth) * 100
      const maxIncrease = initialRight - minWidth
      const maxDecrease = initialLeft - minWidth
      const boundedDelta = Math.max(-maxDecrease, Math.min(maxIncrease, deltaPercent))

      setRoomFolderLayoutDraft((prev) => ({
        ...prev,
        [leftKey]: Number((initialLeft + boundedDelta).toFixed(2)),
        [rightKey]: Number((initialRight - boundedDelta).toFixed(2)),
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const startRoomFolderRowHeightResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const initialY = event.clientY
    const initialHeight = roomFolderLayoutDraft.rowHeight

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - initialY
      const nextHeight = Math.max(18, Math.min(60, Math.round(initialHeight + deltaY)))
      setRoomFolderLayoutDraft((prev) => ({
        ...prev,
        rowHeight: nextHeight,
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const startRoomDoorColumnResize = (boundaryIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const wrapperWidth = roomDoorTableWrapperRef.current?.getBoundingClientRect().width || 0
    if (!wrapperWidth) return

    const leftKey = ROOM_DOOR_COLUMN_KEYS[boundaryIndex]
    const rightKey = ROOM_DOOR_COLUMN_KEYS[boundaryIndex + 1]
    const initialX = event.clientX
    const initialLeft = roomDoorLayoutDraft[leftKey]
    const initialRight = roomDoorLayoutDraft[rightKey]
    const minWidth = 8

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - initialX
      const deltaPercent = (deltaPx / wrapperWidth) * 100
      const maxIncrease = initialRight - minWidth
      const maxDecrease = initialLeft - minWidth
      const boundedDelta = Math.max(-maxDecrease, Math.min(maxIncrease, deltaPercent))

      setRoomDoorLayoutDraft((prev) => ({
        ...prev,
        [leftKey]: Number((initialLeft + boundedDelta).toFixed(2)),
        [rightKey]: Number((initialRight - boundedDelta).toFixed(2)),
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const startRoomDoorInfoColumnResize = (boundaryIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const wrapperWidth = roomDoorInfoTableWrapperRef.current?.getBoundingClientRect().width || 0
    if (!wrapperWidth) return

    const leftKey = ROOM_DOOR_INFO_COLUMN_KEYS[boundaryIndex]
    const rightKey = ROOM_DOOR_INFO_COLUMN_KEYS[boundaryIndex + 1]
    const initialX = event.clientX
    const initialLeft = roomDoorLayoutDraft[leftKey]
    const initialRight = roomDoorLayoutDraft[rightKey]
    const minWidth = 5

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - initialX
      const deltaPercent = (deltaPx / wrapperWidth) * 100
      const maxIncrease = initialRight - minWidth
      const maxDecrease = initialLeft - minWidth
      const boundedDelta = Math.max(-maxDecrease, Math.min(maxIncrease, deltaPercent))

      setRoomDoorLayoutDraft((prev) => ({
        ...prev,
        [leftKey]: Number((initialLeft + boundedDelta).toFixed(2)),
        [rightKey]: Number((initialRight - boundedDelta).toFixed(2)),
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const startRoomDoorRowHeightResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const initialY = event.clientY
    const initialHeight = roomDoorLayoutDraft.rowHeight

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - initialY
      const nextHeight = Math.max(18, Math.min(80, Math.round(initialHeight + deltaY)))
      setRoomDoorLayoutDraft((prev) => ({
        ...prev,
        rowHeight: nextHeight,
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const scheduleHighlightRingClass: Record<SeatingPlanFormat, string> = {
    mainGate: 'ring-2 ring-blue-500',
    roomFolderSlip: 'ring-2 ring-green-500',
    roomDoorSlip: 'ring-2 ring-yellow-500',
    cbseCopy: 'ring-2 ring-purple-500',
  }

  return (
    <div className="p-6">
      {/* Status Overview - Clickable Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <ToggleButton
          pressed={activeTab === 'mainGate'}
          onClick={() => setActiveTab('mainGate')}
          disabled={pdfMutation.isPending && activeTab !== 'mainGate'}
          className={`rounded-lg shadow p-6 transition-all cursor-pointer border-2 ${activeTab === 'mainGate' ? 'ring-2 ring-blue-500 border-blue-400 dark:border-blue-500 bg-blue-100 dark:bg-blue-900/40' : 'bg-white dark:bg-gray-800 border-transparent hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800'
            } ${pdfMutation.isPending && activeTab !== 'mainGate' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Main Gate</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{activeTab === 'mainGate' ? 'Selected format' : 'Click to switch format'}</p>
            </div>
          </div>
        </ToggleButton>

        <ToggleButton
          pressed={activeTab === 'roomFolderSlip'}
          onClick={() => setActiveTab('roomFolderSlip')}
          disabled={pdfMutation.isPending && activeTab !== 'roomFolderSlip'}
          className={`rounded-lg shadow p-6 transition-all cursor-pointer border-2 ${activeTab === 'roomFolderSlip' ? 'ring-2 ring-green-500 border-green-400 dark:border-green-500 bg-green-100 dark:bg-green-900/40' : 'bg-white dark:bg-gray-800 border-transparent hover:shadow-lg hover:border-green-200 dark:hover:border-green-800'
            } ${pdfMutation.isPending && activeTab !== 'roomFolderSlip' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Room Folder Slip</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{activeTab === 'roomFolderSlip' ? 'Selected format' : 'Click to switch format'}</p>
            </div>
          </div>
        </ToggleButton>

        <ToggleButton
          pressed={activeTab === 'roomDoorSlip'}
          onClick={() => setActiveTab('roomDoorSlip')}
          disabled={pdfMutation.isPending && activeTab !== 'roomDoorSlip'}
          className={`rounded-lg shadow p-6 transition-all cursor-pointer border-2 ${activeTab === 'roomDoorSlip' ? 'ring-2 ring-yellow-500 border-yellow-400 dark:border-yellow-500 bg-yellow-100 dark:bg-yellow-900/40' : 'bg-white dark:bg-gray-800 border-transparent hover:shadow-lg hover:border-yellow-200 dark:hover:border-yellow-800'
            } ${pdfMutation.isPending && activeTab !== 'roomDoorSlip' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Room Door Slip</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{activeTab === 'roomDoorSlip' ? 'Selected format' : 'Click to switch format'}</p>
            </div>
          </div>
        </ToggleButton>

        <ToggleButton
          pressed={activeTab === 'cbseCopy'}
          onClick={() => setActiveTab('cbseCopy')}
          disabled={pdfMutation.isPending && activeTab !== 'cbseCopy'}
          className={`rounded-lg shadow p-6 transition-all cursor-pointer border-2 ${activeTab === 'cbseCopy' ? 'ring-2 ring-purple-500 border-purple-400 dark:border-purple-500 bg-purple-100 dark:bg-purple-900/40' : 'bg-white dark:bg-gray-800 border-transparent hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-800'
            } ${pdfMutation.isPending && activeTab !== 'cbseCopy' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">CBSE Copy</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{activeTab === 'cbseCopy' ? 'Selected format' : 'Click to switch format'}</p>
            </div>
          </div>
        </ToggleButton>
      </div>

      {/* Datesheet Table */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8 transition-all ${scheduleHighlightRingClass[activeTab]}`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Examination Schedule
          </h3>
        </div>

        <div className="overflow-x-auto overflow-y-visible sp-datesheet-scroll-container">
          <div className="seating-table-wrapper overflow-x-auto pb-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader size="lg" />
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={() => refetch()}
                  className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Retry
                </button>
              </div>
            ) : datesheetEntries.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No datesheet entries found. Please import a datesheet first.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Sr No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Day
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Subject Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Subject Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Candidates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      No Of Rooms
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {datesheetEntries.map((entry, index) => (
                    <tr
                      key={entry._id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${entry.class === '10'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : entry.class === '12'
                          ? 'bg-purple-50 dark:bg-purple-900/20'
                          : ''
                        }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(entry.examDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {entry.dayName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        {entry.subjectCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {entry.subjectName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${entry.class === '10'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : entry.class === '12'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                          Class {entry.class}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(entry.timeSlot.start)} - {formatTime(entry.timeSlot.end)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {entry.candidateCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {Math.ceil(entry.candidateCount / 24)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDownloadPDF(entry._id, activeTab)}
                            disabled={pdfMutation.isPending}
                            className={`text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 ${pdfMutation.isPending && downloadingId !== entry._id ? 'cursor-not-allowed' : ''}`}
                            title={`Download ${activeTab === 'mainGate' ? 'Main Gate' : activeTab === 'roomFolderSlip' ? 'Room Folder Slip' : activeTab === 'roomDoorSlip' ? 'Room Door Slip' : 'CBSE Copy'}`}
                          >
                            {downloadingId === entry._id ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {activeTab === 'mainGate' && 'Main Gate Format'}
            {activeTab === 'roomFolderSlip' && 'Room Folder Slip Format'}
            {activeTab === 'roomDoorSlip' && 'Room Door Slip Format'}
            {activeTab === 'cbseCopy' && 'CBSE Copy Format'}
          </h3>
        </div>

        <div className="p-6">
          {activeTab === 'mainGate' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This format is designed for display at the main gate and notice boards. All rooms are shown on a single document for easy reference.
                </p>
              </div>
              <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-white dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Main Gate Layout (Drag to resize)</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {loadingTemplateSettings
                      ? 'Loading settings...'
                      : isSavingTemplateSettings
                        ? 'Saving...'
                        : 'Saved'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Drag vertical separators on first room table to resize columns for all room tables. Use row-height handle below.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Width total: {totalMainGateColumnWidth}% (backend auto-normalizes to 100% when saving).
                </p>
              </div>

              {/* Main Gate Preview */}
              <div className="overflow-x-auto py-2">
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-900 mx-auto seating-plan-preview-page">
                  {/* Header */}
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">INTERNATIONAL BHARTI SCHOOL, ROHTAK</h2>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Seating Plan CBSE Board Exam</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Centre No: 827403</p>
                  </div>

                  {/* Exam Details */}
                  <div className="flex justify-between mb-4 text-sm font-bold text-gray-900 dark:text-white">
                    <div>
                      <p>Date: 15.02.2026 (Saturday)</p>
                      <p>Subject: English (Lang. & Lit.)</p>
                    </div>
                    <div className="text-right">
                      <p>Class: X</p>
                      <p>Subject Code: 184</p>
                    </div>
                  </div>

                  {/* Room Table 1 */}
                  <style>{`.sp-main-gate-layout { --sp-col1-width: ${mainGateLayoutDraft.col1Width}%; --sp-col2-width: ${mainGateLayoutDraft.col2Width}%; --sp-col3-width: ${mainGateLayoutDraft.col3Width}%; --sp-col4-width: ${mainGateLayoutDraft.col4Width}%; --sp-row-height: ${mainGateLayoutDraft.rowHeight}px; }${mainGateColumnBoundaries.map((b, i) => `.sp-main-gate-boundary-${i} { left: ${b}%; }`).join(' ')}`}</style>
                  <div className="relative mb-5" ref={mainGateTableWrapperRef}>
                    <table className="w-full border-collapse seating-plan-table-layout-fixed sp-main-gate-layout">
                      <colgroup>
                        <col className="sp-col-1" />
                        <col className="sp-col-2" />
                        <col className="sp-col-3" />
                        <col className="sp-col-4" />
                      </colgroup>
                      <caption className="text-sm font-bold text-gray-900 dark:text-white p-2 border border-black dark:border-gray-400 border-b-0 bg-white dark:bg-gray-900">
                        Room No. 01 - X Rose (First Floor)
                      </caption>
                      <thead>
                        <tr>
                          <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row</th>
                          <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 1</th>
                          <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 2</th>
                          <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(8)].map((_, i) => (
                          <tr key={i}>
                            <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center font-bold text-gray-900 dark:text-white text-sm">Roll No</td>
                            <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248737 + i}</td>
                            <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248745 + i}</td>
                            <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248753 + i}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {mainGateColumnBoundaries.map((_, index) => (
                      <div
                        key={`main-gate-boundary-${index}`}
                        className={`sp-main-gate-boundary-${index} absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-20`}
                        onMouseDown={(event) => startMainGateColumnResize(index, event)}
                        title="Drag to resize column"
                      />
                    ))}
                  </div>

                  {/* Room Table 2 */}
                  <table className="w-full border-collapse mb-5 seating-plan-table-layout-fixed sp-main-gate-layout">
                    <colgroup>
                      <col className="sp-col-1" />
                      <col className="sp-col-2" />
                      <col className="sp-col-3" />
                      <col className="sp-col-4" />
                    </colgroup>
                    <caption className="text-sm font-bold text-gray-900 dark:text-white p-2 border border-black dark:border-gray-400 border-b-0 bg-white dark:bg-gray-900">
                      Room No. 02 - X Tulip (First Floor)
                    </caption>
                    <thead>
                      <tr>
                        <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row</th>
                        <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 1</th>
                        <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 2</th>
                        <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(8)].map((_, i) => (
                        <tr key={i}>
                          <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center font-bold text-gray-900 dark:text-white text-sm">Roll No</td>
                          <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248761 + i}</td>
                          <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248769 + i}</td>
                          <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248777 + i}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Room Table 3 */}
                  <table className="w-full border-collapse mb-5 seating-plan-table-layout-fixed sp-main-gate-layout">
                    <colgroup>
                      <col className="sp-col-1" />
                      <col className="sp-col-2" />
                      <col className="sp-col-3" />
                      <col className="sp-col-4" />
                    </colgroup>
                    <caption className="text-sm font-bold text-gray-900 dark:text-white p-2 border border-black dark:border-gray-400 border-b-0 bg-white dark:bg-gray-900">
                      Room No. 03 - X Lotus (First Floor)
                    </caption>
                    <thead>
                      <tr>
                        <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row</th>
                        <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 1</th>
                        <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 2</th>
                        <th className="border border-black dark:border-gray-400 p-1.5 font-bold text-gray-900 dark:text-white text-sm">Row 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(8)].map((_, i) => (
                        <tr key={i}>
                          <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center font-bold text-gray-900 dark:text-white text-sm">Roll No</td>
                          <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248785 + i}</td>
                          <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248793 + i}</td>
                          <td className="sp-row-height-cell border border-black dark:border-gray-400 p-1.5 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">{17248801 + i}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="h-2 flex-1 rounded bg-blue-100 dark:bg-blue-900/30 cursor-row-resize"
                      onMouseDown={startMainGateRowHeightResize}
                      title="Drag up/down to resize row height"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Row Height: {mainGateLayoutDraft.rowHeight}px
                    </span>
                  </div>

                  {/* Footer */}
                  <p className="mt-16 text-right font-bold text-gray-900 dark:text-white">CENTRE SUPERINTENDENT</p>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                Click the download button next to any exam to generate the Main Gate PDF with actual candidate data.
              </p>
            </div>
          )}

          {activeTab === 'roomFolderSlip' && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  This format is designed for inclusion in room supervisor folders.
                </p>
              </div>
              <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-white dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Room Folder Slip Layout (Drag to resize)</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {loadingTemplateSettings
                      ? 'Loading settings...'
                      : isSavingTemplateSettings
                        ? 'Saving...'
                        : 'Saved'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Drag vertical separators inside seating table to resize columns. Use row-height handle below table.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Seating width total: {totalRoomFolderColumnWidth}% | Info width total: {totalRoomFolderInfoColumnWidth}% (backend auto-normalizes to 100% when saving).
                </p>
              </div>

              <div className="overflow-x-auto py-2">
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-900 mx-auto seating-plan-preview-page">
                  <h2 className="text-lg font-bold text-center mb-4 text-gray-900 dark:text-white">SEATING PLAN</h2>

                  <style>{`.sp-room-folder-info-cols { --sp-info-col-1: ${roomFolderLayoutDraft.infoCol1Width}%; --sp-info-col-2: ${roomFolderLayoutDraft.infoCol2Width}%; --sp-info-col-3: ${roomFolderLayoutDraft.infoCol3Width}%; --sp-info-col-4: ${roomFolderLayoutDraft.infoCol4Width}%; --sp-info-col-5: ${roomFolderLayoutDraft.infoCol5Width}%; --sp-info-col-6: ${roomFolderLayoutDraft.infoCol6Width}%; --sp-info-col-7: ${roomFolderLayoutDraft.infoCol7Width}%; } .sp-room-folder-data-cols { --sp-data-col-1: ${roomFolderLayoutDraft.col1Width}%; --sp-data-col-2: ${roomFolderLayoutDraft.col2Width}%; --sp-data-col-3: ${roomFolderLayoutDraft.col3Width}%; --sp-data-col-4: ${roomFolderLayoutDraft.col4Width}%; --sp-data-col-5: ${roomFolderLayoutDraft.col5Width}%; --sp-data-col-6: ${roomFolderLayoutDraft.col6Width}%; --sp-data-col-7: ${roomFolderLayoutDraft.col7Width}%; --sp-data-col-8: ${roomFolderLayoutDraft.col8Width}%; --sp-data-col-9: ${roomFolderLayoutDraft.col9Width}%; --sp-row-height: ${roomFolderLayoutDraft.rowHeight}px; } ${roomFolderInfoColumnBoundaries.map((b, i) => `.sp-rf-info-b-${i} { left: ${b}%; }`).join(' ')} ${roomFolderColumnBoundaries.map((b, i) => `.sp-rf-data-b-${i} { left: ${b}%; }`).join(' ')}`}</style>
                  <div className="relative mb-4" ref={roomFolderInfoTableWrapperRef}>
                    <table className="w-full border-collapse text-sm seating-plan-table-layout-fixed sp-room-folder-info-cols">
                      <colgroup>
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Name Of Centre</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={3}>
                            International Bharti School, Rohtak
                          </td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Centre No</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-900 dark:text-white">829261</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Class: XII</td>
                        </tr>
                        <tr>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Name Of Examination</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={3}>
                            Sr. Secondary School Certificate Examination 2026
                          </td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Subject</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>
                            048 ; PHYSICAL EDUCATION
                          </td>
                        </tr>
                        <tr>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Date</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={3}>18.02.2026 (Wednesday)</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Room No.</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-900 dark:text-white font-bold" colSpan={2}>02 - XII A</td>
                        </tr>
                      </tbody>
                    </table>
                    {roomFolderInfoColumnBoundaries.map((_, index) => (
                      <div
                        key={`room-folder-info-boundary-${index}`}
                        className={`absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-20 sp-rf-info-b-${index}`}
                        onMouseDown={(event) => startRoomFolderInfoColumnResize(index, event)}
                        title="Drag to resize info table columns"
                      />
                    ))}
                  </div>

                  <div className="relative" ref={roomFolderTableWrapperRef}>
                    <table className="w-full border-collapse text-xs seating-plan-table-layout-fixed sp-room-folder-data-cols">
                      <colgroup>
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="border border-gray-800 dark:border-gray-400 p-2" colSpan={3}>Row 1</th>
                          <th className="border border-gray-800 dark:border-gray-400 p-2" colSpan={3}>Row 2</th>
                          <th className="border border-gray-800 dark:border-gray-400 p-2" colSpan={3}>Row 3</th>
                        </tr>
                        <tr>
                          <th className="border border-gray-800 dark:border-gray-400 p-1.5">Roll No</th>
                          <th className="border border-gray-800 dark:border-gray-400 p-1.5">QP Code</th>
                          <th className="border border-gray-800 dark:border-gray-400 p-1.5">Sheet No</th>
                          <th className="border border-gray-800 dark:border-gray-400 p-1.5">Roll No</th>
                          <th className="border border-gray-800 dark:border-gray-400 p-1.5">QP Code</th>
                          <th className="border border-gray-800 dark:border-gray-400 p-1.5">Sheet No</th>
                          <th className="border border-gray-800 dark:border-gray-400 p-1.5">Roll No</th>
                          <th className="border border-gray-800 dark:border-gray-400 p-1.5">QP Code</th>
                          <th className="border border-gray-800 dark:border-gray-400 p-1.5">Sheet No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(8)].map((_, i) => (
                          <tr key={i}>
                            <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{31683240 + i}</td>
                            <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{(i % 3) + 1}</td>
                            <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">A00{41 + i}</td>
                            <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{31683263 + i}</td>
                            <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{((i + 1) % 3) + 1}</td>
                            <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">A00{49 + i}</td>
                            <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{31683284 + i}</td>
                            <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{((i + 2) % 3) + 1}</td>
                            <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">A00{57 + i}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold">
                          <td className="border border-gray-800 dark:border-gray-400 p-2" colSpan={2}>Registered:</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-2 text-center">24</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-2" colSpan={2}>Present:</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                          <td className="border border-gray-800 dark:border-gray-400 p-2" colSpan={2}>Absent:</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                    {roomFolderColumnBoundaries.map((_, index) => (
                      <div
                        key={`room-folder-boundary-${index}`}
                        className={`absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-20 sp-rf-data-b-${index}`}
                        onMouseDown={(event) => startRoomFolderColumnResize(index, event)}
                        title="Drag to resize column"
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-3 mb-1">
                    <div
                      className="h-2 flex-1 rounded bg-green-100 dark:bg-green-900/30 cursor-row-resize"
                      onMouseDown={startRoomFolderRowHeightResize}
                      title="Drag up/down to resize row height"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Row Height: {roomFolderLayoutDraft.rowHeight}px
                    </span>
                  </div>
                  <div className="my-4 border-t border-dashed border-gray-400 dark:border-gray-500" />

                  <table className="w-full border-collapse mb-4 text-sm seating-plan-table-layout-fixed sp-room-folder-info-cols">
                    <colgroup>
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Name Of Centre</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={3}>
                          International Bharti School, Rohtak
                        </td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Centre No</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-900 dark:text-white">829261</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Class: XII</td>
                      </tr>
                      <tr>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Name Of Examination</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={3}>
                          Sr. Secondary School Certificate Examination 2026
                        </td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Subject</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>
                          048 ; PHYSICAL EDUCATION
                        </td>
                      </tr>
                      <tr>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Date</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={3}>18.02.2026 (Wednesday)</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Room No.</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-900 dark:text-white font-bold" colSpan={2}>03 - XII B</td>
                      </tr>
                    </tbody>
                  </table>

                  <table className="w-full border-collapse text-xs seating-plan-table-layout-fixed sp-room-folder-data-cols">
                    <colgroup>
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="border border-gray-800 dark:border-gray-400 p-2" colSpan={3}>Row 1</th>
                        <th className="border border-gray-800 dark:border-gray-400 p-2" colSpan={3}>Row 2</th>
                        <th className="border border-gray-800 dark:border-gray-400 p-2" colSpan={3}>Row 3</th>
                      </tr>
                      <tr>
                        <th className="border border-gray-800 dark:border-gray-400 p-1.5">Roll No</th>
                        <th className="border border-gray-800 dark:border-gray-400 p-1.5">QP Code</th>
                        <th className="border border-gray-800 dark:border-gray-400 p-1.5">Sheet No</th>
                        <th className="border border-gray-800 dark:border-gray-400 p-1.5">Roll No</th>
                        <th className="border border-gray-800 dark:border-gray-400 p-1.5">QP Code</th>
                        <th className="border border-gray-800 dark:border-gray-400 p-1.5">Sheet No</th>
                        <th className="border border-gray-800 dark:border-gray-400 p-1.5">Roll No</th>
                        <th className="border border-gray-800 dark:border-gray-400 p-1.5">QP Code</th>
                        <th className="border border-gray-800 dark:border-gray-400 p-1.5">Sheet No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(8)].map((_, i) => (
                        <tr key={`second-slip-row-${i}`}>
                          <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{31683340 + i}</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{(i % 3) + 1}</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">A10{41 + i}</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{31683363 + i}</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{((i + 1) % 3) + 1}</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">A10{49 + i}</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{31683384 + i}</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">{((i + 2) % 3) + 1}</td>
                          <td className="border border-gray-800 dark:border-gray-400 p-1.5 text-center sp-row-height-cell">A10{57 + i}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roomDoorSlip' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This format is designed for display on examination room doors.
                </p>
              </div>
              <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 bg-white dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Room Door Slip Layout (Drag to resize)</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {loadingTemplateSettings
                      ? 'Loading settings...'
                      : isSavingTemplateSettings
                        ? 'Saving...'
                        : 'Saved'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Drag vertical separators inside seating table to resize columns. Use row-height handle below table.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Seating width total: {totalRoomDoorColumnWidth}% | Info width total: {totalRoomDoorInfoColumnWidth}% (backend auto-normalizes to 100% when saving).
                </p>
              </div>

              <div className="overflow-x-auto py-2">
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-900 mx-auto seating-plan-preview-page">
                  <h2 className="text-xl font-bold text-center mb-4 text-gray-900 dark:text-white">SEATING PLAN</h2>

                  <style>{`.sp-room-door-info-cols { --sp-door-info-col-1: ${roomDoorLayoutDraft.infoCol1Width}%; --sp-door-info-col-2: ${roomDoorLayoutDraft.infoCol2Width}%; --sp-door-info-col-3: ${roomDoorLayoutDraft.infoCol3Width}%; --sp-door-info-col-4: ${roomDoorLayoutDraft.infoCol4Width}%; --sp-door-info-col-5: ${roomDoorLayoutDraft.infoCol5Width}%; --sp-door-info-col-6: ${roomDoorLayoutDraft.infoCol6Width}%; } .sp-room-door-data-cols { --sp-door-data-col-1: ${roomDoorLayoutDraft.col1Width}%; --sp-door-data-col-2: ${roomDoorLayoutDraft.col2Width}%; --sp-door-data-col-3: ${roomDoorLayoutDraft.col3Width}%; --sp-door-row-height: ${roomDoorLayoutDraft.rowHeight}px; } ${roomDoorInfoColumnBoundaries.map((b, i) => `.sp-rd-info-b-${i} { left: ${b}%; }`).join(' ')} ${roomDoorColumnBoundaries.map((b, i) => `.sp-rd-data-b-${i} { left: ${b}%; }`).join(' ')}`}</style>
                  <div className="relative mb-4" ref={roomDoorInfoTableWrapperRef}>
                    <table className="w-full border-collapse text-sm seating-plan-table-layout-fixed sp-room-door-info-cols">
                      <colgroup>
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Name Of Centre</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>
                            International Bharti School, Rohtak
                          </td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Centre No</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-900 dark:text-white">829261</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Class: XII</td>
                        </tr>
                        <tr>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Name Of Examination</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>
                            Sr. Secondary School Certificate Examination 2026
                          </td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Subject</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>
                            048 ; PHYSICAL EDUCATION
                          </td>
                        </tr>
                        <tr>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Date</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>18.02.2026 (Wednesday)</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Room No.</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-900 dark:text-white font-bold" colSpan={2}>02 - XII A</td>
                        </tr>
                      </tbody>
                    </table>
                    {roomDoorInfoColumnBoundaries.map((_, index) => (
                      <div
                        key={`room-door-info-boundary-${index}`}
                        className={`absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-20 sp-rd-info-b-${index}`}
                        onMouseDown={(event) => startRoomDoorInfoColumnResize(index, event)}
                        title="Drag to resize info table columns"
                      />
                    ))}
                  </div>

                  <div className="relative" ref={roomDoorTableWrapperRef}>
                    <table className="w-full border-collapse text-sm seating-plan-table-layout-fixed sp-room-door-data-cols">
                      <colgroup>
                        <col />
                        <col />
                        <col />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Row 1</th>
                          <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Row 2</th>
                          <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Row 3</th>
                        </tr>
                        <tr>
                          <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Roll No</th>
                          <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Roll No</th>
                          <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Roll No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(8)].map((_, i) => (
                          <tr key={i}>
                            <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center sp-row-height-cell">{31683240 + i}</td>
                            <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center sp-row-height-cell">{31683263 + i}</td>
                            <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center sp-row-height-cell">{31683284 + i}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {roomDoorColumnBoundaries.map((_, index) => (
                      <div
                        key={`room-door-boundary-${index}`}
                        className={`absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-20 sp-rd-data-b-${index}`}
                        onMouseDown={(event) => startRoomDoorColumnResize(index, event)}
                        title="Drag to resize column"
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-3 mb-1">
                    <div
                      className="h-2 flex-1 rounded bg-yellow-100 dark:bg-yellow-900/30 cursor-row-resize"
                      onMouseDown={startRoomDoorRowHeightResize}
                      title="Drag up/down to resize row height"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Row Height: {roomDoorLayoutDraft.rowHeight}px
                    </span>
                  </div>

                  <div className="my-4 border-t border-dashed border-gray-400 dark:border-gray-500" />

                  <table className="w-full border-collapse mb-4 text-sm seating-plan-table-layout-fixed sp-room-door-info-cols">
                    <colgroup>
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Name Of Centre</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>International Bharti School, Rohtak</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Centre No</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-900 dark:text-white">829261</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Class: XII</td>
                      </tr>
                      <tr>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Name Of Examination</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>Sr. Secondary School Certificate Examination 2026</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Subject</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>048 ; PHYSICAL EDUCATION</td>
                      </tr>
                      <tr>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Date</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>18.02.2026 (Wednesday)</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold bg-gray-50 dark:bg-gray-800 text-center text-gray-900 dark:text-white">Room No.</td>
                        <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-900 dark:text-white font-bold" colSpan={2}>03 - XII B</td>
                      </tr>
                    </tbody>
                  </table>

                  <table className="w-full border-collapse text-sm seating-plan-table-layout-fixed sp-room-door-data-cols">
                    <colgroup>
                      <col />
                      <col />
                      <col />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Row 1</th>
                        <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Row 2</th>
                        <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Row 3</th>
                      </tr>
                      <tr>
                        <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Roll No</th>
                        <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Roll No</th>
                        <th className="border-2 border-gray-800 dark:border-gray-400 p-2">Roll No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(8)].map((_, i) => (
                        <tr key={`second-door-row-${i}`}>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center sp-row-height-cell">{31683340 + i}</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center sp-row-height-cell">{31683363 + i}</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center sp-row-height-cell">{31683384 + i}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cbseCopy' && (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  This format is designed for submission to CBSE. Each room generates one page with 24 candidates (8 rows x 3 columns).
                </p>
              </div>

              <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-white dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">CBSE Copy Layout (Drag to resize)</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {loadingTemplateSettings
                      ? 'Loading settings...'
                      : isSavingTemplateSettings
                        ? 'Saving...'
                        : 'Saved'}
                  </span>
                </div>

                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Drag vertical separators in both tables (including Centre Name/Date section) to resize columns. Drag the horizontal handle below seating table to resize row height.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Seating width total: {totalColumnWidth}% | Info width total: {totalInfoColumnWidth}% (backend auto-normalizes to 100% when saving).
                </p>
              </div>

              {/* CBSE Copy Preview */}
              <div className="overflow-x-auto py-2">
                <style>{`.sp-cbse-info-cols { --sp-cbse-info-col-1: ${cbseLayoutDraft.infoCol1Width}%; --sp-cbse-info-col-2: ${cbseLayoutDraft.infoCol2Width}%; --sp-cbse-info-col-3: ${cbseLayoutDraft.infoCol3Width}%; --sp-cbse-info-col-4: ${cbseLayoutDraft.infoCol4Width}%; --sp-cbse-info-col-5: ${cbseLayoutDraft.infoCol5Width}%; } .sp-cbse-data-cols { --sp-cbse-data-col-1: ${cbseLayoutDraft.col1Width}%; --sp-cbse-data-col-2: ${cbseLayoutDraft.col2Width}%; --sp-cbse-data-col-3: ${cbseLayoutDraft.col3Width}%; --sp-cbse-data-col-4: ${cbseLayoutDraft.col4Width}%; --sp-cbse-data-col-5: ${cbseLayoutDraft.col5Width}%; --sp-cbse-data-col-6: ${cbseLayoutDraft.col6Width}%; --sp-cbse-header-font-size: ${cbseLayoutDraft.headerFontSize}pt; --sp-cbse-subheader-font-size: ${cbseLayoutDraft.subHeaderFontSize}pt; --sp-cbse-row-height: ${cbseLayoutDraft.rowHeight}px; --sp-cbse-cell-padding-y: ${cbseLayoutDraft.cellPaddingY}px; --sp-cbse-cell-padding-x: ${cbseLayoutDraft.cellPaddingX}px; --sp-cbse-body-font-size: ${cbseLayoutDraft.bodyFontSize}pt; } ${cbseInfoColumnBoundaries.map((b, i) => `.sp-cbse-info-b-${i} { left: ${b}%; }`).join(' ')} ${cbseColumnBoundaries.map((b, i) => `.sp-cbse-data-b-${i} { left: ${b}%; }`).join(' ')}`}</style>
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-900 mx-auto sp-preview-page-size">
                  {/* Header */}
                  <h2 className="text-xl font-bold text-center mb-4 text-gray-900 dark:text-white">SEATING PLAN</h2>

                  {/* Info Table */}
                  <div className="relative mb-4" ref={cbseInfoTableWrapperRef}>
                    <table className="w-full border-collapse seating-plan-table-layout-fixed sp-cbse-info-cols">
                      <colgroup>
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white">Name Of Centre</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>
                            International Bharti School<br />Gohana Road, Rohtak
                          </td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Centre No</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-900 dark:text-white">827403</td>
                        </tr>
                        <tr>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white">Name Of<br />Examination</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>
                            Sr. Secondary School Certificate Examination 2026
                          </td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Subject</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-sm text-gray-900 dark:text-white">184 ; ENGLISH (LANG. & LIT.)</td>
                        </tr>
                        <tr>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white">Date</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300" colSpan={2}>15.02.2026</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white">Room No.</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-900 dark:text-white">01</td>
                        </tr>
                      </tbody>
                    </table>

                    {cbseInfoColumnBoundaries.map((_, index) => (
                      <div
                        key={`cbse-info-boundary-${index}`}
                        className={`absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-20 sp-cbse-info-b-${index}`}
                        onMouseDown={(event) => startInfoColumnResize(index, event)}
                        title="Drag to resize info table columns"
                      />
                    ))}
                  </div>

                  {/* Seating Table */}
                  <div className="relative" ref={cbseTableWrapperRef}>
                    <table className="w-full border-collapse mb-4 seating-plan-table-layout-fixed sp-cbse-data-cols">
                      <colgroup>
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                        <col />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white sp-cbse-header-font" colSpan={2}>Row 1</th>
                          <th className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white sp-cbse-header-font" colSpan={2}>Row 2</th>
                          <th className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-gray-900 dark:text-white sp-cbse-header-font" colSpan={2}>Row 3</th>
                        </tr>
                        <tr>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white sp-cbse-subheader-font">Roll No</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white sp-cbse-subheader-font">Q.P. Code</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white sp-cbse-subheader-font">Roll No</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white sp-cbse-subheader-font">Q.P. Code</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white sp-cbse-subheader-font">Roll No</td>
                          <td className="border-2 border-gray-800 dark:border-gray-400 p-2 font-bold text-center text-gray-900 dark:text-white sp-cbse-subheader-font">Q.P. Code</td>
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(8)].map((_, i) => (
                          <tr key={i}>
                            <td className="border-2 border-gray-800 dark:border-gray-400 text-center text-gray-700 dark:text-gray-300 sp-cbse-body-cell">{17248737 + i}</td>
                            <td className="border-2 border-gray-800 dark:border-gray-400 text-center text-gray-400 dark:text-gray-500 sp-cbse-body-cell" />
                            <td className="border-2 border-gray-800 dark:border-gray-400 text-center text-gray-700 dark:text-gray-300 sp-cbse-body-cell">{17248745 + i}</td>
                            <td className="border-2 border-gray-800 dark:border-gray-400 text-center text-gray-400 dark:text-gray-500 sp-cbse-body-cell" />
                            <td className="border-2 border-gray-800 dark:border-gray-400 text-center text-gray-700 dark:text-gray-300 sp-cbse-body-cell">{17248753 + i}</td>
                            <td className="border-2 border-gray-800 dark:border-gray-400 text-center text-gray-400 dark:text-gray-500 sp-cbse-body-cell" />
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {cbseColumnBoundaries.map((_, index) => (
                      <div
                        key={`cbse-boundary-${index}`}
                        className={`absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-20 sp-cbse-data-b-${index}`}
                        onMouseDown={(event) => startColumnResize(index, event)}
                        title="Drag to resize column"
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="h-2 flex-1 rounded bg-purple-100 dark:bg-purple-900/30 cursor-row-resize"
                      onMouseDown={startRowHeightResize}
                      title="Drag up/down to resize row height"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Row Height: {cbseLayoutDraft.rowHeight}px
                    </span>
                  </div>

                  {/* Footer Section */}
                  <div className="flex justify-between mb-6 text-sm">
                    <div className="w-1/2 leading-relaxed">
                      <p className="font-bold text-gray-900 dark:text-white">Signature of Assistant</p>
                      <p className="font-bold text-gray-900 dark:text-white mb-3">Superintendent</p>
                      <p className="text-gray-700 dark:text-gray-300 mt-2">1. ______________</p>
                      <p className="text-gray-700 dark:text-gray-300 mt-3">2. ______________</p>
                    </div>
                    <div className="w-1/2 text-left pl-10 leading-relaxed">
                      <p className="font-bold text-gray-900 dark:text-white">Total Students</p>
                      <p className="text-gray-700 dark:text-gray-300 mt-2"><span className="font-bold text-gray-900 dark:text-white">Registered:</span> 24</p>
                      <p className="text-gray-700 dark:text-gray-300 mt-3"><span className="font-bold text-gray-900 dark:text-white">Present:</span> ________</p>
                      <p className="text-gray-700 dark:text-gray-300 mt-3"><span className="font-bold text-gray-900 dark:text-white">Absent:</span> ________</p>
                    </div>
                  </div>

                  <p className="text-right font-bold text-gray-900 dark:text-white">Signature of Centre Superintendent</p>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                Click the download button next to any exam to generate the CBSE Copy PDF with actual candidate data.
              </p>
            </div>
          )}
        </div>
      </div>

      {showPreviewDialog && previewPdfUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-6xl h-[88vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Seating Plan PDF Preview
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Open in New Tab
                </a>
                <a
                  href={previewPdfUrl}
                  download={previewFilename || 'seating-plan.pdf'}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  Download PDF
                </a>
                <button
                  type="button"
                  onClick={closePreviewDialog}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="w-full flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4">
              {previewRenderError ? (
                <div className="h-full w-full flex items-center justify-center p-6 text-center text-sm text-gray-600 dark:text-gray-300">
                  {previewRenderError}
                </div>
              ) : (
                <Document
                  file={previewPdfUrl}
                  loading={
                    <div className="h-full w-full flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
                      Loading PDF preview...
                    </div>
                  }
                  onLoadSuccess={({ numPages }) => {
                    setPreviewPageCount(numPages)
                    setPreviewRenderError(null)
                  }}
                  onLoadError={(error) => {
                    console.error('Failed to render seating plan preview:', error)
                    const message = (error as Error)?.message || 'Unknown PDF render error'
                    setPreviewRenderError(`Failed to render preview in dialog (${message}). Use "Open in New Tab" or "Download PDF".`)
                  }}
                  className="flex flex-col items-center gap-4"
                >
                  {Array.from({ length: previewPageCount }).map((_, index) => (
                    <Page
                      key={`seating-preview-page-${index + 1}`}
                      pageNumber={index + 1}
                      width={980}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  ))}
                </Document>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SeatingPlan
