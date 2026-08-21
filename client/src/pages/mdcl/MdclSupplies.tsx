import React from 'react'
import { RecordManager } from '@/components/records/RecordManager'
import { makeRecordService } from '@/services/recordService'

const service = makeRecordService('/mdcl/supplies')

const MdclSupplies: React.FC = () => (
  <RecordManager
    title="Medical Supplies"
    subtitle="Track clinic stock, reorder levels, and expiry for first-aid and medicines."
    fields={[
      { key: 'name', label: 'Item name', required: true },
      { key: 'category', label: 'Category' },
      { key: 'unit', label: 'Unit' },
      { key: 'quantityOnHand', label: 'Quantity on hand', type: 'number' },
      { key: 'reorderLevel', label: 'Reorder level', type: 'number' },
      { key: 'location', label: 'Storage location' },
      { key: 'expiryDate', label: 'Expiry date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    list={service.list}
    save={service.save}
    remove={service.remove}
    cardTitle={(item) => item.name || 'Supply item'}
    cardMeta={(item) =>
      [
        item.category,
        item.quantityOnHand !== undefined && item.quantityOnHand !== ''
          ? `${item.quantityOnHand} ${item.unit || ''}`.trim()
          : '',
        item.expiryDate ? `Exp ${item.expiryDate}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    }
  />
)

export default MdclSupplies
