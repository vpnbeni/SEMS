const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const seatingPlanAllocationSchema = new mongoose.Schema(
  {
    datesheetEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    examDate: {
      type: String,
      required: true,
      index: true,
    },
    subjectCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entrySortKey: {
      type: String,
      required: true,
      index: true,
    },
    rollNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    roomNo: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

seatingPlanAllocationSchema.index(
  { datesheetEntryId: 1, rollNo: 1 },
  { unique: true }
);

seatingPlanAllocationSchema.index({ rollNo: 1, entrySortKey: 1 });

module.exports = createContextModelProxy('SeatingPlanAllocation', seatingPlanAllocationSchema);
