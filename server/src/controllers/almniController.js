const { syncClass12Alumni } = require('../services/almniSyncService');

const getCurrentLabel = (req) => String(req.academicSession || '').trim();

const listAlumni = async (req, res) => {
  try {
    const Alumni = req.models?.Alumni;
    if (!Alumni) {
      return res.status(500).json({ success: false, message: 'Alumni model is not available.' });
    }

    const currentLabel = getCurrentLabel(req);
    const sync = await syncClass12Alumni(req, currentLabel);

    const query = { isActive: { $ne: false } };
    const batchSession = String(req.query.batchSession || '').trim();
    const search = String(req.query.search || '').trim();
    const section = String(req.query.section || '').trim();

    if (batchSession) query.batchSession = batchSession;
    if (section) query.section = section;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const records = await Alumni.find(query).sort({ batchSession: -1, name: 1 }).lean();
    const allRecords = await Alumni.find({ isActive: { $ne: false } }).select('batchSession section').lean();

    const batches = [...new Set(allRecords.map((item) => item.batchSession).filter(Boolean))].sort().reverse();
    const sections = [...new Set(allRecords.map((item) => item.section).filter(Boolean))].sort();

    return res.json({
      success: true,
      data: {
        records,
        batches,
        sections,
        total: allRecords.length,
        currentSession: currentLabel,
        sync,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load alumni.', error: error.message });
  }
};

const syncAlumni = async (req, res) => {
  try {
    const currentLabel = getCurrentLabel(req);
    const sync = await syncClass12Alumni(req, currentLabel);
    return res.json({
      success: true,
      message: sync.added > 0
        ? `${sync.added} Class XII student${sync.added === 1 ? '' : 's'} added to alumni.`
        : 'Alumni directory is already up to date.',
      data: sync,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to sync alumni.', error: error.message });
  }
};

module.exports = {
  listAlumni,
  syncAlumni,
};
