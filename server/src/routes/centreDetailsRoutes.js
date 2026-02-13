const express = require('express');
const { protect } = require('../middleware/auth');
const { validateJoi } = require('../middleware/validation');
const {
  getCentreDetails,
  upsertCentreDetails,
} = require('../controllers/centreDetailsController');
const {
  centreDetailsUpsertSchema,
} = require('../validations/centreDetailsValidation');

const router = express.Router();

router.use(protect);

router.get('/', getCentreDetails);
router.put('/', validateJoi(centreDetailsUpsertSchema), upsertCentreDetails);

module.exports = router;
