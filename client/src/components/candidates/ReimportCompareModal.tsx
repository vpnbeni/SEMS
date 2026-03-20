import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import Loader from '../common/Loader'
import {
  useReimportCompare,
  useReimportImpact,
  useReimportApply,
} from '../../hooks/useReimport'
import type {
  ComparisonResult,
  ImpactResult,
  ReimportChange,
} from '../../services/candidateService'

interface ReimportCompareModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'upload' | 'review' | 'impact'

const ReimportCompareModal: React.FC<ReimportCompareModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep] = useState<Step>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())
  const [cascadeCleanup, setCascadeCleanup] = useState(true)
  const [impact, setImpact] = useState<ImpactResult | null>(null)
  const [activeTab, setActiveTab] = useState<'mismatches' | 'new' | 'missing'>('mismatches')

  const compareMutation = useReimportCompare()
  const impactMutation = useReimportImpact()
  const applyMutation = useReimportApply()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: compareMutation.isPending,
  })

  const handleCompare = async () => {
    if (!selectedFile) return
    try {
      const result = await compareMutation.mutateAsync(selectedFile)
      setComparison(result)
      // Auto-select all removed (phantom) subjects
      const autoSelected = new Set<string>()
      for (const diff of result.differences) {
        for (const removed of diff.subjectChanges.removed) {
          autoSelected.add(`${diff.rollNumber}:remove:${removed.code}`)
        }
      }
      setSelectedChanges(autoSelected)
      setStep('review')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to compare')
    }
  }

  const toggleChange = (key: string) => {
    setSelectedChanges((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const buildChanges = (): ReimportChange[] => {
    if (!comparison) return []
    const changeMap = new Map<string, ReimportChange>()

    for (const key of selectedChanges) {
      const [rollNumber, action, code] = key.split(':')
      const mapKey = `${rollNumber}:${action === 'remove' ? 'remove_subjects' : 'add_subjects'}`
      if (!changeMap.has(mapKey)) {
        changeMap.set(mapKey, {
          rollNumber,
          action: action === 'remove' ? 'remove_subjects' : 'add_subjects',
          subjectCodes: [],
          cascadeCleanup,
        })
      }
      changeMap.get(mapKey)!.subjectCodes.push(code)
    }

    return Array.from(changeMap.values())
  }

  const handleCheckImpact = async () => {
    const changes = buildChanges()
    if (changes.length === 0) {
      toast.error('No changes selected')
      return
    }
    try {
      const result = await impactMutation.mutateAsync(changes)
      setImpact(result)
      setStep('impact')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to check impact')
    }
  }

  const handleApply = async () => {
    const changes = buildChanges()
    try {
      const result = await applyMutation.mutateAsync(changes)
      toast.success(`Applied ${result.successCount} change(s)`)
      handleClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to apply changes')
    }
  }

  const handleClose = () => {
    if (compareMutation.isPending || applyMutation.isPending) return
    setStep('upload')
    setSelectedFile(null)
    setComparison(null)
    setSelectedChanges(new Set())
    setImpact(null)
    onClose()
  }

  if (!isOpen) return null

  const totalPhantom = comparison?.differences.reduce(
    (sum, d) => sum + d.subjectChanges.removed.length, 0
  ) ?? 0
  const totalMissing = comparison?.differences.reduce(
    (sum, d) => sum + d.subjectChanges.added.length, 0
  ) ?? 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

        <div className="relative inline-block align-bottom bg-white dark:bg-secondary-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-secondary-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Re-Import & Compare
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {step === 'upload' && 'Upload a candidate PDF to compare with existing data'}
                {step === 'review' && 'Review differences between PDF and database'}
                {step === 'impact' && 'Review impact and confirm changes'}
              </p>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {(['upload', 'review', 'impact'] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className={`w-2.5 h-2.5 rounded-full ${
                    step === s
                      ? 'bg-primary-600'
                      : i < ['upload', 'review', 'impact'].indexOf(step)
                        ? 'bg-primary-300'
                        : 'bg-gray-300 dark:bg-secondary-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <div>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-secondary-600 hover:border-primary-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {isDragActive ? 'Drop the PDF here...' : 'Drag & drop a candidate PDF, or click to select'}
                  </p>
                </div>
                {selectedFile && (
                  <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 dark:bg-secondary-700 rounded-lg">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Review */}
            {step === 'review' && comparison && (
              <div>
                {/* Summary banner */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Parsed <strong>{comparison.parseStats.totalParsed}</strong> candidates from PDF
                    (class {comparison.parseStats.pdfClass}).
                    {' '}Matched <strong>{comparison.parseStats.matchedCount}</strong> in database.
                    {totalPhantom > 0 && (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {' '}{totalPhantom} phantom subject(s) found (in DB but not in PDF).
                      </span>
                    )}
                    {totalMissing > 0 && (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {' '}{totalMissing} missing subject(s) (in PDF but not in DB).
                      </span>
                    )}
                    {comparison.newCandidates.length > 0 && (
                      <span> {comparison.newCandidates.length} new candidate(s).</span>
                    )}
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-secondary-700">
                  {[
                    { id: 'mismatches' as const, label: 'Subject Mismatches', count: comparison.differences.length },
                    { id: 'new' as const, label: 'New Candidates', count: comparison.newCandidates.length },
                    { id: 'missing' as const, label: 'Missing from PDF', count: comparison.missingFromPdf.length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-secondary-600">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Subject Mismatches Tab */}
                {activeTab === 'mismatches' && (
                  <div>
                    {comparison.differences.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                        No subject mismatches found — all candidates match.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-secondary-700">
                            <th className="pb-2 pr-2 w-8"></th>
                            <th className="pb-2 pr-2">Roll No</th>
                            <th className="pb-2 pr-2">Name</th>
                            <th className="pb-2 pr-2">Subject</th>
                            <th className="pb-2 pr-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-secondary-700">
                          {comparison.differences.flatMap((diff) => {
                            const rows: React.ReactNode[] = []
                            for (const removed of diff.subjectChanges.removed) {
                              const key = `${diff.rollNumber}:remove:${removed.code}`
                              rows.push(
                                <tr key={key} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                  <td className="py-2 pr-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedChanges.has(key)}
                                      onChange={() => toggleChange(key)}
                                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                  </td>
                                  <td className="py-2 pr-2 font-mono text-xs">{diff.rollNumber}</td>
                                  <td className="py-2 pr-2">{diff.candidateName}</td>
                                  <td className="py-2 pr-2 font-mono">{removed.code}</td>
                                  <td className="py-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                      Phantom (remove)
                                    </span>
                                  </td>
                                </tr>
                              )
                            }
                            for (const added of diff.subjectChanges.added) {
                              const key = `${diff.rollNumber}:add:${added.code}`
                              rows.push(
                                <tr key={key} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                  <td className="py-2 pr-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedChanges.has(key)}
                                      onChange={() => toggleChange(key)}
                                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                  </td>
                                  <td className="py-2 pr-2 font-mono text-xs">{diff.rollNumber}</td>
                                  <td className="py-2 pr-2">{diff.candidateName}</td>
                                  <td className="py-2 pr-2 font-mono">{added.code}</td>
                                  <td className="py-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                      Missing (add)
                                    </span>
                                  </td>
                                </tr>
                              )
                            }
                            return rows
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* New Candidates Tab */}
                {activeTab === 'new' && (
                  <div>
                    {comparison.newCandidates.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                        No new candidates in the PDF.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-secondary-700">
                            <th className="pb-2 pr-2">Roll No</th>
                            <th className="pb-2 pr-2">Name</th>
                            <th className="pb-2 pr-2">Class</th>
                            <th className="pb-2 pr-2">School</th>
                            <th className="pb-2">Subjects</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-secondary-700">
                          {comparison.newCandidates.map((c) => (
                            <tr key={c.rollNumber} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                              <td className="py-2 pr-2 font-mono text-xs">{c.rollNumber}</td>
                              <td className="py-2 pr-2">{c.name}</td>
                              <td className="py-2 pr-2">{c.class}</td>
                              <td className="py-2 pr-2 text-xs">{c.schoolCode}</td>
                              <td className="py-2 font-mono text-xs">
                                {c.subjectCodes.map((s) => s.code).join(', ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Missing from PDF Tab */}
                {activeTab === 'missing' && (
                  <div>
                    {comparison.missingFromPdf.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                        All database candidates are present in the PDF.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          These candidates exist in the database but were not found in the uploaded PDF. This is informational only — no automatic action is taken.
                        </p>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-secondary-700">
                              <th className="pb-2 pr-2">Roll No</th>
                              <th className="pb-2 pr-2">Name</th>
                              <th className="pb-2">Class</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-secondary-700">
                            {comparison.missingFromPdf.map((c) => (
                              <tr key={c.rollNumber} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                <td className="py-2 pr-2 font-mono text-xs">{c.rollNumber}</td>
                                <td className="py-2 pr-2">{c.name}</td>
                                <td className="py-2">{c.class}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Impact & Confirm */}
            {step === 'impact' && impact && (
              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Impact Analysis
                  </h4>
                  {/* Overall summary */}
                  <div className={`p-3 rounded-lg border ${
                    impact.summary.overallSeverity === 'high'
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      : impact.summary.overallSeverity === 'low'
                        ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                        : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  }`}>
                    <p className="text-sm">
                      {impact.summary.overallSeverity === 'none' && (
                        <span className="text-green-700 dark:text-green-400">No downstream data affected. Safe to apply.</span>
                      )}
                      {impact.summary.overallSeverity === 'low' && (
                        <span className="text-yellow-700 dark:text-yellow-400">
                          {impact.summary.totalSeatingAllocationsAffected} seating allocation(s) will be affected.
                        </span>
                      )}
                      {impact.summary.overallSeverity === 'high' && (
                        <span className="text-red-700 dark:text-red-400">
                          High impact: {impact.summary.totalForm66Affected} Form66 record(s) and {impact.summary.totalAnswerSheetsAffected} answer sheet(s) affected.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Per-change impact table */}
                {impact.impacts.length > 0 && (
                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-secondary-700">
                        <th className="pb-2 pr-2">Roll No</th>
                        <th className="pb-2 pr-2">Subject</th>
                        <th className="pb-2 pr-2">Seating</th>
                        <th className="pb-2 pr-2">Form66</th>
                        <th className="pb-2 pr-2">Answer Sheets</th>
                        <th className="pb-2">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-secondary-700">
                      {impact.impacts.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 pr-2 font-mono text-xs">{item.rollNumber}</td>
                          <td className="py-2 pr-2 font-mono">{item.subjectCode}</td>
                          <td className="py-2 pr-2">{item.seatingPlanAllocations}</td>
                          <td className="py-2 pr-2">{item.form66Records}</td>
                          <td className="py-2 pr-2">{item.answerSheetLinks}</td>
                          <td className="py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.severity === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : item.severity === 'low'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {item.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Cascade cleanup option */}
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={cascadeCleanup}
                    onChange={(e) => setCascadeCleanup(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Also clean up affected seating plan allocations
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-secondary-700 flex items-center justify-between">
            <button
              onClick={step === 'upload' ? handleClose : () => setStep(step === 'impact' ? 'review' : 'upload')}
              disabled={compareMutation.isPending || applyMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-secondary-700 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:hover:bg-secondary-600 transition-colors"
            >
              {step === 'upload' ? 'Cancel' : 'Back'}
            </button>

            <div className="flex gap-2">
              {step === 'upload' && (
                <button
                  onClick={handleCompare}
                  disabled={!selectedFile || compareMutation.isPending}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {compareMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 mr-2" />
                      Comparing...
                    </>
                  ) : (
                    'Compare'
                  )}
                </button>
              )}

              {step === 'review' && (
                <button
                  onClick={handleCheckImpact}
                  disabled={selectedChanges.size === 0 || impactMutation.isPending}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {impactMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 mr-2" />
                      Checking...
                    </>
                  ) : (
                    `Check Impact (${selectedChanges.size})`
                  )}
                </button>
              )}

              {step === 'impact' && (
                <button
                  onClick={handleApply}
                  disabled={applyMutation.isPending}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {applyMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 mr-2" />
                      Applying...
                    </>
                  ) : (
                    'Apply Selected Fixes'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReimportCompareModal
