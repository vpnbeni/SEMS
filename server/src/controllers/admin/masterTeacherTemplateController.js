const {
  ALLOWED_TEACHER_TEMPLATE_KEYS
} = require('../../models/platform/MasterTeacherTemplate');

const DEFAULT_TEMPLATE_COLUMNS = [
  { key: 'srNo', label: 'Sr No', required: false },
  { key: 'oasisId', label: 'Oasis ID', required: true },
  { key: 'functionaryName', label: 'Functionary Name', required: true },
  { key: 'designation', label: 'Designation', required: true },
  { key: 'subject', label: 'Subject', required: false },
  { key: 'subjectCode', label: 'Subject Code', required: false },
  { key: 'schoolCode', label: 'School Code', required: false }
];

const getTemplate = async (req, res) => {
  try {
    const { MasterTeacherTemplate } = req.platformModels;
    const template = await MasterTeacherTemplate.findOne({ isActive: true })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        name: template?.name || 'Exam Functionaries Import Template',
        columns: template?.columns?.length ? template.columns : DEFAULT_TEMPLATE_COLUMNS
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher template',
      error: error.message
    });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { MasterTeacherTemplate } = req.platformModels;
    const { name, columns } = req.body || {};

    if (!Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'columns array is required'
      });
    }

    const seen = new Set();
    for (const column of columns) {
      if (!column || typeof column !== 'object') {
        return res.status(400).json({ success: false, message: 'Invalid column object' });
      }
      const { key, label } = column;
      if (!ALLOWED_TEACHER_TEMPLATE_KEYS.includes(key)) {
        return res.status(400).json({ success: false, message: `Invalid column key: ${key}` });
      }
      if (seen.has(key)) {
        return res.status(400).json({ success: false, message: `Duplicate column key: ${key}` });
      }
      seen.add(key);
      if (!label || !String(label).trim()) {
        return res.status(400).json({ success: false, message: `Column label is required for key: ${key}` });
      }
    }

    const updated = await MasterTeacherTemplate.findOneAndUpdate(
      { isActive: true },
      {
        $set: {
          name: name || 'Exam Functionaries Import Template',
          columns: columns.map((column) => ({
            key: column.key,
            label: String(column.label).trim(),
            required: Boolean(column.required)
          })),
          isActive: true
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      success: true,
      message: 'Teacher import template updated successfully',
      data: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update teacher template',
      error: error.message
    });
  }
};

module.exports = {
  getTemplate,
  updateTemplate,
  DEFAULT_TEMPLATE_COLUMNS
};
