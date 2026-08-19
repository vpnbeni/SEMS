import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/actvt/sports')

const ActvtSports: React.FC = () => (
  <RecordManager
    title="Sports"
    subtitle="Organise, manage, and record the inter-house Annual Sports Meet."
    fields={[
      { key: 'title', label: 'Meet title', required: true },
      { key: 'year', label: 'Year' },
      { key: 'venue', label: 'Venue' },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'endDate', label: 'End date', type: 'date' },
      { key: 'events', label: 'Events', type: 'textarea' },
      { key: 'results', label: 'Results / records', type: 'textarea' },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.title || 'Annual Sports Meet'}
    cardMeta={(item) => `${item.year || ''} · ${item.venue || ''} · ${item.startDate || ''}`}
  />
)

export default ActvtSports
