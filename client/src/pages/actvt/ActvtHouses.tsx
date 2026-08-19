import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/actvt/houses')

const ActvtHouses: React.FC = () => (
  <RecordManager
    title="Houses"
    subtitle="Add school houses, students, and house activities such as quiz, debate, play, rangoli, handwriting, calligraphy, and poster making."
    fields={[
      { key: 'name', label: 'House name', required: true },
      { key: 'color', label: 'House colour' },
      { key: 'incharge', label: 'House incharge' },
      { key: 'motto', label: 'Motto' },
      { key: 'activityType', label: 'Activity type', type: 'select', options: ['Quiz', 'Debate', 'Play', 'Rangoli', 'Handwriting', 'Calligraphy', 'Poster making', 'Other'] },
      { key: 'members', label: 'Students (one name per line)', type: 'textarea' },
      { key: 'activities', label: 'Activity record', type: 'textarea' },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.name || 'Untitled house'}
    cardMeta={(item) => `${item.color || 'No colour'} · ${item.incharge || 'No incharge'} · ${item.activityType || ''}\n${item.motto || ''}`}
  />
)

export default ActvtHouses
