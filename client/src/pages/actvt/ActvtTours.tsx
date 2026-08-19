import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/actvt/tours')

const ActvtTours: React.FC = () => (
  <RecordManager
    title="Tours & Trips"
    subtitle="Organise educational tours and collect student feedback."
    fields={[
      { key: 'title', label: 'Title', required: true },
      { key: 'destination', label: 'Destination' },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'endDate', label: 'End date', type: 'date' },
      { key: 'classes', label: 'Classes' },
      { key: 'description', label: 'Plan / itinerary', type: 'textarea' },
      { key: 'students', label: 'Students going (one name per line)', type: 'textarea' },
      { key: 'feedback', label: 'Student feedback', type: 'textarea' },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.title || 'Untitled trip'}
    cardMeta={(item) => `${item.destination || ''} · ${item.startDate || ''} to ${item.endDate || ''} · ${item.classes || ''}`}
  />
)

export default ActvtTours
