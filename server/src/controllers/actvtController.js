const { makeRecordCrud } = require('../utils/recordCrud');
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../config/cloudinary');

const tours = makeRecordCrud('ActivityTour', ['title', 'destination', 'startDate', 'endDate', 'classes', 'description', 'students', 'feedback']);
const sports = makeRecordCrud('ActivitySportsMeet', ['title', 'year', 'venue', 'startDate', 'endDate', 'events', 'results']);
const functions = makeRecordCrud('ActivityFunction', ['title', 'functionType', 'date', 'venue', 'incharge', 'plan', 'outcome']);
const events = makeRecordCrud('ActivityEvent', [
  'title', 'date', 'monthKey', 'scopeType', 'houseId', 'houseName', 'clubId', 'clubName',
  'venue', 'incharge', 'description', 'status',
]);
const points = makeRecordCrud('ActivityPoints', [
  'title', 'date', 'eventId', 'houseId', 'houseName', 'houseColor', 'points', 'category', 'notes',
]);
const certificates = makeRecordCrud('ActivityCertificate', [
  'title', 'eventId', 'eventTitle', 'eventDate', 'houseId', 'houseName',
  'participantName', 'className', 'section', 'role', 'issuedOn', 'status',
]);

const ranking = {
  summary: async (req, res) => {
    try {
      const PointsModel = req.models?.ActivityPoints;
      const HouseModel = req.models?.ActivityHouse;
      if (!PointsModel) {
        return res.status(500).json({ success: false, message: 'ActivityPoints is not available.' });
      }

      const [pointRows, houses] = await Promise.all([
        PointsModel.find({ isActive: { $ne: false } }).sort({ date: -1, createdAt: -1 }).lean(),
        HouseModel
          ? HouseModel.find({ isActive: { $ne: false } }).select('name color logo').sort({ name: 1 }).lean()
          : Promise.resolve([]),
      ]);

      const byHouse = new Map();
      houses.forEach((house) => {
        byHouse.set(String(house._id), {
          houseId: String(house._id),
          houseName: house.name || 'Untitled house',
          houseColor: house.color || '',
          logo: house.logo || '',
          totalPoints: 0,
          entries: 0,
        });
      });

      pointRows.forEach((row) => {
        const houseId = String(row.houseId || '').trim() || `name:${String(row.houseName || '').trim().toLowerCase()}`;
        if (!byHouse.has(houseId)) {
          byHouse.set(houseId, {
            houseId,
            houseName: row.houseName || 'Unknown house',
            houseColor: row.houseColor || '',
            logo: '',
            totalPoints: 0,
            entries: 0,
          });
        }
        const bucket = byHouse.get(houseId);
        bucket.totalPoints += Number(row.points) || 0;
        bucket.entries += 1;
        if (!bucket.houseColor && row.houseColor) bucket.houseColor = row.houseColor;
        if (!bucket.houseName && row.houseName) bucket.houseName = row.houseName;
      });

      const standings = Array.from(byHouse.values())
        .sort((a, b) => b.totalPoints - a.totalPoints || a.houseName.localeCompare(b.houseName))
        .map((item, index) => ({ ...item, rank: index + 1 }));

      return res.json({
        success: true,
        data: {
          standings,
          recent: pointRows.slice(0, 40),
          totalEntries: pointRows.length,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to load house ranking.', error: error.message });
    }
  },
};

const CLUB_FIELDS = [
  'name',
  'logo',
  'logoPublicId',
  'tagline',
  'motto',
  'color',
  'incharge',
  'meetingDay',
  'description',
  'members',
  'activities',
];

const HOUSE_FIELDS = ['name', 'logo', 'logoPublicId', 'flag', 'flagPublicId', 'tagline', 'motto', 'color', 'teachers', 'councilMembers'];

const pickClubPayload = (body = {}) => {
  const payload = {};
  CLUB_FIELDS.forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });
  payload.isActive = body.isActive !== false;
  ['name', 'tagline', 'motto', 'color', 'incharge', 'meetingDay', 'description', 'members', 'activities'].forEach((field) => {
    if (typeof payload[field] === 'string') payload[field] = payload[field].trim();
  });
  return payload;
};

const pickHousePayload = (body = {}) => {
  const payload = {};
  HOUSE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });
  payload.isActive = body.isActive !== false;
  if (typeof payload.name === 'string') payload.name = payload.name.trim();
  if (typeof payload.tagline === 'string') payload.tagline = payload.tagline.trim();
  if (typeof payload.motto === 'string') payload.motto = payload.motto.trim();
  if (typeof payload.color === 'string') payload.color = payload.color.trim();

  if (typeof payload.teachers === 'string') {
    try { payload.teachers = JSON.parse(payload.teachers); } catch (_error) { payload.teachers = []; }
  }
  if (typeof payload.councilMembers === 'string') {
    try { payload.councilMembers = JSON.parse(payload.councilMembers); } catch (_error) { payload.councilMembers = []; }
  }
  if (Array.isArray(payload.teachers)) {
    payload.teachers = payload.teachers
      .map((item) => ({
        name: String(item?.name || '').trim(),
        role: String(item?.role || 'House Teacher').trim() || 'House Teacher',
        phone: String(item?.phone || '').trim(),
        email: String(item?.email || '').trim(),
        teacherId: item?.teacherId || null,
      }))
      .filter((item) => item.name);
  }
  if (Array.isArray(payload.councilMembers)) {
    payload.councilMembers = payload.councilMembers
      .map((item) => ({
        name: String(item?.name || '').trim(),
        role: String(item?.role || 'Member').trim() || 'Member',
        className: String(item?.className || '').trim(),
        section: String(item?.section || '').trim(),
        phone: String(item?.phone || '').trim(),
        studentId: item?.studentId || null,
      }))
      .filter((item) => item.name);
  }

  return payload;
};

const uploadActvtImageIfPresent = async (req, fieldName, folder, existingPublicId = '') => {
  const file = req.files?.[fieldName];
  if (!file) return null;

  const fileInput = file.tempFilePath || file.data;
  const uploadResult = await uploadToCloudinary(fileInput, folder);

  if (existingPublicId) {
    try {
      await deleteFromCloudinary(existingPublicId);
    } catch (_error) {
      // Best-effort cleanup of previous image.
    }
  }

  return {
    url: uploadResult.url,
    publicId: uploadResult.publicId,
  };
};

const parseMemberLines = (members = '') =>
  String(members || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const clubs = {
  list: async (req, res) => {
    try {
      const Model = req.models?.ActivityClub;
      if (!Model) return res.status(500).json({ success: false, message: 'ActivityClub is not available.' });
      const records = await Model.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
      return res.json({ success: true, data: records });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to load clubs.', error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const Model = req.models?.ActivityClub;
      if (!Model) return res.status(500).json({ success: false, message: 'ActivityClub is not available.' });

      const payload = pickClubPayload(req.body);
      if (!payload.name) {
        return res.status(400).json({ success: false, message: 'Club name is required.' });
      }

      const logoUpload = await uploadActvtImageIfPresent(req, 'logo', 'actvt/clubs/logos');
      if (logoUpload) {
        payload.logo = logoUpload.url;
        payload.logoPublicId = logoUpload.publicId;
      }

      const record = await Model.create(payload);
      return res.status(201).json({ success: true, data: record, message: 'Club saved.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to save club.', error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const Model = req.models?.ActivityClub;
      if (!Model) return res.status(500).json({ success: false, message: 'ActivityClub is not available.' });

      const existing = await Model.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Club not found.' });

      const payload = pickClubPayload(req.body);
      if (payload.name !== undefined && !payload.name) {
        return res.status(400).json({ success: false, message: 'Club name is required.' });
      }

      const logoUpload = await uploadActvtImageIfPresent(
        req,
        'logo',
        'actvt/clubs/logos',
        existing.logoPublicId || extractPublicId(existing.logo) || ''
      );
      if (logoUpload) {
        payload.logo = logoUpload.url;
        payload.logoPublicId = logoUpload.publicId;
      } else if (String(req.body?.clearLogo || '').toLowerCase() === 'true') {
        const publicId = existing.logoPublicId || extractPublicId(existing.logo);
        if (publicId) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (_error) {
            // Best-effort logo cleanup.
          }
        }
        payload.logo = '';
        payload.logoPublicId = '';
      }

      const record = await Model.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
      return res.json({ success: true, data: record, message: 'Club updated.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update club.', error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const Model = req.models?.ActivityClub;
      if (!Model) return res.status(500).json({ success: false, message: 'ActivityClub is not available.' });

      const existing = await Model.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Club not found.' });

      const publicId = existing.logoPublicId || extractPublicId(existing.logo);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (_error) {
          // Best-effort logo cleanup.
        }
      }

      await Model.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
      return res.json({ success: true, message: 'Club removed.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to remove club.', error: error.message });
    }
  },

  details: async (req, res) => {
    try {
      const Model = req.models?.ActivityClub;
      if (!Model) return res.status(500).json({ success: false, message: 'ActivityClub is not available.' });

      const club = await Model.findOne({
        _id: req.params.id,
        isActive: { $ne: false },
      }).lean();

      if (!club) {
        return res.status(404).json({ success: false, message: 'Club not found.' });
      }

      const memberLines = parseMemberLines(club.members);

      return res.json({
        success: true,
        data: {
          club,
          memberLines,
          stats: {
            membersCount: memberLines.length,
            hasIncharge: Boolean(String(club.incharge || '').trim()),
            hasMeetingDay: Boolean(String(club.meetingDay || '').trim()),
          },
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to load club details.', error: error.message });
    }
  },
};

const houses = {
  list: async (req, res) => {
    try {
      const Model = req.models?.ActivityHouse;
      if (!Model) return res.status(500).json({ success: false, message: 'ActivityHouse is not available.' });
      const records = await Model.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
      return res.json({ success: true, data: records });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to load houses.', error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const Model = req.models?.ActivityHouse;
      if (!Model) return res.status(500).json({ success: false, message: 'ActivityHouse is not available.' });

      const payload = pickHousePayload(req.body);
      if (!payload.name) {
        return res.status(400).json({ success: false, message: 'House name is required.' });
      }

      const logoUpload = await uploadActvtImageIfPresent(req, 'logo', 'actvt/houses/logos');
      if (logoUpload) {
        payload.logo = logoUpload.url;
        payload.logoPublicId = logoUpload.publicId;
      }

      const flagUpload = await uploadActvtImageIfPresent(req, 'flag', 'actvt/houses/flags');
      if (flagUpload) {
        payload.flag = flagUpload.url;
        payload.flagPublicId = flagUpload.publicId;
      }

      const record = await Model.create(payload);
      return res.status(201).json({ success: true, data: record, message: 'House saved.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to save house.', error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const Model = req.models?.ActivityHouse;
      if (!Model) return res.status(500).json({ success: false, message: 'ActivityHouse is not available.' });

      const existing = await Model.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'House not found.' });

      const payload = pickHousePayload(req.body);
      if (payload.name !== undefined && !payload.name) {
        return res.status(400).json({ success: false, message: 'House name is required.' });
      }

      const logoUpload = await uploadActvtImageIfPresent(
        req,
        'logo',
        'actvt/houses/logos',
        existing.logoPublicId || extractPublicId(existing.logo) || ''
      );
      if (logoUpload) {
        payload.logo = logoUpload.url;
        payload.logoPublicId = logoUpload.publicId;
      } else if (String(req.body?.clearLogo || '').toLowerCase() === 'true') {
        const publicId = existing.logoPublicId || extractPublicId(existing.logo);
        if (publicId) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (_error) {
            // Best-effort logo cleanup.
          }
        }
        payload.logo = '';
        payload.logoPublicId = '';
      }

      const flagUpload = await uploadActvtImageIfPresent(
        req,
        'flag',
        'actvt/houses/flags',
        existing.flagPublicId || extractPublicId(existing.flag) || ''
      );
      if (flagUpload) {
        payload.flag = flagUpload.url;
        payload.flagPublicId = flagUpload.publicId;
      }

      const record = await Model.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
      return res.json({ success: true, data: record, message: 'House updated.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update house.', error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const Model = req.models?.ActivityHouse;
      if (!Model) return res.status(500).json({ success: false, message: 'ActivityHouse is not available.' });

      const existing = await Model.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'House not found.' });

      const publicId = existing.logoPublicId || extractPublicId(existing.logo);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (_error) {
          // Best-effort logo cleanup.
        }
      }

      const flagPublicId = existing.flagPublicId || extractPublicId(existing.flag);
      if (flagPublicId) {
        try {
          await deleteFromCloudinary(flagPublicId);
        } catch (_error) {
          // Best-effort flag cleanup.
        }
      }

      await Model.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
      return res.json({ success: true, message: 'House removed.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to remove house.', error: error.message });
    }
  },

  stats: async (req, res) => {
    try {
      const HouseModel = req.models?.ActivityHouse;
      const StudentModel = req.models?.Student;
      if (!HouseModel) {
        return res.status(500).json({ success: false, message: 'ActivityHouse is not available.' });
      }

      const houses = await HouseModel.find({ isActive: { $ne: false } })
        .select('_id name color logo')
        .sort({ name: 1 })
        .lean();

      const houseIdSet = new Set(houses.map((house) => String(house._id)));
      const byHouseMap = new Map(houses.map((house) => [String(house._id), {
        houseId: String(house._id),
        houseName: house.name,
        color: house.color || '',
        logo: house.logo || '',
        count: 0,
      }]));

      let totalStudents = 0;
      let assignedStudents = 0;
      let unassignedStudents = 0;
      const matrixMap = new Map();

      const sortClassSection = (left, right) => {
        const leftNum = Number.parseInt(String(left.className).match(/\d+/)?.[0] || '9999', 10);
        const rightNum = Number.parseInt(String(right.className).match(/\d+/)?.[0] || '9999', 10);
        if (leftNum !== rightNum) return leftNum - rightNum;
        const classCompare = String(left.className).localeCompare(String(right.className), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (classCompare !== 0) return classCompare;
        return String(left.section).localeCompare(String(right.section), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      };

      if (StudentModel) {
        const studentFilter = { isActive: { $ne: false } };
        if (req.academicSession) studentFilter.academicSession = req.academicSession;

        const students = await StudentModel.find(studentFilter)
          .select('class section house houseId')
          .lean();

        totalStudents = students.length;

        students.forEach((student) => {
          const className = String(student.class || '').trim() || 'Unspecified';
          const section = String(student.section || '').trim() || '-';
          const rowKey = `${className}::${section}`;
          if (!matrixMap.has(rowKey)) {
            matrixMap.set(rowKey, {
              className,
              section,
              houses: {},
              unassigned: 0,
              total: 0,
            });
          }
          const row = matrixMap.get(rowKey);
          row.total += 1;

          const houseId = student.houseId ? String(student.houseId) : '';
          const matchedHouseId = houseId && houseIdSet.has(houseId)
            ? houseId
            : (() => {
                const houseName = String(student.house || '').trim().toLowerCase();
                if (!houseName) return '';
                const matched = houses.find((house) => String(house.name || '').trim().toLowerCase() === houseName);
                return matched ? String(matched._id) : '';
              })();

          if (matchedHouseId && byHouseMap.has(matchedHouseId)) {
            assignedStudents += 1;
            byHouseMap.get(matchedHouseId).count += 1;
            row.houses[matchedHouseId] = (row.houses[matchedHouseId] || 0) + 1;
          } else {
            unassignedStudents += 1;
            row.unassigned += 1;
          }
        });
      }

      return res.json({
        success: true,
        data: {
          totalStudents,
          assignedStudents,
          unassignedStudents,
          byHouse: Array.from(byHouseMap.values()),
          matrix: Array.from(matrixMap.values()).sort(sortClassSection),
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to load house stats.', error: error.message });
    }
  },

  details: async (req, res) => {
    try {
      const HouseModel = req.models?.ActivityHouse;
      const StudentModel = req.models?.Student;
      if (!HouseModel) {
        return res.status(500).json({ success: false, message: 'ActivityHouse is not available.' });
      }

      const house = await HouseModel.findOne({
        _id: req.params.id,
        isActive: { $ne: false },
      }).lean();

      if (!house) {
        return res.status(404).json({ success: false, message: 'House not found.' });
      }

      let students = [];

      if (StudentModel) {
        const studentFilter = {
          isActive: { $ne: false },
          $or: [
            { houseId: house._id },
            ...(house.name
              ? [{ house: new RegExp(`^${String(house.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }]
              : []),
          ],
        };
        if (req.academicSession) studentFilter.academicSession = req.academicSession;

        students = await StudentModel.find(studentFilter)
          .select('rollNumber classRollNo name class section gender phone house houseId fatherName')
          .sort({ class: 1, section: 1, classRollNo: 1, name: 1 })
          .lean();
      }

      const byClassSectionMap = new Map();
      const genderCounts = { Boy: 0, Girl: 0, Other: 0, Unspecified: 0 };

      students.forEach((student) => {
        const className = String(student.class || '').trim() || 'Unspecified';
        const section = String(student.section || '').trim() || '-';
        const key = `${className}::${section}`;
        byClassSectionMap.set(key, (byClassSectionMap.get(key) || 0) + 1);

        const gender = String(student.gender || 'Unspecified');
        if (genderCounts[gender] !== undefined) genderCounts[gender] += 1;
        else genderCounts.Unspecified += 1;
      });

      const byClassSection = Array.from(byClassSectionMap.entries())
        .map(([key, count]) => {
          const [className, section] = key.split('::');
          return { className, section, count };
        })
        .sort((left, right) => {
          const leftNum = Number.parseInt(String(left.className).match(/\d+/)?.[0] || '9999', 10);
          const rightNum = Number.parseInt(String(right.className).match(/\d+/)?.[0] || '9999', 10);
          if (leftNum !== rightNum) return leftNum - rightNum;
          return String(left.section).localeCompare(String(right.section), undefined, { sensitivity: 'base' });
        });

      return res.json({
        success: true,
        data: {
          house,
          students,
          stats: {
            totalStudents: students.length,
            teachersCount: Array.isArray(house.teachers) ? house.teachers.length : 0,
            councilCount: Array.isArray(house.councilMembers) ? house.councilMembers.length : 0,
            genderCounts,
            byClassSection,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to load house details.', error: error.message });
    }
  },
};

module.exports = { clubs, houses, tours, sports, functions, events, points, certificates, ranking };
