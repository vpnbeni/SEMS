import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Bus, Pencil, Trash2, UserRound } from 'lucide-react'
import teacherService, { type Teacher } from '@/services/teacherService'
import trnstService, { type TransportVehicle, type VehicleStatus, type VehicleType } from '@/services/trnstService'
import { isDriver } from '@/utils/staafStaff'

const VEHICLE_TONES = ['#f59e0b', '#0ea5e9', '#6366f1', '#10b981', '#ef4444', '#8b5cf6']

const emptyVehicle = {
  busNo: '',
  registrationNumber: '',
  vehicleType: 'Bus' as VehicleType,
  make: '',
  model: '',
  capacity: 40,
  driverId: '',
  status: 'active' as VehicleStatus,
}

const inputClass =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400'

const TrnstVehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([])
  const [drivers, setDrivers] = useState<Teacher[]>([])
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

  const loadDrivers = async () => {
    try {
      const response = await teacherService.getAll({
        dutyType: 'Driver',
        isActive: true,
        limit: 200,
        sort: 'name',
      })
      setDrivers((response.items || []).filter(isDriver))
    } catch {
      setDrivers([])
    }
  }

  useEffect(() => {
    void loadVehicles()
    void loadDrivers()
  }, [])

  const assignedDriverIds = useMemo(() => {
    const map = new Map<string, string>()
    vehicles.forEach((vehicle) => {
      if (vehicle.driverId && vehicle._id !== editingId) {
        map.set(String(vehicle.driverId), vehicle.busNo || vehicle.registrationNumber)
      }
    })
    return map
  }, [vehicles, editingId])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.busNo.trim()) {
      toast.error('Bus number is required.')
      return
    }
    if (!form.registrationNumber.trim()) {
      toast.error('Registration number is required.')
      return
    }
    setSaving(true)
    try {
      await trnstService.saveVehicle(
        {
          ...form,
          driverId: form.driverId || null,
        },
        editingId || undefined
      )
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
      busNo: vehicle.busNo || '',
      registrationNumber: vehicle.registrationNumber || '',
      vehicleType: vehicle.vehicleType || 'Bus',
      make: vehicle.make || '',
      model: vehicle.model || '',
      capacity: vehicle.capacity || 40,
      driverId: vehicle.driverId ? String(vehicle.driverId) : '',
      status: vehicle.status || 'active',
    })
  }

  const handleCancelEdit = () => {
    setEditingId('')
    setForm(emptyVehicle)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this vehicle from the fleet?')) return
    try {
      await trnstService.deleteVehicle(id)
      toast.success('Vehicle removed.')
      if (editingId === id) handleCancelEdit()
      await loadVehicles()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove vehicle.'))
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            {editingId ? (
              <div className="mb-0.5 flex w-full items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-500">Edit vehicle</p>
                <button type="button" onClick={handleCancelEdit} className="text-[11px] font-semibold text-slate-500 hover:text-slate-700">
                  Cancel edit
                </button>
              </div>
            ) : null}

            <label className="w-[72px] shrink-0 text-[11px]">
              <span className="mb-1 block font-medium text-slate-500">
                {editingId ? 'Bus no.' : 'Add bus'}
              </span>
              <input
                required
                value={form.busNo}
                onChange={(event) => setForm({ ...form, busNo: event.target.value })}
                placeholder="12"
                className={inputClass}
              />
            </label>

            <label className="w-[120px] shrink-0 text-[11px]">
              <span className="mb-1 block font-medium text-slate-500">Type</span>
              <select
                value={form.vehicleType}
                onChange={(event) => setForm({ ...form, vehicleType: event.target.value as VehicleType })}
                className={inputClass}
              >
                {['Bus', 'Mini Bus', 'Van', 'Winger', 'Other'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="min-w-[140px] flex-1 text-[11px]">
              <span className="mb-1 block font-medium text-slate-500">Registration no.</span>
              <input
                required
                value={form.registrationNumber}
                onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })}
                placeholder="Number plate"
                className={inputClass}
              />
            </label>

            <label className="w-[72px] shrink-0 text-[11px]">
              <span className="mb-1 block font-medium text-slate-500">Seats</span>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) || 1 })}
                className={inputClass}
              />
            </label>

            <label className="min-w-[180px] flex-[1.2] text-[11px]">
              <span className="mb-1 block font-medium text-slate-500">Driver (STAAF)</span>
              <select
                value={form.driverId}
                onChange={(event) => setForm({ ...form, driverId: event.target.value })}
                className={inputClass}
              >
                <option value="">Select driver</option>
                {drivers.map((driver) => {
                  const assignedTo = assignedDriverIds.get(String(driver._id))
                  return (
                    <option key={driver._id} value={driver._id}>
                      {driver.name}
                      {assignedTo ? ` (Bus ${assignedTo})` : ''}
                    </option>
                  )
                })}
              </select>
            </label>

            <label className="w-[100px] shrink-0 text-[11px]">
              <span className="mb-1 block font-medium text-slate-500">Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as VehicleStatus })}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="h-9 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </button>
          </div>

          {drivers.length === 0 ? (
            <p className="mt-2 text-[11px] text-amber-700">
              No STAAF drivers found. Add staff with type Driver under STAAF to assign them here.
            </p>
          ) : null}
        </form>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {vehicles.length} Bus{vehicles.length === 1 ? '' : 'es'}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">Fleet cards with STAAF-assigned drivers.</p>
            </div>
          </div>

          {loading ? <p className="mt-6 text-sm text-slate-500">Loading vehicles...</p> : null}

          {!loading && vehicles.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">No buses yet</p>
              <p className="mt-1 text-sm text-slate-500">Add a bus number, plate, and assign a STAAF driver.</p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {vehicles.map((vehicle, index) => {
                const tone = VEHICLE_TONES[index % VEHICLE_TONES.length]
                return (
                  <article
                    key={vehicle._id}
                    className="flex flex-col overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-[0_16px_36px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-20px_rgba(15,23,42,0.5)]"
                  >
                    <div className="h-28 shrink-0" style={{ backgroundColor: tone }} />

                    <div className="relative z-[1] -mt-16 px-4">
                      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border-4 border-white bg-white p-2 shadow-md">
                        <div
                          className="flex h-full w-full flex-col items-center justify-center rounded-xl text-white"
                          style={{ backgroundColor: tone }}
                        >
                          <Bus className="h-6 w-6 opacity-90" />
                          <p className="mt-1 text-lg font-bold leading-none">Bus {vehicle.busNo || '—'}</p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-90">
                            {vehicle.vehicleType}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="relative flex flex-1 flex-col px-3 pb-3 pt-3">
                      <div className="flex flex-1 flex-col text-center">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {vehicle.registrationNumber}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                          {vehicle.capacity || 0} seats
                          {(vehicle.make || vehicle.model)
                            ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}`
                            : ''}
                        </p>
                        <p className="mt-2 inline-flex items-center justify-center gap-1 text-xs text-slate-600">
                          <UserRound className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{vehicle.driverName || 'No driver assigned'}</span>
                        </p>
                        {vehicle.driverPhone ? (
                          <p className="mt-0.5 text-[11px] text-slate-400">{vehicle.driverPhone}</p>
                        ) : null}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-600">
                          {vehicle.status}
                        </span>
                        <div className="flex shrink-0 gap-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(vehicle)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(vehicle._id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default TrnstVehicles
