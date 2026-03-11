import React, { useState } from 'react'

interface House {
  id: string
  name: string
}

interface Club {
  id: string
  name: string
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const Activities: React.FC = () => {
  const [houses, setHouses] = useState<House[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [newHouseName, setNewHouseName] = useState('')
  const [newClubName, setNewClubName] = useState('')

  const handleAddHouse = () => {
    const name = newHouseName.trim()
    if (!name) return
    if (houses.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
      window.alert('House with this name already exists.')
      return
    }
    setHouses((prev) => [...prev, { id: genId(), name }])
    setNewHouseName('')
  }

  const handleAddClub = () => {
    const name = newClubName.trim()
    if (!name) return
    if (clubs.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      window.alert('Club with this name already exists.')
      return
    }
    setClubs((prev) => [...prev, { id: genId(), name }])
    setNewClubName('')
  }

  const handleDeleteHouse = (id: string) => {
    setHouses((prev) => prev.filter((h) => h.id !== id))
  }

  const handleDeleteClub = (id: string) => {
    setClubs((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <p className="text-sm text-secondary-500 dark:text-secondary-400">
        Manage school houses and clubs for use in other modules.
      </p>

      {/* Houses */}
      <div className="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/60 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Houses</h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
              {houses.length} house{houses.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newHouseName}
              onChange={(e) => setNewHouseName(e.target.value)}
              placeholder="Add house (e.g. Ashoka)"
              className="w-44 md:w-60 px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddHouse()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddHouse}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white"
            >
              Add
            </button>
          </div>
        </div>
        {houses.length === 0 ? (
          <div className="px-5 py-8 text-sm text-secondary-500 dark:text-secondary-400">
            No houses added yet. Use the field above to add your first house.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-600 dark:text-secondary-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-20">Sr No</th>
                  <th className="px-4 py-3 text-left font-semibold">House Name</th>
                  <th className="px-4 py-3 text-right font-semibold w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {houses.map((house, index) => (
                  <tr
                    key={house.id}
                    className="border-t border-secondary-100 dark:border-secondary-800 text-secondary-700 dark:text-secondary-200"
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{house.name}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteHouse(house.id)}
                        className="text-xs font-semibold text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clubs */}
      <div className="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/60 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Clubs</h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
              {clubs.length} club{clubs.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
              placeholder="Add club (e.g. Science Club)"
              className="w-44 md:w-60 px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddClub()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddClub}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white"
            >
              Add
            </button>
          </div>
        </div>
        {clubs.length === 0 ? (
          <div className="px-5 py-8 text-sm text-secondary-500 dark:text-secondary-400">
            No clubs added yet. Use the field above to add your first club.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-600 dark:text-secondary-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-20">Sr No</th>
                  <th className="px-4 py-3 text-left font-semibold">Club Name</th>
                  <th className="px-4 py-3 text-right font-semibold w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((club, index) => (
                  <tr
                    key={club.id}
                    className="border-t border-secondary-100 dark:border-secondary-800 text-secondary-700 dark:text-secondary-200"
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{club.name}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteClub(club.id)}
                        className="text-xs font-semibold text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Activities

