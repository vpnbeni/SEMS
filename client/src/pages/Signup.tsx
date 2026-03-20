import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import fullLogo from '../assets/full logo.png'
import signupImg from '../assets/signupimg.png'
import tenantSignupService from '@/services/tenantSignupService'
import toast from 'react-hot-toast'

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type PasswordStrength = 'weak' | 'medium' | 'strong'

function getPasswordStrength(password: string): PasswordStrength {
  if (!password.length) return 'weak'
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

const Signup: React.FC = () => {
  const navigate = useNavigate()
  const [schoolCode, setSchoolCode] = useState('')
  const [affiliationNo, setAffiliationNo] = useState('')
  const [nameOfSchool, setNameOfSchool] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'resolved' | 'not_found' | 'error'>('idle')
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState('')

  const strength = useMemo(() => getPasswordStrength(password), [password])
  const slug = useMemo(() => toSlug(schoolCode.trim() || nameOfSchool.trim()), [schoolCode, nameOfSchool])

  useEffect(() => {
    const nextSchoolCode = schoolCode.trim()

    if (nextSchoolCode.length !== 5) {
      setAffiliationNo('')
      setNameOfSchool('')
      setResolvedSchoolCode('')
      setLookupState('idle')
      return
    }

    let cancelled = false
    setLookupState('loading')
    setAffiliationNo('')
    setNameOfSchool('')
    setResolvedSchoolCode('')

    const timeoutId = window.setTimeout(async () => {
      try {
        const school = await tenantSignupService.lookupSchoolByCode(nextSchoolCode)
        if (cancelled) {
          return
        }

        setAffiliationNo(school.affiliationNo || '')
        setNameOfSchool(school.name || '')
        setResolvedSchoolCode(school.schoolCode || nextSchoolCode)
        setLookupState('resolved')
      } catch (err: unknown) {
        if (cancelled) {
          return
        }

        setAffiliationNo('')
        setNameOfSchool('')
        setResolvedSchoolCode('')

        if (typeof err === 'object' && err && 'response' in err) {
          const response = (err as { response?: { status?: number } }).response
          setLookupState(response?.status === 404 ? 'not_found' : 'error')
        } else {
          setLookupState('error')
        }
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [schoolCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = nameOfSchool.trim()
    if (!/^\d{5}$/.test(schoolCode.trim())) {
      toast.error('School code must be exactly 5 digits.')
      return
    }
    if (lookupState !== 'resolved' || resolvedSchoolCode !== schoolCode.trim()) {
      toast.error('Enter a valid school code from the school directory.')
      return
    }
    if (!/^\d{6}$/.test(affiliationNo.trim())) {
      toast.error('Affiliation no must be exactly 6 digits.')
      return
    }
    if (!name) {
      toast.error('Please enter the name of school.')
      return
    }
    if (!slug) {
      toast.error('Please enter a school code.')
      return
    }
    if (!adminEmail.trim()) {
      toast.error('Please enter admin email.')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const result = await tenantSignupService.startSignup({
        schoolCode: schoolCode.trim(),
        affiliationNo: affiliationNo.trim(),
        name,
        slug,
        adminEmail: adminEmail.trim().toLowerCase(),
        adminPassword: password,
        confirmPassword,
      })
      localStorage.setItem('tenantSlug', result.tenantSlug)
      toast.success('Verification email sent. Check your inbox.')
      navigate(`/signup/complete?ticket=${encodeURIComponent(result.ticket)}`)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg || 'Signup failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-100 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(560px,0.95fr)]">
      <div className="hidden min-w-0 items-center justify-center p-6 lg:flex xl:p-10">
        <img
          src={signupImg}
          alt="Sign up"
          className="max-h-[76vh] w-auto max-w-full object-contain"
        />
      </div>

      <div className="flex min-h-screen flex-col justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
        <div className="mx-auto flex w-full max-w-xl flex-col rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-6 lg:min-h-[78vh] lg:max-w-2xl lg:justify-between lg:p-8">
          <div className="mb-2 flex justify-center lg:mb-4">
            <img src={fullLogo} alt="Cntr" className="h-12 w-auto" />
          </div>
          <h1 className="mb-4 text-center text-lg font-bold text-slate-900 sm:text-xl lg:mb-6">Create your exam centre account.</h1>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-center space-y-3 lg:space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
              <div>
                <label htmlFor="schoolCode" className="mb-1 block text-xs font-medium text-slate-700">
                  School Code
                </label>
                <input
                  id="schoolCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="5 digits"
                />
                <p
                  className={`mt-1 text-[11px] ${
                    lookupState === 'resolved'
                      ? 'text-emerald-600'
                      : lookupState === 'not_found' || lookupState === 'error'
                        ? 'text-red-500'
                        : 'text-slate-500'
                  }`}
                >
                  {lookupState === 'loading' && 'Checking school directory...'}
                  {lookupState === 'resolved' && 'School found. Affiliation number and school name were auto-filled.'}
                  {lookupState === 'not_found' && 'No school found for this code in the school directory.'}
                  {lookupState === 'error' && 'School lookup failed. Please try again.'}
                  {lookupState === 'idle' && 'Enter the 5-digit school code to fetch school details.'}
                </p>
              </div>
              <div>
                <label htmlFor="affiliationNo" className="mb-1 block text-xs font-medium text-slate-700">
                  Affiliation No
                </label>
                <input
                  id="affiliationNo"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={affiliationNo}
                  onChange={(e) => setAffiliationNo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="6 digits"
                />
              </div>
            </div>

            <div>
              <label htmlFor="nameOfSchool" className="mb-1 block text-xs font-medium text-slate-700">
                Full Name of School (as per CBSE records)
              </label>
              <input
                id="nameOfSchool"
                type="text"
                value={nameOfSchool}
                onChange={(e) => setNameOfSchool(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter school name."
              />
            </div>

            <div>
              <label htmlFor="adminEmail" className="mb-1 block text-xs font-medium text-slate-700">
                Email Address
              </label>
              <input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="admin@school.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-slate-700">
                Create Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Create password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2 lg:mt-3">
                <span className="text-[11px] text-slate-500">Strength:</span>
                <div className="flex gap-0.5">
                  <div
                    className={`h-1 w-8 rounded-full ${
                      strength === 'weak' ? 'bg-red-500' : strength === 'medium' ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                  />
                  <div
                    className={`h-1 w-8 rounded-full ${
                      strength === 'weak' ? 'bg-slate-200' : strength === 'medium' ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                  />
                  <div
                    className={`h-1 w-8 rounded-full ${
                      strength === 'weak' ? 'bg-slate-200' : strength === 'medium' ? 'bg-slate-200' : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    strength === 'weak' ? 'text-red-500' : strength === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {strength === 'weak' ? 'Weak' : strength === 'medium' ? 'Medium' : 'Strong'}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-xs font-medium text-slate-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600 lg:mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
