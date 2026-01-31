import { Variants } from 'framer-motion'
import type { DialogAnimation, DialogBackdropBlur } from './DialogTypes'

// Backdrop animation variants
export const backdropVariants: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: 'easeIn'
    }
  }
}

// Dialog animation variants based on animation type
export const getDialogVariants = (animationType: DialogAnimation): Variants => {
  const variants: Record<DialogAnimation, Variants> = {
    scale: {
      hidden: { 
        scale: 0.85, 
        opacity: 0 
      },
      visible: { 
        scale: 1, 
        opacity: 1,
        transition: { 
          type: 'spring', 
          stiffness: 300, 
          damping: 30,
          mass: 0.8
        }
      },
      exit: { 
        scale: 0.85, 
        opacity: 0,
        transition: {
          duration: 0.2,
          ease: 'easeIn'
        }
      }
    },
    'slide-up': {
      hidden: { 
        y: '100vh', 
        opacity: 0 
      },
      visible: { 
        y: 0, 
        opacity: 1, 
        transition: { 
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.9
        } 
      },
      exit: { 
        y: '100vh', 
        opacity: 0,
        transition: {
          duration: 0.25,
          ease: 'easeIn'
        }
      }
    },
    'slide-down': {
      hidden: { 
        y: '-100vh', 
        opacity: 0 
      },
      visible: { 
        y: 0, 
        opacity: 1, 
        transition: { 
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.9
        } 
      },
      exit: { 
        y: '-100vh', 
        opacity: 0,
        transition: {
          duration: 0.25,
          ease: 'easeIn'
        }
      }
    },
    'slide-left': {
      hidden: { 
        x: '100vw', 
        opacity: 0 
      },
      visible: { 
        x: 0, 
        opacity: 1, 
        transition: { 
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.9
        } 
      },
      exit: { 
        x: '100vw', 
        opacity: 0,
        transition: {
          duration: 0.25,
          ease: 'easeIn'
        }
      }
    },
    'slide-right': {
      hidden: { 
        x: '-100vw', 
        opacity: 0 
      },
      visible: { 
        x: 0, 
        opacity: 1, 
        transition: { 
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.9
        } 
      },
      exit: { 
        x: '-100vw', 
        opacity: 0,
        transition: {
          duration: 0.25,
          ease: 'easeIn'
        }
      }
    },
    fade: {
      hidden: { 
        opacity: 0 
      },
      visible: { 
        opacity: 1,
        transition: {
          duration: 0.25,
          ease: 'easeOut'
        }
      },
      exit: { 
        opacity: 0,
        transition: {
          duration: 0.2,
          ease: 'easeIn'
        }
      }
    }
  }

  return variants[animationType]
}

// Get backdrop blur class based on blur level
export const getBackdropBlurClass = (blur: DialogBackdropBlur): string => {
  const blurClasses: Record<DialogBackdropBlur, string> = {
    none: '',
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg'
  }
  
  return blurClasses[blur]
}

// Utility to get backdrop opacity style
export const getBackdropOpacity = (opacity?: number): number => {
  if (opacity === undefined) return 0.5
  return Math.max(0, Math.min(1, opacity))
}
