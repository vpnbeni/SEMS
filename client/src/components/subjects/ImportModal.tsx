import React, { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Loader from '../common/Loader'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (file: File) => Promise<void>
  importing: boolean
}

const SubjectsImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, importing }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false, disabled: importing })

  const handleImport = async () => {
    if (selectedFile) {
      await onImport(selectedFile)
      setSelectedFile(null)
    }
  }

  const handleClose = () => {
    if (!importing) {
      setSelectedFile(null)
      onClose()
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !importing) {
        setSelectedFile(null)
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, importing])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-subjects-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
          <h2
            id="import-subjects-title"
            className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white"
          >
            Import Subjects from PDF
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The uploaded PDF will be stored securely. We will extract subject code and name.
          </p>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
            } ${importing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} />
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF file here'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">or click to select a file</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="btn btn-outline w-full sm:w-auto min-h-[44px] rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedFile || importing}
            className="btn btn-primary w-full sm:w-auto min-h-[44px] rounded-xl flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <Loader size="sm" />
                <span>Processing...</span>
              </>
            ) : (
              'Import Subjects'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SubjectsImportModal


