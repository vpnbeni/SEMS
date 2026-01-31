import { useEffect, useRef, useState, useCallback } from 'react'

interface UseFocusTrapOptions {
  isOpen: boolean
  onClose: () => void
  closeOnEscape: boolean
  initialFocus?: React.RefObject<HTMLElement>
}

// Get all focusable elements
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',')

  return Array.from(container.querySelectorAll<HTMLElement>(selector))
}

export const useFocusTrap = (options: UseFocusTrapOptions) => {
  const { isOpen, initialFocus } = options
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return

    // Store the element that had focus before dialog opened
    previousActiveElement.current = document.activeElement as HTMLElement

    // Set initial focus
    const setInitialFocus = () => {
      if (initialFocus?.current) {
        initialFocus.current.focus()
      } else {
        // Focus first focusable element
        const focusableElements = getFocusableElements(dialogRef.current!)
        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        }
      }
    }

    // Delay to ensure DOM is ready
    setTimeout(setInitialFocus, 100)

    // Handle Tab key for focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = getFocusableElements(dialogRef.current)
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab: focus last element if currently on first
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: focus first element if currently on last
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)

    return () => {
      document.removeEventListener('keydown', handleTab)
      
      // Restore focus to previous element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, initialFocus])

  return dialogRef
}

// Hook for body scroll lock
export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight

    // Get scrollbar width
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    // Lock scroll
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [isLocked])
}

// Hook for handling async close with validation
export const useAsyncClose = (
  onClose: () => void,
  onBeforeClose?: () => boolean | Promise<boolean>
) => {
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = useCallback(async () => {
    if (isClosing) return

    if (onBeforeClose) {
      setIsClosing(true)
      try {
        const canClose = await Promise.resolve(onBeforeClose())
        if (canClose) {
          onClose()
        }
      } catch (error) {
        console.error('Error in onBeforeClose:', error)
      } finally {
        setIsClosing(false)
      }
    } else {
      onClose()
    }
  }, [onClose, onBeforeClose, isClosing])

  return { handleClose, isClosing }
}

// Hook for drag functionality (basic implementation)
export const useDraggable = (isDraggable: boolean, isOpen: boolean) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDraggable) return
    
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }, [isDraggable, position])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Reset position when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen])

  return {
    position,
    isDragging,
    handleMouseDown
  }
}
