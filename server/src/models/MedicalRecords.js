const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const withActive = (definition) => new mongoose.Schema({
  ...definition,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const medicalCaseSchema = withActive({
  date: { type: String, trim: true, default: '' },
  studentName: { type: String, required: true, trim: true },
  className: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  complaint: { type: String, required: true, trim: true },
  treatment: { type: String, trim: true, default: '' },
  firstAid: { type: String, trim: true, default: '' },
  prescription: { type: String, trim: true, default: '' },
  suppliesUsed: { type: String, trim: true, default: '' },
  attendedBy: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
});

const medicalSupplySchema = withActive({
  name: { type: String, required: true, trim: true },
  category: { type: String, trim: true, default: 'First aid' },
  unit: { type: String, trim: true, default: 'pcs' },
  quantityOnHand: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 0 },
  location: { type: String, trim: true, default: '' },
  expiryDate: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
});

module.exports = {
  MedicalCase: createContextModelProxy('MedicalCase', medicalCaseSchema),
  MedicalSupply: createContextModelProxy('MedicalSupply', medicalSupplySchema),
};
