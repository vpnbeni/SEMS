import React, { useEffect, useMemo, useState } from 'react'
import teacherService, { type Teacher } from '@/services/teacherService'
import api from '@/services/api'

interface StaffRecord {
  id: string
  name: string
  employeeId: string
  designation: string
  department: string
  phone: string
  email: string
  schoolName: string
}

const normalize = (value: string | undefined) => String(value || '').trim().toLowerCase()

const Staff: React.FC = () => {
  const [records, setRecords] = useState<StaffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const centreDetailsResult = await api.get('/centre-details').catch(() => null)
        if (!mounted) return

        if (!mounted) return

        const centrePayload = centreDetailsResult?.data?.data || {}
        const centreSchoolCode = normalize(centrePayload?.centreSchoolCode)
        const centreName = normalize(centrePayload?.centreName)

        const allTeachers: Teacher[] = []
        let page = 1
        let totalPages = 1

        do {
          const teachersResult = await teacherService.getAll({
            page,
            limit: 100,
            isActive: true,
            sort: 'name',
          })
          if (!mounted) return

          allTeachers.push(...teachersResult.items)
          totalPages = Math.max(teachersResult.totalPages || 1, 1)
          page += 1
        } while (page <= totalPages)

        const mapped = allTeachers
          .map((teacher: Teacher) => {
            const id = String(teacher._id || teacher.id || '').trim()
            if (!id) return null

            return {
              id,
              name: String(teacher.name || '').trim() || 'Unnamed',
              employeeId: String(teacher.employeeId || '').trim() || '-',
              designation: String(teacher.designation || '').trim() || '-',
              department: String(teacher.department || '').trim() || '-',
              phone: String(teacher.mobileNo || teacher.phone || '').trim() || '-',
              email: String(teacher.email || '').trim() || '-',
              schoolName: String(teacher.schoolName || '').trim() || '-',
              schoolCode: normalize(teacher.schoolCode),
              schoolNameNormalized: normalize(teacher.schoolName),
            }
          })
          .filter(Boolean) as Array<
          StaffRecord & { schoolCode: string; schoolNameNormalized: string }
        >

        const filteredToCentre =
          centreSchoolCode || centreName
            ? mapped.filter((record) => {
                if (centreSchoolCode) {
                  return record.schoolCode === centreSchoolCode
                }
                return record.schoolNameNormalized === centreName
              })
            : mapped

        setRecords(
          filteredToCentre.map(({ schoolCode, schoolNameNormalized, ...record }) => record)
        )
      } catch {
        if (!mounted) return
        setError('Failed to load staff records.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const visibleRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return records

    return records.filter((record) =>
      [record.name, record.employeeId, record.designation, record.department, record.phone, record.email]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [records, search])

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
        Details of staff members currently working in the school.
      </p>

      <div className="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/60 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Staff</h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
              {visibleRecords.length} staff member{visibleRecords.length === 1 ? '' : 's'}
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full sm:w-72 px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm"
          />
        </div>

        {error && (
          <div className="px-5 py-3 text-sm text-error-600 bg-error-50 dark:bg-error-900/20 dark:text-error-300 border-b border-error-100 dark:border-error-900/40">
            {error}
          </div>
        )}

        {loading ? (
          <div className="px-5 py-8 text-sm text-secondary-500 dark:text-secondary-400">Loading staff...</div>
        ) : visibleRecords.length === 0 ? (
          <div className="px-5 py-8 text-sm text-secondary-500 dark:text-secondary-400">
            No staff records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-600 dark:text-secondary-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Sr No</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Employee ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Designation</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">School</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    className="border-t border-secondary-100 dark:border-secondary-800 text-secondary-700 dark:text-secondary-200"
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{record.name}</td>
                    <td className="px-4 py-3">{record.employeeId}</td>
                    <td className="px-4 py-3">{record.designation}</td>
                    <td className="px-4 py-3">{record.department}</td>
                    <td className="px-4 py-3">{record.phone}</td>
                    <td className="px-4 py-3">{record.email}</td>
                    <td className="px-4 py-3">{record.schoolName}</td>
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

export default Staff
