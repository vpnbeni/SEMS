const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const dutyAssignmentSchema = new mongoose.Schema(
  {
    examDate: {
      type: Date,
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    functionary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

dutyAssignmentSchema.index({ examDate: 1, room: 1 }, { unique: true });
dutyAssignmentSchema.index({ examDate: 1, isActive: 1, room: 1 });

module.exports = createContextModelProxy('DutyAssignment', dutyAssignmentSchema);
