import React from 'react'
import { Link } from 'react-router-dom'

const Dashboard: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card group hover:shadow-elegant transition-all duration-300 transform hover:-translate-y-1">
          <div className="card-content">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Total Students</p>
                <p className="text-3xl font-bold text-secondary-900 dark:text-white">1,250</p>
                <p className="text-xs text-success-600 dark:text-success-400 mt-1">↗ +12% from last month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-elegant transition-all duration-300 transform hover:-translate-y-1">
          <div className="card-content">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-success-100 to-success-200 dark:from-success-900 dark:to-success-800 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Total Teachers</p>
                <p className="text-3xl font-bold text-secondary-900 dark:text-white">85</p>
                <p className="text-xs text-success-600 dark:text-success-400 mt-1">↗ +3 new this month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-elegant transition-all duration-300 transform hover:-translate-y-1">
          <div className="card-content">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Total Subjects</p>
                <p className="text-3xl font-bold text-secondary-900 dark:text-white">24</p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">All departments</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-elegant transition-all duration-300 transform hover:-translate-y-1">
          <div className="card-content">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-900 dark:to-warning-800 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Upcoming Exams</p>
                <p className="text-3xl font-bold text-secondary-900 dark:text-white">7</p>
                <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">Next: March 15, 2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Card */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="card-title">Recent Activity</h2>
              <span className="badge badge-secondary">Live</span>
            </div>
            <p className="card-description">Latest system activities and updates</p>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {/* Activity items */}
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800/50 border-l-4 border-primary-500">
                <div className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">
                    New teacher registration
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    John Smith joined Mathematics Department • 2 hours ago
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800/50 border-l-4 border-success-500">
                <div className="flex-shrink-0 w-2 h-2 bg-success-500 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">
                    Date sheet published
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    Final exam schedule for Grade 12 • 4 hours ago
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800/50 border-l-4 border-warning-500">
                <div className="flex-shrink-0 w-2 h-2 bg-warning-500 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">
                    Room allocation updated
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    Physics exam moved to Hall A • 6 hours ago
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button className="btn btn-outline w-full" onClick={() => console.log('View All Activities - Feature coming soon')}>
                View All Activities
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
            <p className="card-description">Frequently used management tools</p>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 gap-3">
              <Link
                to="/exam-functionaries"
                className="group flex items-center p-4 rounded-xl border-2 border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-800 transition-colors">
                  <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300">
                    Manage Exam Functionaries
                  </h3>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    Add, edit, and view teacher profiles
                  </p>
                </div>
                <svg className="w-5 h-5 text-secondary-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Students quick action removed */}

              <Link
                to="/datesheets"
                className="group flex items-center p-4 rounded-xl border-2 border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-warning-100 dark:bg-warning-900 rounded-lg flex items-center justify-center group-hover:bg-warning-200 dark:group-hover:bg-warning-800 transition-colors">
                  <svg className="w-5 h-5 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300">
                    Create Date Sheet
                  </h3>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    Schedule and publish exam dates
                  </p>
                </div>
                <svg className="w-5 h-5 text-secondary-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                to="/rooms"
                className="group flex items-center p-4 rounded-xl border-2 border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300">
                    Room Allocation
                  </h3>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    Assign rooms for examinations
                  </p>
                </div>
                <svg className="w-5 h-5 text-secondary-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard