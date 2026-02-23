const Joi = require('joi');

const optionalText = (max = 200) => Joi.string().trim().max(max).allow('').default('');
const optionalPhone = Joi.string().trim().pattern(/^\d{0,10}$/).allow('').default('').messages({
  'string.pattern.base': 'Contact number must contain up to 10 digits',
});

const centreDetailsUpsertSchema = Joi.object({
  centreNo: optionalText(100),
  centreName: optionalText(200),
  centreSchoolCode: optionalText(100),
  centreSuperintendent: optionalText(120),
  centreSuperintendentContact: optionalPhone,
  deputyCentreSuperintendent: optionalText(120),
  deputyCentreSuperintendentContact: optionalPhone,
  centreClerk: optionalText(120),
  centreClerkContact: optionalPhone,
  packingClothColor: optionalText(80),
  packingMarker: optionalText(80),
}).custom((value, helpers) => {
  const hasCentreName = Boolean(String(value.centreName || '').trim());
  const hasCentreSchoolCode = Boolean(String(value.centreSchoolCode || '').trim());
  if (hasCentreName !== hasCentreSchoolCode) {
    return helpers.error('any.invalid');
  }
  return value;
}).messages({
  'any.invalid': 'Centre Name and School Code must be filled together',
});

module.exports = {
  centreDetailsUpsertSchema,
};
