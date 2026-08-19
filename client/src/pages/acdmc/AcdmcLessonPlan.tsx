import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/acdmc/lesson-plans')

const AcdmcLessonPlan: React.FC = () => (
  <RecordManager
    title="Lesson Plan"
    subtitle="Prepare, edit, and manage class lesson plans."
    fields={[
      { key: 'title', label: 'Title', required: true },
      { key: 'teacherName', label: 'Teacher' },
      { key: 'className', label: 'Class' },
      { key: 'section', label: 'Section' },
      { key: 'subject', label: 'Subject' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'topic', label: 'Topic' },
      { key: 'objectives', label: 'Objectives', type: 'textarea' },
      { key: 'activities', label: 'Classroom activities', type: 'textarea' },
      { key: 'resources', label: 'Resources', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['draft', 'published'] },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.title || 'Untitled plan'}
    cardMeta={(item) => `${item.teacherName || 'Teacher'} · ${item.className || ''} ${item.section || ''} · ${item.subject || ''} · ${item.status || 'draft'}\n${item.topic || ''}`}
  />
)

export default AcdmcLessonPlan
