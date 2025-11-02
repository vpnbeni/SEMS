import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getCurrentUser, selectIsAuthenticated, selectAuthLoading } from './redux/slices/authSlice'
import authService from './services/authService'
import type { AppDispatch } from './redux/store'

// Pages
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Teachers from './pages/Teachers'
import TeacherDetail from './pages/TeacherDetail'
import Students from './pages/Students'
import StudentDetail from './pages/StudentDetail'
import Candidates from './pages/Candidates'
import CandidateDetail from './pages/CandidateDetail'
import Subjects from './pages/Subjects'
import DateSheets from './pages/DateSheets'
import RoomAllocation from './pages/RoomAllocation'
import AnswerSheetDispatch from './pages/AnswerSheetDispatch'

// Components
import Layout from './components/layout/Layout'
import ProtectedRoute from './routes/ProtectedRoute'
import Loader from './components/common/Loader'

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const loading = useSelector(selectAuthLoading)

  useEffect(() => {
    // Initialize auth on app startup
    authService.initializeAuth()
    
    // Get current user if token exists
    const token = authService.getToken()
    if (token && !isAuthenticated) {
      dispatch(getCurrentUser())
    }
  }, [dispatch, isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
            } 
          />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="teachers/:id" element={<TeacherDetail />} />
              <Route path="students" element={<Students />} />
              <Route path="students/:id" element={<StudentDetail />} />
              <Route path="candidates" element={<Candidates />} />
              <Route path="candidates/:id" element={<CandidateDetail />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="datesheets" element={<DateSheets />} />
              <Route path="rooms" element={<RoomAllocation />} />
              <Route path="dispatch" element={<AnswerSheetDispatch />} />
            </Route>
          </Route>

          {/* Catch all route */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">Page not found</p>
                  <a 
                    href="/dashboard" 
                    className="btn btn-primary"
                  >
                    Go to Dashboard
                  </a>
                </div>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App