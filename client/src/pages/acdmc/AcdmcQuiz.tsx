import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/acdmc/quizzes')

const AcdmcQuiz: React.FC = () => (
  <RecordManager
    title="Quiz"
    subtitle="Prepare a topic quiz for students to attempt."
    fields={[
      { key: 'title', label: 'Title', required: true },
      { key: 'teacherName', label: 'Teacher' },
      { key: 'className', label: 'Class' },
      { key: 'section', label: 'Section' },
      { key: 'subject', label: 'Subject' },
      { key: 'topic', label: 'Topic' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'durationMinutes', label: 'Duration (minutes)', type: 'number' },
      { key: 'questions', label: 'Questions (one per line: question | A | B | C | D | answer)', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['draft', 'published'] },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.title || 'Untitled quiz'}
    cardMeta={(item) => `${item.topic || item.subject || ''} · ${item.className || ''} ${item.section || ''} · ${item.durationMinutes || 15} min`}
  />
)

export default AcdmcQuiz
