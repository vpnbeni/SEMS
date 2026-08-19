import React, { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  ClipboardList,
  FileText,
  Megaphone,
  Presentation,
  ScrollText,
  Users,
} from 'lucide-react'

type VacantPost = {
  id: string
  post: string
  group: string
  vacancies: number
  status: 'Open' | 'On hold' | 'Filled'
}

type Advertisement = {
  id: string
  title: string
  publishedOn: string
  lastDate: string
  medium: string
}

type Application = {
  id: string
  name: string
  post: string
  phone: string
  email: string
  appliedOn: string
  status: 'Received' | 'Shortlisted' | 'Rejected'
}

type ScheduleRow = {
  id: string
  candidate: string
  post: string
  date: string
  time: string
  venue: string
}

type RecruitmentState = {
  vacantPosts: VacantPost[]
  advertisements: Advertisement[]
  applications: Application[]
  interviews: ScheduleRow[]
  demos: ScheduleRow[]
  entranceTests: ScheduleRow[]
}

const STORAGE_KEY = 'staaf:recruitment'

const PROCESS_STEPS = [
  'Vacant post',
  'Advertisement',
  'Application',
  'Entrance test',
  'Demo',
  'Interview',
  'Offer / joining',
]

const SAMPLE: RecruitmentState = {
  vacantPosts: [
    { id: 'vp1', post: 'PGT Mathematics', group: 'Teaching', vacancies: 2, status: 'Open' },
    { id: 'vp2', post: 'TGT English', group: 'Teaching', vacancies: 1, status: 'Open' },
    { id: 'vp3', post: 'Office Clerk', group: 'Admin', vacancies: 1, status: 'On hold' },
    { id: 'vp4', post: 'Security Guard', group: 'Security', vacancies: 3, status: 'Open' },
  ],
  advertisements: [
    { id: 'ad1', title: 'Walk-in for PGT / TGT posts', publishedOn: '2026-08-01', lastDate: '2026-08-25', medium: 'Newspaper + Website' },
    { id: 'ad2', title: 'Security and support staff recruitment', publishedOn: '2026-08-10', lastDate: '2026-08-30', medium: 'School notice board' },
  ],
  applications: [
    { id: 'ap1', name: 'Neha Sharma', post: 'PGT Mathematics', phone: '9876543210', email: 'neha@example.com', appliedOn: '2026-08-12', status: 'Shortlisted' },
    { id: 'ap2', name: 'Rohit Verma', post: 'TGT English', phone: '9811122233', email: 'rohit@example.com', appliedOn: '2026-08-14', status: 'Received' },
  ],
  interviews: [
    { id: 'iv1', candidate: 'Neha Sharma', post: 'PGT Mathematics', date: '2026-08-22', time: '10:00 AM', venue: 'Principal Office' },
  ],
  demos: [
    { id: 'dm1', candidate: 'Neha Sharma', post: 'PGT Mathematics', date: '2026-08-21', time: '09:00 AM', venue: 'Class XII-A' },
  ],
  entranceTests: [
    { id: 'et1', candidate: 'Rohit Verma', post: 'TGT English', date: '2026-08-20', time: '11:00 AM', venue: 'Exam Hall 1' },
  ],
}

const loadState = (): RecruitmentState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return SAMPLE
    const parsed = JSON.parse(raw) as RecruitmentState
    return { ...SAMPLE, ...parsed }
  } catch {
    return SAMPLE
  }
}

const TABS = [
  { id: 'posts', label: 'Vacant posts' },
  { id: 'ads', label: 'Advertisement' },
  { id: 'form', label: 'Job application form' },
  { id: 'interview', label: 'Interview schedule' },
  { id: 'demo', label: 'Demo schedule' },
  { id: 'test', label: 'Entrance test schedule' },
] as const

type TabId = (typeof TABS)[number]['id']

const StaafRecruitment: React.FC = () => {
  const [state, setState] = useState<RecruitmentState>(SAMPLE)
  const [tab, setTab] = useState<TabId>('posts')
  const [form, setForm] = useState({ name: '', post: '', phone: '', email: '' })

  useEffect(() => {
    setState(loadState())
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const stats = useMemo(() => {
    const openVacancies = state.vacantPosts
      .filter((post) => post.status === 'Open')
      .reduce((sum, post) => sum + Number(post.vacancies || 0), 0)
    return {
      openVacancies,
      advertisements: state.advertisements.length,
      applications: state.applications.length,
      shortlisted: state.applications.filter((item) => item.status === 'Shortlisted').length,
    }
  }, [state])

  const submitApplication = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !form.post.trim()) return
    const next: Application = {
      id: `ap_${Date.now()}`,
      name: form.name.trim(),
      post: form.post.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      appliedOn: new Date().toISOString().slice(0, 10),
      status: 'Received',
    }
    setState((prev) => ({ ...prev, applications: [next, ...prev.applications] }))
    setForm({ name: '', post: '', phone: '', email: '' })
    setTab('form')
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Briefcase className="h-5 w-5" />} label="Vacant posts" value={stats.openVacancies} hint="Open vacancies currently being filled." tone="bg-blue-50 text-blue-600" />
        <StatCard icon={<Megaphone className="h-5 w-5" />} label="Advertisements" value={stats.advertisements} hint="Live or published recruitment notices." tone="bg-amber-50 text-amber-600" />
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Applications" value={stats.applications} hint="Job applications received so far." tone="bg-violet-50 text-violet-600" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Shortlisted" value={stats.shortlisted} hint="Candidates moved to interview / demo." tone="bg-emerald-50 text-emerald-600" />
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Process flow</h2>
        <p className="mt-1 text-sm text-slate-500">Standard recruitment path from vacancy to joining.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {PROCESS_STEPS.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                {index + 1}. {step}
              </div>
              {index < PROCESS_STEPS.length - 1 ? <span className="hidden text-slate-300 sm:inline">→</span> : null}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              tab === item.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'posts' ? (
        <Panel title="Vacant posts" icon={<Briefcase className="h-4 w-4" />}>
          <Table
            headers={['Post', 'Group', 'Vacancies', 'Status']}
            rows={state.vacantPosts.map((post) => [post.post, post.group, String(post.vacancies), post.status])}
            empty="No vacant posts recorded."
          />
        </Panel>
      ) : null}

      {tab === 'ads' ? (
        <Panel title="Advertisement" icon={<Megaphone className="h-4 w-4" />}>
          <Table
            headers={['Title', 'Published on', 'Last date', 'Medium']}
            rows={state.advertisements.map((ad) => [ad.title, ad.publishedOn, ad.lastDate, ad.medium])}
            empty="No advertisements published yet."
          />
        </Panel>
      ) : null}

      {tab === 'form' ? (
        <Panel title="Job application form" icon={<FileText className="h-4 w-4" />}>
          <form onSubmit={submitApplication} className="grid gap-4 md:grid-cols-2">
            <Field label="Applicant name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
            <Field label="Post applied for" value={form.post} onChange={(value) => setForm((prev) => ({ ...prev, post: value }))} />
            <Field label="Phone" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} />
            <Field label="Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
            <div className="md:col-span-2">
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Submit application
              </button>
            </div>
          </form>
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-slate-700">Received applications</p>
            <Table
              headers={['Name', 'Post', 'Phone', 'Applied on', 'Status']}
              rows={state.applications.map((item) => [item.name, item.post, item.phone, item.appliedOn, item.status])}
              empty="No applications received yet."
            />
          </div>
        </Panel>
      ) : null}

      {tab === 'interview' ? (
        <Panel title="Interview schedule" icon={<ScrollText className="h-4 w-4" />}>
          <Table
            headers={['Candidate', 'Post', 'Date', 'Time', 'Venue']}
            rows={state.interviews.map((item) => [item.candidate, item.post, item.date, item.time, item.venue])}
            empty="No interviews scheduled."
          />
        </Panel>
      ) : null}

      {tab === 'demo' ? (
        <Panel title="Demo schedule" icon={<Presentation className="h-4 w-4" />}>
          <Table
            headers={['Candidate', 'Post', 'Date', 'Time', 'Venue']}
            rows={state.demos.map((item) => [item.candidate, item.post, item.date, item.time, item.venue])}
            empty="No demos scheduled."
          />
        </Panel>
      ) : null}

      {tab === 'test' ? (
        <Panel title="Entrance test schedule" icon={<ClipboardList className="h-4 w-4" />}>
          <Table
            headers={['Candidate', 'Post', 'Date', 'Time', 'Venue']}
            rows={state.entranceTests.map((item) => [item.candidate, item.post, item.date, item.time, item.venue])}
            empty="No entrance tests scheduled."
          />
        </Panel>
      ) : null}
    </div>
  )
}

const StatCard = ({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  hint: string
  tone: string
}) => (
  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      </div>
    </div>
    <p className="mt-4 text-sm text-slate-500">{hint}</p>
  </div>
)

const Panel = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
      <span className="text-slate-500">{icon}</span>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </div>
    <div className="px-6 py-5">{children}</div>
  </section>
)

const Field = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) => (
  <label className="block text-sm font-medium text-slate-600">
    {label}
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
    />
  </label>
)

const Table = ({
  headers,
  rows,
  empty,
}: {
  headers: string[]
  rows: string[][]
  empty: string
}) => (
  <div className="overflow-x-auto">
    {rows.length === 0 ? (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">{empty}</p>
    ) : (
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="border-b border-slate-100 last:border-0">
              {row.map((cell) => (
                <td key={`${index}-${cell}`} className="px-3 py-2.5 text-slate-800">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)

export default StaafRecruitment
