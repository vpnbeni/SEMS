import React from 'react'
import { X } from 'lucide-react'
import { useDialogContext } from './DialogContext'
import type { DialogHeaderProps } from './DialogTypes'

const variantIconColors = {
  default: 'text-primary-600 dark:text-primary-400',
  success: 'text-success-600 dark:text-success-400',
  warning: 'text-warning-600 dark:text-warning-400',
  error: 'text-error-600 dark:text-error-400',
  info: 'text-primary-600 dark:text-primary-400'
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  children,
  icon,
  showClose = true,
  onClose: customOnClose,
  className = '',
  variant
}) => {
  const context = useDialogContext()
  const variantToUse = variant || context.variant
  const onClose = customOnClose || context.onClose

  return (
    <div className={`card-header flex items-start justify-between border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-start gap-3 flex-1">
        {icon && (
          <div className={`flex-shrink-0 mt-1 ${variantIconColors[variantToUse]}`}>
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h2 
            id={context.titleId}
            className="card-title text-xl font-semibold text-gray-900 dark:text-white"
          >
            {children}
          </h2>
        </div>
      </div>
      
      {showClose && (
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
