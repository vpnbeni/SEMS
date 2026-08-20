import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import trnstService, { type RouteShift, type TransportRoute, type TransportStop, type TransportVehicle } from '@/services/trnstService'

const emptyStop = (): TransportStop => ({ name: '', landmark: '', pickupTime: '', dropTime: '' })

const emptyRoute = {
  name: '',
  code: '',
  vehicleId: '',
  shift: 'both' as RouteShift,
  startPoint: '',
  endPoint: '',
  distanceKm: 0,
  stops: [emptyStop()],
}

const vehicleIdOf = (value: TransportRoute['vehicleId']) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value._id
}

const TrnstRoutes: React.FC = () => {
  const [routes, setRoutes] = useState<TransportRoute[]>([])
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([])
  const [form, setForm] = useState(emptyRoute)
  const [editingId, setEditingId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [nextRoutes, nextVehicles] = await Promise.all([trnstService.getRoutes(), trnstService.getVehicles()])
      setRoutes(nextRoutes)
      setVehicles(nextVehicles)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load routes.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const updateStop = (index: number, patch: Partial<TransportStop>) => {
    setForm((prev) => ({
      ...prev,
      stops: prev.stops.map((stop, stopIndex) => (stopIndex === index ? { ...stop, ...patch } : stop)),
    }))
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Route name and code are required.')
      return
    }
    setSaving(true)
    try {
      await trnstService.saveRoute({
        ...form,
        vehicleId: form.vehicleId || null,
        stops: form.stops.filter((stop) => stop.name.trim()),
      }, editingId || undefined)
      toast.success(editingId ? 'Route updated.' : 'Route added.')
      setForm(emptyRoute)
      setEditingId('')
      await loadData()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save route.'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (route: TransportRoute) => {
    setEditingId(route._id)
    setForm({
      name: route.name || '',
      code: route.code || '',
      vehicleId: vehicleIdOf(route.vehicleId),
      shift: route.shift || 'both',
      startPoint: route.startPoint || '',
      endPoint: route.endPoint || '',
      distanceKm: route.distanceKm || 0,
      stops: route.stops?.length ? route.stops : [emptyStop()],
    })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this route?')) return
    try {
      await trnstService.deleteRoute(id)
      toast.success('Route removed.')
      await loadData()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove route.'))
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto grid max-w-[1400px] gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={handleSave} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit route' : 'Add route'}</h2>
          <div className="mt-4 space-y-3">
            <Field label="Route name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <Field label="Code" value={form.code} onChange={(value) => setForm({ ...form, code: value })} required />
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Vehicle</span>
              <select value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })} className={inputClass}>
                <option value="">Unassigned</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    Bus {vehicle.busNo || '—'} · {vehicle.registrationNumber} · {vehicle.vehicleType}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Shift</span>
              <select value={form.shift} onChange={(event) => setForm({ ...form, shift: event.target.value as RouteShift })} className={inputClass}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="both">Both</option>
              </select>
            </label>
            <Field label="Start point" value={form.startPoint} onChange={(value) => setForm({ ...form, startPoint: value })} />
            <Field label="End point" value={form.endPoint} onChange={(value) => setForm({ ...form, endPoint: value })} />
            <Field label="Distance (km)" type="number" value={String(form.distanceKm)} onChange={(value) => setForm({ ...form, distanceKm: Number(value) || 0 })} />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600">Stops</p>
                <button type="button" onClick={() => setForm({ ...form, stops: [...form.stops, emptyStop()] })} className="text-xs font-semibold text-indigo-600">Add stop</button>
              </div>
              <div className="space-y-2">
                {form.stops.map((stop, index) => (
                  <div key={`${index}-${stop.name}`} className="rounded-xl border border-slate-100 p-3">
                    <input value={stop.name} onChange={(event) => updateStop(index, { name: event.target.value })} placeholder={`Stop ${index + 1} name`} className={`${inputClass} mb-2`} />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={stop.pickupTime} onChange={(event) => updateStop(index, { pickupTime: event.target.value })} placeholder="Pickup time" className={inputClass} />
                      <input value={stop.dropTime} onChange={(event) => updateStop(index, { dropTime: event.target.value })} placeholder="Drop time" className={inputClass} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? 'Saving...' : editingId ? 'Update route' : 'Add route'}
            </button>
            {editingId ? (
              <button type="button" onClick={() => { setEditingId(''); setForm(emptyRoute) }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
            ) : null}
          </div>
        </form>

        <section className="space-y-4">
          {loading ? <p className="text-sm text-slate-500">Loading routes...</p> : null}
          {routes.map((route) => {
            const vehicle = typeof route.vehicleId === 'object' ? route.vehicleId : null
            return (
              <article key={route._id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">{route.code} · {route.shift}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{route.name}</h3>
                    <p className="text-sm text-slate-500">{route.startPoint || 'Start'} → {route.endPoint || 'End'} · {route.distanceKm || 0} km</p>
                    <p className="text-sm text-slate-500">
                      Vehicle: {vehicle?.busNo ? `Bus ${vehicle.busNo}` : vehicle?.registrationNumber || 'Unassigned'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleEdit(route)} className="text-xs font-semibold text-indigo-600">Edit</button>
                    <button type="button" onClick={() => handleDelete(route._id)} className="text-xs font-semibold text-rose-600">Remove</button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(route.stops || []).map((stop, index) => (
                    <span key={`${route._id}-${index}`} className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {index + 1}. {stop.name}{stop.pickupTime ? ` · ${stop.pickupTime}` : ''}
                    </span>
                  ))}
                  {(route.stops || []).length === 0 ? <span className="text-xs text-slate-400">No stops added</span> : null}
                </div>
              </article>
            )
          })}
          {!loading && routes.length === 0 ? <p className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">No routes yet.</p> : null}
        </section>
      </div>
    </div>
  )
}

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400'

const Field = ({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) => (
  <label className="block text-sm">
    <span className="mb-1 block text-slate-600">{label}</span>
    <input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} className={inputClass} />
  </label>
)

export default TrnstRoutes
