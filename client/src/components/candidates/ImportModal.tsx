import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Loader from '../common/Loader'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (file: File) => Promise<void>
  importing: boolean
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  importing
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: importing
  })

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-secondary-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-secondary-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Import Candidates from PDF
              </h3>
              <button
                onClick={handleClose}
                disabled={importing}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Instructions */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                PDF Format Requirements:
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Each candidate should have a roll number (e.g., CS2021001)</li>
                <li>• Name should be clearly mentioned</li>
                <li>• Email and phone numbers will be automatically detected</li>
                <li>• Course and department information will be extracted if available</li>
                <li>• Supported formats: Text-based PDFs (not scanned images)</li>
              </ul>
            </div>

            {/* File Drop Zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
              } ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              
              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    disabled={importing}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {importing ? (
                    <div className="flex items-center">
                      <Loader size="sm" />
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        Processing PDF...
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {isDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF file here'}
                      </p>
                      <button
                        type="button"
                        onClick={open}
                        disabled={importing}
                        className="mt-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium disabled:opacity-50"
                      >
                        or click to select a file
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sample Format */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-secondary-800 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Sample PDF Format:
              </h5>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                CS2021001 John Doe<br />
                john.doe@example.com<br />
                +1234567890<br />
                Computer Science Engineering<br />
                <br />
                CS2021002 Jane Smith<br />
                jane.smith@example.com<br />
                +0987654321<br />
                Computer Science Engineering
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-secondary-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader size="sm" />
                  <span className="ml-2">Processing...</span>
                </>
              ) : (
                'Import Candidates'
              )}
            </button>
            <button
              onClick={handleClose}
              disabled={importing}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-secondary-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportModal