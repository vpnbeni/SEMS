import { useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getCurrentUser, selectIsAuthenticated, selectAuthLoading, selectUser } from './redux/slices/authSlice'
import { useAcademicSession } from './contexts/AcademicSessionContext'
import authService from './services/authService'
import type { AppDispatch } from './redux/store'

// Pages
import Dashboard from './pages/Dashboard'
import CentreDetails from './pages/CentreDetails'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import TenantSignupChat from './pages/TenantSignupChat'
import TenantSignupComplete from './pages/TenantSignupComplete'
import Signup from './pages/Signup'
import CntrLanding from './pages/CntrLanding'
import TmtblLanding from './pages/TmtblLanding'
import StdntLanding from './pages/StdntLanding'
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
import CBSECirculars from './pages/CBSECirculars'
import CBSEPortals from './pages/CBSEPortals'
import SchoolHub from './pages/SchoolHub'
import Staff from './pages/Staff'
import Activities from './pages/Activities'
import BellTimings from './pages/timetable/BellTimings'
import TimetableTeachers from './pages/timetable/TimetableTeachers'
import TimetableClasses from './pages/timetable/TimetableClasses'
import TimetableSubjects from './pages/timetable/TimetableSubjects'
import ClassWise from './pages/timetable/ClassWise'
import TeacherWise from './pages/timetable/TeacherWise'
import PeriodAllocation from './pages/timetable/PeriodAllocation'
import Departments from './pages/timetable/Departments'
import Substitution from './pages/timetable/Substitution'
import Versions from './pages/timetable/Versions'
import Generate from './pages/timetable/Generate'
import { TimetableProvider } from './contexts/TimetableContext'
import Form66 from './pages/Form66'
import SeatingPlan from './pages/SeatingPlan'
import AnswerSheetDetails from './pages/AnswerSheetDetails'
import Attendance from './pages/Attendance'
import PwdInfo from './pages/PwdInfo'
import Umcs from './pages/Umcs'
import Stickers from './pages/Stickers'
import Performas from './pages/Performas'
import DispatchSlip from './pages/DispatchSlip'
import Remuneration from './pages/Remuneration'
import RemunerationDetails from './pages/RemunerationDetails'
import DropdownExamples from './pages/DropdownExamples'
import DialogShowcase from './pages/DialogShowcase'
import Billing from './pages/Billing'
import AccountSettings from './pages/AccountSettings'
import HelpSupport from './pages/HelpSupport'
import SessionSelector from './pages/SessionSelector'
import Pricing from './pages/Pricing'
import { OnboardingPage, ValidationReportPage } from './pages/Onboarding'
import { getPublicBrandVariant } from './utils/publicBranding'

// Components
import Layout from './components/layout/Layout'
import ProtectedRoute from './routes/ProtectedRoute'
import Loader from './components/common/Loader'

const LegacyCandidatesRedirect = () => {
  const location = useLocation()
  const nextPath = location.pathname.replace(/^\/candidates/, '/candidate-details')
  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />
}

const PublicLanding = () => {
  const variant = getPublicBrandVariant()

  if (variant === 'tmtbl') return <TmtblLanding />
  if (variant === 'stdnt') return <StdntLanding />
  return <CntrLanding />
}

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const loading = useSelector(selectAuthLoading)
  const user = useSelector(selectUser)
  const { hasSession } = useAcademicSession()

  const timetableFeatureEnabled = user?.featureToggles?.timetable_classes !== false

  useEffect(() => {
    // Initialize auth on app startup
    authService.initializeAuth()

    // Refresh current user (and feature toggles) once on mount when token exists.
    const token = authService.getToken()
    if (token) {
      dispatch(getCurrentUser())
    }
  }, [dispatch])

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
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                hasSession ? <Navigate to="/dashboard" replace /> : <Navigate to="/select-session" replace />
              ) : (
                <PublicLanding />
              )
            }
          />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                hasSession ? <Navigate to="/dashboard" replace /> : <Navigate to="/select-session" replace />
              ) : (
                <Login />
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              isAuthenticated ? (
                hasSession ? <Navigate to="/dashboard" replace /> : <Navigate to="/select-session" replace />
              ) : (
                <ForgotPassword />
              )
            }
          />
          <Route
            path="/signup"
            element={
              isAuthenticated ? (
                hasSession ? <Navigate to="/dashboard" replace /> : <Navigate to="/select-session" replace />
              ) : (
                <Signup />
              )
            }
          />
          <Route
            path="/signupold"
            element={
              isAuthenticated ? (
                hasSession ? <Navigate to="/dashboard" replace /> : <Navigate to="/select-session" replace />
              ) : (
                <TenantSignupChat />
              )
            }
          />
          <Route
            path="/signup/complete"
            element={
              isAuthenticated ? (
                hasSession ? <Navigate to="/dashboard" replace /> : <Navigate to="/select-session" replace />
              ) : (
                <TenantSignupComplete />
              )
            }
          />

          {/* Session Selection (authenticated but no session yet) */}
          <Route
            path="/select-session"
            element={
              !isAuthenticated ? (
                <Navigate to="/" replace />
              ) : hasSession ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <SessionSelector />
              )
            }
          />

          {/* Onboarding (authenticated, has session, but needs onboarding) */}
          <Route
            path="/onboarding"
            element={
              !isAuthenticated ? (
                <Navigate to="/" replace />
              ) : !hasSession ? (
                <Navigate to="/select-session" replace />
              ) : (
                <OnboardingPage />
              )
            }
          />
          <Route
            path="/onboarding/validation"
            element={
              !isAuthenticated ? (
                <Navigate to="/" replace />
              ) : !hasSession ? (
                <Navigate to="/select-session" replace />
              ) : (
                <ValidationReportPage />
              )
            }
          />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                timetableFeatureEnabled ? (
                  <TimetableProvider>
                    <Layout />
                  </TimetableProvider>
                ) : (
                  <Layout />
                )
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="school-hub" element={<SchoolHub />} />
              <Route path="staff" element={<Staff />} />
              <Route path="activities" element={<Activities />} />
              <Route path="time-table/teachers" element={<TimetableTeachers />} />
              <Route path="time-table/classes" element={<TimetableClasses />} />
              <Route path="time-table/subjects" element={<TimetableSubjects />} />
              <Route path="time-table/departments" element={<Departments />} />
              <Route path="time-table/bell-timings" element={<BellTimings />} />
              <Route path="time-table/generate" element={<Generate />} />
              <Route path="time-table/class-wise" element={<ClassWise />} />
              <Route path="time-table/teacher-wise" element={<TeacherWise />} />
              <Route path="time-table/substitution" element={<Substitution />} />
              <Route path="time-table/versions" element={<Versions />} />
              <Route path="time-table/period-distribution" element={<PeriodAllocation />} />
              <Route path="time-table/distribution" element={<Navigate to="/time-table/period-distribution" replace />} />
              <Route path="time-table/period-allocation" element={<Navigate to="/time-table/period-distribution" replace />} />
              <Route path="time-table" element={<Navigate to="/time-table/classes" replace />} />
              <Route path="stdnt/classes" element={<TimetableClasses />} />
              <Route path="stdnt/subjects" element={<TimetableSubjects />} />
              <Route path="stdnt" element={<Navigate to="/stdnt/classes" replace />} />
              <Route path="centre-details" element={<CentreDetails />} />
              <Route
                path="exam-functionaries"
                element={<Teachers hidePagination includeAllRecords uiOnlyDelete />}
              />
              <Route path="exam-functionaries/:id" element={<TeacherDetail />} />
              <Route path="duties" element={<Duties />} />
              <Route path="undertaking" element={<UndertakingForm />} />
              {/* Legacy redirects */}
              <Route path="teachers" element={<Navigate to="/exam-functionaries" replace />} />
              <Route path="teachers/:id" element={<Navigate to="/exam-functionaries/:id" replace />} />
              {/* Students feature removed */}
              <Route path="candidate-details" element={<Candidates />} />
              <Route path="candidate-details/:id" element={<CandidateDetail />} />
              <Route path="candidates/*" element={<LegacyCandidatesRedirect />} />
              <Route path="dispatch-slip" element={<DispatchSlip />} />
              <Route path="remuneration" element={<Remuneration />} />
              <Route path="remuneration/:id" element={<RemunerationDetails />} />
              <Route path="form66" element={<Form66 />} />
              <Route path="seatingplan" element={<SeatingPlan />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="datesheets" element={<DateSheets />} />
              <Route path="examrooms" element={<RoomAllocation />} />
              {/* Legacy redirect */}
              <Route path="rooms" element={<Navigate to="/examrooms" replace />} />
              <Route path="answersheets" element={<AnswerSheets />} />
              <Route path="answersheets/:id" element={<AnswerSheetDetails />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="pwd-info" element={<PwdInfo />} />
              <Route path="umcs" element={<Umcs />} />
              <Route path="stickers" element={<Stickers />} />
              <Route path="performas" element={<Performas />} />
              <Route path="centre-guidelines" element={<CentreGuidelines />} />
              <Route path="cbse-circulars" element={<CBSECirculars />} />
              <Route path="cbse-portals" element={<CBSEPortals />} />
              <Route path="billing" element={<Billing />} />
              <Route path="account-settings" element={<AccountSettings />} />
              <Route path="help-support" element={<HelpSupport />} />
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
                    to="/"
                    className="btn btn-primary"
                  >
                    Back to Home
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
