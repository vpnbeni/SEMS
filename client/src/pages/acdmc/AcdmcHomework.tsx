import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/acdmc/homework')

const AcdmcHomework: React.FC = () => (
  <RecordManager
    title="Homework"
    subtitle="Record and publish daily homework for students."
    fields={[
      { key: 'title', label: 'Title', required: true },
      { key: 'teacherName', label: 'Teacher' },
      { key: 'className', label: 'Class' },
      { key: 'section', label: 'Section' },
      { key: 'subject', label: 'Subject' },
      { key: 'assignedDate', label: 'Date', type: 'date' },
      { key: 'dueDate', label: 'Due date', type: 'date' },
      { key: 'description', label: 'Homework details', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['draft', 'published'] },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.title || 'Untitled homework'}
    cardMeta={(item) => `${item.className || ''} ${item.section || ''} · ${item.subject || ''} · due ${item.dueDate || '—'}\n${item.description || ''}`}
  />
)

export default AcdmcHomework
