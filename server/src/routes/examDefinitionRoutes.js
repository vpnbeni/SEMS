const express = require('express');
const Joi = require('joi');
const { validateParams } = require('../middleware/validation');
const {
  listExamDefinitions,
  createExamDefinition,
  updateExamDefinition,
  deleteExamDefinition,
  getExamSubjectMatrix,
  saveExamSubjectMatrix,
} = require('../controllers/examDefinitionController');

const router = express.Router();

const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

router.route('/')
  .get(listExamDefinitions)
  .post(createExamDefinition);

router.get('/subject-matrix', getExamSubjectMatrix);
router.put('/subject-matrix', saveExamSubjectMatrix);

router.put('/:id', validateParams(Joi.object({ id: objectIdSchema })), updateExamDefinition);
router.delete('/:id', validateParams(Joi.object({ id: objectIdSchema })), deleteExamDefinition);

module.exports = router;
