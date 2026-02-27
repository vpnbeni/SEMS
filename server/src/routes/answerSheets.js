const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
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
  uploadExcel,
  getAnswerSheetDetails,
  getSerialAllocation,
  downloadDispatchRecord,
  addDiscardedSerials,
  removeDiscardedSerial,
  getDiscardedSerials,
  updateSeries,
  getSeries
} = require('../controllers/answerSheetController')

router.use(protect)

// Statistics route (must be before :id routes)
router.get('/stats/summary', getStatistics)

// Series routes (must be before :id routes)
router.route('/series')
  .get(getSeries)
  .put(updateSeries)

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

// Details and allocation routes (must be before other :id routes to avoid conflicts)
router.get('/:id/details', getAnswerSheetDetails)
router.get('/:id/allocation', getSerialAllocation)
router.get('/:id/dispatch-record/:entryId/download', downloadDispatchRecord)

// Action routes
router.post('/:id/use', useAnswerSheets)
router.post('/:id/discard', discardAnswerSheets)

// Discarded serials routes
router.route('/:id/discarded')
  .get(getDiscardedSerials)
  .post(addDiscardedSerials)

router.delete('/:id/discarded/:serial', removeDiscardedSerial)

module.exports = router
