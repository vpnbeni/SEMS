export interface DropdownOption {
  value: string | number
  label: string
  disabled?: boolean
  group?: string
}

export type DropdownValue = string | number | (string | number)[]

export interface DropdownProps {
  // Data
  options: DropdownOption[]
  value?: DropdownValue
  defaultValue?: DropdownValue
  onChange?: (value: DropdownValue) => void
  
  // Selection mode
  multiple?: boolean
  
  // Search
  searchable?: boolean
  onSearch?: (query: string) => void
  filterFn?: (option: DropdownOption, query: string) => boolean
  
  // Async
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  
  // UI
  size?: 'sm' | 'md' | 'lg'
  placeholder?: string
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  loading?: boolean
  
  // Advanced
  clearable?: boolean
  maxHeight?: number
  position?: 'auto' | 'top' | 'bottom'
  portal?: boolean
  virtualized?: boolean
  renderOption?: (option: DropdownOption) => React.ReactNode
  emptyMessage?: string
  
  // Styling
  className?: string
  dropdownClassName?: string
  
  // IDs for accessibility
  id?: string
  name?: string
}

export interface UseDropdownProps {
  options: DropdownOption[]
  value?: DropdownValue
  defaultValue?: DropdownValue
  multiple?: boolean
  searchable?: boolean
  filterFn?: (option: DropdownOption, query: string) => boolean
  onChange?: (value: DropdownValue) => void
  onSearch?: (query: string) => void
}

export interface UseDropdownReturn {
  // State
  isOpen: boolean
  searchQuery: string
  filteredOptions: DropdownOption[]
  highlightedIndex: number
  selectedValues: (string | number)[]
  
  // Actions
  setIsOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setHighlightedIndex: (index: number) => void
  handleSelect: (option: DropdownOption) => void
  handleClear: () => void
  handleRemove: (value: string | number) => void
  
  // Keyboard
  handleKeyDown: (e: React.KeyboardEvent) => void
  
  // Refs
  inputRef: React.RefObject<HTMLInputElement>
  listRef: React.RefObject<HTMLDivElement>
}

export interface VirtualListProps {
  options: DropdownOption[]
  selectedValues: (string | number)[]
  highlightedIndex: number
  onSelect: (option: DropdownOption) => void
  onHighlight: (index: number) => void
  maxHeight: number
  renderOption?: (option: DropdownOption) => React.ReactNode
  multiple?: boolean
}
