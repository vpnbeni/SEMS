const normalizeString = (value) => String(value || '').trim();

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const vehiclePayload = (body = {}) => ({
  registrationNumber: normalizeString(body.registrationNumber).toUpperCase(),
  vehicleType: ['Bus', 'Mini Bus', 'Van', 'Winger', 'Other'].includes(body.vehicleType) ? body.vehicleType : 'Bus',
  make: normalizeString(body.make),
  model: normalizeString(body.model),
  color: normalizeString(body.color),
  capacity: Number(body.capacity) > 0 ? Number(body.capacity) : 40,
  driverName: normalizeString(body.driverName),
  driverPhone: normalizeString(body.driverPhone),
  conductorName: normalizeString(body.conductorName),
  conductorPhone: normalizeString(body.conductorPhone),
  insuranceExpiry: parseDate(body.insuranceExpiry),
  fitnessExpiry: parseDate(body.fitnessExpiry),
  status: ['active', 'maintenance', 'inactive'].includes(body.status) ? body.status : 'active',
  notes: normalizeString(body.notes),
  isActive: body.isActive !== false,
});

const routePayload = (body = {}) => ({
  name: normalizeString(body.name),
  code: normalizeString(body.code).toUpperCase(),
  vehicleId: body.vehicleId || null,
  shift: ['morning', 'afternoon', 'both'].includes(body.shift) ? body.shift : 'both',
  startPoint: normalizeString(body.startPoint),
  endPoint: normalizeString(body.endPoint),
  distanceKm: Number(body.distanceKm) >= 0 ? Number(body.distanceKm) : 0,
  stops: Array.isArray(body.stops)
    ? body.stops
      .map((stop, index) => ({
        name: normalizeString(stop.name),
        landmark: normalizeString(stop.landmark),
        pickupTime: normalizeString(stop.pickupTime),
        dropTime: normalizeString(stop.dropTime),
        sequence: Number(stop.sequence) || index + 1,
      }))
      .filter((stop) => stop.name)
    : [],
  isActive: body.isActive !== false,
});

const getOverview = async (req, res) => {
  try {
    const Vehicle = req.models?.TransportVehicle;
    const Route = req.models?.TransportRoute;
    const SelfStudent = req.models?.TransportSelfStudent;
    if (!Vehicle || !Route) {
      return res.status(500).json({ success: false, message: 'Transport models are not available.' });
    }

    const [vehicles, routes, selfStudents] = await Promise.all([
      Vehicle.find({ isActive: { $ne: false } }).sort({ registrationNumber: 1 }).lean(),
      Route.find({ isActive: { $ne: false } }).populate('vehicleId', 'registrationNumber vehicleType driverName').sort({ code: 1 }).lean(),
      SelfStudent ? SelfStudent.find({ isActive: { $ne: false } }).sort({ className: 1, section: 1, name: 1 }).lean() : [],
    ]);

    return res.json({
      success: true,
      data: {
        vehicles,
        routes,
        selfStudents,
        stats: {
          vehicleCount: vehicles.length,
          routeCount: routes.length,
          activeVehicles: vehicles.filter((item) => item.status === 'active').length,
          maintenanceVehicles: vehicles.filter((item) => item.status === 'maintenance').length,
          totalCapacity: vehicles.reduce((sum, item) => sum + Number(item.capacity || 0), 0),
          totalStops: routes.reduce((sum, item) => sum + (item.stops?.length || 0), 0),
          selfStudentCount: selfStudents.length,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load transport overview.', error: error.message });
  }
};

const listVehicles = async (req, res) => {
  try {
    const Vehicle = req.models?.TransportVehicle;
    const vehicles = await Vehicle.find({ isActive: { $ne: false } }).sort({ registrationNumber: 1 }).lean();
    return res.json({ success: true, data: vehicles });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load vehicles.', error: error.message });
  }
};

const createVehicle = async (req, res) => {
  try {
    const payload = vehiclePayload(req.body);
    if (!payload.registrationNumber) {
      return res.status(400).json({ success: false, message: 'Registration number is required.' });
    }
    const vehicle = await req.models.TransportVehicle.create(payload);
    return res.status(201).json({ success: true, data: vehicle, message: 'Vehicle added.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A vehicle with this registration number already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to add vehicle.', error: error.message });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const payload = vehiclePayload(req.body);
    const vehicle = await req.models.TransportVehicle.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    return res.json({ success: true, data: vehicle, message: 'Vehicle updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update vehicle.', error: error.message });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await req.models.TransportVehicle.findByIdAndUpdate(req.params.id, { isActive: false, status: 'inactive' }, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    await req.models.TransportRoute.updateMany({ vehicleId: vehicle._id }, { vehicleId: null });
    return res.json({ success: true, message: 'Vehicle removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove vehicle.', error: error.message });
  }
};

const listRoutes = async (req, res) => {
  try {
    const routes = await req.models.TransportRoute.find({ isActive: { $ne: false } })
      .populate('vehicleId', 'registrationNumber vehicleType driverName capacity')
      .sort({ code: 1 })
      .lean();
    return res.json({ success: true, data: routes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load routes.', error: error.message });
  }
};

const createRoute = async (req, res) => {
  try {
    const payload = routePayload(req.body);
    if (!payload.name || !payload.code) {
      return res.status(400).json({ success: false, message: 'Route name and code are required.' });
    }
    const route = await req.models.TransportRoute.create(payload);
    return res.status(201).json({ success: true, data: route, message: 'Route added.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A route with this code already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to add route.', error: error.message });
  }
};

const updateRoute = async (req, res) => {
  try {
    const payload = routePayload(req.body);
    const route = await req.models.TransportRoute.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });
    return res.json({ success: true, data: route, message: 'Route updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update route.', error: error.message });
  }
};

const deleteRoute = async (req, res) => {
  try {
    const route = await req.models.TransportRoute.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });
    return res.json({ success: true, message: 'Route removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove route.', error: error.message });
  }
};

const COMMUTE_MODES = ['Walk', 'Bicycle', 'Parent drop', 'Own vehicle', 'Other'];

const listSelfStudents = async (req, res) => {
  try {
    const SelfStudent = req.models?.TransportSelfStudent;
    const Student = req.models?.Student;
    const className = normalizeString(req.query.className);
    const section = normalizeString(req.query.section);

    const records = await SelfStudent.find({ isActive: { $ne: false } })
      .sort({ className: 1, section: 1, name: 1 })
      .lean();

    const allStudents = Student
      ? await Student.find({ isActive: true }).select('_id name rollNumber class section guardianPhone phone').sort({ name: 1 }).lean()
      : [];

    const takenIds = new Set(records.map((item) => String(item.studentId)));
    const availableStudents = allStudents.filter((item) => {
      if (takenIds.has(String(item._id))) return false;
      if (className && normalizeString(item.class) !== className) return false;
      if (section && normalizeString(item.section) !== section) return false;
      return true;
    });

    const classMap = new Map();
    allStudents.forEach((item) => {
      const nextClass = normalizeString(item.class);
      const nextSection = normalizeString(item.section);
      if (!nextClass) return;
      const current = classMap.get(nextClass) || [];
      if (nextSection && !current.includes(nextSection)) current.push(nextSection);
      classMap.set(nextClass, current);
    });

    return res.json({
      success: true,
      data: {
        records,
        availableStudents,
        classOptions: Array.from(classMap.entries())
          .sort((left, right) => left[0].localeCompare(right[0], undefined, { numeric: true }))
          .map(([name, sections]) => ({ className: name, sections: sections.sort() })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load self students.', error: error.message });
  }
};

const createSelfStudent = async (req, res) => {
  try {
    const Student = req.models?.Student;
    const SelfStudent = req.models?.TransportSelfStudent;
    const studentId = normalizeString(req.body?.studentId);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Select a student.' });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const record = await SelfStudent.create({
      studentId: student._id,
      name: normalizeString(student.name),
      rollNumber: normalizeString(student.rollNumber),
      className: normalizeString(student.class),
      section: normalizeString(student.section),
      commuteMode: COMMUTE_MODES.includes(req.body?.commuteMode) ? req.body.commuteMode : 'Walk',
      guardianPhone: normalizeString(req.body?.guardianPhone || student.guardianPhone || student.phone),
      notes: normalizeString(req.body?.notes),
    });

    return res.status(201).json({ success: true, data: record, message: 'Self-commuting student added.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This student is already marked as self-commuting.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to add self-commuting student.', error: error.message });
  }
};

const updateSelfStudent = async (req, res) => {
  try {
    const record = await req.models.TransportSelfStudent.findByIdAndUpdate(
      req.params.id,
      {
        commuteMode: COMMUTE_MODES.includes(req.body?.commuteMode) ? req.body.commuteMode : 'Walk',
        guardianPhone: normalizeString(req.body?.guardianPhone),
        notes: normalizeString(req.body?.notes),
      },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
    return res.json({ success: true, data: record, message: 'Self-commuting student updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update record.', error: error.message });
  }
};

const deleteSelfStudent = async (req, res) => {
  try {
    const record = await req.models.TransportSelfStudent.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
    return res.json({ success: true, message: 'Student removed from self-commute list.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove record.', error: error.message });
  }
};

module.exports = {
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
};
