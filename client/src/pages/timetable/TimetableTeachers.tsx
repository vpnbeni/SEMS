import React, { useCallback, useMemo } from 'react'
import { useTimetable } from '@/contexts/TimetableContext'
import type { Teacher } from '@/services/teacherService'
import teacherService from '@/services/teacherService'
import Teachers from '../Teachers'

const TimetableTeachers: React.FC = () => {
  const { teachers, setTeachers, deleteTeachers, teacherSubjectAllocations, setTeacherSubjectAllocations } = useTimetable()

  const timetableTeacherRows = useMemo<Teacher[]>(() => {
    return teachers.map((teacher) => ({
      _id: teacher.id,
      id: teacher.id,
      name: teacher.name,
      oasisId: '',
      employeeId: '',
      designation: '',
      subjects: teacher.subjects,
      subjectCode: teacher.shortName || '',
      schoolName: '',
      schoolCode: '',
      isActive: true,
    }))
  }, [teachers])

  const handleDeleteSelected = useCallback(
    (ids: string[]) => {
      const deleteAndSync = async () => {
        const results = await Promise.allSettled(ids.map((id) => teacherService.deleteById(id)))

        const deletedIds = results
          .map((r, idx) => (r.status === 'fulfilled' ? ids[idx] : null))
          .filter((v): v is string => typeof v === 'string' && v.length > 0)

        if (deletedIds.length > 0) {
          const idSet = new Set(deletedIds)
          deleteTeachers(deletedIds)
          setTeacherSubjectAllocations(
            teacherSubjectAllocations.filter((allocation) => !idSet.has(allocation.teacherId))
          )
        }

        return deletedIds
      }

      return deleteAndSync()
    },
    [deleteTeachers, teacherSubjectAllocations, setTeacherSubjectAllocations]
  )

  const handleAddTeacherCreated = useCallback(
    (created?: Teacher) => {
      if (!created) return

      const teacherId = created._id || created.id
      if (!teacherId) return

      // TimetableContext expects subject *names* for matrix building.
      const subjectNames = (created.subjects || [])
        .map((s) => (typeof s === 'string' ? s : s?.name))
        .map((s) => String(s || '').trim())
        .filter(Boolean)

      const firstSubjectCode =
        created.subjects?.[0] && typeof created.subjects[0] !== 'string'
          ? (created.subjects[0] as { code?: string }).code
          : ''

      const shortName = String(created.subjectCode || firstSubjectCode || '').trim()

      const alreadyExists = teachers.some((t) => t.id === teacherId)
      if (alreadyExists) return

      setTeachers([
        ...teachers,
        {
          id: teacherId,
          name: created.name,
          shortName,
          subjects: subjectNames,
        },
      ])
    },
    [setTeachers, teachers]
  )

  return (
    <Teachers
      hideStats
      hideDutyType
      hideSchoolCode
      hideSchoolName
      sourceTeachers={timetableTeacherRows}
      onDeleteSelected={handleDeleteSelected}
      disableApiMutations
      disableRowEdit
      entityLabelSingular="teacher"
      showAddButton
      onAddTeacherCreated={handleAddTeacherCreated}
    />
  )
}

export default TimetableTeachers
