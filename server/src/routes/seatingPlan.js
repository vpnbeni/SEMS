const express = require('express');
const router = express.Router();
const seatingPlanController = require('../controllers/seatingPlanController');

// Room management routes
router.get('/rooms', seatingPlanController.getRooms);
router.post('/rooms', seatingPlanController.createRoom);
router.put('/rooms/:id', seatingPlanController.updateRoom);
router.delete('/rooms/:id', seatingPlanController.deleteRoom);

// PDF generation routes
router.get('/generate/main-gate/:datesheetId', seatingPlanController.generateMainGate);
router.get('/generate/room-folder-slip/:datesheetId', seatingPlanController.generateRoomFolderSlip);
router.get('/generate/room-door-slip/:datesheetId', seatingPlanController.generateRoomDoorSlip);
router.get('/generate/cbse-copy/:datesheetId', seatingPlanController.generateCBSECopy);

module.exports = router;
