const { initiateRollout, retryFailedRollout } = require('../../services/rolloutService');

// Initiate a rollout
exports.initiateRollout = async (req, res) => {
  try {
    const { module, masterDataId, versionLabel } = req.body;

    if (!module || !masterDataId || !versionLabel) {
      return res.status(400).json({
        success: false,
        message: 'module, masterDataId, and versionLabel are required',
      });
    }

    const validModules = ['subjects', 'datesheet', 'guidelines'];
    if (!validModules.includes(module)) {
      return res.status(400).json({
        success: false,
        message: `Invalid module. Must be one of: ${validModules.join(', ')}`,
      });
    }

    const rollout = await initiateRollout({
      module,
      masterDataId,
      versionLabel,
      adminId: req.platformUser._id,
    });

    res.json({
      success: true,
      message: `Rollout initiated for ${module}`,
      data: rollout,
    });
  } catch (error) {
    console.error('Initiate rollout error:', error);

    if (error.message.includes('already in progress')) {
      return res.status(409).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Error initiating rollout', error: error.message });
  }
};

// List rollouts
exports.listRollouts = async (req, res) => {
  try {
    const { DataRollout } = req.platformModels;
    const { module, status } = req.query;

    const filter = {};
    if (module) filter.module = module;
    if (status) filter.status = status;

    const rollouts = await DataRollout.find(filter)
      .select('-tenantStatuses')
      .sort({ initiatedAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: rollouts });
  } catch (error) {
    console.error('List rollouts error:', error);
    res.status(500).json({ success: false, message: 'Error listing rollouts', error: error.message });
  }
};

// Get rollout detail with per-tenant statuses
exports.getRollout = async (req, res) => {
  try {
    const { DataRollout } = req.platformModels;
    const { id } = req.params;

    const rollout = await DataRollout.findById(id).lean();
    if (!rollout) {
      return res.status(404).json({ success: false, message: 'Rollout not found' });
    }

    res.json({ success: true, data: rollout });
  } catch (error) {
    console.error('Get rollout error:', error);
    res.status(500).json({ success: false, message: 'Error getting rollout', error: error.message });
  }
};

// Retry failed tenants in a rollout
exports.retryRollout = async (req, res) => {
  try {
    const { id } = req.params;

    const rollout = await retryFailedRollout(id);

    res.json({
      success: true,
      message: 'Retry initiated for failed tenants',
      data: rollout,
    });
  } catch (error) {
    console.error('Retry rollout error:', error);
    if (error.message === 'Rollout record not found') {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (error.message === 'No failed tenants to retry') {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Error retrying rollout', error: error.message });
  }
};
