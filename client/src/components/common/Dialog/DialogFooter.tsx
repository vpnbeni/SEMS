import React from 'react'
import type { DialogFooterProps } from './DialogTypes'

const alignClasses = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  'space-between': 'justify-between'
}

export const DialogFooter: React.FC<DialogFooterProps> = ({
  children,
  className = '',
  align = 'right'
}) => {
  return (
    <div 
      className={`card-footer border-t border-gray-200 dark:border-gray-700 ${alignClasses[align]} gap-3 ${className}`}
    >
      {children}
    </div>
  )
}
