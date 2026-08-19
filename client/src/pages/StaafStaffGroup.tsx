import React from 'react'
import Teachers from './Teachers'
import { STAFF_GROUP_MATCHERS, STAFF_GROUP_META, STAAF_TYPE_OPTIONS, type StaafStaffGroup } from '../utils/staafStaff'

const StaafStaffGroup: React.FC<{ group: StaafStaffGroup }> = ({ group }) => {
  const meta = STAFF_GROUP_META[group]

  return (
    <Teachers
      hidePagination
      includeAllRecords
      entityLabelSingular={meta.entityLabel}
      entityLabelPlural={meta.entityLabelPlural}
      uiOnlyDelete
      dutyTypeColumnLabel="Type"
      dutyTypeErrorLabel="Member type"
      dutyTypeOptions={STAAF_TYPE_OPTIONS}
      enforceDesignationDutyRules={false}
      alwaysEditableDutyType
      recordFilter={STAFF_GROUP_MATCHERS[group]}
    />
  )
}

export default StaafStaffGroup
