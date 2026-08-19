import React, { createContext, useContext, useMemo, useState } from 'react'

export type AttndMatrixMode = 'classwise' | 'daywise'

type AttndMatrixModeContextValue = {
  mode: AttndMatrixMode
  setMode: (mode: AttndMatrixMode) => void
}

const STORAGE_KEY = 'attnd-matrix-mode'

const AttndMatrixModeContext = createContext<AttndMatrixModeContextValue>({
  mode: 'classwise',
  setMode: () => {},
})

const readStoredMode = (): AttndMatrixMode => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === 'daywise' ? 'daywise' : 'classwise'
  } catch {
    return 'classwise'
  }
}

export const AttndMatrixModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AttndMatrixMode>(readStoredMode)

  const value = useMemo(
    () => ({
      mode,
      setMode: (next: AttndMatrixMode) => {
        setModeState(next)
        try {
          window.sessionStorage.setItem(STORAGE_KEY, next)
        } catch {
          /* ignore */
        }
      },
    }),
    [mode]
  )

  return <AttndMatrixModeContext.Provider value={value}>{children}</AttndMatrixModeContext.Provider>
}

export const useAttndMatrixMode = () => useContext(AttndMatrixModeContext)
