import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/acdmc/curriculum')

const AcdmcCurriculum: React.FC = () => (
  <RecordManager
    fields={[
      { key: 'className', label: 'Class', required: true },
      { key: 'subject', label: 'Subject', required: true },
      { key: 'bookTitle', label: 'Book title', required: true },
      { key: 'author', label: 'Author' },
      { key: 'publisher', label: 'Publisher' },
      { key: 'sessionType', label: 'Session', type: 'select', options: ['current', 'next'] },
      { key: 'academicSession', label: 'Academic session (e.g. 2026-2027)' },
      { key: 'status', label: 'Status', type: 'select', options: ['proposed', 'selected'] },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.bookTitle || 'Untitled book'}
    cardMeta={(item) => `${item.className || ''} · ${item.subject || ''} · ${item.sessionType || 'current'} · ${item.status || 'proposed'}\n${item.author || ''} ${item.publisher ? `· ${item.publisher}` : ''}`}
  />
)

export default AcdmcCurriculum
