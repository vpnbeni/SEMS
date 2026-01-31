import { useEffect, useRef } from 'react'

interface DialogStackItem {
  id: string
  onClose: () => void
  closeOnEscape: boolean
}

// Global dialog stack to manage multiple dialogs
const dialogStack: DialogStackItem[] = []

export const useDialogStack = (
  isOpen: boolean,
  onClose: () => void,
  closeOnEscape: boolean,
  id: string
) => {
  const dialogIdRef = useRef(id)

  useEffect(() => {
    if (!isOpen) return

    // Add dialog to stack when opened
    const stackItem: DialogStackItem = {
      id: dialogIdRef.current,
      onClose,
      closeOnEscape
    }
    dialogStack.push(stackItem)

    // Handle Escape key for topmost dialog
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Only close if this is the topmost dialog and closeOnEscape is true
        const topDialog = dialogStack[dialogStack.length - 1]
        if (topDialog && topDialog.id === dialogIdRef.current && topDialog.closeOnEscape) {
          e.preventDefault()
          e.stopPropagation()
          topDialog.onClose()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)

    // Cleanup: remove from stack when closed
    return () => {
      document.removeEventListener('keydown', handleEscape)
      const index = dialogStack.findIndex(item => item.id === dialogIdRef.current)
      if (index > -1) {
        dialogStack.splice(index, 1)
      }
    }
  }, [isOpen, onClose, closeOnEscape])

  // Calculate z-index based on position in stack
  const getZIndex = (): number => {
    const baseZIndex = 9000
    const index = dialogStack.findIndex(item => item.id === dialogIdRef.current)
    return index > -1 ? baseZIndex + index * 10 : baseZIndex
  }

  // Check if this is the topmost dialog
  const isTopmost = (): boolean => {
    if (dialogStack.length === 0) return true
    const topDialog = dialogStack[dialogStack.length - 1]
    return topDialog.id === dialogIdRef.current
  }

  return {
    zIndex: getZIndex(),
    isTopmost: isTopmost(),
    stackDepth: dialogStack.length
  }
}
