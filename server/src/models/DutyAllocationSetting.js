const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

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

dutyAllocationSettingSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('DutyAllocationSetting', dutyAllocationSettingSchema);
