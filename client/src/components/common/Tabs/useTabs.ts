import { useRef, useState, useCallback, useEffect } from 'react'
import { UseTabsProps, UseTabsReturn } from './TabsTypes'

export function useTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  orientation = 'horizontal'
}: UseTabsProps<T>): UseTabsReturn<T> {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const tabRefs = useRef<Map<T, HTMLButtonElement | null>>(new Map())

  // Update focused index when active tab changes
  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab)
    if (activeIndex !== -1) {
      setFocusedIndex(activeIndex)
    }
  }, [activeTab, tabs])

  const handleTabClick = useCallback((tabId: T) => {
    const tab = tabs.find(t => t.id === tabId)
    if (tab && !tab.disabled) {
      onChange(tabId)
    }
  }, [tabs, onChange])

  const focusTab = useCallback((index: number) => {
    const tab = tabs[index]
    if (tab && !tab.disabled) {
      const element = tabRefs.current.get(tab.id)
      if (element) {
        element.focus()
        setFocusedIndex(index)
      }
    }
  }, [tabs])

  const findNextEnabledIndex = useCallback((startIndex: number, direction: 1 | -1): number => {
    const length = tabs.length
    let index = startIndex
    let attempts = 0
    
    while (attempts < length) {
      index = (index + direction + length) % length
      if (!tabs[index].disabled) {
        return index
      }
      attempts++
    }
    
    return startIndex
  }, [tabs])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
    const isHorizontal = orientation === 'horizontal'
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

    switch (e.key) {
      case nextKey:
        e.preventDefault()
        const nextIndex = findNextEnabledIndex(currentIndex, 1)
        focusTab(nextIndex)
        onChange(tabs[nextIndex].id)
        break

      case prevKey:
        e.preventDefault()
        const prevIndex = findNextEnabledIndex(currentIndex, -1)
        focusTab(prevIndex)
        onChange(tabs[prevIndex].id)
        break

      case 'Home':
        e.preventDefault()
        const firstEnabled = tabs.findIndex(tab => !tab.disabled)
        if (firstEnabled !== -1) {
          focusTab(firstEnabled)
          onChange(tabs[firstEnabled].id)
        }
        break

      case 'End':
        e.preventDefault()
        const lastEnabledIndex = tabs.length - 1 - [...tabs].reverse().findIndex(tab => !tab.disabled)
        if (lastEnabledIndex >= 0 && lastEnabledIndex < tabs.length) {
          focusTab(lastEnabledIndex)
          onChange(tabs[lastEnabledIndex].id)
        }
        break

      case 'Enter':
      case ' ':
        e.preventDefault()
        const tab = tabs[currentIndex]
        if (tab && !tab.disabled) {
          onChange(tab.id)
        }
        break
    }
  }, [orientation, tabs, onChange, focusTab, findNextEnabledIndex])

  const isActive = useCallback((tabId: T) => {
    return activeTab === tabId
  }, [activeTab])

  const getTabIndex = useCallback((tabId: T, index: number) => {
    const tab = tabs[index]
    if (tab.disabled) return -1
    return isActive(tabId) ? 0 : -1
  }, [tabs, isActive])

  return {
    activeTabId: activeTab,
    focusedIndex,
    handleTabClick,
    handleKeyDown,
    tabRefs,
    isActive,
    getTabIndex
  }
}
