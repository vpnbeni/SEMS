const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const transportSelfStudentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  rollNumber: { type: String, trim: true, default: '' },
  className: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  commuteMode: {
    type: String,
    enum: ['Walk', 'Bicycle', 'Parent drop', 'Own vehicle', 'Other'],
    default: 'Walk',
  },
  guardianPhone: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '', maxlength: 400 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

transportSelfStudentSchema.index({ studentId: 1 }, { unique: true });
transportSelfStudentSchema.index({ className: 1, section: 1, isActive: 1 });

module.exports = createContextModelProxy('TransportSelfStudent', transportSelfStudentSchema);
