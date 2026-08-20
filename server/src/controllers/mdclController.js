const { makeRecordCrud } = require('../utils/recordCrud');

const cases = makeRecordCrud('MedicalCase', [
  'date',
  'studentName',
  'className',
  'section',
  'complaint',
  'treatment',
  'firstAid',
  'prescription',
  'suppliesUsed',
  'attendedBy',
  'notes',
]);

const supplies = makeRecordCrud('MedicalSupply', [
  'name',
  'category',
  'unit',
  'quantityOnHand',
  'reorderLevel',
  'location',
  'expiryDate',
  'notes',
]);

module.exports = { cases, supplies };
