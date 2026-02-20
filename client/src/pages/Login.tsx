import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { login, clearError } from '../redux/slices/authSlice'
import { selectAuth } from '../redux/slices/authSlice'
import authService from '../services/authService'
import type { AppDispatch } from '../redux/store'
import type { LoginCredentials } from '../types/auth'
import Loader from '../components/common/Loader'
import { Lock, Mail, Eye, EyeOff, BookOpen, ChevronRight, Activity, Globe, Shield } from 'lucide-react'

type LoginStep = 'email' | 'password'

interface ResolvedTenant {
  slug: string
  name: string
}

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
  const [step, setStep] = useState<LoginStep>('email')
  const [resolvingTenant, setResolvingTenant] = useState(false)
  const [tenantLookupError, setTenantLookupError] = useState<string | null>(null)
  const [resolvedTenant, setResolvedTenant] = useState<ResolvedTenant | null>(null)
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  })

  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated } = useSelector(selectAuth)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError())
    }
  }, [dispatch])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setTenantLookupError(null)
    dispatch(clearError())
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTenantResolution = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || resolvingTenant) {
      return
    }

    try {
      setResolvingTenant(true)
      setTenantLookupError(null)
      dispatch(clearError())

      const tenant = await authService.resolveTenantByEmail(formData.email)
      localStorage.setItem('tenantSlug', tenant.slug)
      syncTenantInUrl(tenant.slug)
      setResolvedTenant(tenant)
      setFormData(prev => ({ ...prev, password: '' }))
      setShowPassword(false)
      setStep('password')
    } catch (error) {
      const message = (error as any)?.response?.data?.message || 'Unable to find user for this email'
      localStorage.removeItem('tenantSlug')
      syncTenantInUrl(null)
      setResolvedTenant(null)
      setStep('email')
      setTenantLookupError(message)
    } finally {
      setResolvingTenant(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password || !resolvedTenant) {
      return
    }

    try {
      await dispatch(login(formData)).unwrap()
      navigate('/dashboard')
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleUseAnotherEmail = () => {
    setStep('email')
    setResolvedTenant(null)
    setShowPassword(false)
    setTenantLookupError(null)
    setFormData(prev => ({ ...prev, password: '' }))
    localStorage.removeItem('tenantSlug')
    syncTenantInUrl(null)
    dispatch(clearError())
  }

  const isPasswordStep = step === 'password'
  const activeError = tenantLookupError || error

  const galleryImages = [
    {
      url: '/assets/images/login/hero1.png',
      title: 'Bharat Edutech',
      desc: 'Smart examination core for Indian institutions.'
    },
    {
      url: '/assets/images/login/hero2.png',
      title: 'Board Excellence',
      desc: 'Digitizing the future of academic evaluation.'
    }
  ]

  if (loading) {
    return <Loader />
  }

  return (
    <div className="min-h-screen w-full flex bg-[#050505] text-white selection:bg-primary-500/30">
      {/* Left Side: Interactive Gallery */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-gray-900 to-black border-r border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 w-full flex flex-col justify-between p-12">
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

          <div className="space-y-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-5xl font-bold leading-tight mb-4">
                The Future of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                  Online Exam Centre Management System
                </span>
              </h1>
              <p className="text-gray-400 text-lg max-w-md">
                Experience BECMS — a minimalistic, powerful, and secure platform designed for Bharat's modern educational ecosystem.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              {galleryImages.map((img, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05, y: -5 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className="group relative h-64 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                >
                  <img
                    src={img.url}
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                    <h3 className="font-semibold text-white">{img.title}</h3>
                    <p className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {img.desc}
                    </p>
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

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Background micro-interactions */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary-500/10 rounded-full blur-[80px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="p-3 bg-primary-500 rounded-2xl">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-2">Welcome to BECMS</h2>
            <p className="text-gray-400">
              {isPasswordStep
                ? 'User identified. Enter your password to continue.'
                : 'Enter your email to locate your account.'}
            </p>
          </div>

          <div className="glass-morphism rounded-3xl p-8 border border-white/10 shadow-2xl relative">
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

            <form onSubmit={isPasswordStep ? handlePasswordLogin : handleTenantResolution} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Email / Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 transition-colors group-focus-within:text-primary-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isPasswordStep}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                    placeholder="name@institution.com"
                  />
                </div>
              </div>

              {isPasswordStep && resolvedTenant && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  User: <span className="font-semibold">{resolvedTenant.name}</span> ({resolvedTenant.slug})
                </div>
              )}

              {isPasswordStep && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-medium text-gray-300">Password</label>
                    <a href="#" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Forgot Password?</a>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 transition-colors group-focus-within:text-primary-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required={isPasswordStep}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center ml-1">
                <input
                  id="remember"
                  type="checkbox"
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/50 transition-all"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-400 cursor-pointer">Stay signed in</label>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={resolvingTenant || loading}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/25 transition-all flex items-center justify-center gap-2 group"
              >
                {isPasswordStep
                  ? (loading ? 'Signing In...' : 'Sign In to Portal')
                  : (resolvingTenant ? 'Finding User...' : 'Continue')}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              {isPasswordStep && (
                <button
                  type="button"
                  onClick={handleUseAnotherEmail}
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-gray-200 transition-colors hover:bg-white/10"
                >
                  Use another email
                </button>
              )}
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

          <p className="text-center mt-10 text-sm text-gray-500">
            © 2026 Bharat Examination Core Management System
          </p>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .glass-morphism {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}} />
    </div>
  )
}

export default Login
