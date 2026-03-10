import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ChevronRight, Eye, EyeOff, Globe, Lock, Mail, Shield, BookOpen, Building2 } from 'lucide-react'
import { clearError, login, selectAuth } from '../redux/slices/authSlice'
import authService from '../services/authService'
import { useAcademicSession } from '../contexts/AcademicSessionContext'
import sessionService from '../services/sessionService'
import { getRememberPreference, setRememberPreference } from '../utils/authStorage'
import { resolveTenantSlug } from '../utils/tenantRuntime'
import type { AppDispatch } from '../redux/store'
import type { LoginCredentials } from '../types/auth'
import Loader from '../components/common/Loader'

const syncTenantInUrl = (tenantSlug: string | null) => {
  const url = new URL(window.location.href)

  if (tenantSlug) {
    url.searchParams.set('tenant', tenantSlug)
  } else {
    url.searchParams.delete('tenant')
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

const galleryImages = [
  {
    url: '/assets/images/login/hero1.png',
    title: 'Bharat Edutech',
  },
  {
    url: '/assets/images/login/hero2.png',
    title: 'Board Excellence',
  },
]

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

  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated } = useSelector(selectAuth)
  const { hasSession, setSession } = useAcademicSession()

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
            setTenantLookupError('Enter your School Code to sign in with a username.')
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
    } catch (loginError) {
      const message =
        (loginError as any)?.response?.data?.message
        || (loginError as Error)?.message
        || 'Login failed. Check your credentials and try again.'

      setTenantLookupError(message)
      console.error('Login failed:', loginError)
    } finally {
      setResolvingTenant(false)
    }
  }

  const activeError = tenantLookupError || error

  if (loading) {
    return <Loader />
  }

  return (
    <div className="login-shell min-h-screen w-full flex bg-[#050505] text-white selection:bg-primary-500/30">
      <div className="login-left hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-gray-900 to-black border-r border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 w-full flex flex-col justify-between p-8 xl:p-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">BECMS</span>
          </motion.div>

          <div className="space-y-8 xl:space-y-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="login-hero-title text-[2rem] font-bold leading-tight mb-4">
                The Future of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                  Online Exam Centre Management System
                </span>
              </h1>
              <p className="text-gray-400 text-base xl:text-lg max-w-md">
                Experience BECMS — a minimalistic, powerful, and secure platform designed for Bharat&apos;s modern
                educational ecosystem.
              </p>
            </motion.div>

            <div className="login-gallery grid grid-cols-2 gap-4">
              {galleryImages.map((img, idx) => (
                <motion.div
                  key={img.title}
                  whileHover={{ scale: 1.05, y: -5 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className="login-gallery-card group relative h-56 xl:h-64 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                >
                  <img
                    src={img.url}
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                    <h3 className="font-semibold text-white">{img.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-6 text-sm text-gray-500"
          >
            <div className="flex items-center gap-2"><Shield className="w-4 h-4" /> Secure</div>
            <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Indian Market Optimized</div>
            <div className="flex items-center gap-2"><Globe className="w-4 h-4" /> Localized</div>
          </motion.div>
        </div>
      </div>

      <div className="login-right flex-1 flex flex-col items-center justify-center p-6 xl:p-8 relative overflow-hidden">
        <div className="lg:hidden absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary-500/10 rounded-full blur-[80px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8 xl:mb-10">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="p-3 bg-primary-500 rounded-2xl">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-2">Welcome to BECMS</h2>
            <p className="text-gray-400">Enter your username/email and password to login.</p>
          </div>

          <div className="glass-morphism login-form-card rounded-3xl p-6 xl:p-8 border border-white/10 shadow-2xl relative">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary-500/20 rounded-full blur-3xl" />

            <AnimatePresence mode="wait">
              {activeError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-400 text-sm">
                    <Activity className="w-5 h-5 flex-shrink-0" />
                    <p>{activeError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="space-y-5 xl:space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-300 ml-1 block">Username / Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 transition-colors group-focus-within:text-primary-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
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
                    <label htmlFor="schoolCode" className="text-sm font-medium text-gray-300 ml-1 block">School Code</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 transition-colors group-focus-within:text-primary-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <input
                        id="schoolCode"
                        name="schoolCode"
                        type="text"
                        value={schoolCode}
                        onChange={handleSchoolCodeChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                        placeholder="e.g. ib, springdale"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500 ml-1">Your school or institution code, provided by your administrator.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Forgot Password?</Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 transition-colors group-focus-within:text-primary-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center ml-1">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/50 transition-all"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-400 cursor-pointer">Stay signed in</label>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={resolvingTenant || loading}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/25 transition-all flex items-center justify-center gap-2 group disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Signing In...' : resolvingTenant ? 'Finding User...' : 'Login'}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </form>

            <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <p className="text-sm text-cyan-100">
                New user?{' '}
                <Link to="/signup" className="font-semibold text-cyan-300 hover:text-cyan-200 underline underline-offset-2">
                  Create your account with AI signup.
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center mt-8 xl:mt-10 text-sm text-gray-500">
            © 2026 Bharat Examination Core Management System
          </p>
        </motion.div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .glass-morphism {
          background: rgba(255, 255, 255, 0.03);
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

          .login-hero-title {
            font-size: 2rem;
            line-height: 1.02;
          }

          .login-gallery-card {
            height: 13.5rem;
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
