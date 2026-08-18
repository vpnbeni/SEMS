const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const schoolProfileSchema = new mongoose.Schema({
  schoolName: { type: String, default: '', trim: true },
  schoolCode: { type: String, default: '', trim: true },
  affiliationNo: { type: String, default: '', trim: true },
  logoUrl: { type: String, default: '' },
  logoPublicId: { type: String, default: '' },
  tagline: { type: String, default: '', trim: true },
  address: { type: String, default: '', trim: true },
  contact: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
  awardListDesign: { type: mongoose.Schema.Types.Mixed, default: null },
  admitCardDesign: { type: mongoose.Schema.Types.Mixed, default: null },
  reportCardDesign: { type: mongoose.Schema.Types.Mixed, default: null },
  metadata: {
    studentRollNumberAssignment: {
      mode: { type: String, default: 'alphabetical_by_class_section' },
      sortBy: { type: String, default: 'name_then_father_name' },
      scope: { type: String, default: 'each class and section' },
      description: {
        type: String,
        default:
          'Roll numbers are assigned automatically to students of each section of each class by sorting them in alphabetical order of name. If two students have the same name, they are ordered alphabetically by father name. If a student changes section, roll numbers in both the previous and new sections are reassigned.',
      },
    },
  },
}, { timestamps: true });

module.exports = createContextModelProxy('SchoolProfile', schoolProfileSchema);
