import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
    ArrowLeft,
    FileText,
    Layers,
    Palette,
    GraduationCap,
    Hash,
    Edit2,
    Save,
    X,
    Calendar,
    Users,
    AlertCircle,
    BookOpen,
    CheckCircle2,
    TrendingUp,
    Trash2,
    Plus,
    Ban,
    Download,
    Loader2
} from 'lucide-react'
import api from '../services/api'
import answerSheetService, { AnswerSheetEntry, DiscardedSerial } from '../services/answerSheetService'

interface RelatedExam {
    _id: string
    examDate: string
    dayName: string
    subjectCode: string
    subjectName: string
    class: string
    timeSlot: {
        start: string
        end: string
    }
    duration: number
    candidateCount: number
    answerSheetType: string
}

interface SerialAllocation extends RelatedExam {
    serialFrom: string
    serialTo: string
    sheetsAllocated: number
}

interface AllocationData {
    hasSerialNumbers: boolean
    serialFrom?: string
    serialTo?: string
    total?: number
    discardedCount?: number
    discardedSerials?: DiscardedSerial[]
    usableTotal?: number
    allocations: SerialAllocation[]
    totalAllocated?: number
    remaining?: number
}

const AnswerSheetDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [answerSheet, setAnswerSheet] = useState<AnswerSheetEntry | null>(null)
    const [, setRelatedExams] = useState<RelatedExam[]>([])
    const [allocation, setAllocation] = useState<AllocationData | null>(null)
    const [loading, setLoading] = useState(true)
    const [editMode, setEditMode] = useState(false)
    const [editValues, setEditValues] = useState({ serialFrom: '', serialTo: '' })
    
    // Discarded serials management
    const [showDiscardedModal, setShowDiscardedModal] = useState(false)
    const [discardInput, setDiscardInput] = useState({ serial: '', fromSerial: '', toSerial: '', reason: 'Damaged/Misprinted' })
    const [discardMode, setDiscardMode] = useState<'single' | 'range'>('single')
    const [savingDiscard, setSavingDiscard] = useState(false)
    // Dispatch record PDF preview
    const [dispatchPreviewUrl, setDispatchPreviewUrl] = useState<string | null>(null)
    const [showDispatchPreview, setShowDispatchPreview] = useState(false)
    const [dispatchPreviewLoading, setDispatchPreviewLoading] = useState(false)
    const [dispatchPreviewError, setDispatchPreviewError] = useState<string | null>(null)
    const [dispatchPreviewAlloc, setDispatchPreviewAlloc] = useState<SerialAllocation | null>(null)

    useEffect(() => {
        if (id) {
            loadDetails()
        }
    }, [id])

    const loadDetails = async () => {
        try {
            setLoading(true)

            // Load answer sheet details
            const detailsResponse = await answerSheetService.getAnswerSheetDetails(id!)
            if (detailsResponse.success) {
                setAnswerSheet(detailsResponse.data.answerSheet)
                setRelatedExams(detailsResponse.data.relatedExams || [])
                setEditValues({
                    serialFrom: detailsResponse.data.answerSheet.serialFrom || '',
                    serialTo: detailsResponse.data.answerSheet.serialTo || ''
                })
            }

            // Load allocation data if serial numbers exist
            const allocationResponse = await answerSheetService.getSerialAllocation(id!)
            if (allocationResponse.success) {
                setAllocation(allocationResponse.data)
            }
        } catch (error: any) {
            console.error('Error loading answer sheet details:', error)
            toast.error('Failed to load answer sheet details')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveSerialNumbers = async () => {
        if (!editValues.serialFrom || !editValues.serialTo) {
            toast.error('Please enter both serial numbers')
            return
        }

        const fromNum = parseInt(editValues.serialFrom.replace(/\D/g, ''))
        const toNum = parseInt(editValues.serialTo.replace(/\D/g, ''))

        if (isNaN(fromNum) || isNaN(toNum)) {
            toast.error('Please enter valid serial numbers')
            return
        }

        if (toNum < fromNum) {
            toast.error('Serial To must be greater than or equal to Serial From')
            return
        }

        try {
            setLoading(true)
            await answerSheetService.updateAnswerSheet(id!, {
                serialFrom: editValues.serialFrom,
                serialTo: editValues.serialTo
            })
            toast.success('Serial numbers updated successfully')
            setEditMode(false)
            await loadDetails() // Reload to get updated allocation
        } catch (error: any) {
            console.error('Error updating serial numbers:', error)
            toast.error(error.response?.data?.error || 'Failed to update serial numbers')
        } finally {
            setLoading(false)
        }
    }

    const handleAddDiscarded = async () => {
        if (discardMode === 'single' && !discardInput.serial) {
            toast.error('Please enter a serial number')
            return
        }
        if (discardMode === 'range' && (!discardInput.fromSerial || !discardInput.toSerial)) {
            toast.error('Please enter both from and to serial numbers')
            return
        }

        try {
            setSavingDiscard(true)
            const data = discardMode === 'single'
                ? { serials: discardInput.serial, reason: discardInput.reason }
                : { fromSerial: discardInput.fromSerial, toSerial: discardInput.toSerial, reason: discardInput.reason }

            await answerSheetService.addDiscardedSerials(id!, data)
            setShowDiscardedModal(false)
            setDiscardInput({ serial: '', fromSerial: '', toSerial: '', reason: 'Damaged/Misprinted' })
            await loadDetails()
        } catch (error: any) {
            console.error('Error adding discarded serials:', error)
            toast.error(error.response?.data?.error || 'Failed to add discarded serials')
        } finally {
            setSavingDiscard(false)
        }
    }

    const handleRemoveDiscarded = async (serial: string) => {
        try {
            await answerSheetService.removeDiscardedSerial(id!, serial)
            await loadDetails()
        } catch (error: any) {
            console.error('Error removing discarded serial:', error)
            toast.error(error.response?.data?.error || 'Failed to remove discarded serial')
        }
    }

    const getDispatchFilename = (alloc: SerialAllocation) => {
        const datePart = (() => {
            const date = new Date(alloc.examDate)
            return Number.isNaN(date.getTime()) ? 'unknown-date' : date.toISOString().split('T')[0]
        })()

        const subjectCode = (alloc.subjectCode || 'subject').replace(/[^a-z0-9_-]/gi, '_')
        return `answer-sheet-dispatch-record-${subjectCode}-${datePart}.pdf`
    }

    const closeDispatchPreview = () => {
        setShowDispatchPreview(false)
        setDispatchPreviewAlloc(null)
        setDispatchPreviewError(null)
        setDispatchPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return null
        })
    }

    const openDispatchPreview = async (alloc: SerialAllocation) => {
        if (!id) return
        const allocationId = String(alloc._id || '')
        if (!allocationId) return
        const hasAllocation = alloc.serialFrom !== 'N/A' && alloc.serialTo !== 'N/A' && alloc.sheetsAllocated > 0
        if (!hasAllocation) {
            toast.error('No allocation available for preview')
            return
        }
        setDispatchPreviewAlloc(alloc)
        setDispatchPreviewError(null)
        setDispatchPreviewLoading(true)
        setShowDispatchPreview(true)
        setDispatchPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return null
        })
        try {
            const response = await api.get<Blob>(
                `/answersheets/${id}/dispatch-record/${allocationId}/download`,
                { responseType: 'blob' }
            )
            const blob = response.data
            const contentType = response.headers['content-type'] || ''
            if (typeof blob === 'object' && blob !== null && contentType.toLowerCase().includes('application/pdf')) {
                const objectUrl = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob]))
                setDispatchPreviewUrl(objectUrl)
            } else {
                const text = await (blob instanceof Blob ? blob.text() : Promise.resolve(String(blob)))
                let message = 'Failed to generate preview'
                try {
                    const json = JSON.parse(text)
                    if (typeof json?.error === 'string') message = json.error
                } catch (_) { /* ignore */ }
                setDispatchPreviewError(message)
            }
        } catch (error: any) {
            console.error('Failed to load dispatch record preview:', error)
            if (error?.response?.data instanceof Blob) {
                try {
                    const text = await error.response.data.text()
                    const json = JSON.parse(text)
                    if (typeof json?.error === 'string') {
                        setDispatchPreviewError(json.error)
                        return
                    }
                } catch (_) { /* ignore */ }
            }
            setDispatchPreviewError(error?.serverMessage ?? error?.message ?? 'Failed to load dispatch record preview')
        } finally {
            setDispatchPreviewLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    const formatAnswerSheetType = (type: string) => {
        const typeMap: Record<string, string> = {
            '32_pages': '32 Pages',
            '20_pages': '20 Pages',
            '40_graph': '40 Pages (Graph)',
            'none': 'Not Specified'
        }
        return typeMap[type] || type
    }

    const getColorStyles = (color: string) => {
        const c = color.toLowerCase();
        if (c === 'red') return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
        if (c === 'blue') return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
        if (c === 'green') return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
        if (c === 'yellow') return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
        if (c === 'pink') return 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800';
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }

    if (loading && !answerSheet) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
            </div>
        )
    }

    if (!answerSheet) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Answer sheet not found</h2>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-blue-600 hover:text-blue-500 font-medium flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </button>
                </div>
            </div>
        )
    }

    // Use usableTotal (total - discarded) for percentage calculation
    const usableTotal = allocation?.usableTotal || allocation?.total || 0
    const usagePercentage = usableTotal ? Math.round(((allocation?.totalAllocated || 0) / usableTotal) * 100) : 0;

    // Calculate color based on percentage
    const getProgressBarColor = (percentage: number) => {
        if (percentage > 100) return 'bg-red-600';
        if (percentage > 90) return 'bg-orange-500';
        if (percentage > 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 lg:p-8"
        >
            <div className="mx-auto max-w-7xl">
                {/* Info Cards Grid */}
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="relative overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                                    {formatAnswerSheetType(answerSheet.answerSheetType)}
                                </p>
                            </div>
                            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <FileText className="h-5 w-5" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -2 }}
                        className="relative overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pages</p>
                                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{answerSheet.pages} Pages</p>
                            </div>
                            <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                <Layers className="h-5 w-5" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -2 }}
                        className="relative overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Colour</p>
                                <div className={`mt-2 inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-medium border ${getColorStyles(answerSheet.colour)}`}>
                                    {answerSheet.colour}
                                </div>
                            </div>
                            <div className="rounded-lg bg-pink-50 p-2.5 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
                                <Palette className="h-5 w-5" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -2 }}
                        className="relative overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Class</p>
                                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Class {answerSheet.class}</p>
                            </div>
                            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Left Column: Serial Allocation Stats */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Serial Number Management Card */}
                        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-md bg-white p-1.5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-700 dark:ring-gray-600">
                                            <Hash className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <h2 className="font-semibold text-gray-900 dark:text-white">Serial Number Range</h2>
                                    </div>
                                    {!editMode ? (
                                        <button
                                            onClick={() => setEditMode(true)}
                                            className="group inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:text-blue-600 hover:ring-blue-200 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600"
                                        >
                                            <Edit2 className="h-3.5 w-3.5 transition-colors group-hover:text-blue-600" />
                                            Edit Range
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveSerialNumbers}
                                                disabled={loading}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-green-700 disabled:opacity-50"
                                            >
                                                <Save className="h-3.5 w-3.5" />
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditMode(false)
                                                    setEditValues({
                                                        serialFrom: answerSheet.serialFrom || '',
                                                        serialTo: answerSheet.serialTo || ''
                                                    })
                                                }}
                                                disabled={loading}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 disabled:opacity-50"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="relative rounded-xl bg-gray-50/50 p-4 ring-1 ring-gray-100 dark:bg-gray-800/50 dark:ring-gray-700">
                                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Start From
                                        </label>
                                        {editMode ? (
                                            <input
                                                type="text"
                                                value={editValues.serialFrom}
                                                onChange={(e) => setEditValues({ ...editValues, serialFrom: e.target.value })}
                                                className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 font-mono text-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                                placeholder="e.g. 626101"
                                            />
                                        ) : (
                                            <div className="font-mono text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                                                {answerSheet.serialFrom || <span className="text-gray-400 text-lg font-normal">Not Set</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative rounded-xl bg-gray-50/50 p-4 ring-1 ring-gray-100 dark:bg-gray-800/50 dark:ring-gray-700">
                                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            End At
                                        </label>
                                        {editMode ? (
                                            <input
                                                type="text"
                                                value={editValues.serialTo}
                                                onChange={(e) => setEditValues({ ...editValues, serialTo: e.target.value })}
                                                className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 font-mono text-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                                placeholder="e.g. 627458"
                                            />
                                        ) : (
                                            <div className="font-mono text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                                                {answerSheet.serialTo || <span className="text-gray-400 text-lg font-normal">Not Set</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {allocation && allocation.hasSerialNumbers && (
                                    <div className="mt-8">
                                        <div className="mb-3 flex items-end justify-between">
                                            <div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Utilization</span>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    <span className="font-medium text-gray-900 dark:text-white">{allocation.totalAllocated?.toLocaleString()}</span> allocated of <span className="font-medium text-gray-900 dark:text-white">{(allocation.usableTotal || allocation.total)?.toLocaleString()}</span> usable
                                                    {(allocation.discardedCount || 0) > 0 && (
                                                        <span className="text-red-500 ml-1">({allocation.discardedCount} discarded)</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className={`text-xl font-bold ${usagePercentage > 90 ? 'text-red-600' :
                                                    usagePercentage > 75 ? 'text-orange-600' : 'text-green-600'
                                                }`}>
                                                {usagePercentage}%
                                            </div>
                                        </div>
                                        <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(usagePercentage, 100)}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className={`h-full rounded-full ${getProgressBarColor(usagePercentage)} shadow-sm`}
                                            />
                                        </div>

                                        <div className="mt-6 grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-700">
                                            <div className="px-3 text-center">
                                                <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Allocated</div>
                                                <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{allocation.totalAllocated?.toLocaleString()}</div>
                                            </div>
                                            <div className="px-3 text-center">
                                                <div className="text-xs font-medium uppercase tracking-wider text-red-500">Discarded</div>
                                                <div className="mt-1 text-lg font-bold text-red-600">{(allocation.discardedCount || 0).toLocaleString()}</div>
                                            </div>
                                            <div className="px-3 text-center">
                                                <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Remaining</div>
                                                <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{allocation.remaining?.toLocaleString()}</div>
                                            </div>
                                            <div className="px-3 text-center">
                                                <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Expected</div>
                                                <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                                                    {(allocation.allocations.reduce((acc, curr) => acc + curr.candidateCount, 0))?.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Discarded Sheets Management Card */}
                        {allocation && allocation.hasSerialNumbers && (
                            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-md bg-red-50 p-1.5 shadow-sm ring-1 ring-red-200 dark:bg-red-900/30 dark:ring-red-800">
                                                <Ban className="h-4 w-4 text-red-500 dark:text-red-400" />
                                            </div>
                                            <div>
                                                <h2 className="font-semibold text-gray-900 dark:text-white">Discarded Sheets</h2>
                                                <p className="text-xs text-gray-500">Mark damaged or unusable sheets to skip in allocation</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowDiscardedModal(true)}
                                            className="group inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm ring-1 ring-red-200 transition-all hover:bg-red-100 hover:ring-red-300 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800 dark:hover:bg-red-900/50"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Discarded
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {(allocation.discardedSerials?.length || 0) === 0 ? (
                                        <div className="text-center py-8">
                                            <Ban className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No discarded sheets</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">Click "Add Discarded" to mark damaged or unusable sheets</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {allocation.discardedSerials?.map((item, index) => (
                                                <div
                                                    key={item.serial || index}
                                                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 dark:border-red-800 dark:bg-red-900/10"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-sm font-medium text-red-700 dark:text-red-400">{item.serial}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.reason}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveDiscarded(item.serial)}
                                                        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
                                                        title="Remove from discarded"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Date-wise Breakdown Table */}
                        {allocation && allocation.hasSerialNumbers && allocation.allocations.length > 0 && (
                            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Allocation Schedule</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Date-wise distribution (skips discarded)</p>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {allocation.allocations.length} items
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50/50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Date & Subject</th>
                                                <th className="px-6 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Students</th>
                                                <th className="px-6 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Serial Range</th>
                                                <th className="px-6 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Total</th>
                                                <th className="px-6 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Download</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-700 dark:border-gray-700">
                                            {allocation.allocations.map((alloc, index) => {
                                                const hasAllocation = alloc.serialFrom !== 'N/A' && alloc.serialTo !== 'N/A' && alloc.sheetsAllocated > 0

                                                return (
                                                    <tr key={alloc._id || index} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                                                    <Calendar className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-gray-900 dark:text-white">{formatDate(alloc.examDate)}</div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[180px] truncate" title={alloc.subjectName}>
                                                                        {alloc.subjectName} ({alloc.subjectCode})
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                                <Users className="h-3 w-3" />
                                                                {alloc.candidateCount}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="font-mono text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1 inline-block border border-gray-100 dark:border-gray-700">
                                                                <span className="font-medium text-gray-900 dark:text-white">{alloc.serialFrom}</span>
                                                                <span className="mx-2 text-gray-400">→</span>
                                                                <span className="font-medium text-gray-900 dark:text-white">{alloc.serialTo}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="font-bold text-gray-900 dark:text-white">
                                                                {alloc.sheetsAllocated}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="relative inline-flex group">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => hasAllocation ? openDispatchPreview(alloc) : undefined}
                                                                    disabled={!hasAllocation || (dispatchPreviewLoading && dispatchPreviewAlloc?._id !== alloc._id)}
                                                                    className="inline-flex items-center justify-center rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
                                                                    title={hasAllocation ? 'Preview and download dispatch record PDF' : 'No allocation available for download'}
                                                                    aria-label={hasAllocation ? 'Preview and download dispatch record PDF' : 'No allocation available for download'}
                                                                >
                                                                    {dispatchPreviewLoading && dispatchPreviewAlloc?._id === alloc._id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Download className="h-4 w-4" />
                                                                    )}
                                                                </button>
                                                                {hasAllocation && (
                                                                    <span
                                                                        className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 text-xs font-medium text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10"
                                                                        role="tooltip"
                                                                    >
                                                                        Preview and download dispatch record PDF
                                                                    </span>
                                                                )}
                                                                {!hasAllocation && (
                                                                    <span
                                                                        className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10"
                                                                        role="tooltip"
                                                                    >
                                                                        No allocation available for download
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Empty States */}
                        {!loading && allocation && allocation.hasSerialNumbers && allocation.allocations.length === 0 && (
                            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
                                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Exams Scheduled</h3>
                                <p className="mt-2 text-gray-500 dark:text-gray-400">
                                    No exams were found that use this answer sheet type. Please check your datesheet configuration.
                                </p>
                            </div>
                        )}

                        {/* No Serial Numbers State */}
                        {!loading && (!allocation || !allocation.hasSerialNumbers) && (
                            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                                    <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Ready to Configure</h3>
                                <p className="mx-auto mt-2 max-w-md text-gray-500 dark:text-gray-400">
                                    Set up the serial number range allocated by the board to start tracking usage and distribution across exams.
                                </p>
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Set Serial Numbers
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Quick Stats / Summary / Guidelines */}
                    <div className="space-y-6">
                        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg overflow-hidden relative">
                            {/* Decorative bubbles */}
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>

                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 relative z-10">
                                <AlertCircle className="h-5 w-5" />
                                Pro Tip
                            </h3>
                            <p className="text-blue-100 text-sm leading-relaxed relative z-10">
                                Always ensure the serial number range matches the physical bundles received from the board.
                                Discrepancies should be reported successfully allocated.
                            </p>
                        </div>

                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-gray-500" />
                                Guidelines
                            </h3>
                            <ul className="space-y-4">
                                <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                    <span>Verify bundle seals before opening packages.</span>
                                </li>
                                <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                    <span>Maintain a daily usage log signed by the Superintendent.</span>
                                </li>
                                <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                    <span>Return unused sheets to the safe storage immediately.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Discarded Modal */}
            {showDiscardedModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Discarded Sheets</h3>
                            <button
                                type="button"
                                title="Close"
                                aria-label="Close"
                                onClick={() => {
                                    setShowDiscardedModal(false)
                                    setDiscardInput({ serial: '', fromSerial: '', toSerial: '', reason: 'Damaged/Misprinted' })
                                }}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Mode Toggle */}
                        <div className="mb-4 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                            <button
                                onClick={() => setDiscardMode('single')}
                                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                                    discardMode === 'single'
                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                }`}
                            >
                                Single Serial
                            </button>
                            <button
                                onClick={() => setDiscardMode('range')}
                                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                                    discardMode === 'range'
                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                }`}
                            >
                                Range
                            </button>
                        </div>

                        {discardMode === 'single' ? (
                            <div className="mb-4">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Serial Number
                                </label>
                                <input
                                    type="text"
                                    value={discardInput.serial}
                                    onChange={(e) => setDiscardInput({ ...discardInput, serial: e.target.value })}
                                    className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 font-mono shadow-sm focus:border-red-500 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                    placeholder={`e.g. ${answerSheet?.serialFrom || '446351'}`}
                                />
                            </div>
                        ) : (
                            <div className="mb-4 grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        From Serial
                                    </label>
                                    <input
                                        type="text"
                                        value={discardInput.fromSerial}
                                        onChange={(e) => setDiscardInput({ ...discardInput, fromSerial: e.target.value })}
                                        className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 font-mono shadow-sm focus:border-red-500 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                        placeholder={answerSheet?.serialFrom || '446351'}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        To Serial
                                    </label>
                                    <input
                                        type="text"
                                        value={discardInput.toSerial}
                                        onChange={(e) => setDiscardInput({ ...discardInput, toSerial: e.target.value })}
                                        className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 font-mono shadow-sm focus:border-red-500 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                        placeholder={answerSheet?.serialTo || '446700'}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mb-6">
                            <label htmlFor="discard-reason" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Reason
                            </label>
                            <select
                                id="discard-reason"
                                value={discardInput.reason}
                                onChange={(e) => setDiscardInput({ ...discardInput, reason: e.target.value })}
                                className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="Damaged/Misprinted">Damaged/Misprinted</option>
                                <option value="Received Damaged (Wear/Tear during transport)">Received Damaged (Wear/Tear during transport)</option>
                                <option value="Torn">Torn</option>
                                <option value="Water Damage">Water Damage</option>
                                <option value="Missing Pages">Missing Pages</option>
                                <option value="Printing Defect">Printing Defect</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDiscardedModal(false)
                                    setDiscardInput({ serial: '', fromSerial: '', toSerial: '', reason: 'Damaged/Misprinted' })
                                }}
                                className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddDiscarded}
                                disabled={savingDiscard}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {savingDiscard ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4" />
                                        Mark as Discarded
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                            Valid range: {answerSheet?.serialFrom} - {answerSheet?.serialTo}
                        </p>
                    </motion.div>
                </div>
            )}

            {/* Dispatch record PDF preview modal */}
            {showDispatchPreview && (dispatchPreviewUrl || dispatchPreviewLoading || dispatchPreviewError) && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-6xl h-[88vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-4">
                                Dispatch Record PDF Preview
                                {dispatchPreviewAlloc && (
                                    <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
                                        {formatDate(dispatchPreviewAlloc.examDate)} — {dispatchPreviewAlloc.subjectName}
                                    </span>
                                )}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {dispatchPreviewUrl && (
                                    <>
                                        <a
                                            href={dispatchPreviewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        >
                                            Open in New Tab
                                        </a>
                                        <a
                                            href={dispatchPreviewUrl}
                                            download={dispatchPreviewAlloc ? getDispatchFilename(dispatchPreviewAlloc) : 'dispatch-record.pdf'}
                                            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                        >
                                            Download PDF
                                        </a>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={closeDispatchPreview}
                                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="w-full flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4 min-h-0">
                            {dispatchPreviewLoading ? (
                                <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                    <p>Generating preview...</p>
                                </div>
                            ) : dispatchPreviewError ? (
                                <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-600 dark:text-gray-300">
                                    <FileText className="w-12 h-12 text-amber-500" />
                                    <p>{dispatchPreviewError}</p>
                                    <p className="text-xs">Use Close and try again, or check allocation and rooms.</p>
                                </div>
                            ) : dispatchPreviewUrl ? (
                                <iframe
                                    src={`${dispatchPreviewUrl}#toolbar=0`}
                                    className="w-full h-full min-h-[60vh] border-0 rounded-lg bg-white dark:bg-gray-900"
                                    title="Dispatch record PDF preview"
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    )
}

export default AnswerSheetDetails
