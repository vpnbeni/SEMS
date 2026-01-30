import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { UseDropdownProps, UseDropdownReturn, DropdownOption } from './DropdownTypes'

const defaultFilterFn = (option: DropdownOption, query: string): boolean => {
  return option.label.toLowerCase().includes(query.toLowerCase())
}

export const useDropdown = ({
  options,
  value,
  defaultValue,
  multiple = false,
  searchable = false,
  filterFn = defaultFilterFn,
  onChange,
  onSearch,
}: UseDropdownProps): UseDropdownReturn => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [internalValue, setInternalValue] = useState<(string | number)[]>(() => {
    // Initialize internal value
    if (value !== undefined) {
      return Array.isArray(value) ? value : [value]
    }
    if (defaultValue !== undefined) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
    }
    return []
  })
  
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const typeaheadRef = useRef<string>('')
  const typeaheadTimeoutRef = useRef<NodeJS.Timeout>()

  // Controlled vs uncontrolled component logic
  const selectedValues = value !== undefined 
    ? (Array.isArray(value) ? value : [value])
    : internalValue

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    return options.filter(option => filterFn(option, searchQuery))
  }, [options, searchQuery, filterFn])

  // Reset highlighted index when options change
  useEffect(() => {
    if (filteredOptions.length > 0 && highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(0)
    }
  }, [filteredOptions.length, highlightedIndex])

  // Handle search query changes
  useEffect(() => {
    if (searchable && onSearch) {
      const debounceTimer = setTimeout(() => {
        onSearch(searchQuery)
      }, 300)
      return () => clearTimeout(debounceTimer)
    }
  }, [searchQuery, searchable, onSearch])

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setHighlightedIndex(0)
    }
  }, [isOpen])

  const handleSelect = useCallback((option: DropdownOption) => {
    if (option.disabled) return

    let newValue: (string | number)[]
    
    if (multiple) {
      // Multi-select: toggle selection
      if (selectedValues.includes(option.value)) {
        newValue = selectedValues.filter(v => v !== option.value)
      } else {
        newValue = [...selectedValues, option.value]
      }
    } else {
      // Single-select: set value and close
      newValue = [option.value]
      setIsOpen(false)
    }

    // Update internal state if uncontrolled
    if (value === undefined) {
      setInternalValue(newValue)
    }

    // Call onChange with appropriate format
    if (onChange) {
      onChange(multiple ? newValue : newValue[0])
    }
  }, [multiple, selectedValues, value, onChange])

  const handleClear = useCallback(() => {
    const newValue: (string | number)[] = []
    
    if (value === undefined) {
      setInternalValue(newValue)
    }

    if (onChange) {
      onChange(multiple ? newValue : '')
    }
  }, [multiple, value, onChange])

  const handleRemove = useCallback((valueToRemove: string | number) => {
    const newValue = selectedValues.filter(v => v !== valueToRemove)
    
    if (value === undefined) {
      setInternalValue(newValue)
    }

    if (onChange) {
      onChange(multiple ? newValue : '')
    }
  }, [selectedValues, multiple, value, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault()
      setIsOpen(true)
      return
    }

    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
        break

      case 'Home':
        e.preventDefault()
        setHighlightedIndex(0)
        break

      case 'End':
        e.preventDefault()
        setHighlightedIndex(filteredOptions.length - 1)
        break

      case 'Enter':
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex])
        }
        break

      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        inputRef.current?.blur()
        break

      case 'Tab':
        setIsOpen(false)
        break

      default:
        // Type-ahead search (only when not searchable)
        if (!searchable && e.key.length === 1) {
          // Clear previous timeout
          if (typeaheadTimeoutRef.current) {
            clearTimeout(typeaheadTimeoutRef.current)
          }

          // Append character to typeahead string
          typeaheadRef.current += e.key.toLowerCase()

          // Find first matching option
          const matchIndex = filteredOptions.findIndex(option =>
            option.label.toLowerCase().startsWith(typeaheadRef.current)
          )

          if (matchIndex !== -1) {
            setHighlightedIndex(matchIndex)
          }

          // Clear typeahead after 1 second
          typeaheadTimeoutRef.current = setTimeout(() => {
            typeaheadRef.current = ''
          }, 1000)
        }
        break
    }
  }, [isOpen, filteredOptions, highlightedIndex, handleSelect, searchable])

  // Cleanup typeahead timeout
  useEffect(() => {
    return () => {
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current)
      }
    }
  }, [])

  return {
    isOpen,
    searchQuery,
    filteredOptions,
    highlightedIndex,
    selectedValues,
    setIsOpen,
    setSearchQuery,
    setHighlightedIndex,
    handleSelect,
    handleClear,
    handleRemove,
    handleKeyDown,
    inputRef,
    listRef,
  }
}
