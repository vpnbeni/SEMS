import { ReactNode, RefObject } from 'react'

export type DialogVariant = 'default' | 'success' | 'warning' | 'error' | 'info'
export type DialogSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type DialogPosition = 'center' | 'top' | 'bottom' | 'left' | 'right'
export type DialogAnimation = 'scale' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'fade'
export type DialogRounded = 'rounded' | 'square' | 'pill'
export type DialogBackdropBlur = 'none' | 'sm' | 'md' | 'lg'
export type DialogCloseButtonPosition = 'inside' | 'outside'

export interface DialogAction {
  label: string
  onClick: () => void | Promise<void>
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'ghost'
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
}

export interface DialogProps {
  // Core
  isOpen: boolean
  onClose: () => void
  
  // Content
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  icon?: ReactNode
  
  // Style
  variant?: DialogVariant
  size?: DialogSize
  position?: DialogPosition
  animation?: DialogAnimation
  rounded?: DialogRounded
  
  // Behavior
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  closeButtonPosition?: DialogCloseButtonPosition
  preventBodyScroll?: boolean
  portal?: boolean
  
  // Advanced
  draggable?: boolean
  maxHeight?: string | number
  minHeight?: string | number
  onBeforeClose?: () => boolean | Promise<boolean>
  initialFocus?: RefObject<HTMLElement>
  stackOrder?: number
  
  // Backdrop
  backdropBlur?: DialogBackdropBlur
  backdropOpacity?: number
  
  // Footer Actions
  actions?: DialogAction[]
  
  // Loading
  loading?: boolean
  
  // Custom styling
  className?: string
  contentClassName?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
  overlayClassName?: string
  
  // IDs for accessibility
  id?: string
}

export interface DialogHeaderProps {
  children: ReactNode
  icon?: ReactNode
  showClose?: boolean
  onClose?: () => void
  className?: string
  variant?: DialogVariant
}

export interface DialogBodyProps {
  children: ReactNode
  className?: string
}

export interface DialogFooterProps {
  children: ReactNode
  className?: string
  align?: 'left' | 'center' | 'right' | 'space-between'
}

export interface DialogContextValue {
  isOpen: boolean
  onClose: () => void
  variant: DialogVariant
  size: DialogSize
  titleId: string
  descriptionId: string
  contentId: string
}
