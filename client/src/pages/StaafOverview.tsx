import React, { useMemo } from 'react'
import { BarChart3, Shield, Users, UserSquare2 } from 'lucide-react'
import { useTeachers } from '../hooks/useTeachers'
import {
  getDesignationCode,
  getStaffGender,
  isAdminStaff,
  isClassIvStaff,
  isConductor,
  isDriver,
  isSecurityStaff,
  isSportsCoach,
  isTeachingStaff,
} from '../utils/staafStaff'
import type { Teacher } from '../redux/slices/teacherSlice'

const GROUP_CARDS = [
  { key: 'teaching', label: 'Teaching', tone: 'bg-blue-50 text-blue-700 ring-blue-100', match: isTeachingStaff },
  { key: 'sports-coach', label: 'Sports Coach', tone: 'bg-orange-50 text-orange-700 ring-orange-100', match: isSportsCoach },
  { key: 'admin', label: 'Admin', tone: 'bg-violet-50 text-violet-700 ring-violet-100', match: isAdminStaff },
  { key: 'class-iv', label: 'Class IV', tone: 'bg-amber-50 text-amber-700 ring-amber-100', match: isClassIvStaff },
  { key: 'drivers', label: 'Drivers', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100', match: isDriver },
  { key: 'conductors', label: 'Conductors', tone: 'bg-sky-50 text-sky-700 ring-sky-100', match: isConductor },
  { key: 'security', label: 'Security', tone: 'bg-slate-100 text-slate-700 ring-slate-200', match: isSecurityStaff },
] as const

const StaafOverview: React.FC = () => {
  const { data, isLoading } = useTeachers({
    page: 1,
    limit: 500,
    includeAllRecords: true,
    sort: 'name',
  })

  const staff = (data?.items || []) as Teacher[]

  const stats = useMemo(() => {
    const active = staff.filter((member) => member.isActive !== false).length
    const gender = { Male: 0, Female: 0, Other: 0, Unspecified: 0 }
    const designations: Record<'PRT' | 'TGT' | 'PGT' | 'Other', number> = {
      PRT: 0,
      TGT: 0,
      PGT: 0,
      Other: 0,
    }

    staff.forEach((member) => {
      gender[getStaffGender(member)] += 1
      const code = getDesignationCode(member)
      if (code === 'PRT') designations.PRT += 1
      else if (code === 'TGT') designations.TGT += 1
      else if (code === 'PGT') designations.PGT += 1
      else if (isTeachingStaff(member)) designations.Other += 1
    })

    return {
      total: staff.length,
      active,
      gender,
      designations,
      groups: GROUP_CARDS.map((group) => ({
        ...group,
        count: staff.filter(group.match).length,
      })),
    }
  }, [staff])

  if (isLoading && staff.length === 0) {
    return (
      <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
        Loading staff overview...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Staff" value={stats.total} hint="All staff records in the current session." tone="bg-blue-50 text-blue-600" />
        <StatCard icon={<UserSquare2 className="h-5 w-5" />} label="Active Staff" value={stats.active} hint="Members currently marked active." tone="bg-emerald-50 text-emerald-600" />
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Teaching Staff" value={stats.groups.find((group) => group.key === 'teaching')?.count || 0} hint="Teachers and PRT / TGT / PGT designations." tone="bg-violet-50 text-violet-600" />
        <StatCard icon={<Shield className="h-5 w-5" />} label="Support Staff" value={stats.total - (stats.groups.find((group) => group.key === 'teaching')?.count || 0)} hint="Admin, Class IV, transport, and security." tone="bg-amber-50 text-amber-600" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <MatrixCard title="Gender Matrix" description="Male, female, and records still awaiting a gender value.">
          <div className="grid gap-4 sm:grid-cols-2">
            <CountTile label="Male" value={stats.gender.Male} className="border-blue-100 bg-blue-50 text-blue-700" />
            <CountTile label="Female" value={stats.gender.Female} className="border-rose-100 bg-rose-50 text-rose-700" />
            <CountTile label="Other" value={stats.gender.Other} className="border-violet-100 bg-violet-50 text-violet-700" />
            <CountTile label="Unspecified" value={stats.gender.Unspecified} className="border-slate-200 bg-slate-50 text-slate-600" />
          </div>
        </MatrixCard>

        <MatrixCard title="Designation Matrix" description="Teaching designations grouped as PRT, TGT, and PGT.">
          <div className="grid gap-4 sm:grid-cols-2">
            <CountTile label="PRT" value={stats.designations.PRT} className="border-emerald-100 bg-emerald-50 text-emerald-700" />
            <CountTile label="TGT" value={stats.designations.TGT} className="border-sky-100 bg-sky-50 text-sky-700" />
            <CountTile label="PGT" value={stats.designations.PGT} className="border-indigo-100 bg-indigo-50 text-indigo-700" />
            <CountTile label="Other teaching" value={stats.designations.Other} className="border-slate-200 bg-slate-50 text-slate-600" />
          </div>
        </MatrixCard>
      </section>

      <MatrixCard title="Group Matrix" description="Staff grouped as Teaching, Admin, Class IV, Drivers, Conductors, and Security.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.groups.map((group) => (
            <div key={group.key} className={`rounded-2xl px-4 py-4 ring-1 ${group.tone}`}>
              <p className="text-sm font-medium">{group.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{group.count}</p>
            </div>
          ))}
        </div>
      </MatrixCard>
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

const MatrixCard = ({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) => (
  <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 px-6 py-5">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
    <div className="px-6 py-6">{children}</div>
  </div>
)

const CountTile = ({ label, value, className }: { label: string; value: number; className: string }) => (
  <div className={`rounded-2xl border px-4 py-4 ${className}`}>
    <p className="text-sm font-medium">{label}</p>
    <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
  </div>
)

export default StaafOverview
