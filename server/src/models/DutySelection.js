const mongoose = require('mongoose');

const dutySelectionSchema = new mongoose.Schema(
    {
        dutyType: {
            type: String,
            required: true,
            enum: [
                'Centre Superintendent',
                'Deputy Centre Superintendent',
                'Observer',
                'Invigilator',
                'ASI (CCTV)',
                'ASI (Frisking Male)',
                'ASI (Frisking Female)',
                'Clerk',
                'Class IV',
            ],
        },
        examDate: {
            type: String,
            required: true,
        },
        functionary: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
            required: true,
        },
        selectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate selections
dutySelectionSchema.index(
    { dutyType: 1, examDate: 1, functionary: 1 },
    { unique: true }
);

module.exports = mongoose.model('DutySelection', dutySelectionSchema);
