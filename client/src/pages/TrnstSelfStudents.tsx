import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import trnstService, {
  type CommuteMode,
  type SelfStudentOption,
  type SelfStudentRecord,
} from '@/services/trnstService'

const COMMUTE_MODES: CommuteMode[] = ['Walk', 'Bicycle', 'Parent drop', 'Own vehicle', 'Other']

const TrnstSelfStudents: React.FC = () => {
  const [records, setRecords] = useState<SelfStudentRecord[]>([])
  const [availableStudents, setAvailableStudents] = useState<SelfStudentOption[]>([])
  const [classOptions, setClassOptions] = useState<Array<{ className: string; sections: string[] }>>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [commuteMode, setCommuteMode] = useState<CommuteMode>('Walk')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const sectionOptions = useMemo(
    () => classOptions.find((item) => item.className === selectedClass)?.sections || [],
    [classOptions, selectedClass]
  )

  const loadData = async (className = selectedClass, section = selectedSection) => {
    setLoading(true)
    try {
      const payload = await trnstService.getSelfStudents({
        className: className || undefined,
        section: section || undefined,
      })
      setRecords(payload.records || [])
      setAvailableStudents(payload.availableStudents || [])
      setClassOptions(payload.classOptions || [])
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load self students.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData('', '')
  }, [])

  useEffect(() => {
    if (!selectedClass) {
      setSelectedSection('')
      return
    }
    if (sectionOptions.length && !sectionOptions.includes(selectedSection)) {
      setSelectedSection(sectionOptions[0])
    }
  }, [selectedClass, sectionOptions, selectedSection])

  useEffect(() => {
    if (!selectedClass) return
    void loadData(selectedClass, selectedSection)
  }, [selectedClass, selectedSection])

  useEffect(() => {
    const student = availableStudents.find((item) => item._id === selectedStudentId)
    setGuardianPhone(student?.guardianPhone || student?.phone || '')
  }, [selectedStudentId, availableStudents])

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return records
    return records.filter((item) =>
      [item.name, item.rollNumber, item.className, item.section, item.commuteMode]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [records, searchQuery])

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedStudentId) {
      toast.error('Select a student.')
      return
    }
    setSaving(true)
    try {
      await trnstService.saveSelfStudent({
        studentId: selectedStudentId,
        commuteMode,
        guardianPhone,
        notes,
      })
      toast.success('Student added to self-commute list.')
      setSelectedStudentId('')
      setNotes('')
      await loadData(selectedClass, selectedSection)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to add student.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this student from the self-commute list?')) return
    try {
      await trnstService.deleteSelfStudent(id)
      toast.success('Student removed.')
      await loadData(selectedClass, selectedSection)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove student.'))
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="rounded-[28px] border border-emerald-100 bg-white px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Self commute</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Self students</h2>
          <p className="mt-2 text-sm text-slate-500">
            Keep a list of students who come to school on their own, not by school bus or van.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <form onSubmit={handleAdd} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Add student</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Class</span>
                <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} className={inputClass}>
                  <option value="">All classes</option>
                  {classOptions.map((item) => (
                    <option key={item.className} value={item.className}>{item.className}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Section</span>
                <select value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)} disabled={!selectedClass} className={inputClass}>
                  <option value="">{selectedClass ? 'All sections' : 'Select class first'}</option>
                  {sectionOptions.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Student</span>
                <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className={inputClass}>
                  <option value="">Select student</option>
                  {availableStudents.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} · {student.class} {student.section} · {student.rollNumber || 'No roll'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Comes by</span>
                <select value={commuteMode} onChange={(event) => setCommuteMode(event.target.value as CommuteMode)} className={inputClass}>
                  {COMMUTE_MODES.map((mode) => <option key={mode}>{mode}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Guardian phone</span>
                <input value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Notes</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={inputClass} />
              </label>
            </div>
            <button type="submit" disabled={saving} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Add self student'}
            </button>
          </form>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">{filteredRecords.length} self students</h3>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, class, or mode"
                className="w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            {loading ? <p className="mt-6 text-sm text-slate-500">Loading students...</p> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredRecords.map((item) => (
                <article key={item._id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.className} {item.section} · {item.rollNumber || 'No roll'}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">{item.commuteMode}</span>
                  </div>
                  {item.guardianPhone ? <p className="mt-2 text-sm text-slate-600">{item.guardianPhone}</p> : null}
                  {item.notes ? <p className="mt-1 text-sm text-slate-500">{item.notes}</p> : null}
                  <button type="button" onClick={() => handleDelete(item._id)} className="mt-3 text-xs font-semibold text-rose-600">Remove</button>
                </article>
              ))}
            </div>
            {!loading && filteredRecords.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">No self-commuting students recorded yet.</p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400'

export default TrnstSelfStudents
