const express = require('express');
const { protect } = require('../middleware/auth');
const { requireTenantFeature } = require('../middleware/tenantFeatureAccess');
const {
  getOverview,
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  listRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  listSelfStudents,
  createSelfStudent,
  updateSelfStudent,
  deleteSelfStudent,
} = require('../controllers/trnstController');

const router = express.Router();

router.use(protect);
router.use(requireTenantFeature('trnst_transport'));

router.get('/overview', getOverview);
router.get('/vehicles', listVehicles);
router.post('/vehicles', createVehicle);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', deleteVehicle);
router.get('/routes', listRoutes);
router.post('/routes', createRoute);
router.put('/routes/:id', updateRoute);
router.delete('/routes/:id', deleteRoute);
router.get('/self-students', listSelfStudents);
router.post('/self-students', createSelfStudent);
router.put('/self-students/:id', updateSelfStudent);
router.delete('/self-students/:id', deleteSelfStudent);

module.exports = router;
