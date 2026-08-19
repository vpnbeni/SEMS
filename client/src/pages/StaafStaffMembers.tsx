import React from 'react'
import Teachers from './Teachers'
import { STAAF_TYPE_OPTIONS } from '../utils/staafStaff'

const StaafStaffMembers: React.FC = () => {
  return (
    <Teachers
      hidePagination
      includeAllRecords
      entityLabelSingular="staff member"
      uiOnlyDelete
      dutyTypeColumnLabel="Type"
      dutyTypeErrorLabel="Member type"
      dutyTypeOptions={STAAF_TYPE_OPTIONS}
      enforceDesignationDutyRules={false}
      alwaysEditableDutyType
    />
  )
}

export default StaafStaffMembers
