import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Check } from 'lucide-react'
import type { VirtualListProps } from './DropdownTypes'

export const VirtualList: React.FC<VirtualListProps> = ({
  options,
  selectedValues,
  highlightedIndex,
  onSelect,
  onHighlight,
  maxHeight,
  renderOption,
  multiple = false,
}) => {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: options.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Estimated item height
    overscan: 5, // Number of items to render outside of viewport
  })

  // Scroll to highlighted item
  useEffect(() => {
    if (highlightedIndex >= 0 && highlightedIndex < options.length) {
      virtualizer.scrollToIndex(highlightedIndex, {
        align: 'auto',
      })
    }
  }, [highlightedIndex, virtualizer, options.length])

  const isSelected = (value: string | number) => selectedValues.includes(value)

  return (
    <div
      ref={parentRef}
      style={{ maxHeight: `${maxHeight}px`, overflow: 'auto' }}
      className="overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const option = options[virtualItem.index]
          const selected = isSelected(option.value)
          const highlighted = virtualItem.index === highlightedIndex

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={`
                px-3 py-2 cursor-pointer transition-colors
                ${highlighted 
                  ? 'bg-primary-50 dark:bg-primary-900/20' 
                  : 'hover:bg-secondary-50 dark:hover:bg-secondary-700'
                }
                ${selected 
                  ? 'bg-primary-100 dark:bg-primary-900/30' 
                  : ''
                }
                ${option.disabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
                }
              `}
              onClick={() => !option.disabled && onSelect(option)}
              onMouseEnter={() => !option.disabled && onHighlight(virtualItem.index)}
            >
              <div className="flex items-center justify-between gap-2">
                {renderOption ? (
                  renderOption(option)
                ) : (
                  <span className={`
                    text-sm
                    ${selected 
                      ? 'font-medium text-primary-700 dark:text-primary-400' 
                      : 'text-gray-900 dark:text-white'
                    }
                    ${option.disabled 
                      ? 'text-secondary-400 dark:text-secondary-500' 
                      : ''
                    }
                  `}>
                    {option.label}
                  </span>
                )}
                
                {multiple && selected && (
                  <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
