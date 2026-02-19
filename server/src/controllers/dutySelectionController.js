const asyncHandler = require('../middleware/asyncHandler');
const DutySelection = require('../models/DutySelection');
const { generateResponse, HTTP_STATUS } = require('../utils/constants');

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

module.exports = {
    getDutySelections,
    saveDutySelections,
};
