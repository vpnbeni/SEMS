import React, { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity "
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative max-h-[90vh]  overflow-y-auto w-full ${sizeClasses[size]} animate-fade-in-up`}>
        <div className="card shadow-elegant">
          {/* Header */}
          <div className=" card-header flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <h2 className="card-title  text-xl">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 absolute right-4 top-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="card-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal
