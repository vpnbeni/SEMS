const pdfGenerator = require('../utils/pdfGenerator');
const seatingPlanBuilder = require('../utils/seatingPlanBuilder');
const Room = require('../models/Room');

const parseRoomNoForSort = (roomNo) => {
  const value = String(roomNo ?? '').trim();
  if (!value) return Number.POSITIVE_INFINITY;

  const pureNumeric = value.match(/^\d+$/);
  if (pureNumeric) return parseInt(pureNumeric[0], 10);

  const leadingNumeric = value.match(/^(\d+)/);
  if (leadingNumeric) return parseInt(leadingNumeric[1], 10);

  return Number.POSITIVE_INFINITY;
};

const compareRoomNo = (a, b) => {
  const aNo = parseRoomNoForSort(a?.roomNo);
  const bNo = parseRoomNoForSort(b?.roomNo);

  if (aNo !== bNo) return aNo - bNo;
  return String(a?.roomNo ?? '').localeCompare(String(b?.roomNo ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

// Get all rooms
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true }).lean();
    rooms.sort(compareRoomNo);
    res.json(rooms);
  } catch (error) {
    console.error('Get Rooms Error:', error);
    res.status(500).json({ message: 'Failed to fetch rooms', error: error.message });
  }
};

// Create room
exports.createRoom = async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json(room);
  } catch (error) {
    console.error('Create Room Error:', error);
    res.status(500).json({ message: 'Failed to create room', error: error.message });
  }
};

// Update room
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('Update Room Error:', error);
    res.status(500).json({ message: 'Failed to update room', error: error.message });
  }
};

// Delete room
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete Room Error:', error);
    res.status(500).json({ message: 'Failed to delete room', error: error.message });
  }
};

// Helper function to send PDF buffer properly
const sendPDFResponse = (res, pdfBuffer, filename) => {
  const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
};

// Generate Main Gate PDF
exports.generateMainGate = async (req, res) => {
  try {
    const { datesheetId } = req.params;
    
    const seatingData = await seatingPlanBuilder.buildSeatingData(datesheetId);
    const templateData = seatingPlanBuilder.buildMainGateData(seatingData);
    const pdfBuffer = await pdfGenerator.generateMainGate(templateData);
    
    sendPDFResponse(res, pdfBuffer, 'main-gate.pdf');
  } catch (error) {
    console.error('Generate Main Gate PDF Error:', error);
    res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
  }
};

// Generate Room Folder Slip PDF
exports.generateRoomFolderSlip = async (req, res) => {
  try {
    const { datesheetId } = req.params;
    
    const seatingData = await seatingPlanBuilder.buildSeatingData(datesheetId);
    const templateData = seatingPlanBuilder.buildRoomFolderSlipData(seatingData);
    const pdfBuffer = await pdfGenerator.generateRoomFolderSlip(templateData);
    
    sendPDFResponse(res, pdfBuffer, 'room-folder-slip.pdf');
  } catch (error) {
    console.error('Generate Room Folder Slip PDF Error:', error);
    res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
  }
};

// Generate Room Door Slip PDF
exports.generateRoomDoorSlip = async (req, res) => {
  try {
    const { datesheetId } = req.params;
    
    const seatingData = await seatingPlanBuilder.buildSeatingData(datesheetId);
    const templateData = seatingPlanBuilder.buildRoomDoorSlipData(seatingData);
    const pdfBuffer = await pdfGenerator.generateRoomDoorSlip(templateData);
    
    sendPDFResponse(res, pdfBuffer, 'room-door-slip.pdf');
  } catch (error) {
    console.error('Generate Room Door Slip PDF Error:', error);
    res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
  }
};

// Generate CBSE Copy PDF
exports.generateCBSECopy = async (req, res) => {
  try {
    const { datesheetId } = req.params;
    
    const seatingData = await seatingPlanBuilder.buildSeatingData(datesheetId);
    const templateData = seatingPlanBuilder.buildCBSECopyData(seatingData);
    const pdfBuffer = await pdfGenerator.generateCBSECopy(templateData);
    
    sendPDFResponse(res, pdfBuffer, 'cbse-copy.pdf');
  } catch (error) {
    console.error('Generate CBSE Copy PDF Error:', error);
    res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
  }
};
