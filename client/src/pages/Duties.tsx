import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import teacherService, { type Teacher } from '../services/teacherService'
import { seatingPlanService, type Room } from '../services/seatingPlanService'
import dutiesService, { type DutyRecord } from '../services/dutiesService'

const toLocalYmd = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatExamDate = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const Duties: React.FC = () => {
  const [examDate, setExamDate] = useState(toLocalYmd(new Date()))
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [functionaries, setFunctionaries] = useState<Teacher[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [duties, setDuties] = useState<DutyRecord[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [teachersRes, roomsRes] = await Promise.all([
        teacherService.getAll({ isActive: true, limit: 1000, sort: 'name' }),
        seatingPlanService.getRooms(),
      ])

      setFunctionaries(
        [...(teachersRes?.items || [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      )
      setRooms(roomsRes || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load duties setup data')
    } finally {
      setLoading(false)
    }
  }

  const fetchDuties = async (date: string) => {
    try {
      const data = await dutiesService.getDailyDuties(date)
      setDuties(data?.duties || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load duties')
      setDuties([])
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    fetchDuties(examDate)
  }, [examDate])

  const filteredFunctionaries = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return functionaries
    return functionaries.filter((f) => {
      const haystack = `${f.name} ${f.employeeId || ''} ${f.department || ''}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [functionaries, search])

  const dutyByRoomId = useMemo(() => {
    const map = new Map<string, DutyRecord>()
    duties.forEach((duty) => {
      if (duty?.room?._id) map.set(duty.room._id, duty)
    })
    return map
  }, [duties])

  const selectedCount = selectedIds.size
  const roomsCount = rooms.length

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllFiltered = () => {
    const ids = filteredFunctionaries.map((f) => f._id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id))

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const assignDuties = async () => {
    if (!examDate) {
      toast.error('Please select an exam date')
      return
    }
    if (selectedCount === 0) {
      toast.error('Please select at least one exam functionary')
      return
    }
    if (selectedCount < roomsCount) {
      toast.error(`Select at least ${roomsCount} functionaries to cover all rooms`)
      return
    }

    try {
      setAssigning(true)
      const data = await dutiesService.assignDailyDuties({
        examDate,
        functionaryIds: Array.from(selectedIds),
      })
      setDuties(data?.duties || [])
      toast.success(`Duties assigned for ${data?.totalAssigned || 0} room(s)`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to assign duties')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="text-gray-600 dark:text-gray-400">Loading duties setup...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="glass p-5 rounded-xl border border-secondary-200 dark:border-secondary-700">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Exam Day</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <div>Rooms: <span className="font-semibold text-gray-900 dark:text-white">{roomsCount}</span></div>
            <div>Selected Functionaries: <span className="font-semibold text-gray-900 dark:text-white">{selectedCount}</span></div>
            <div>Assigned Today: <span className="font-semibold text-gray-900 dark:text-white">{duties.length}</span></div>
          </div>
          <div className="md:ml-auto">
            <button
              onClick={assignDuties}
              disabled={assigning || roomsCount === 0}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? 'Assigning...' : 'Assign Duties'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-700 flex flex-col sm:flex-row sm:items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Exam Functionaries</h3>
            <div className="sm:ml-auto flex gap-2">
              <input
                type="text"
                placeholder="Search functionaries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
              />
              <button
                onClick={toggleSelectAllFiltered}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Toggle All
              </button>
            </div>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Select</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFunctionaries.map((f) => (
                  <tr key={f._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(f._id)}
                        onChange={() => toggleSelect(f._id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{f.department || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{f.employeeId}</td>
                  </tr>
                ))}
                {filteredFunctionaries.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No exam functionaries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Duty Record for {formatExamDate(examDate)}
            </h3>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Functionary</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rooms.map((room) => {
                  const duty = dutyByRoomId.get(room._id)
                  return (
                    <tr key={room._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="font-medium">{room.roomNo}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {room.roomName || '-'} • {room.floor || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {duty?.functionary?.name || <span className="text-gray-500 dark:text-gray-400">Not assigned</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                        {duty?.functionary?.employeeId || '-'}
                      </td>
                    </tr>
                  )
                })}
                {rooms.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No active rooms found. Add rooms first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Duties
