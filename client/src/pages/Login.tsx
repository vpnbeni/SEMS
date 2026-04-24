import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ChevronRight, Eye, EyeOff, Lock, Mail, Building2, ShieldCheck, RefreshCw } from 'lucide-react'
import { clearError, login, selectAuth, setCredentials } from '../redux/slices/authSlice'
import authService from '../services/authService'
import { useAcademicSession } from '../contexts/AcademicSessionContext'
import sessionService from '../services/sessionService'
import { getRememberPreference, persistAuthData, setRememberPreference } from '../utils/authStorage'
import { resolveTenantSlug } from '../utils/tenantRuntime'
import { getPublicAppOrigin, getUniversalAuthCopy } from '../utils/publicBranding'
import type { AppDispatch } from '../redux/store'
import type { LoginCredentials } from '../types/auth'
import Loader from '../components/common/Loader'
import loginImage from '../assets/login.png'
import UniversalAuthBrand from '../components/auth/UniversalAuthBrand'

const syncTenantInUrl = (tenantSlug: string | null) => {
  const url = new URL(window.location.href)

  if (tenantSlug) {
    url.searchParams.set('tenant', tenantSlug)
  } else {
    url.searchParams.delete('tenant')
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [resolvingTenant, setResolvingTenant] = useState(false)
  const [rememberMe, setRememberMe] = useState<boolean>(getRememberPreference())
  const [tenantLookupError, setTenantLookupError] = useState<string | null>(null)
  const [schoolCode, setSchoolCode] = useState('')
  const [showSchoolCode, setShowSchoolCode] = useState(false)
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  })

  // Email verification flow
  const [verifyEmailStep, setVerifyEmailStep] = useState(false)
  const [verifyOtp, setVerifyOtp] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [verifySuccessMessage, setVerifySuccessMessage] = useState<string | null>(null)

  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated } = useSelector(selectAuth)
  const { hasSession, setSession } = useAcademicSession()
  const authCopy = getUniversalAuthCopy()
  const appOrigin = getPublicAppOrigin()

  useEffect(() => {
    if (isAuthenticated && !resolvingTenant) {
      navigate(hasSession ? '/dashboard' : '/select-session')
    }
  }, [hasSession, isAuthenticated, navigate, resolvingTenant])

  useEffect(() => {
    return () => {
      dispatch(clearError())
    }
  }, [dispatch])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setTenantLookupError(null)
    dispatch(clearError())
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSchoolCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSchoolCode(e.target.value)
    setTenantLookupError(null)
    dispatch(clearError())
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const identifier = String(formData.email || '').trim().toLowerCase()
    const password = String(formData.password || '')

    if (!identifier || !password || resolvingTenant || loading) {
      return
    }

    try {
      setTenantLookupError(null)
      dispatch(clearError())
      setResolvingTenant(true)

      if (identifier.includes('@')) {
        const tenant = await authService.resolveTenantByEmail(identifier)
        localStorage.setItem('tenantSlug', tenant.slug)
        syncTenantInUrl(tenant.slug)
      } else {
        // Username login: resolve tenant from localStorage/JWT, or from the school code field.
        const tenantSlug = resolveTenantSlug()
        if (!tenantSlug) {
          const code = schoolCode.trim().toLowerCase()
          if (!code) {
            setShowSchoolCode(true)
            setTenantLookupError('Enter your Workspace Code to sign in with a username.')
            return
          }
          localStorage.setItem('tenantSlug', code)
          syncTenantInUrl(code)
        }
      }

      setRememberPreference(rememberMe)
      await dispatch(login({ email: identifier, password })).unwrap()

      try {
        const available = await sessionService.getAvailableSessions()
        const fallbackCurrent = available?.data?.find((session) => session.isCurrent)?.label || null
        const currentLabel = available?.meta?.currentLabel || fallbackCurrent

        if (currentLabel) {
          await sessionService.createSession(currentLabel)
          setSession(currentLabel)
          navigate('/dashboard', { replace: true })
          return
        }
      } catch (sessionError) {
        console.warn('Unable to auto-select current academic session:', sessionError)
      }

      navigate('/select-session', { replace: true })
    } catch (loginError: any) {
      const errorCode = loginError?.response?.data?.errorCode
      const message =
        loginError?.response?.data?.message
        || (loginError as Error)?.message
        || 'Login failed. Check your credentials and try again.'

      if (errorCode === 'email_not_verified') {
        setVerifyEmailStep(true)
        setVerifyError(null)
        setVerifySuccessMessage('A verification code has been sent to your email. Enter it below to continue.')
      } else {
        setTenantLookupError(message)
      }
      console.error('Login failed:', loginError)
    } finally {
      setResolvingTenant(false)
    }
  }

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = String(formData.email || '').trim().toLowerCase()
    const normalizedOtp = verifyOtp.trim()

    if (!email || !/^\d{6}$/.test(normalizedOtp) || verifyLoading) return

    setVerifyLoading(true)
    setVerifyError(null)
    setVerifySuccessMessage(null)

    try {
      const response = await authService.verifyEmail(email, normalizedOtp)
      const data = response.data as any
      const userWithBilling = {
        ...data.user,
        ...(data.billing ? { billing: data.billing } : {}),
      }
      persistAuthData({ token: data.token, refreshToken: data.refreshToken, user: userWithBilling, remember: rememberMe })
      dispatch(setCredentials({ user: userWithBilling, token: data.token }))

      try {
        const available = await sessionService.getAvailableSessions()
        const fallbackCurrent = available?.data?.find((s: any) => s.isCurrent)?.label || null
        const currentLabel = available?.meta?.currentLabel || fallbackCurrent
        if (currentLabel) {
          await sessionService.createSession(currentLabel)
          setSession(currentLabel)
          navigate('/dashboard', { replace: true })
          return
        }
      } catch {
        // ignore session error
      }
      navigate('/select-session', { replace: true })
    } catch (err: any) {
      const code = err?.response?.data?.errorCode
      const msg = err?.response?.data?.message || 'Verification failed. Please try again.'
      if (code === 'otp_attempts_exceeded' || code === 'otp_expired' || code === 'otp_not_requested') {
        setVerifyError(msg + ' Try logging in again to get a new code.')
      } else {
        setVerifyError(msg)
      }
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleResendVerification = async () => {
    const email = String(formData.email || '').trim().toLowerCase()
    if (!email || resendLoading) return

    setResendLoading(true)
    setVerifyError(null)
    setVerifySuccessMessage(null)

    try {
      await authService.resendEmailVerificationOtp(email)
      setVerifyOtp('')
      setVerifySuccessMessage('A new verification code has been sent to your email.')
    } catch (err: any) {
      setVerifyError(err?.response?.data?.message || 'Could not resend code. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const activeError = tenantLookupError || error

  if (loading) {
    return <Loader />
  }

  return (
    <div className="login-shell min-h-screen w-full flex bg-white text-slate-900 selection:bg-primary-500/20">
      <div className="login-left relative hidden overflow-hidden border-r border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 lg:flex lg:w-1/2">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-sky-400/10 blur-[120px]" />
        </div>

        <div className="relative z-10 flex h-full w-full flex-col gap-8 p-8 xl:p-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start gap-3"
          >
            <a
              href={appOrigin}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-90"
            >
              <UniversalAuthBrand subtitle="One account across modules" />
            </a>
            <div>
              <p className="text-2xl font-bold tracking-[0.08em] text-primary-900">Universal module access</p>
            </div>
          </motion.div>

          <div className="flex flex-1 items-center justify-center">
            <motion.img
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              src={loginImage}
              alt="Login illustration"
              className="login-side-image w-full max-w-2xl object-contain"
            />
          </div>
        </div>
      </div>

      <div className="login-right relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-white p-6 xl:p-8">
        <div className="absolute left-0 top-0 -z-10 h-full w-full lg:hidden">
          <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-primary-500/10 blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-secondary-500/10 blur-[80px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center xl:mb-10">
            <div className="mb-6 flex justify-center lg:hidden">
              <a
                href={appOrigin}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-90"
              >
                <UniversalAuthBrand compact subtitle="One account across modules" />
              </a>
            </div>
            <h2 className="mb-2 text-3xl font-bold text-slate-900">Welcome to Capabble</h2>
            <p className="text-slate-500">{authCopy.loginDescription}</p>
          </div>

          <div className="glass-morphism login-form-card relative rounded-3xl border border-slate-200 p-6 shadow-2xl shadow-slate-200/80 xl:p-8">
            <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-primary-500/20 blur-3xl" />

            {verifyEmailStep ? (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-2 text-center">
                  <ShieldCheck className="h-10 w-10 text-primary-500" />
                  <h3 className="text-xl font-bold text-slate-900">Verify Your Email</h3>
                  <p className="text-sm text-slate-500">
                    Enter the 6-digit code sent to <span className="font-medium text-slate-700">{formData.email}</span>
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {verifySuccessMessage && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        <Activity className="h-5 w-5 flex-shrink-0" />
                        <p>{verifySuccessMessage}</p>
                      </div>
                    </motion.div>
                  )}
                  {verifyError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                        <Activity className="h-5 w-5 flex-shrink-0" />
                        <p>{verifyError}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <input
                    type="text"
                    value={verifyOtp}
                    onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    pattern="\d{6}"
                    placeholder="Enter 6-digit code"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-lg tracking-[0.25em] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                    autoComplete="one-time-code"
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={verifyLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {verifyLoading ? 'Verifying...' : 'Verify and Sign In'}
                    <ChevronRight className="h-5 w-5" />
                  </motion.button>
                </form>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {resendLoading ? 'Sending...' : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVerifyEmailStep(false); setVerifyOtp(''); setVerifyError(null); setVerifySuccessMessage(null); }}
                    className="text-center text-sm text-slate-500 hover:text-slate-700"
                  >
                    Back to login
                  </button>
                </div>
              </div>
            ) : (
              <>
            <AnimatePresence mode="wait">
              {activeError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                    <Activity className="h-5 w-5 flex-shrink-0" />
                    <p>{activeError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="space-y-5 xl:space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="ml-1 block text-sm font-medium text-slate-700">Username / Email</label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-primary-500">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                    placeholder="username or name@institution.com"
                  />
                </div>
              </div>

              <AnimatePresence>
                {showSchoolCode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label htmlFor="schoolCode" className="ml-1 block text-sm font-medium text-slate-700">Workspace Code</label>
                    <div className="group relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-primary-500">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <input
                        id="schoolCode"
                        name="schoolCode"
                        type="text"
                        value={schoolCode}
                        onChange={handleSchoolCodeChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                        placeholder="e.g. ib, springdale"
                        autoFocus
                      />
                    </div>
                    <p className="ml-1 text-xs text-slate-500">Your workspace or institution code, provided by your administrator.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <div className="ml-1 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary-600 transition-colors hover:text-primary-500">Forgot Password?</Link>
                </div>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-primary-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="ml-1 flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 bg-white text-primary-500 transition-all focus:ring-primary-500/30"
                />
                <label htmlFor="remember" className="ml-2 cursor-pointer text-sm text-slate-600">Stay signed in</label>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={resolvingTenant || loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading || resolvingTenant ? 'Logging in...' : 'Login'}
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </form>

            <div className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-sm text-cyan-900">
                New user?{' '}
                <Link to="/signup" className="font-semibold text-cyan-700 underline underline-offset-2 hover:text-cyan-600">
                  Create one account for all enabled modules.
                </Link>
              </p>
            </div>
              </>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500 xl:mt-10">
            Copyright 2026 Capabble
          </p>
        </motion.div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .glass-morphism {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        @media (max-width: 1366px) and (min-width: 1024px), (max-height: 900px) and (min-width: 1024px) {
          .login-shell {
            overflow: hidden;
          }

          .login-left,
          .login-right {
            min-height: 100vh;
          }

          .login-side-image {
            max-height: calc(100vh - 15rem);
          }

          .login-form-card {
            padding: 1.5rem;
          }
        }
      `,
        }}
      />
    </div>
  )
}

export default Login
