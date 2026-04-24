const express = require('express');
const Joi = require('joi');
const { validateParams } = require('../middleware/validation');
const {
  listCirculars,
  createCircular,
  updateCircular,
  publishCircular,
  deleteCircular,
} = require('../controllers/examCircularController');

const router = express.Router();

const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

router.route('/')
  .get(listCirculars)
  .post(createCircular);

router.put('/:id', validateParams(Joi.object({ id: objectIdSchema })), updateCircular);
router.post('/:id/publish', validateParams(Joi.object({ id: objectIdSchema })), publishCircular);
router.delete('/:id', validateParams(Joi.object({ id: objectIdSchema })), deleteCircular);

module.exports = router;
