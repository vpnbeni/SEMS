import React, { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import BillingBanner from './BillingBanner'

const SIDEBAR_EXPANDED_DEFAULT = 272
const SIDEBAR_EXPANDED_MIN = 220
const SIDEBAR_EXPANDED_MAX = 420
const SIDEBAR_COLLAPSED_WIDTH = 80
const SIDEBAR_WIDTH_STORAGE_KEY = 'layout:sidebarWidth'

const Layout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_EXPANDED_DEFAULT)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const resizeRafRef = useRef<number | null>(null)

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY) || SIDEBAR_EXPANDED_DEFAULT)
    if (Number.isFinite(stored)) {
      const bounded = Math.max(SIDEBAR_EXPANDED_MIN, Math.min(SIDEBAR_EXPANDED_MAX, stored))
      setSidebarWidth(bounded)
    }
  }, [])

  useEffect(() => {
    if (isSidebarCollapsed) return
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth))
  }, [sidebarWidth, isSidebarCollapsed])

  const handleResizeStart = () => {
    if (isSidebarCollapsed) return
    setIsResizingSidebar(true)
  }

  useEffect(() => {
    if (!isResizingSidebar) return

    const handleMouseMove = (event: MouseEvent) => {
      if (resizeRafRef.current !== null) window.cancelAnimationFrame(resizeRafRef.current)
      resizeRafRef.current = window.requestAnimationFrame(() => {
        const nextWidth = Math.max(SIDEBAR_EXPANDED_MIN, Math.min(SIDEBAR_EXPANDED_MAX, event.clientX))
        setSidebarWidth(nextWidth)
      })
    }

    const handleMouseUp = () => {
      setIsResizingSidebar(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current)
        resizeRafRef.current = null
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingSidebar])

  const currentSidebarWidth = isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth

  return (
    <div className="relative flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        expandedWidth={sidebarWidth}
        collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
      />

      {/* Resize handle sits on the sidebar's right border */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        onMouseDown={handleResizeStart}
        style={{ left: currentSidebarWidth }}
        className={`group absolute inset-y-0 z-50 w-3 -translate-x-1/2 cursor-col-resize ${
          isSidebarCollapsed ? 'pointer-events-none' : ''
        }`}
      >
        <div
          className={`absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-blue-500/80 transition-opacity ${
            isResizingSidebar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        />
        <BillingBanner />

        {/* Page Content */}
        <main
          id="app-main-scroll"
          className="flex-1 overflow-x-hidden overflow-y-auto animate-page-enter"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
