const mongoose = require('mongoose');

const ALLOWED_TEACHER_TEMPLATE_KEYS = [
  'srNo',
  'oasisId',
  'functionaryName',
  'subject',
  'subjectCode',
  'schoolCode',
  'employeeId',
  'name',
  'email',
  'phone',
  'department',
  'designation',
  'experience',
  'qualification',
  'dateOfJoining',
  'dateOfBirth',
  'subjectCodes',
  'isActive',
  'street',
  'city',
  'state',
  'pincode',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelation',
  'notes'
];

const templateColumnSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    enum: ALLOWED_TEACHER_TEMPLATE_KEYS
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  required: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const masterTeacherTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'Exam Functionaries Import Template',
    trim: true
  },
  columns: {
    type: [templateColumnSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

masterTeacherTemplateSchema.index({ isActive: 1, updatedAt: -1 });

const MODEL_NAME = 'MasterTeacherTemplate';

const getMasterTeacherTemplateModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get MasterTeacherTemplate model');
  }

  return connection.models[MODEL_NAME]
    || connection.model(MODEL_NAME, masterTeacherTemplateSchema);
};

module.exports = {
  ALLOWED_TEACHER_TEMPLATE_KEYS,
  getMasterTeacherTemplateModel,
  MODEL_NAME
};
