const pick = (body, fields) => {
  const payload = {};
  fields.forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });
  payload.isActive = body.isActive !== false;
  return payload;
};

const makeRecordCrud = (modelKey, fields) => {
  const list = async (req, res) => {
    try {
      const Model = req.models?.[modelKey];
      if (!Model) return res.status(500).json({ success: false, message: `${modelKey} is not available.` });
      const records = await Model.find({ isActive: { $ne: false } }).sort({ updatedAt: -1 }).lean();
      return res.json({ success: true, data: records });
    } catch (error) {
      return res.status(500).json({ success: false, message: `Failed to load ${modelKey} records.`, error: error.message });
    }
  };

  const create = async (req, res) => {
    try {
      const Model = req.models?.[modelKey];
      const record = await Model.create(pick(req.body, fields));
      return res.status(201).json({ success: true, data: record, message: 'Record saved.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to save record.', error: error.message });
    }
  };

  const update = async (req, res) => {
    try {
      const Model = req.models?.[modelKey];
      const record = await Model.findByIdAndUpdate(req.params.id, pick(req.body, fields), { new: true, runValidators: true });
      if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
      return res.json({ success: true, data: record, message: 'Record updated.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update record.', error: error.message });
    }
  };

  const remove = async (req, res) => {
    try {
      const Model = req.models?.[modelKey];
      const record = await Model.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
      if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
      return res.json({ success: true, message: 'Record removed.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to remove record.', error: error.message });
    }
  };

  return { list, create, update, remove };
};

module.exports = { makeRecordCrud };
