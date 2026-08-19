import React, { useMemo } from 'react'
import { useTeachers } from '../hooks/useTeachers'
import { useCentreDetails } from '../hooks/useCentreDetails'
import { getOrgBandId, ORG_BANDS, type OrgBandId } from '../utils/staafStaff'
import type { Teacher } from '../redux/slices/teacherSlice'

const BAND_TONE: Record<OrgBandId, string> = {
  principal: 'from-indigo-600 to-blue-600 text-white',
  'vice-principal': 'from-sky-600 to-cyan-600 text-white',
  pgt: 'from-violet-50 to-white text-violet-900 ring-1 ring-violet-100',
  tgt: 'from-blue-50 to-white text-blue-900 ring-1 ring-blue-100',
  prt: 'from-emerald-50 to-white text-emerald-900 ring-1 ring-emerald-100',
  'sports-coach': 'from-orange-50 to-white text-orange-900 ring-1 ring-orange-100',
  admin: 'from-amber-50 to-white text-amber-900 ring-1 ring-amber-100',
  'class-iv': 'from-slate-50 to-white text-slate-800 ring-1 ring-slate-200',
  drivers: 'from-teal-50 to-white text-teal-900 ring-1 ring-teal-100',
  conductors: 'from-sky-50 to-white text-sky-900 ring-1 ring-sky-100',
  security: 'from-stone-50 to-white text-stone-800 ring-1 ring-stone-200',
  other: 'from-gray-50 to-white text-gray-800 ring-1 ring-gray-200',
}

const StaafOrgStructure: React.FC = () => {
  const { data, isLoading } = useTeachers({
    page: 1,
    limit: 500,
    includeAllRecords: true,
    sort: 'name',
  })
  const { data: centre } = useCentreDetails()
  const staff = (data?.items || []) as Teacher[]
  const schoolName = String(centre?.centreName || '').trim() || 'Organisation'

  const bands = useMemo(() => {
    const grouped = new Map<OrgBandId, Teacher[]>()
    ORG_BANDS.forEach((band) => grouped.set(band.id, []))
    staff.forEach((member) => {
      const bandId = getOrgBandId(member)
      grouped.get(bandId)?.push(member)
    })
    return ORG_BANDS
      .map((band) => ({ ...band, members: grouped.get(band.id) || [] }))
      .filter((band) => band.id !== 'other' || band.members.length > 0)
  }, [staff])

  const leadership = bands.filter((band) => band.level <= 2)
  const teaching = bands.filter((band) => band.level >= 3 && band.level <= 5)
  const support = bands.filter((band) => band.level >= 6)

  if (isLoading && staff.length === 0) {
    return (
      <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
        Loading organisation structure...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto pb-4">
        <div className="mx-auto flex min-w-[760px] max-w-6xl flex-col items-center">
          <div className="rounded-[28px] bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-5 text-center text-white shadow-lg">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Organisation</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{schoolName}</h2>
            <p className="mt-1 text-sm text-slate-300">{staff.length} staff mapped across the hierarchy</p>
          </div>

          <Connector />

          {leadership.map((band) => (
            <React.Fragment key={band.id}>
              <BandRow band={band} />
              <Connector />
            </React.Fragment>
          ))}

          <LevelLabel>Academic Wing</LevelLabel>
          <div className="grid w-full grid-cols-2 gap-4 xl:grid-cols-4">
            {teaching.map((band) => (
              <BandColumn key={band.id} band={band} />
            ))}
          </div>

          <Connector />
          <LevelLabel>Administration & Support</LevelLabel>
          <div className="grid w-full grid-cols-2 gap-4 xl:grid-cols-5">
            {support.map((band) => (
              <BandColumn key={band.id} band={band} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const Connector = () => (
  <div className="flex h-8 w-px items-center justify-center bg-slate-300" />
)

const LevelLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{children}</p>
)

const BandRow = ({ band }: { band: { id: OrgBandId; label: string; members: Teacher[] } }) => (
  <div className="flex w-full flex-wrap justify-center gap-3">
    {band.members.length === 0 ? (
      <PersonCard bandId={band.id} title={band.label} subtitle="Position vacant" vacant />
    ) : (
      band.members.map((member) => (
        <PersonCard
          key={member._id || member.id || member.name}
          bandId={band.id}
          title={member.name}
          subtitle={member.designation || band.label}
        />
      ))
    )}
  </div>
)

const BandColumn = ({ band }: { band: { id: OrgBandId; label: string; members: Teacher[] } }) => (
  <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-3">
    <div className="mb-3 flex items-center justify-between gap-2 px-1">
      <p className="text-sm font-semibold text-slate-800">{band.label}</p>
      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
        {band.members.length}
      </span>
    </div>
    <div className="space-y-2">
      {band.members.length === 0 ? (
        <PersonCard bandId={band.id} title="Vacant" subtitle={`No ${band.label.toLowerCase()} added yet`} vacant compact />
      ) : (
        band.members.map((member) => (
          <PersonCard
            key={member._id || member.id || member.name}
            bandId={band.id}
            title={member.name}
            subtitle={member.designation || member.dutyType || band.label}
            compact
          />
        ))
      )}
    </div>
  </div>
)

const PersonCard = ({
  bandId,
  title,
  subtitle,
  vacant = false,
  compact = false,
}: {
  bandId: OrgBandId
  title: string
  subtitle: string
  vacant?: boolean
  compact?: boolean
}) => (
  <div
    className={`rounded-2xl bg-gradient-to-br px-4 shadow-sm ${BAND_TONE[bandId]} ${compact ? 'py-3' : 'min-w-[220px] py-4'} ${vacant ? 'border border-dashed border-slate-300 bg-none bg-white text-slate-400' : ''}`}
  >
    <p className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
    <p className={`mt-0.5 ${compact ? 'text-xs' : 'text-sm'} ${vacant ? 'text-slate-400' : 'opacity-80'}`}>{subtitle}</p>
  </div>
)

export default StaafOrgStructure
