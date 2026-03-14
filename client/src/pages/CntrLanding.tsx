import React from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  FileText,
  Building2,
  FileStack,
  LayoutGrid,
  Users,
  ClipboardCheck,
  UserCheck,
  CheckCircle2,
} from 'lucide-react'
import fullLogo from '../assets/full logo.png'
import dashboardPreview from '../assets/dashboard.png'
import dashboardPreview2 from '../assets/dashboard2.png'

const APP_URL = 'https://sems.capabble.cloud'

const modules = [
  {
    title: 'Centre Datesheet',
    description: 'Automatically generate centre-specific exam schedules using official LOC data.',
    bullets: ['Auto generate schedule', 'Accurate subject mapping', 'Export printable plan'],
    icon: Calendar,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Form-66',
    description: 'Generate official Form-66 instantly with verified candidate and centre details.',
    bullets: ['Auto-fill candidate data', 'Ready-to-print format', 'No manual word file typing'],
    icon: FileText,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    title: 'Exam Rooms',
    description: 'Manage and assign exam rooms effectively with detailed capacity planning and resource allocation.',
    bullets: ['Optimize room utilization', 'Real-time availability', 'Assign resources easily'],
    icon: Building2,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
  },
  {
    title: 'Answer Sheets',
    description: 'Track answer sheets used across different examination days and subjects.',
    bullets: ['Organized sheet records', 'Track exam day usage', 'Quick verification'],
    icon: FileStack,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    title: 'Seating Plan',
    description: 'Generate seating arrangements automatically for multiple exam rooms.',
    bullets: ['Instant seating generation', 'Supports multiple rooms', 'Printable layouts'],
    icon: LayoutGrid,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Functionary Duties',
    description: 'Automatically assign invigilators and exam staff based on exam schedule.',
    bullets: ['Smart duty allocation', 'Balanced invigilators', 'Avoid manual conflicts'],
    icon: Users,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    title: 'Attendance',
    description: 'Monitor candidate attendance during exams and generate reports instantly.',
    bullets: ['Track student presence', 'Instant attendance reports', 'Avoid manual conflicts'],
    icon: ClipboardCheck,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Candidates',
    description: 'Monitor candidate registrations, manage profiles, and track examination history efficiently.',
    bullets: ['Centralized candidate profiles', 'Filter by subject or school', 'Easy candidate search'],
    icon: UserCheck,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
]

const CntrLanding: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      {/* ─── 1. Hero / Preview Section ─── */}
      <section className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-center">
            <div>
            <img
              src={fullLogo}
              alt="Cntr – Exam Centre Control"
              className="h-28 w-auto"
            />
              <h1 className="mt-8 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Control The Entire Examination Process Effortlessly
              </h1>
              <h2 className="mt-4 text-slate-600 max-w-xl text-base sm:text-lg">
                Manage datesheets, rooms, answer sheets, seating plans, invigilator duties, attendance and candidate records.
              </h2>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={APP_URL}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-600 transition-colors"
                >
                  User Manual
                </a>
                
              </div>
            </div>

            {/* Dashboard preview image */}
            <div className="flex items-center justify-center lg:justify-end">
              <img
                src={dashboardPreview}
                alt="Cntr dashboard preview"
                className="block w-full h-auto max-w-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Cards Section ─── */}
      <section className="py-16 lg:py-20 bg-gradient-to-b from-sky-50/50 via-white to-violet-50/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-sky-500">
              Modules
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
              Powerful Modules Designed for Examination Centres
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
              Everything a centre controller needs on exam day – from room allocation to answer sheets –
              organised into focused, easy-to-use workspaces.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((mod) => {
              const Icon = mod.icon
              return (
                <article
                  key={mod.title}
                  className="group relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className={`inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${mod.iconBg} ${mod.iconColor}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900">
                        {mod.title}
                      </h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 leading-snug">
                    {mod.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {mod.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
              </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── 3. Bottom Section ─── */}
      <section className="py-16 lg:py-20 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-10">
            Run the exam centre smoothly and efficiently.
          </h2>
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-14 text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              Automatic exam planning
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              Zero manual paperwork
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              Fast room allocation
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              Accurate exam monitoring
            </li>
          </ul>

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-center">
            {/* App preview image */}
            <div className="flex items-center justify-center lg:justify-start">
              <img
                src={dashboardPreview2}
                alt="Cntr room allocation preview"
                className="block w-full h-auto max-w-md"
              />
            </div>

            {/* CTA block */}
            <div className="text-center lg:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                Ready to Manage Your Examination Centre Efficiently?
              </h3>
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-6 border-t border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Cntr – Exam Centre Control. Powered by CAPABBLE.   </footer>
    </div>
  )
}

export default CntrLanding
