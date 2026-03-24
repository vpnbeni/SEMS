import React from 'react'
import TimetablePagePlaceholder from './TimetablePagePlaceholder'

const Substitution: React.FC = () => {
  return (
    <TimetablePagePlaceholder
      eyebrow="Time Table"
      title="Substitution"
      description="Manage same-day teacher substitutions without rewriting the core timetable. This is the space for handling absences, quick replacements, and temporary slot-level changes."
      cards={[
        {
          title: 'Absence Tracking',
          description: 'Record unavailable teachers and immediately identify which periods need replacement.',
        },
        {
          title: 'Substitute Suggestions',
          description: 'Review available teachers and choose replacements based on free periods and subject fit.',
        },
        {
          title: 'Daily Adjustments',
          description: 'Keep one-off substitution changes visible without disturbing the published weekly version.',
        },
      ]}
    />
  )
}

export default Substitution
