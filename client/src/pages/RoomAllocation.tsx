import React, { useState, useEffect } from 'react'
import { seatingPlanService, Room } from '../services/seatingPlanService'

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

  useEffect(() => {
    fetchRooms()
  }, [])

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
            <button className="btn btn-secondary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Auto Allocate
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
                      value={newRoom.roomNo}
                      onChange={(e) => setNewRoom({ ...newRoom, roomNo: e.target.value })}
                      placeholder="Room No"
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={newRoom.roomName}
                      onChange={(e) => setNewRoom({ ...newRoom, roomName: e.target.value })}
                      placeholder="Room Name"
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
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
    </div>
  )
}

export default RoomAllocation