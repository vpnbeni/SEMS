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
}, { timestamps: true });

module.exports = createContextModelProxy('SchoolProfile', schoolProfileSchema);
