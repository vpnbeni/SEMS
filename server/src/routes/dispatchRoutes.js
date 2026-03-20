const express = require('express')
const { protect } = require('../middleware/auth')
const { downloadDispatchSlipPdf } = require('../controllers/dispatchSlipController')

const router = express.Router()

// Apply authentication to all routes
router.use(protect)

// Dispatch slip PDF (per centre datesheet entry)
router.get('/slip/:entryId/pdf', downloadDispatchSlipPdf)

module.exports = router