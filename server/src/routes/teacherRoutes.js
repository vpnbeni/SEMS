const express = require('express');
const Joi = require('joi');
const {
  getTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignSubjects,
  removeSubjects,
  getTeachersByDepartment,
  getTeachersBySubject,
  getTeacherStats,
  getNextEmployeeId,
  bulkCreateTeachers
} = require('../controllers/teacherController');

const { protect, authorize } = require('../middleware/auth');
const { validateJoi, validateParams, validateQuery } = require('../middleware/validation');
const {
  createTeacherSchema,
  updateTeacherSchema,
  assignSubjectsSchema,
  teacherQuerySchema,
  bulkUploadSchema
} = require('../validations/teacherValidation');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Object ID validation schema
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format'
  });

// Department validation schema
const departmentSchema = Joi.string()
  .trim()
  .min(2)
  .max(50)
  .required()
  .messages({
    'string.min': 'Department must be at least 2 characters',
    'string.max': 'Department cannot exceed 50 characters',
    'any.required': 'Department is required'
  });

// Main teacher routes
router.route('/')
  .get(validateQuery(teacherQuerySchema), getTeachers)
  .post(validateJoi(createTeacherSchema), createTeacher);

// Statistics route
router.get('/stats', getTeacherStats);

// Next employee ID route
router.get('/next-employee-id', getNextEmployeeId);

// Bulk operations
router.post('/bulk', validateJoi(bulkUploadSchema), bulkCreateTeachers);

// Department-based routes
router.get('/department/:department', 
  validateParams(Joi.object({ department: departmentSchema })),
  getTeachersByDepartment
);

// Subject-based routes
router.get('/subject/:subjectId',
  validateParams(Joi.object({ subjectId: objectIdSchema })),
  getTeachersBySubject
);

// Individual teacher routes
router.route('/:id')
  .get(validateParams(Joi.object({ id: objectIdSchema })), getTeacher)
  .put(
    validateParams(Joi.object({ id: objectIdSchema })),
    validateJoi(updateTeacherSchema),
    updateTeacher
  )
  .delete(validateParams(Joi.object({ id: objectIdSchema })), deleteTeacher);

// Subject assignment routes
router.route('/:id/subjects')
  .post(
    validateParams(Joi.object({ id: objectIdSchema })),
    validateJoi(assignSubjectsSchema),
    assignSubjects
  )
  .delete(
    validateParams(Joi.object({ id: objectIdSchema })),
    validateJoi(assignSubjectsSchema),
    removeSubjects
  );

module.exports = router;
