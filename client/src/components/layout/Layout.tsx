import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import BillingBanner from './BillingBanner'

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-primary-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        <BillingBanner />

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto animate-page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
