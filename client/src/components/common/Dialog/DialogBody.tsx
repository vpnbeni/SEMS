import React from 'react'
import { useDialogContext } from './DialogContext'
import type { DialogBodyProps } from './DialogTypes'

export const DialogBody: React.FC<DialogBodyProps> = ({
  children,
  className = ''
}) => {
  const context = useDialogContext()

  return (
    <div 
      id={context.contentId}
      className={`card-content ${className}`}
    >
      {children}
    </div>
  )
}
