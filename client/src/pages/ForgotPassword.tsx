import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail, RefreshCcw, Shield } from 'lucide-react'
import authService from '@/services/authService'
import { getUniversalAuthCopy } from '@/utils/publicBranding'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,128}$/
const RESEND_COOLDOWN_SECONDS = 45

type Step = 'email' | 'reset' | 'success'

interface FieldErrors {
  email?: string
  otp?: string
  newPassword?: string
  confirmNewPassword?: string
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

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate()
  const authCopy = getUniversalAuthCopy()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [submittingEmail, setSubmittingEmail] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resendingOtp, setResendingOtp] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const isBusy = submittingEmail || resettingPassword || resendingOtp

  const resendLabel = useMemo(() => {
    if (cooldownRemaining <= 0) {
      return 'Resend OTP'
    }

    return `Resend OTP in ${cooldownRemaining}s`
  }, [cooldownRemaining])

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setCooldownRemaining((value) => (value > 0 ? value - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldownRemaining])

  useEffect(() => {
    if (step !== 'success') return undefined

    const redirectTimer = window.setTimeout(() => {
      navigate('/login', { replace: true })
    }, 2000)

    return () => window.clearTimeout(redirectTimer)
  }, [navigate, step])

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      return { ...prev, [field]: undefined }
    })
  }

  const resetFeedback = () => {
    setErrorMessage('')
    setStatusMessage('')
  }

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isBusy) return

    resetFeedback()
    const normalizedEmail = email.trim().toLowerCase()

    if (!emailRegex.test(normalizedEmail)) {
      setFieldErrors({ email: 'Enter a valid email address.' })
      return
    }

    setSubmittingEmail(true)
    setFieldErrors({})

    try {
      const tenant = await authService.resolveTenantByEmail(normalizedEmail)
      localStorage.setItem('tenantSlug', tenant.slug)
      syncTenantInUrl(tenant.slug)

      await authService.forgotPassword(normalizedEmail)

      setEmail(normalizedEmail)
      setStep('reset')
      setOtp('')
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS)
      setStatusMessage(`A 6-digit OTP was sent to ${normalizedEmail}.`)
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Unable to start password reset. Please try again.'
      setErrorMessage(message)
    } finally {
      setSubmittingEmail(false)
    }
  }

  const validateResetForm = (): boolean => {
    const nextErrors: FieldErrors = {}
    const normalizedOtp = otp.trim()

    if (!/^\d{6}$/.test(normalizedOtp)) {
      nextErrors.otp = 'OTP must be exactly 6 digits.'
    }

    if (!strongPasswordRegex.test(newPassword)) {
      nextErrors.newPassword = 'Use at least 8 chars with upper/lowercase, number, and special character.'
    }

    if (confirmNewPassword !== newPassword) {
      nextErrors.confirmNewPassword = 'Confirm password must match new password.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isBusy) return

    resetFeedback()
    if (!validateResetForm()) {
      return
    }

    setResettingPassword(true)

    try {
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
        confirmNewPassword,
      })

      setStep('success')
      setStatusMessage('Password reset successful. Redirecting to login...')
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Unable to reset password right now. Please try again.'
      setErrorMessage(message)
    } finally {
      setResettingPassword(false)
    }
  }

  const handleResendOtp = async () => {
    if (isBusy || cooldownRemaining > 0) {
      return
    }

    resetFeedback()
    setResendingOtp(true)

    try {
      await authService.resendForgotPasswordOtp(email.trim().toLowerCase())
      setOtp('')
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS)
      setStatusMessage('A new OTP has been sent to your email.')
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Unable to resend OTP. Please try again.'
      setErrorMessage(message)
    } finally {
      setResendingOtp(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-2">
        <section className="relative hidden overflow-hidden border-r border-white/5 bg-gradient-to-br from-gray-900 to-black lg:block">
          <div className="absolute inset-0">
            <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-primary-500/20 blur-[120px]" />
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-secondary-500/20 blur-[120px]" />
          </div>
          <div className="relative z-10 flex h-full flex-col justify-between p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-400/30 bg-primary-500/10 px-3 py-1 text-xs text-primary-200">
                <Shield className="h-4 w-4" />
                Secure Recovery
              </div>
              <h1 className="mt-8 text-4xl font-bold leading-tight">
                {authCopy.forgotTitle}
                <span className="block bg-gradient-to-r from-primary-300 to-secondary-300 bg-clip-text text-transparent">
                  with email verification.
                </span>
              </h1>
              <p className="mt-4 max-w-md text-gray-400">
                {authCopy.forgotDescription}
              </p>
            </div>

            <div className="space-y-4 text-sm text-gray-300">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Shared account recovery across modules
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Secure OTP with expiry and retry controls
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Password strength checks before submit
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="absolute inset-0 -z-10 lg:hidden">
            <div className="absolute left-8 top-8 h-40 w-40 rounded-full bg-primary-500/15 blur-[80px]" />
            <div className="absolute bottom-8 right-8 h-48 w-48 rounded-full bg-secondary-500/15 blur-[80px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur xl:p-8"
          >
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>

            <div className="mt-5">
              <h2 className="text-2xl font-bold">Forgot Password</h2>
              <p className="mt-2 text-sm text-gray-400">
                {step === 'email'
                  ? 'Enter your account email to receive OTP.'
                  : step === 'reset'
                    ? 'Enter OTP and choose a secure new password.'
                    : 'Password updated successfully.'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {step === 'email' && (
                <motion.form
                  key="email-step"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onSubmit={handleEmailSubmit}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label htmlFor="forgot-email" className="mb-2 ml-1 block text-sm text-gray-300">Email</label>
                    <div className="group relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 group-focus-within:text-primary-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        id="forgot-email"
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value)
                          clearFieldError('email')
                          resetFeedback()
                        }}
                        className={`w-full rounded-xl border bg-white/5 py-3 pl-12 pr-4 outline-none transition-all ${
                          fieldErrors.email
                            ? 'border-red-400/50 focus:border-red-400'
                            : 'border-white/10 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40'
                        }`}
                        placeholder="name@institution.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                    {fieldErrors.email && <p className="mt-1 ml-1 text-xs text-red-300">{fieldErrors.email}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingEmail}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submittingEmail ? 'Sending OTP...' : 'Send OTP'}
                    <KeyRound className="h-4 w-4" />
                  </button>
                </motion.form>
              )}

              {step === 'reset' && (
                <motion.form
                  key="reset-step"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onSubmit={handleResetSubmit}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label htmlFor="forgot-otp" className="mb-2 ml-1 block text-sm text-gray-300">OTP</label>
                    <input
                      id="forgot-otp"
                      type="text"
                      value={otp}
                      onChange={(event) => {
                        setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                        clearFieldError('otp')
                        resetFeedback()
                      }}
                      className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-center text-lg tracking-[0.25em] outline-none transition-all ${
                        fieldErrors.otp
                          ? 'border-red-400/50 focus:border-red-400'
                          : 'border-white/10 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40'
                      }`}
                      inputMode="numeric"
                      pattern="\d{6}"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      required
                    />
                    {fieldErrors.otp && <p className="mt-1 ml-1 text-xs text-red-300">{fieldErrors.otp}</p>}
                  </div>

                  <div>
                    <label htmlFor="forgot-new-password" className="mb-2 ml-1 block text-sm text-gray-300">New Password</label>
                    <div className="relative">
                      <input
                        id="forgot-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(event) => {
                          setNewPassword(event.target.value)
                          clearFieldError('newPassword')
                          resetFeedback()
                        }}
                        className={`w-full rounded-xl border bg-white/5 py-3 pl-4 pr-12 outline-none transition-all ${
                          fieldErrors.newPassword
                            ? 'border-red-400/50 focus:border-red-400'
                            : 'border-white/10 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40'
                        }`}
                        placeholder="New strong password"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((value) => !value)}
                        className="absolute inset-y-0 right-0 pr-4 text-gray-400 transition-colors hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {fieldErrors.newPassword && <p className="mt-1 ml-1 text-xs text-red-300">{fieldErrors.newPassword}</p>}
                  </div>

                  <div>
                    <label htmlFor="forgot-confirm-password" className="mb-2 ml-1 block text-sm text-gray-300">Confirm Password</label>
                    <div className="relative">
                      <input
                        id="forgot-confirm-password"
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(event) => {
                          setConfirmNewPassword(event.target.value)
                          clearFieldError('confirmNewPassword')
                          resetFeedback()
                        }}
                        className={`w-full rounded-xl border bg-white/5 py-3 pl-4 pr-12 outline-none transition-all ${
                          fieldErrors.confirmNewPassword
                            ? 'border-red-400/50 focus:border-red-400'
                            : 'border-white/10 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40'
                        }`}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword((value) => !value)}
                        className="absolute inset-y-0 right-0 pr-4 text-gray-400 transition-colors hover:text-white"
                      >
                        {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {fieldErrors.confirmNewPassword && <p className="mt-1 ml-1 text-xs text-red-300">{fieldErrors.confirmNewPassword}</p>}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="submit"
                      disabled={resettingPassword}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {resettingPassword ? 'Resetting...' : 'Reset Password'}
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendingOtp || cooldownRemaining > 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-3 font-semibold text-gray-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {resendingOtp ? 'Sending...' : resendLabel}
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 'success' && (
                <motion.div
                  key="success-step"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center"
                >
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
                  <h3 className="mt-3 text-xl font-semibold">Password Updated</h3>
                  <p className="mt-2 text-sm text-emerald-100/90">Redirecting you to login.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/login', { replace: true })}
                    className="mt-5 rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-slate-900 transition-colors hover:bg-emerald-400"
                  >
                    Go to Login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {statusMessage && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100"
                >
                  {statusMessage}
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {errorMessage && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                >
                  {errorMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </section>
      </div>
    </div>
  )
}

export default ForgotPassword
