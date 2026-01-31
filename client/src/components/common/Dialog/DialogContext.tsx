import React, { createContext, useContext } from 'react'
import type { DialogContextValue } from './DialogTypes'

const DialogContext = createContext<DialogContextValue | null>(null)

export const DialogProvider: React.FC<{
  value: DialogContextValue
  children: React.ReactNode
}> = ({ value, children }) => {
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

export const useDialogContext = () => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('Dialog compound components must be used within a Dialog component')
  }
  return context
}
