const { DUTY_TYPES } = require('../../models/platform/MasterRemunerationRate');

const normalizeDutyType = (value) => String(value || '').trim();

const normalizeNumber = (value) => {
  const num = typeof value === 'number' ? value : Number(String(value || '').trim());
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
};

exports.listRates = async (req, res) => {
  try {
    const { MasterRemunerationRate } = req.platformModels;
    const items = await MasterRemunerationRate.find({}).sort({ dutyType: 1 }).lean();

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch remuneration rates',
      error: error.message,
    });
  }
};

exports.upsertRates = async (req, res) => {
  try {
    const { MasterRemunerationRate } = req.platformModels;
    const { rates } = req.body || {};

    const rows = Array.isArray(rates) ? rates : [];
    const operations = [];

    for (const row of rows) {
      const dutyType = normalizeDutyType(row?.dutyType);
      if (!dutyType || !DUTY_TYPES.includes(dutyType)) {
        continue;
      }

      operations.push({
        updateOne: {
          filter: { dutyType },
          update: {
            $set: {
              dutyType,
              rates: {
                remuneration: normalizeNumber(row?.rates?.remuneration ?? row?.remuneration),
                conveyance: normalizeNumber(row?.rates?.conveyance ?? row?.conveyance),
                refreshment: normalizeNumber(row?.rates?.refreshment ?? row?.refreshment),
              },
              isActive: true,
              updatedBy: req.platformUser?._id || null,
            },
          },
          upsert: true,
        },
      });
    }

    if (operations.length > 0) {
      await MasterRemunerationRate.bulkWrite(operations, { ordered: false });
    }

    const items = await MasterRemunerationRate.find({}).sort({ dutyType: 1 }).lean();

    return res.json({
      success: true,
      message: 'Remuneration rates updated',
      data: items,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update remuneration rates',
      error: error.message,
    });
  }
};

