import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import trnstService, { type TransportVehicle, type VehicleStatus, type VehicleType } from '@/services/trnstService'

const emptyVehicle = {
  registrationNumber: '',
  vehicleType: 'Bus' as VehicleType,
  make: '',
  model: '',
  capacity: 40,
  driverName: '',
  driverPhone: '',
  conductorName: '',
  status: 'active' as VehicleStatus,
}

const TrnstVehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([])
  const [form, setForm] = useState(emptyVehicle)
  const [editingId, setEditingId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadVehicles = async () => {
    setLoading(true)
    try {
      setVehicles(await trnstService.getVehicles())
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load vehicles.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadVehicles()
  }, [])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.registrationNumber.trim()) {
      toast.error('Registration number is required.')
      return
    }
    setSaving(true)
    try {
      await trnstService.saveVehicle(form, editingId || undefined)
      toast.success(editingId ? 'Vehicle updated.' : 'Vehicle added.')
      setForm(emptyVehicle)
      setEditingId('')
      await loadVehicles()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save vehicle.'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (vehicle: TransportVehicle) => {
    setEditingId(vehicle._id)
    setForm({
      registrationNumber: vehicle.registrationNumber || '',
      vehicleType: vehicle.vehicleType || 'Bus',
      make: vehicle.make || '',
      model: vehicle.model || '',
      capacity: vehicle.capacity || 40,
      driverName: vehicle.driverName || '',
      driverPhone: vehicle.driverPhone || '',
      conductorName: vehicle.conductorName || '',
      status: vehicle.status || 'active',
    })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this vehicle from the fleet?')) return
    try {
      await trnstService.deleteVehicle(id)
      toast.success('Vehicle removed.')
      await loadVehicles()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove vehicle.'))
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto grid max-w-[1400px] gap-6 xl:grid-cols-[360px_1fr]">
        <form onSubmit={handleSave} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit vehicle' : 'Add vehicle'}</h2>
          <div className="mt-4 space-y-3">
            <Field label="Registration no." value={form.registrationNumber} onChange={(value) => setForm({ ...form, registrationNumber: value })} required />
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Type</span>
              <select value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value as VehicleType })} className={inputClass}>
                {['Bus', 'Mini Bus', 'Van', 'Winger', 'Other'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Make" value={form.make} onChange={(value) => setForm({ ...form, make: value })} />
              <Field label="Model" value={form.model} onChange={(value) => setForm({ ...form, model: value })} />
            </div>
            <Field label="Capacity" type="number" value={String(form.capacity)} onChange={(value) => setForm({ ...form, capacity: Number(value) || 1 })} />
            <Field label="Driver name" value={form.driverName} onChange={(value) => setForm({ ...form, driverName: value })} />
            <Field label="Driver phone" value={form.driverPhone} onChange={(value) => setForm({ ...form, driverPhone: value })} />
            <Field label="Conductor" value={form.conductorName} onChange={(value) => setForm({ ...form, conductorName: value })} />
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Status</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as VehicleStatus })} className={inputClass}>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? 'Saving...' : editingId ? 'Update vehicle' : 'Add vehicle'}
            </button>
            {editingId ? (
              <button type="button" onClick={() => { setEditingId(''); setForm(emptyVehicle) }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Fleet</h2>
          {loading ? <p className="mt-6 text-sm text-slate-500">Loading vehicles...</p> : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {vehicles.map((vehicle) => (
              <article key={vehicle._id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{vehicle.registrationNumber}</p>
                    <p className="text-xs text-slate-500">{vehicle.vehicleType} · {vehicle.make} {vehicle.model}</p>
                  </div>
                  <span className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold capitalize text-slate-600">{vehicle.status}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{vehicle.capacity} seats</p>
                <p className="text-sm text-slate-600">Driver: {vehicle.driverName || '—'}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => handleEdit(vehicle)} className="text-xs font-semibold text-indigo-600">Edit</button>
                  <button type="button" onClick={() => handleDelete(vehicle._id)} className="text-xs font-semibold text-rose-600">Remove</button>
                </div>
              </article>
            ))}
          </div>
          {!loading && vehicles.length === 0 ? <p className="mt-6 text-sm text-slate-500">No vehicles yet.</p> : null}
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

export default TrnstVehicles
