const express = require('express')
const router = express.Router()
const {
  getAnswerSheets,
  getAnswerSheetById,
  createAnswerSheet,
  updateAnswerSheet,
  deleteAnswerSheet,
  useAnswerSheets,
  discardAnswerSheets,
  getStatistics,
  parseTemplate,
  downloadTemplate,
  uploadExcel
} = require('../controllers/answerSheetController')

// Statistics route (must be before :id routes)
router.get('/stats/summary', getStatistics)

// Template routes
router.get('/parse/template', parseTemplate)
router.get('/template/download', downloadTemplate)
router.post('/upload/excel', uploadExcel)

// CRUD routes
router.route('/')
  .get(getAnswerSheets)
  .post(createAnswerSheet)

router.route('/:id')
  .get(getAnswerSheetById)
  .put(updateAnswerSheet)
  .delete(deleteAnswerSheet)

// Action routes
router.post('/:id/use', useAnswerSheets)
router.post('/:id/discard', discardAnswerSheets)

module.exports = router
