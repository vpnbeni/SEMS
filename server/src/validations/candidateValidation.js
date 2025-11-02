const { body, validationResult } = require('express-validator');

const validateCandidate = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('rollNumber')
    .trim()
    .notEmpty()
    .withMessage('Roll number is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Roll number must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Roll number must contain only uppercase letters and numbers'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'graduated', 'suspended'])
    .withMessage('Status must be one of: active, inactive, graduated, suspended'),

  body('subjectCodes')
    .optional()
    .isArray()
    .withMessage('Subject codes must be an array'),

  body('subjectCodes.*')
    .optional()
    .isString()
    .withMessage('Each subject code must be a string'),

  // Middleware to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateCandidate
};