import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Bus, MapPinned, ShieldAlert, Users } from 'lucide-react'
import trnstService, { type TransportOverview } from '@/services/trnstService'

const emptyStats = {
  vehicleCount: 0,
  routeCount: 0,
  activeVehicles: 0,
  maintenanceVehicles: 0,
  totalCapacity: 0,
  selfStudentCount: 0,
  totalStops: 0,
}

const TrnstOverview: React.FC = () => {
  const [data, setData] = useState<TransportOverview | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        setData(await trnstService.getOverview())
      } catch (error: any) {
        toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load transport overview.'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const stats = data?.stats || emptyStats

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="rounded-[28px] border border-amber-100 bg-white px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">TRNST</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">School transport</h2>
          <p className="mt-2 text-sm text-slate-500">Keep vehicle papers, assigned staff, and route stops in one place.</p>
        </div>

        {loading && !data ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">Loading transport records...</div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<Bus className="h-5 w-5" />} label="Vehicles" value={stats.vehicleCount} hint={`${stats.activeVehicles} running`} tone="bg-amber-50 text-amber-700" />
              <StatCard icon={<MapPinned className="h-5 w-5" />} label="Routes" value={stats.routeCount} hint={`${stats.totalStops} stops mapped`} tone="bg-sky-50 text-sky-700" />
              <StatCard icon={<Users className="h-5 w-5" />} label="Seat capacity" value={stats.totalCapacity} hint="Across active fleet" tone="bg-indigo-50 text-indigo-700" />
              <StatCard icon={<ShieldAlert className="h-5 w-5" />} label="Self students" value={stats.selfStudentCount || 0} hint="Coming to school without school transport" tone="bg-emerald-50 text-emerald-700" />
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Vehicles" to="/trnst/vehicles" action="Manage vehicles">
                {(data?.vehicles || []).slice(0, 5).map((vehicle) => (
                  <div key={vehicle._id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{vehicle.registrationNumber}</p>
                      <p className="text-xs text-slate-500">{vehicle.vehicleType} · {vehicle.capacity} seats · {vehicle.driverName || 'No driver assigned'}</p>
                    </div>
                    <StatusPill status={vehicle.status} />
                  </div>
                ))}
                {(data?.vehicles || []).length === 0 ? <Empty text="Add the first school bus or van." /> : null}
              </Panel>
              <Panel title="Routes" to="/trnst/routes" action="Manage routes">
                {(data?.routes || []).slice(0, 5).map((route) => (
                  <div key={route._id} className="rounded-2xl border border-slate-100 px-4 py-3">
                    <p className="font-semibold text-slate-900">{route.code} · {route.name}</p>
                    <p className="text-xs text-slate-500">
                      {route.startPoint || 'Start'} → {route.endPoint || 'End'} · {route.stops?.length || 0} stops
                    </p>
                  </div>
                ))}
                {(data?.routes || []).length === 0 ? <Empty text="Create a pickup route and attach a vehicle." /> : null}
              </Panel>
            </div>
            <Panel title="Self students" to="/trnst/self-students" action="Manage self students">
              {(data?.selfStudents || []).slice(0, 6).map((student) => (
                <div key={student._id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.className} {student.section} · {student.commuteMode}</p>
                  </div>
                </div>
              ))}
              {(data?.selfStudents || []).length === 0 ? <Empty text="Record students who walk, cycle, or are dropped by parents." /> : null}
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}

const StatCard = ({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: number; hint: string; tone: string }) => (
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

const Panel = ({ title, to, action, children }: { title: string; to: string; action: string; children: React.ReactNode }) => (
  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <Link to={to} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">{action}</Link>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
)

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    maintenance: 'bg-amber-50 text-amber-700',
    inactive: 'bg-slate-100 text-slate-600',
  }
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${map[status] || map.inactive}`}>{status}</span>
}

const Empty = ({ text }: { text: string }) => <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{text}</p>

export default TrnstOverview
