import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Building2,
  ChevronRight,
  Cloud,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Shield,
  Sparkles,
} from 'lucide-react'
import { clearError, login, selectAuth } from '../redux/slices/authSlice'
import authService from '../services/authService'
import { useAcademicSession } from '../contexts/AcademicSessionContext'
import sessionService from '../services/sessionService'
import { getRememberPreference, setRememberPreference } from '../utils/authStorage'
import { resolveTenantSlug } from '../utils/tenantRuntime'
import type { AppDispatch } from '../redux/store'
import type { LoginCredentials } from '../types/auth'
import Loader from '../components/common/Loader'

interface ResolvedTenant {
  slug: string
  name: string
}

const showcaseCards = [
  {
    url: '/assets/images/login/hero1.png',
    title: 'Exam command center',
    desc: 'Track rooms, schedules, and centre readiness from one operational surface.',
  },
  {
    url: '/assets/images/login/hero2.png',
    title: 'Board workflow clarity',
    desc: 'Datesheets, staffing, and answer-sheet flows stay aligned across the institution.',
  },
]

const trustSignals = [
  { icon: Shield, label: 'Secure tenant access' },
  { icon: Activity, label: 'Built for daily operations' },
  { icon: Globe, label: 'Cloud-ready deployment' },
]

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
  const [resolvedTenant, setResolvedTenant] = useState<ResolvedTenant | null>(null)
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
        setResolvedTenant(tenant)
      } else {
        setResolvedTenant(null)
        const tenantSlug = resolveTenantSlug()
        if (!tenantSlug) {
          setTenantLookupError('Use your full work email here, or open your tenant login URL to sign in with a username.')
          return
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
    <div className="min-h-screen overflow-hidden bg-[#07111f] text-white selection:bg-sky-300/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(79,172,254,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.14),_transparent_28%)]" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative border-b border-white/10 px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:border-white/10 lg:px-14 lg:py-12">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-emerald-300 text-slate-950 shadow-[0_16px_50px_rgba(56,189,248,0.35)]">
                  <Cloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-sky-100/70">capabble.cloud</p>
                  <p className="text-lg font-semibold tracking-tight text-white">Capabble</p>
                </div>
              </div>
              <Link
                to="/signup"
                className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-300/40 hover:bg-white/10 lg:inline-flex"
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <div className="flex flex-1 flex-col justify-center py-10 lg:py-14">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 }}
                className="max-w-2xl"
              >
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-cyan-100/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  cleaner exam operations
                </div>

                <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-[64px]">
                  Run the full exam centre workflow from one calm surface.
                </h1>

                <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                  Capabble brings datesheets, duty allocation, room planning, attendance, and answer-sheet control into one
                  cloud workspace for institutions that need operational clarity.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="mt-10 grid gap-4 sm:grid-cols-3"
              >
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <p className="text-3xl font-semibold text-white">1 workspace</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">For datesheets, rooms, duties, attendance, and answer sheets.</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <p className="text-3xl font-semibold text-white">Auto tenant</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Enter your email and Capabble routes you to the right institution.</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <p className="text-3xl font-semibold text-white">Cloud first</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Built for modern institutional rollout without scattered tools.</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-10 hidden lg:block"
              >
                <div className="relative h-[420px] overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,30,0.92),rgba(16,32,51,0.78))] p-5 shadow-[0_32px_100px_rgba(3,7,18,0.55)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_34%)]" />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.38 }}
                    className="absolute left-5 top-5 w-[58%] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70"
                  >
                    <img src={showcaseCards[0].url} alt={showcaseCards[0].title} className="h-[290px] w-full object-cover" />
                    <div className="space-y-2 p-4">
                      <p className="text-sm font-semibold text-white">{showcaseCards[0].title}</p>
                      <p className="text-sm leading-6 text-slate-300">{showcaseCards[0].desc}</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 24, rotate: 3 }}
                    animate={{ opacity: 1, y: 0, rotate: 6 }}
                    transition={{ delay: 0.48 }}
                    className="absolute right-8 top-16 w-[36%] overflow-hidden rounded-[26px] border border-cyan-300/20 bg-slate-950/80 shadow-[0_20px_70px_rgba(14,165,233,0.18)]"
                  >
                    <img src={showcaseCards[1].url} alt={showcaseCards[1].title} className="h-[210px] w-full object-cover" />
                    <div className="space-y-2 p-4">
                      <p className="text-sm font-semibold text-white">{showcaseCards[1].title}</p>
                      <p className="text-xs leading-5 text-slate-300">{showcaseCards[1].desc}</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.58 }}
                    className="absolute bottom-6 right-8 max-w-[260px] rounded-[24px] border border-emerald-300/20 bg-emerald-300/10 p-4 backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                        <Building2 className="h-5 w-5 text-emerald-100" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-50">Institution-aware login</p>
                        <p className="text-xs text-emerald-100/70">Email-first routing for multi-tenant access.</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                {trustSignals.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"
                  >
                    <Icon className="h-4 w-4 text-cyan-200" />
                    {label}
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center bg-[linear-gradient(180deg,rgba(10,20,32,0.96),rgba(14,34,46,0.94))] px-6 py-8 sm:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.1),_transparent_32%)]" />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-[440px]"
          >
            <div className="mb-8 text-center lg:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-300">
                <Cloud className="h-3.5 w-3.5 text-sky-200" />
                Capabble access
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-[38px]">Log in to capabble.cloud</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                Use your email to detect your institution automatically, or sign in with a username from your tenant-specific login URL.
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-[#0a1320]/80 p-6 shadow-[0_28px_90px_rgba(2,8,23,0.6)] backdrop-blur-2xl sm:p-8">
              <AnimatePresence mode="wait">
                {activeError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-5 overflow-hidden"
                  >
                    <div className="flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                      <Activity className="mt-0.5 h-5 w-5 flex-shrink-0" />
                      <p>{activeError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                    Username or email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="email"
                      name="email"
                      type="text"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="name@institution.edu"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300/40 focus:bg-white/10 focus:ring-4 focus:ring-sky-300/10"
                    />
                  </div>
                </div>

                {resolvedTenant && (
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-50">
                    Institution detected: <span className="font-semibold">{resolvedTenant.name}</span> ({resolvedTenant.slug})
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                      Password
                    </label>
                    <span className="text-xs text-slate-400">Tenant resolves after email entry</span>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300/40 focus:bg-white/10 focus:ring-4 focus:ring-sky-300/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-sky-400 focus:ring-sky-300/30"
                  />
                  Keep me signed in on this device
                </label>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={resolvingTenant || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-300 px-5 py-3.5 text-base font-semibold text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Signing in...' : resolvingTenant ? 'Locating institution...' : 'Log in'}
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              </form>

              <div className="mt-5 grid gap-3">
                <Link
                  to="/signup"
                  className="flex items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-300/10 px-5 py-3 text-sm font-medium text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-300/15"
                >
                  Create an institution account
                </Link>
                <p className="text-center text-xs leading-6 text-slate-400">
                  Need username-only login? Open your tenant-specific URL and sign in there.
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs tracking-[0.18em] text-slate-500 lg:text-left">
              Copyright 2026 Capabble Cloud
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  )
}

export default Login
