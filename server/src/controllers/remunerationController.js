const { getPlatformModels } = require('../tenancy/platformModels');

exports.getRemunerationRates = async (req, res) => {
  try {
    const { MasterRemunerationRate } = getPlatformModels();
    const items = await MasterRemunerationRate.find({ isActive: true }).sort({ dutyType: 1 }).lean();

    const byDutyType = {};
    for (const item of items) {
      const dutyType = String(item?.dutyType || '').trim();
      if (!dutyType) continue;
      byDutyType[dutyType] = {
        remuneration: Number(item?.rates?.remuneration || 0),
        conveyance: Number(item?.rates?.conveyance || 0),
        refreshment: Number(item?.rates?.refreshment || 0),
      };
    }

    return res.json({
      success: true,
      data: {
        byDutyType,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch remuneration rates',
      error: error.message,
    });
  }
};

