import { useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getCurrentUser, selectIsAuthenticated, selectAuthLoading } from './redux/slices/authSlice'
import authService from './services/authService'
import type { AppDispatch } from './redux/store'

// Pages
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import TenantSignupChat from './pages/TenantSignupChat'
import TenantSignupComplete from './pages/TenantSignupComplete'
import Teachers from './pages/Teachers'
import TeacherDetail from './pages/TeacherDetail'
import Duties from './pages/Duties'
import UndertakingForm from './pages/UndertakingForm'
// Students feature removed
import Candidates from './pages/Candidates'
import CandidateDetail from './pages/CandidateDetail'
import Subjects from './pages/Subjects'
import DateSheets from './pages/DateSheets'
import RoomAllocation from './pages/RoomAllocation'
import AnswerSheets from './pages/AnswerSheets'
import CentreGuidelines from './pages/CentreGuidelines'
import Form66 from './pages/Form66'
import SeatingPlan from './pages/SeatingPlan'
import AnswerSheetDetails from './pages/AnswerSheetDetails'
import DropdownExamples from './pages/DropdownExamples'
import DialogShowcase from './pages/DialogShowcase'

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
          <Route
            path="/signup"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <TenantSignupChat />
            }
          />
          <Route
            path="/signup/complete"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <TenantSignupComplete />
            }
          />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="exam-functionaries" element={<Teachers />} />
              <Route path="exam-functionaries/:id" element={<TeacherDetail />} />
              <Route path="duties" element={<Duties />} />
              <Route path="undertaking" element={<UndertakingForm />} />
              {/* Legacy redirects */}
              <Route path="teachers" element={<Navigate to="/exam-functionaries" replace />} />
              <Route path="teachers/:id" element={<Navigate to="/exam-functionaries/:id" replace />} />
              {/* Students feature removed */}
              <Route path="candidates" element={<Candidates />} />
              <Route path="candidates/:id" element={<CandidateDetail />} />
              <Route path="form66" element={<Form66 />} />
              <Route path="seatingplan" element={<SeatingPlan />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="datesheets" element={<DateSheets />} />
              <Route path="examrooms" element={<RoomAllocation />} />
              {/* Legacy redirect */}
              <Route path="rooms" element={<Navigate to="/examrooms" replace />} />
              <Route path="answersheets" element={<AnswerSheets />} />
              <Route path="answersheets/:id" element={<AnswerSheetDetails />} />
              <Route path="centre-guidelines" element={<CentreGuidelines />} />
              <Route path="dropdown-examples" element={<DropdownExamples />} />
              <Route path="dialog-showcase" element={<DialogShowcase />} />
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
                  <Link
                    to="/dashboard"
                    className="btn btn-primary"
                  >
                    Go to Dashboard
                  </Link>
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
