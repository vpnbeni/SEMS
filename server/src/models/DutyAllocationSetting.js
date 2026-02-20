const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const dutyAllocationSettingSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'manual',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = createContextModelProxy('DutyAllocationSetting', dutyAllocationSettingSchema);
