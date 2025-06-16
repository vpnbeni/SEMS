const Joi = require('joi');
const { REGEX_PATTERNS } = require('../utils/constants');

// Create teacher validation schema
const createTeacherSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  phone: Joi.string()
    .pattern(REGEX_PATTERNS.PHONE)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid 10-digit phone number',
      'any.required': 'Phone number is required'
    }),
  employeeId: Joi.string()
    .trim()
    .min(3)
    .max(20)
    .uppercase()
    .required()
    .messages({
      'string.min': 'Employee ID must be at least 3 characters long',
      'string.max': 'Employee ID cannot exceed 20 characters',
      'any.required': 'Employee ID is required'
    }),
  department: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Department must be at least 2 characters long',
      'string.max': 'Department cannot exceed 50 characters',
      'any.required': 'Department is required'
    }),
  designation: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Designation must be at least 2 characters long',
      'string.max': 'Designation cannot exceed 50 characters',
      'any.required': 'Designation is required'
    }),
  subjects: Joi.array()
    .items(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          'string.pattern.base': 'Invalid subject ID format'
        })
    )
    .default([])
    .messages({
      'array.base': 'Subjects must be an array'
    }),
  experience: Joi.number()
    .integer()
    .min(0)
    .max(50)
    .required()
    .messages({
      'number.base': 'Experience must be a number',
      'number.integer': 'Experience must be a whole number',
      'number.min': 'Experience cannot be negative',
      'number.max': 'Experience cannot exceed 50 years',
      'any.required': 'Experience is required'
    }),
  qualification: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Qualification must be at least 2 characters long',
      'string.max': 'Qualification cannot exceed 200 characters',
      'any.required': 'Qualification is required'
    }),
  address: Joi.object({
    street: Joi.string()
      .trim()
      .max(200)
      .messages({
        'string.max': 'Street address cannot exceed 200 characters'
      }),
    city: Joi.string()
      .trim()
      .max(50)
      .messages({
        'string.max': 'City cannot exceed 50 characters'
      }),
    state: Joi.string()
      .trim()
      .max(50)
      .messages({
        'string.max': 'State cannot exceed 50 characters'
      }),
    pincode: Joi.string()
      .pattern(/^\d{6}$/)
      .messages({
        'string.pattern.base': 'Please provide a valid 6-digit pincode'
      })
  }).default({}),
  dateOfJoining: Joi.date()
    .iso()
    .max('now')
    .required()
    .messages({
      'date.base': 'Date of joining must be a valid date',
      'date.format': 'Date of joining must be in ISO format',
      'date.max': 'Date of joining cannot be in the future',
      'any.required': 'Date of joining is required'
    }),
  dateOfBirth: Joi.date()
    .iso()
    .max('now')
    .required()
    .messages({
      'date.base': 'Date of birth must be a valid date',
      'date.format': 'Date of birth must be in ISO format',
      'date.max': 'Date of birth cannot be in the future',
      'any.required': 'Date of birth is required'
    }),
  emergencyContact: Joi.object({
    name: Joi.string()
      .trim()
      .max(100)
      .messages({
        'string.max': 'Emergency contact name cannot exceed 100 characters'
      }),
    phone: Joi.string()
      .pattern(REGEX_PATTERNS.PHONE)
      .messages({
        'string.pattern.base': 'Please provide a valid emergency contact phone number'
      }),
    relation: Joi.string()
      .trim()
      .max(50)
      .messages({
        'string.max': 'Relation cannot exceed 50 characters'
      })
  }).default({}),
  notes: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    }),
  isActive: Joi.boolean()
    .default(true)
});

// Update teacher validation schema
const updateTeacherSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  phone: Joi.string()
    .pattern(REGEX_PATTERNS.PHONE)
    .messages({
      'string.pattern.base': 'Please provide a valid 10-digit phone number'
    }),
  department: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Department must be at least 2 characters long',
      'string.max': 'Department cannot exceed 50 characters'
    }),
  designation: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Designation must be at least 2 characters long',
      'string.max': 'Designation cannot exceed 50 characters'
    }),
  subjects: Joi.array()
    .items(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          'string.pattern.base': 'Invalid subject ID format'
        })
    )
    .messages({
      'array.base': 'Subjects must be an array'
    }),
  experience: Joi.number()
    .integer()
    .min(0)
    .max(50)
    .messages({
      'number.base': 'Experience must be a number',
      'number.integer': 'Experience must be a whole number',
      'number.min': 'Experience cannot be negative',
      'number.max': 'Experience cannot exceed 50 years'
    }),
  qualification: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Qualification must be at least 2 characters long',
      'string.max': 'Qualification cannot exceed 200 characters'
    }),
  address: Joi.object({
    street: Joi.string()
      .trim()
      .max(200)
      .allow('')
      .messages({
        'string.max': 'Street address cannot exceed 200 characters'
      }),
    city: Joi.string()
      .trim()
      .max(50)
      .allow('')
      .messages({
        'string.max': 'City cannot exceed 50 characters'
      }),
    state: Joi.string()
      .trim()
      .max(50)
      .allow('')
      .messages({
        'string.max': 'State cannot exceed 50 characters'
      }),
    pincode: Joi.string()
      .pattern(/^\d{6}$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Please provide a valid 6-digit pincode'
      })
  }),
  dateOfJoining: Joi.date()
    .iso()
    .max('now')
    .messages({
      'date.base': 'Date of joining must be a valid date',
      'date.format': 'Date of joining must be in ISO format',
      'date.max': 'Date of joining cannot be in the future'
    }),
  dateOfBirth: Joi.date()
    .iso()
    .max('now')
    .messages({
      'date.base': 'Date of birth must be a valid date',
      'date.format': 'Date of birth must be in ISO format',
      'date.max': 'Date of birth cannot be in the future'
    }),
  emergencyContact: Joi.object({
    name: Joi.string()
      .trim()
      .max(100)
      .allow('')
      .messages({
        'string.max': 'Emergency contact name cannot exceed 100 characters'
      }),
    phone: Joi.string()
      .pattern(REGEX_PATTERNS.PHONE)
      .allow('')
      .messages({
        'string.pattern.base': 'Please provide a valid emergency contact phone number'
      }),
    relation: Joi.string()
      .trim()
      .max(50)
      .allow('')
      .messages({
        'string.max': 'Relation cannot exceed 50 characters'
      })
  }),
  notes: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    }),
  isActive: Joi.boolean()
});

// Assign subjects validation schema
const assignSubjectsSchema = Joi.object({
  subjectIds: Joi.array()
    .items(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          'string.pattern.base': 'Invalid subject ID format'
        })
    )
    .min(1)
    .required()
    .messages({
      'array.base': 'Subject IDs must be an array',
      'array.min': 'At least one subject ID is required',
      'any.required': 'Subject IDs are required'
    })
});

// Teacher query validation schema
const teacherQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  sort: Joi.string()
    .default('-createdAt')
    .messages({
      'string.base': 'Sort must be a string'
    }),
  search: Joi.string()
    .trim()
    .messages({
      'string.base': 'Search must be a string'
    }),
  department: Joi.string()
    .trim()
    .messages({
      'string.base': 'Department must be a string'
    }),
  isActive: Joi.boolean()
    .messages({
      'boolean.base': 'isActive must be a boolean'
    }),
  subject: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid subject ID format'
    }),
  minExperience: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.base': 'Minimum experience must be a number',
      'number.integer': 'Minimum experience must be an integer',
      'number.min': 'Minimum experience cannot be negative'
    }),
  maxExperience: Joi.number()
    .integer()
    .min(0)
    .greater(Joi.ref('minExperience'))
    .messages({
      'number.base': 'Maximum experience must be a number',
      'number.integer': 'Maximum experience must be an integer',
      'number.min': 'Maximum experience cannot be negative',
      'number.greater': 'Maximum experience must be greater than minimum experience'
    })
});

// Bulk upload validation schema
const bulkUploadSchema = Joi.object({
  teachers: Joi.array()
    .items(createTeacherSchema)
    .min(1)
    .max(1000)
    .required()
    .messages({
      'array.base': 'Teachers must be an array',
      'array.min': 'At least one teacher is required',
      'array.max': 'Cannot upload more than 1000 teachers at once',
      'any.required': 'Teachers data is required'
    }),
  skipDuplicates: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'skipDuplicates must be a boolean'
    }),
  updateExisting: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'updateExisting must be a boolean'
    })
});

module.exports = {
  createTeacherSchema,
  updateTeacherSchema,
  assignSubjectsSchema,
  teacherQuerySchema,
  bulkUploadSchema
};