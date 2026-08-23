import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/actvt/functions')

const ActvtFunctions: React.FC = () => (
  <RecordManager
    fields={[
      { key: 'title', label: 'Function title', required: true },
      { key: 'functionType', label: 'Type', type: 'select', options: ['Annual Day', 'Independence Day', 'Republic Day', 'Farewell', 'Investiture', 'Festival', 'Other'] },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'venue', label: 'Venue' },
      { key: 'incharge', label: 'Incharge' },
      { key: 'plan', label: 'Plan', type: 'textarea' },
      { key: 'outcome', label: 'Record / outcome', type: 'textarea' },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.title || 'Untitled function'}
    cardMeta={(item) => `${item.functionType || ''} · ${item.date || ''} · ${item.venue || ''}`}
  />
)

export default ActvtFunctions
