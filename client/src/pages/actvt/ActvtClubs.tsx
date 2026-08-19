import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/actvt/clubs')

const ActvtClubs: React.FC = () => (
  <RecordManager
    title="Clubs"
    subtitle="Create clubs, assign students, and organise club activities."
    fields={[
      { key: 'name', label: 'Club name', required: true },
      { key: 'incharge', label: 'Teacher incharge' },
      { key: 'meetingDay', label: 'Meeting day' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'members', label: 'Members (one name per line)', type: 'textarea' },
      { key: 'activities', label: 'Activities and notes', type: 'textarea' },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.name || 'Untitled club'}
    cardMeta={(item) => `${item.incharge || 'No incharge'} · ${item.meetingDay || 'No meeting day'}\n${item.description || ''}`}
  />
)

export default ActvtClubs
