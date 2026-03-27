import React, { useCallback, useMemo } from 'react'
import { useTimetable } from '@/contexts/TimetableContext'
import type { Teacher } from '@/services/teacherService'
import Teachers from '../Teachers'

const TimetableTeachers: React.FC = () => {
  const { teachers, deleteTeachers, teacherSubjectAllocations, setTeacherSubjectAllocations } =
    useTimetable()

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
      // Local-only delete for timetable teachers.
      // Do not call exam functionary APIs to keep both modules independent.
      const idSet = new Set(ids)
      deleteTeachers(ids)
      setTeacherSubjectAllocations(
        teacherSubjectAllocations.filter((allocation) => !idSet.has(allocation.teacherId))
      )
      return ids
    },
    [deleteTeachers, teacherSubjectAllocations, setTeacherSubjectAllocations]
  )

  return (
    <div>
      <Teachers
        hideStats
        hideDutyType
        hideSchoolCode
        hideSchoolName
        hidePagination
        disableApiMutations
        disableRowEdit
        sourceTeachers={timetableTeacherRows}
        onDeleteSelected={handleDeleteSelected}
        entityLabelSingular="teacher"
      />
    </div>
  )
}

export default TimetableTeachers
