import { ReactNode } from 'react'

export type TabColor = 
  | 'blue' 
  | 'emerald' 
  | 'green'
  | 'amber' 
  | 'yellow'
  | 'rose' 
  | 'red'
  | 'purple'
  | 'gray'
  | 'indigo'
  | 'teal'
  | 'orange'

export type TabVariant = 'pill' | 'underline' | 'enclosed'

export type TabSize = 'sm' | 'md' | 'lg'

export interface TabConfig<T extends string = string> {
  id: T
  label: string
  icon?: ReactNode
  badge?: string | number
  color?: TabColor
  disabled?: boolean
  ariaControls?: string
}

export interface TabsProps<T extends string = string> {
  // Data
  tabs: TabConfig<T>[]
  activeTab: T
  onChange: (tabId: T) => void
  
  // Appearance
  variant?: TabVariant
  size?: TabSize
  
  // Layout
  orientation?: 'horizontal' | 'vertical'
  fullWidth?: boolean
  
  // Behavior
  defaultTab?: T
  
  // Styling
  className?: string
  tabClassName?: string
  
  // Accessibility
  ariaLabel?: string
  id?: string
}

export interface UseTabsProps<T extends string = string> {
  tabs: TabConfig<T>[]
  activeTab: T
  onChange: (tabId: T) => void
  orientation?: 'horizontal' | 'vertical'
}

export interface UseTabsReturn<T extends string = string> {
  // State
  activeTabId: T
  focusedIndex: number
  
  // Actions
  handleTabClick: (tabId: T) => void
  handleKeyDown: (e: React.KeyboardEvent, index: number) => void
  
  // Refs
  tabRefs: React.MutableRefObject<Map<T, HTMLButtonElement | null>>
  
  // Helpers
  isActive: (tabId: T) => boolean
  getTabIndex: (tabId: T, index: number) => number
}
