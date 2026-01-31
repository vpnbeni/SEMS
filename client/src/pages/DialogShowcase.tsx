import React from 'react'
import { AllDialogExamples } from '../components/common/Dialog/DialogExamples'

/**
 * DialogShowcase Page
 * 
 * This page demonstrates all Dialog component features and patterns.
 * Access it by adding a route to your router.
 */
const DialogShowcase: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto">
        <header className="py-8 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Dialog Component Showcase
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            A modern, production-grade Dialog component with comprehensive features
          </p>
        </header>
        
        <main>
          <AllDialogExamples />
        </main>
      </div>
    </div>
  )
}

export default DialogShowcase
