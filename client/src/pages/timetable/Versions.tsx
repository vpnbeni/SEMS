import React from 'react'
import TimetablePagePlaceholder from './TimetablePagePlaceholder'

const Versions: React.FC = () => {
  return (
    <TimetablePagePlaceholder
      eyebrow="Time Table"
      title="Versions"
      description="Track draft, published, and archived timetable snapshots. This page gives the timetable module a natural place for version history, rollback, and release notes."
      cards={[
        {
          title: 'Drafts',
          description: 'Keep in-progress timetable revisions separate until they are ready for staff review.',
        },
        {
          title: 'Published Copies',
          description: 'Store official timetable releases so teachers and coordinators know which version is active.',
        },
        {
          title: 'History & Rollback',
          description: 'Retain prior timetable versions for audit trails, comparison, and controlled restoration.',
        },
      ]}
    />
  )
}

export default Versions
