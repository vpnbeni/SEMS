import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/mdcl/cases')

const MdclCases: React.FC = () => (
  <RecordManager
    title="Medical Cases"
    subtitle="Log book for minor treatments, first aid, prescriptions, and supplies used."
    fields={[
      { key: 'date', label: 'Date of event', type: 'date', required: true },
      { key: 'studentName', label: 'Student name', required: true },
      { key: 'className', label: 'Class' },
      { key: 'section', label: 'Section' },
      { key: 'complaint', label: 'Complaint / case', type: 'textarea', required: true },
      { key: 'firstAid', label: 'First aid provided', type: 'textarea' },
      { key: 'treatment', label: 'Minor treatment', type: 'textarea' },
      { key: 'prescription', label: 'Prescription', type: 'textarea' },
      { key: 'suppliesUsed', label: 'Medical supplies used', type: 'textarea' },
      { key: 'attendedBy', label: 'Attended by' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.studentName || 'Medical case'}
    cardMeta={(item) =>
      [item.date, item.className && item.section ? `${item.className}-${item.section}` : item.className, item.complaint]
        .filter(Boolean)
        .join(' · ')
    }
  />
)

export default MdclCases
