import React, { useState, useMemo } from 'react'
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

  const strength = useMemo(() => getPasswordStrength(password), [password])
  const slug = useMemo(() => toSlug(schoolCode.trim() || nameOfSchool.trim()), [schoolCode, nameOfSchool])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = nameOfSchool.trim()
    if (!/^\d{5}$/.test(schoolCode.trim())) {
      toast.error('School code must be exactly 5 digits.')
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
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      toast.error(msg || 'Signup failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-100">
      {/* Left: image (not background) */}
      <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center p-4 lg:p-6">
        <img
          src={signupImg}
          alt="Sign up"
          className="max-h-[60vh] w-auto max-w-full object-contain"
        />
      </div>

      {/* Right: sign up form in glass box — compact, no scroll */}
      <div className="flex-1 flex min-h-0 flex-col items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-900/10 p-3 sm:p-4">
          <div className="flex justify-center mb-0.5">
            <img src={fullLogo} alt="Cntr" className="h-7 w-auto" />
          </div>
          <h1 className="text-base font-bold text-slate-900 text-center mb-2">Create your exam centre account.</h1>

          <form onSubmit={handleSubmit} className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="schoolCode" className="block text-[11px] font-medium text-slate-700 mb-0.5">
                  School Code
                </label>
                <input
                  id="schoolCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full rounded border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition"
                  placeholder="5 digits"
                />
              </div>
              <div>
                <label htmlFor="affiliationNo" className="block text-[11px] font-medium text-slate-700 mb-0.5">
                  Affiliation No
                </label>
                <input
                  id="affiliationNo"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={affiliationNo}
                  onChange={(e) => setAffiliationNo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition"
                  placeholder="6 digits"
                />
              </div>
            </div>
            <div>
              <label htmlFor="nameOfSchool" className="block text-[11px] font-medium text-slate-700 mb-0.5">
                Name of School
              </label>
              <input
                id="nameOfSchool"
                type="text"
                value={nameOfSchool}
                onChange={(e) => setNameOfSchool(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition"
                placeholder="Enter school name."
              />
            </div>
            <div>
              <label htmlFor="adminEmail" className="block text-[11px] font-medium text-slate-700 mb-0.5">
                Email Address
              </label>
              <input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition"
                placeholder="admin@school.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-[11px] font-medium text-slate-700 mb-0.5">
                Create Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition"
                  placeholder="Create password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">Strength:</span>
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
                  className={`text-[10px] font-medium ${
                    strength === 'weak' ? 'text-red-500' : strength === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {strength === 'weak' ? 'Weak' : strength === 'medium' ? 'Medium' : 'Strong'}
                </span>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-[11px] font-medium text-slate-700 mb-0.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 text-xs shadow-lg shadow-blue-500/25 transition disabled:opacity-70 disabled:cursor-not-allowed mt-1"
            >
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-2 text-center text-[11px] text-slate-600">
            Already have an account?{' '}
            <Link to="/" className="font-semibold text-blue-600 hover:text-blue-700">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
