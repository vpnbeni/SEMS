import React from 'react'
import { TabsProps, TabConfig, TabColor, TabVariant, TabSize } from './TabsTypes'
import { useTabs } from './useTabs'

// Color theme mappings for active states
const colorClasses: Record<TabColor, { active: string; hover: string }> = {
  blue: {
    active: 'bg-blue-500 text-white shadow-sm',
    hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
  },
  emerald: {
    active: 'bg-emerald-500 text-white shadow-sm',
    hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
  },
  green: {
    active: 'bg-green-500 text-white shadow-sm',
    hover: 'hover:bg-green-50 dark:hover:bg-green-900/20'
  },
  amber: {
    active: 'bg-amber-500 text-white shadow-sm',
    hover: 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
  },
  yellow: {
    active: 'bg-yellow-500 text-white shadow-sm',
    hover: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
  },
  rose: {
    active: 'bg-rose-500 text-white shadow-sm',
    hover: 'hover:bg-rose-50 dark:hover:bg-rose-900/20'
  },
  red: {
    active: 'bg-red-500 text-white shadow-sm',
    hover: 'hover:bg-red-50 dark:hover:bg-red-900/20'
  },
  purple: {
    active: 'bg-purple-500 text-white shadow-sm',
    hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
  },
  gray: {
    active: 'bg-gray-500 text-white shadow-sm',
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-900/20'
  },
  indigo: {
    active: 'bg-indigo-500 text-white shadow-sm',
    hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
  },
  teal: {
    active: 'bg-teal-500 text-white shadow-sm',
    hover: 'hover:bg-teal-50 dark:hover:bg-teal-900/20'
  },
  orange: {
    active: 'bg-orange-500 text-white shadow-sm',
    hover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20'
  }
}

// Underline color classes
const underlineColorClasses: Record<TabColor, string> = {
  blue: 'border-blue-500',
  emerald: 'border-emerald-500',
  green: 'border-green-500',
  amber: 'border-amber-500',
  yellow: 'border-yellow-500',
  rose: 'border-rose-500',
  red: 'border-red-500',
  purple: 'border-purple-500',
  gray: 'border-gray-500',
  indigo: 'border-indigo-500',
  teal: 'border-teal-500',
  orange: 'border-orange-500'
}

// Size classes for different variants
const sizeClasses: Record<TabSize, { pill: string; underline: string; enclosed: string }> = {
  sm: {
    pill: 'py-1.5 px-3 text-xs',
    underline: 'py-2 px-3 text-xs',
    enclosed: 'py-1.5 px-3 text-xs'
  },
  md: {
    pill: 'py-2.5 px-4 text-sm',
    underline: 'py-3 px-4 text-sm',
    enclosed: 'py-2.5 px-4 text-sm'
  },
  lg: {
    pill: 'py-3 px-5 text-base',
    underline: 'py-4 px-5 text-base',
    enclosed: 'py-3 px-5 text-base'
  }
}

// Icon size classes
const iconSizeClasses: Record<TabSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
}

// Badge size classes
const badgeSizeClasses: Record<TabSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 min-w-[16px]',
  md: 'text-xs px-2 py-0.5 min-w-[20px]',
  lg: 'text-sm px-2.5 py-1 min-w-[24px]'
}

function TabButton<T extends string>({
  tab,
  isActive,
  onClick,
  onKeyDown,
  tabIndex,
  variant,
  size,
  tabClassName,
  tabRef
}: {
  tab: TabConfig<T>
  isActive: boolean
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  tabIndex: number
  variant: TabVariant
  size: TabSize
  tabClassName?: string
  tabRef: (el: HTMLButtonElement | null) => void
}) {
  const color = tab.color || 'blue'
  const sizeClass = sizeClasses[size][variant]
  const iconSize = iconSizeClasses[size]
  const badgeSize = badgeSizeClasses[size]

  // Pill variant styling
  if (variant === 'pill') {
    const activeClass = isActive ? colorClasses[color].active : ''
    const hoverClass = !isActive ? colorClasses[color].hover : ''
    const inactiveClass = !isActive
      ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      : ''

    return (
      <button
        ref={tabRef}
        role="tab"
        aria-selected={isActive}
        aria-controls={tab.ariaControls}
        aria-disabled={tab.disabled}
        tabIndex={tabIndex}
        onClick={onClick}
        onKeyDown={onKeyDown}
        disabled={tab.disabled}
        className={`
          flex items-center gap-2 ${sizeClass} rounded-lg font-medium transition-all
          ${activeClass} ${hoverClass} ${inactiveClass}
          ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500
          ${tabClassName || ''}
        `.trim()}
      >
        {tab.icon && (
          <span className={`${iconSize} shrink-0`}>
            {tab.icon}
          </span>
        )}
        <span>{tab.label}</span>
        {tab.badge !== undefined && tab.badge !== '' && (
          <span
            className={`
              ${badgeSize} rounded-full font-semibold
              ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}
            `.trim()}
          >
            {tab.badge}
          </span>
        )}
      </button>
    )
  }

  // Underline variant styling
  if (variant === 'underline') {
    const activeClass = isActive
      ? `border-b-2 ${underlineColorClasses[color]} text-${color}-600 dark:text-${color}-400`
      : 'border-b-2 border-transparent'
    const hoverClass = !isActive
      ? 'hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
      : ''

    return (
      <button
        ref={tabRef}
        role="tab"
        aria-selected={isActive}
        aria-controls={tab.ariaControls}
        aria-disabled={tab.disabled}
        tabIndex={tabIndex}
        onClick={onClick}
        onKeyDown={onKeyDown}
        disabled={tab.disabled}
        className={`
          flex items-center gap-2 ${sizeClass} font-medium transition-all
          ${activeClass} ${hoverClass}
          text-gray-600 dark:text-gray-400
          ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500
          ${tabClassName || ''}
        `.trim()}
      >
        {tab.icon && (
          <span className={`${iconSize} shrink-0`}>
            {tab.icon}
          </span>
        )}
        <span>{tab.label}</span>
        {tab.badge !== undefined && tab.badge !== '' && (
          <span
            className={`
              ${badgeSize} rounded-full font-semibold
              ${isActive
                ? `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }
            `.trim()}
          >
            {tab.badge}
          </span>
        )}
      </button>
    )
  }

  // Enclosed variant styling
  const activeClass = isActive
    ? `bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 border-b-white dark:border-b-gray-800 text-${color}-600 dark:text-${color}-400`
    : 'border-transparent border-b-gray-300 dark:border-b-gray-600 text-gray-600 dark:text-gray-400'
  const hoverClass = !isActive
    ? 'hover:text-gray-900 dark:hover:text-white'
    : ''

  return (
    <button
      ref={tabRef}
      role="tab"
      aria-selected={isActive}
      aria-controls={tab.ariaControls}
      aria-disabled={tab.disabled}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={tab.disabled}
      className={`
        flex items-center gap-2 ${sizeClass} font-medium transition-all
        border-t border-l border-r -mb-px
        ${activeClass} ${hoverClass}
        ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500
        first:rounded-tl-lg last:rounded-tr-lg
        ${tabClassName || ''}
      `.trim()}
    >
      {tab.icon && (
        <span className={`${iconSize} shrink-0`}>
          {tab.icon}
        </span>
      )}
      <span>{tab.label}</span>
      {tab.badge !== undefined && tab.badge !== '' && (
        <span
          className={`
            ${badgeSize} rounded-full font-semibold
            ${isActive
              ? `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }
          `.trim()}
        >
          {tab.badge}
        </span>
      )}
    </button>
  )
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'pill',
  size = 'md',
  orientation = 'horizontal',
  fullWidth = false,
  className = '',
  tabClassName,
  ariaLabel,
  id
}: TabsProps<T>) {
  const {
    handleTabClick,
    handleKeyDown,
    tabRefs,
    isActive,
    getTabIndex
  } = useTabs({ tabs, activeTab, onChange, orientation })

  // Container classes based on variant
  const containerClasses = {
    pill: 'flex gap-1 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl',
    underline: 'flex gap-4 border-b border-gray-200 dark:border-gray-700',
    enclosed: 'flex border-b border-gray-300 dark:border-gray-600'
  }

  const orientationClass = orientation === 'vertical' ? 'flex-col' : ''
  const fullWidthClass = fullWidth ? 'w-full' : ''

  return (
    <nav
      id={id}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={`${containerClasses[variant]} ${orientationClass} ${fullWidthClass} ${className}`.trim()}
    >
      {tabs.map((tab, index) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={isActive(tab.id)}
          onClick={() => handleTabClick(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          tabIndex={getTabIndex(tab.id, index)}
          variant={variant}
          size={size}
          tabClassName={tabClassName}
          tabRef={(el) => {
            if (el) {
              tabRefs.current.set(tab.id, el)
            } else {
              tabRefs.current.delete(tab.id)
            }
          }}
        />
      ))}
    </nav>
  )
}
