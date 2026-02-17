import React, { useState, useEffect } from 'react'
import { seatingPlanService, Room } from '../services/seatingPlanService'
import centreDatesheetService from '../services/centreDatesheetService'

const RoomAllocation: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<Room>>({})
  const [newRoom, setNewRoom] = useState<Partial<Room>>({
    roomNo: '',
    roomName: '',
    floor: ''
  })
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAllocating, setIsAllocating] = useState(false)
  const [examDates, setExamDates] = useState<string[]>([])
  const [loadingExamDates, setLoadingExamDates] = useState(false)
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('auto')
  const [loadingAllocationMode, setLoadingAllocationMode] = useState(false)
  const [dateRoomOrderDraft, setDateRoomOrderDraft] = useState<Record<string, string[]>>({})
  const [requiredRoomsByDate, setRequiredRoomsByDate] = useState<Record<string, number>>({})
  const [isSavingAllocation, setIsSavingAllocation] = useState(false)

  useEffect(() => {
    fetchRooms()
    fetchExamDates()
    fetchAllocationMode()
  }, [])

  const normalizeDateKey = (value: string | Date) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
  }

  const formatDateLabel = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-')
    if (!year || !month || !day) return dateKey
    return `${day}.${month}.${year.slice(-2)}`
  }

  const toSortedUniqueDateKeys = (values: string[] = []) => (
    Array.from(
      new Set(values.map((value) => normalizeDateKey(value)).filter(Boolean))
    ).sort()
  )

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const data = await seatingPlanService.getRooms()
      setRooms(data)
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExamDates = async () => {
    try {
      setLoadingExamDates(true)
      const response = await centreDatesheetService.getEntries()
      const entries = Array.isArray(response?.data) ? response.data : []
      const nextRequiredRooms: Record<string, number> = {}
      const uniqueDates = Array.from(
        new Set(
          entries
            .map((entry) => {
              const dateKey = normalizeDateKey(entry.examDate)
              if (dateKey) {
                const roomsNeeded = Number(entry.roomsNeeded || 0)
                const current = nextRequiredRooms[dateKey] || 0
                // Sum room demand across all subjects scheduled on the same date.
                nextRequiredRooms[dateKey] = current + roomsNeeded
              }
              return dateKey
            })
            .filter(Boolean) as string[]
        )
      ).sort()
      setExamDates(uniqueDates)
      setRequiredRoomsByDate(nextRequiredRooms)
    } catch (error) {
      console.error('Failed to fetch exam dates for allocation:', error)
      setExamDates([])
      setRequiredRoomsByDate({})
    } finally {
      setLoadingExamDates(false)
    }
  }

  const fetchAllocationMode = async () => {
    try {
      setLoadingAllocationMode(true)
      const mode = await seatingPlanService.getRoomAllocationMode()
      setAllocationMode(mode)
    } catch (error) {
      console.error('Failed to fetch room allocation mode:', error)
      setAllocationMode('auto')
    } finally {
      setLoadingAllocationMode(false)
    }
  }

  useEffect(() => {
    if (rooms.length === 0 || examDates.length === 0) {
      setDateRoomOrderDraft({})
      return
    }

    const draft: Record<string, string[]> = {}
    examDates.forEach((dateKey) => {
      const ordered = rooms
        .map((room) => {
          const mapValue = room.allocationOrderByDate || {}
          const orderValue = Number((mapValue as Record<string, number>)[dateKey])
          return {
            roomId: room._id,
            order: Number.isFinite(orderValue) && orderValue > 0 ? orderValue : null,
            fallbackSelected: (room.allocatedExamDates || []).includes(dateKey),
          }
        })
        .filter((item) => item.order !== null || item.fallbackSelected)
        .sort((a, b) => {
          if (a.order !== null && b.order !== null) return a.order - b.order
          if (a.order !== null) return -1
          if (b.order !== null) return 1
          return 0
        })
        .map((item) => item.roomId)

      draft[dateKey] = ordered
    })
    setDateRoomOrderDraft(draft)
  }, [rooms, examDates])

  const toggleRoomDateAllocation = (roomId: string, dateKey: string) => {
    if (allocationMode !== 'manual') return

    setDateRoomOrderDraft((prev) => {
      const current = [...(prev[dateKey] || [])]
      const index = current.indexOf(roomId)
      const requiredRooms = Number(requiredRoomsByDate[dateKey] || 0)
      if (index >= 0) {
        current.splice(index, 1)
      } else {
        if (requiredRooms > 0 && current.length >= requiredRooms) {
          alert(`Only ${requiredRooms} room(s) can be selected for ${formatDateLabel(dateKey)}.`)
          return prev
        }
        current.push(roomId)
      }
      return {
        ...prev,
        [dateKey]: current,
      }
    })
  }

  const isRoomSelectedForDate = (roomId: string, dateKey: string) =>
    (dateRoomOrderDraft[dateKey] || []).includes(roomId)

  const getSelectionOrder = (roomId: string, dateKey: string) => {
    const index = (dateRoomOrderDraft[dateKey] || []).indexOf(roomId)
    return index >= 0 ? index + 1 : null
  }

  const isDateSelectionLimitReached = (dateKey: string) => {
    const required = Number(requiredRoomsByDate[dateKey] || 0)
    if (required <= 0) return false
    return (dateRoomOrderDraft[dateKey] || []).length >= required
  }

  const handleModeChange = async (mode: 'auto' | 'manual') => {
    if (mode === allocationMode) return
    try {
      setLoadingAllocationMode(true)
      const savedMode = await seatingPlanService.updateRoomAllocationMode(mode)
      setAllocationMode(savedMode)
    } catch (error) {
      console.error('Failed to update room allocation mode:', error)
      alert('Failed to update allocation mode')
    } finally {
      setLoadingAllocationMode(false)
    }
  }

  const handleSaveRoomAllocations = async () => {
    if (rooms.length === 0) return
    if (allocationMode === 'manual') {
      const invalidDates = examDates.filter((dateKey) => {
        const required = Number(requiredRoomsByDate[dateKey] || 0)
        if (required <= 0) return false
        const selected = (dateRoomOrderDraft[dateKey] || []).length
        return selected !== required
      })
      if (invalidDates.length > 0) {
        alert(`Please select exactly required rooms for: ${invalidDates.map((d) => formatDateLabel(d)).join(', ')}`)
        return
      }
    }

    const updates = rooms
      .map((room) => {
        const nextDates: string[] = []
        const nextOrderByDate: Record<string, number> = {}

        examDates.forEach((dateKey) => {
          const roomOrder = getSelectionOrder(room._id, dateKey)
          if (roomOrder !== null) {
            nextDates.push(dateKey)
            nextOrderByDate[dateKey] = roomOrder
          }
        })

        const currentDates = toSortedUniqueDateKeys(room.allocatedExamDates || [])
        const currentOrderByDate = room.allocationOrderByDate || {}
        const changed = JSON.stringify(currentDates) !== JSON.stringify(toSortedUniqueDateKeys(nextDates))
          || JSON.stringify(currentOrderByDate) !== JSON.stringify(nextOrderByDate)
        if (!changed) return null
        return seatingPlanService.updateRoom(room._id, {
          allocatedExamDates: nextDates,
          allocationOrderByDate: nextOrderByDate,
        })
      })
      .filter(Boolean) as Array<Promise<Room>>

    if (updates.length === 0) {
      alert('No allocation changes to save')
      return
    }

    setIsSavingAllocation(true)
    try {
      await Promise.all(updates)
      await fetchRooms()
      alert(`Saved room allocation for ${updates.length} room(s)`)
    } catch (error) {
      console.error('Failed to save room allocation:', error)
      alert('Failed to save room allocation')
    } finally {
      setIsSavingAllocation(false)
    }
  }

  const handleAddRoom = async () => {
    if (newRoom.roomNo && newRoom.floor) {
      try {
        await seatingPlanService.createRoom(newRoom)
        await fetchRooms()
        setNewRoom({ roomNo: '', roomName: '', floor: '' })
        setIsAddingNew(false)
      } catch (error) {
        console.error('Failed to add room:', error)
        alert('Failed to add room')
      }
    }
  }

  const handleEditRoom = (room: Room) => {
    setEditingId(room._id)
    setEditingData(room)
  }

  const handleSaveRoom = async (id: string) => {
    try {
      await seatingPlanService.updateRoom(id, editingData)
      await fetchRooms()
      setEditingId(null)
      setEditingData({})
    } catch (error) {
      console.error('Failed to update room:', error)
      alert('Failed to update room')
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllOnPage = () => {
    const ids = rooms.map((r) => r._id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Delete ${selectedIds.size} selected room(s)? This cannot be undone.`)) return
    setIsDeleting(true)
    const ids = Array.from(selectedIds)
    try {
      await Promise.all(ids.map((id) => seatingPlanService.deleteRoom(id)))
      clearSelection()
      await fetchRooms()
    } catch (error) {
      console.error('Failed to delete rooms:', error)
      alert('Failed to delete some rooms')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAllocate = async () => {
    if (rooms.length === 0) {
      alert('No rooms available to allocate')
      return
    }

    const getDefaultFloor = (roomNo: string, fallbackIndex: number) => {
      const leading = String(roomNo || '').trim().match(/^(\d+)/)
      const number = leading ? parseInt(leading[1], 10) : fallbackIndex + 1
      if (number <= 20) return 'Ground Floor'
      if (number <= 40) return 'First Floor'
      if (number <= 60) return 'Second Floor'
      return 'Third Floor'
    }

    setIsAllocating(true)
    try {
      const updates = rooms
        .map((room, index) => {
          const nextRoomName = String(room.roomName || '').trim() || `Room ${room.roomNo || index + 1}`
          const nextFloor = String(room.floor || '').trim() || getDefaultFloor(room.roomNo, index)
          const currentRoomName = String(room.roomName || '').trim()
          const currentFloor = String(room.floor || '').trim()
          const shouldUpdate = nextRoomName !== currentRoomName || nextFloor !== currentFloor
          if (!shouldUpdate) return null
          return seatingPlanService.updateRoom(room._id, {
            roomName: nextRoomName,
            floor: nextFloor,
          })
        })
        .filter(Boolean) as Array<Promise<Room>>

      if (updates.length > 0) {
        await Promise.all(updates)
        await fetchRooms()
      }

      alert(updates.length > 0 ? `Allocated ${updates.length} room(s) successfully` : 'All rooms are already allocated')
    } catch (error) {
      console.error('Failed to allocate rooms:', error)
      alert('Failed to allocate rooms')
    } finally {
      setIsAllocating(false)
    }
  }

  const allOnPageSelected = rooms.length > 0 && rooms.every((r) => selectedIds.has(r._id))
  const someOnPageSelected = rooms.some((r) => selectedIds.has(r._id))

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingData({})
    setIsAddingNew(false)
    setNewRoom({ roomNo: '', roomName: '', floor: '' })
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="text-gray-600 dark:text-gray-400">Loading rooms...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Rooms Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Examination Rooms
          </h3>
          <div className="flex space-x-3">
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-700 shadow-sm text-sm font-medium rounded-lg text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
              >
                Delete {selectedIds.size} selected
              </button>
            )}
            <button
              onClick={handleAllocate}
              disabled={isAllocating}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isAllocating ? 'Allocating...' : 'Allocate'}
            </button>
            <button 
              onClick={() => setIsAddingNew(true)}
              disabled={isAddingNew}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Room
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected
                      }}
                      onChange={selectAllOnPage}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      aria-label="Select all on page"
                    />
                  </label>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sr No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Room No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Room Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Floor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Add New Room Row */}
              {isAddingNew && (
                <tr className="bg-blue-50 dark:bg-blue-900/20">
                  <td className="px-4 py-4 w-12" />
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      title="Room number"
                      value={newRoom.roomNo}
                      onChange={(e) => setNewRoom({ ...newRoom, roomNo: e.target.value })}
                      placeholder="Room No"
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      title="Room name"
                      value={newRoom.roomName}
                      onChange={(e) => setNewRoom({ ...newRoom, roomName: e.target.value })}
                      placeholder="Room Name"
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      title="Room floor"
                      value={newRoom.floor}
                      onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    >
                      <option value="">Select Floor</option>
                      <option value="Ground Floor">Ground Floor</option>
                      <option value="First Floor">First Floor</option>
                      <option value="Second Floor">Second Floor</option>
                      <option value="Third Floor">Third Floor</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={handleAddRoom}
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              )}

              {/* Existing Rooms */}
              {rooms.map((room, index) => {
                const isEditing = editingId === room._id

                return (
                  <tr key={room._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 w-12">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(room._id)}
                          onChange={() => toggleSelection(room._id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                          aria-label={`Select room ${room.roomNo}`}
                        />
                      </label>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {isEditing ? (
                        <input
                          type="text"
                          title="Edit room number"
                          placeholder="Room No"
                          value={editingData.roomNo || ''}
                          onChange={(e) => setEditingData({ ...editingData, roomNo: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white">{room.roomNo}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <input
                          type="text"
                          title="Edit room name"
                          placeholder="Room Name"
                          value={editingData.roomName || ''}
                          onChange={(e) => setEditingData({ ...editingData, roomName: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white">{room.roomName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <select
                          title="Edit room floor"
                          value={editingData.floor || ''}
                          onChange={(e) => setEditingData({ ...editingData, floor: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        >
                          <option value="Ground Floor">Ground Floor</option>
                          <option value="First Floor">First Floor</option>
                          <option value="Second Floor">Second Floor</option>
                          <option value="Third Floor">Third Floor</option>
                        </select>
                      ) : (
                        <span className="text-gray-900 dark:text-white">{room.floor}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveRoom(room._id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEditRoom(room)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}

              {/* Empty State */}
              {rooms.length === 0 && !isAddingNew && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Rooms Available
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Add examination rooms and configure seating arrangements for your exams.
                    </p>
                    <button 
                      onClick={() => setIsAddingNew(true)}
                      className="btn btn-primary"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Room
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Room Allocation Matrix */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Room Allocation by Date</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {allocationMode === 'auto'
                ? 'Auto mode active: system will allocate rooms automatically by allocation guidelines.'
                : 'Manual mode active: select rooms in checkbox order for each date.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                type="button"
                onClick={() => handleModeChange('auto')}
                disabled={loadingAllocationMode}
                className={`px-3 py-1.5 text-xs font-semibold ${allocationMode === 'auto'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('manual')}
                disabled={loadingAllocationMode}
                className={`px-3 py-1.5 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 ${allocationMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Manual
              </button>
            </div>
            <button
              onClick={handleSaveRoomAllocations}
              disabled={allocationMode !== 'manual' || isSavingAllocation || rooms.length === 0 || examDates.length === 0}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingAllocation ? 'Saving...' : 'Save Allocation'}
            </button>
          </div>
        </div>

        {loadingExamDates ? (
          <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">Loading exam dates...</div>
        ) : examDates.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
            No centre datesheet dates found. Import/generate centre datesheet to enable allocation columns.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border-2 border-gray-400 dark:border-gray-500">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="border border-gray-400 dark:border-gray-500 px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider">Sr No</th>
                  <th className="border border-gray-400 dark:border-gray-500 px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider">Room No</th>
                  <th className="border border-gray-400 dark:border-gray-500 px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider">Name</th>
                  {examDates.map((dateKey) => (
                    <th
                      key={dateKey}
                      className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider whitespace-nowrap"
                    >
                      {formatDateLabel(dateKey)}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th
                    colSpan={3}
                    className="border border-gray-400 dark:border-gray-500 px-4 py-2 text-left text-[11px] font-semibold text-gray-700 dark:text-gray-100 uppercase tracking-wide"
                  >
                    Rooms Required
                  </th>
                  {examDates.map((dateKey) => {
                    const required = Number(requiredRoomsByDate[dateKey] || 0)
                    return (
                      <th
                        key={`required-${dateKey}`}
                        className="border border-gray-400 dark:border-gray-500 px-4 py-2 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-100 whitespace-nowrap"
                      >
                        {required}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {rooms.map((room, index) => {
                  return (
                    <tr key={`allocation-${room._id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border border-gray-400 dark:border-gray-500 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{index + 1}</td>
                      <td className="border border-gray-400 dark:border-gray-500 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{room.roomNo}</td>
                      <td className="border border-gray-400 dark:border-gray-500 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {room.roomName || `Room ${room.roomNo}`}
                      </td>
                      {examDates.map((dateKey) => (
                        <td key={`${room._id}-${dateKey}`} className="border border-gray-400 dark:border-gray-500 px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isRoomSelectedForDate(room._id, dateKey)}
                            onChange={() => toggleRoomDateAllocation(room._id, dateKey)}
                            disabled={
                              allocationMode !== 'manual' ||
                              (!isRoomSelectedForDate(room._id, dateKey) && isDateSelectionLimitReached(dateKey))
                            }
                            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                            title={`${room.roomNo} - ${formatDateLabel(dateKey)}${allocationMode === 'manual' ? '' : ' (disabled in auto mode)'}`}
                          />
                          {allocationMode === 'manual' && getSelectionOrder(room._id, dateKey) !== null && (
                            <div className="text-[10px] mt-1 text-blue-700 dark:text-blue-300 font-semibold">
                              #{getSelectionOrder(room._id, dateKey)}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default RoomAllocation