import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/acdmc/assignments')

const AcdmcAssignment: React.FC = () => (
  <RecordManager
    fields={[
      { key: 'title', label: 'Title', required: true },
      { key: 'teacherName', label: 'Teacher' },
      { key: 'className', label: 'Class' },
      { key: 'section', label: 'Section' },
      { key: 'subject', label: 'Subject' },
      { key: 'assignedDate', label: 'Assigned on', type: 'date' },
      { key: 'dueDate', label: 'Due date', type: 'date' },
      { key: 'maxMarks', label: 'Max marks', type: 'number' },
      { key: 'instructions', label: 'Instructions', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['draft', 'published'] },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.title || 'Untitled assignment'}
    cardMeta={(item) => `${item.className || ''} ${item.section || ''} · ${item.subject || ''} · ${item.maxMarks || 0} marks\n${item.instructions || ''}`}
  />
)

export default AcdmcAssignment
