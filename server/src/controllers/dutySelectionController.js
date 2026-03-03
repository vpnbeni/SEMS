const asyncHandler = require('../middleware/asyncHandler');
const DutySelection = require('../models/DutySelection');
const DutyAllocationSetting = require('../models/DutyAllocationSetting');
const { generateResponse } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * @desc    Get all duty selections for a given dutyType
 * @route   GET /api/duties/selections?dutyType=Centre+Superintendent
 * @access  Private
 */
const getDutySelections = asyncHandler(async (req, res) => {
    const { dutyType } = req.query;

    if (!dutyType) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
            generateResponse(false, 'dutyType query parameter is required')
        );
    }

    const selections = await DutySelection.find({ dutyType }).lean();

    // Return as a map: { "funcId::dateKey": true }
    const selectionMap = {};
    for (const sel of selections) {
        selectionMap[`${sel.functionary}::${sel.examDate}`] = true;
    }

    res.status(HTTP_STATUS.OK).json(
        generateResponse(true, 'Duty selections fetched', selectionMap)
    );
});

/**
 * @desc    Save duty selections for a given dutyType (replaces all existing)
 * @route   POST /api/duties/selections
 * @body    { dutyType: string, selections: Record<string, boolean> }
 *          selections keys are "funcId::dateKey", values are true/false
 * @access  Private (admin/staff)
 */
const saveDutySelections = asyncHandler(async (req, res) => {
    const { dutyType, selections } = req.body;

    if (!dutyType) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
            generateResponse(false, 'dutyType is required')
        );
    }

    if (!selections || typeof selections !== 'object') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
            generateResponse(false, 'selections object is required')
        );
    }

    // Remove all existing selections for this dutyType
    await DutySelection.deleteMany({ dutyType });

    // Build new selection documents from the truthy entries
    const docs = [];
    for (const [key, value] of Object.entries(selections)) {
        if (!value) continue;
        const [functionary, examDate] = key.split('::');
        if (!functionary || !examDate) continue;
        docs.push({
            dutyType,
            examDate,
            functionary,
            selectedBy: req.user?._id || req.user?.id,
        });
    }

    if (docs.length > 0) {
        await DutySelection.insertMany(docs, { ordered: false });
    }

    res.status(HTTP_STATUS.OK).json(
        generateResponse(true, `${docs.length} duty selection(s) saved for ${dutyType}`)
    );
});

/**
 * @desc    Get duty allocation mode
 * @route   GET /api/duties/allocation-mode
 * @access  Private
 */
const getDutyAllocationMode = asyncHandler(async (_req, res) => {
    const setting = await DutyAllocationSetting.findOne({}).sort({ updatedAt: -1 }).lean();
    const mode = String(setting?.mode || '').toLowerCase() === 'auto' ? 'auto' : 'manual';

    return res.status(HTTP_STATUS.OK).json(
        generateResponse(true, 'Duty allocation mode fetched', { mode })
    );
});

/**
 * @desc    Update duty allocation mode
 * @route   PUT /api/duties/allocation-mode
 * @body    { mode: 'auto' | 'manual' }
 * @access  Private (admin/staff)
 */
const updateDutyAllocationMode = asyncHandler(async (req, res) => {
    const mode = String(req.body?.mode || '').toLowerCase() === 'auto' ? 'auto' : 'manual';
    const existing = await DutyAllocationSetting.findOne({}).sort({ updatedAt: -1 });

    if (existing) {
        existing.mode = mode;
        await existing.save();
    } else {
        await DutyAllocationSetting.create({ mode });
    }

    return res.status(HTTP_STATUS.OK).json(
        generateResponse(true, 'Duty allocation mode updated', { mode })
    );
});

/**
 * @desc    Get total duty selection counts grouped by dutyType
 * @route   GET /api/duties/selections/counts
 * @access  Private
 */
const getDutySelectionCounts = asyncHandler(async (_req, res) => {
    const counts = await DutySelection.aggregate([
        { $group: { _id: '$dutyType', total: { $sum: 1 } } },
    ]);

    // Return as a map: { "Invigilator": 38, "Centre Superintendent": 5, ... }
    const countMap = {};
    for (const entry of counts) {
        countMap[entry._id] = entry.total;
    }

    res.status(HTTP_STATUS.OK).json(
        generateResponse(true, 'Duty selection counts fetched', countMap)
    );
});

module.exports = {
    getDutySelections,
    saveDutySelections,
    getDutyAllocationMode,
    updateDutyAllocationMode,
    getDutySelectionCounts,
};
