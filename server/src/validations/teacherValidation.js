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
  employeeId: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.min': 'OASIS ID must be at least 3 digits long',
      'string.max': 'OASIS ID cannot exceed 50 digits',
      'string.pattern.base': 'OASIS ID must contain digits only',
      'any.required': 'OASIS ID is required'
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
    .min(1)
    .required()
    .messages({
      'array.base': 'Subjects must be an array',
      'array.min': 'At least one subject is required',
      'any.required': 'Subject is required'
    }),
  subjectCode: Joi.string()
    .trim()
    .max(20)
    .allow('')
    .messages({
      'string.max': 'Subject code cannot exceed 20 characters'
    }),
  schoolName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'School name must be at least 2 characters long',
      'string.max': 'School name cannot exceed 200 characters',
      'any.required': 'School name is required'
    }),
  schoolCode: Joi.string()
    .trim()
    .min(1)
    .max(20)
    .required()
    .messages({
      'string.min': 'School code is required',
      'string.max': 'School code cannot exceed 20 characters',
      'any.required': 'School code is required'
    }),
  bankName: Joi.string()
    .trim()
    .min(2)
    .max(120)
    .required()
    .messages({
      'string.min': 'Bank name must be at least 2 characters long',
      'string.max': 'Bank name cannot exceed 120 characters',
      'any.required': 'Bank name is required'
    }),
  accountNumber: Joi.string()
    .trim()
    .min(6)
    .max(40)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.min': 'Account number must be at least 6 characters',
      'string.max': 'Account number cannot exceed 40 characters',
      'string.pattern.base': 'Account number must contain digits only',
      'any.required': 'Account number is required'
    }),
  ifscCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid IFSC code',
      'any.required': 'IFSC code is required'
    }),
  mobileNo: Joi.string()
    .pattern(REGEX_PATTERNS.PHONE)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid 10-digit mobile number',
      'any.required': 'Mobile number is required'
    }),
  // Optional legacy fields accepted for backward compatibility.
  email: Joi.string().email(),
  phone: Joi.string().pattern(REGEX_PATTERNS.PHONE),
  department: Joi.string().trim().max(50).allow(''),
  experience: Joi.number().integer().min(0).max(50),
  qualification: Joi.string().trim().max(200).allow(''),
  dateOfJoining: Joi.date().iso().max('now'),
  dateOfBirth: Joi.date().iso().max('now'),
  address: Joi.object({
    street: Joi.string().trim().max(200).allow(''),
    city: Joi.string().trim().max(50).allow(''),
    state: Joi.string().trim().max(50).allow(''),
    pincode: Joi.string().pattern(/^\d{6}$/).allow('')
  }).default({}),
  emergencyContact: Joi.object({
    name: Joi.string().trim().max(100).allow(''),
    phone: Joi.string().pattern(REGEX_PATTERNS.PHONE).allow(''),
    relation: Joi.string().trim().max(50).allow('')
  }).default({}),
  notes: Joi.string().trim().max(500).allow(''),
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
  employeeId: Joi.string().trim().min(3).max(50).pattern(/^\d+$/).messages({
    'string.pattern.base': 'OASIS ID must contain digits only'
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
  subjectCode: Joi.string().trim().max(20).allow(''),
  schoolName: Joi.string().trim().min(2).max(200),
  schoolCode: Joi.string().trim().min(1).max(20),
  bankName: Joi.string().trim().min(2).max(120),
  accountNumber: Joi.string().trim().min(6).max(40).pattern(/^\d+$/).messages({
    'string.pattern.base': 'Account number must contain digits only'
  }),
  ifscCode: Joi.string().trim().uppercase().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/),
  mobileNo: Joi.string().pattern(REGEX_PATTERNS.PHONE),
  email: Joi.string().email(),
  phone: Joi.string().pattern(REGEX_PATTERNS.PHONE),
  department: Joi.string().trim().max(50).allow(''),
  experience: Joi.number().integer().min(0).max(50),
  qualification: Joi.string().trim().max(200).allow(''),
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
    }),
  joiningDateFrom: Joi.date()
    .iso()
    .messages({
      'date.base': 'Joining date from must be a valid date',
      'date.format': 'Joining date from must be in ISO format'
    }),
  joiningDateTo: Joi.date()
    .iso()
    .min(Joi.ref('joiningDateFrom'))
    .messages({
      'date.base': 'Joining date to must be a valid date',
      'date.format': 'Joining date to must be in ISO format',
      'date.min': 'Joining date to must be after joining date from'
    }),
  schoolName: Joi.string()
    .trim()
    .messages({
      'string.base': 'School name must be a string'
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