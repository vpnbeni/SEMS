const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const supportTicketSchema = new mongoose.Schema(
  {
    centreCode: {
      type: String,
      required: [true, 'Centre code is required'],
      trim: true,
      maxlength: [20, 'Centre code cannot exceed 20 characters'],
    },
    examDate: {
      type: Date,
      required: [true, 'Exam date is required'],
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
      enum: ['Candidates', 'Seating Plan', 'Duties', 'Answer Sheets', 'Reports', 'Other'],
    },
    description: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
      maxlength: [4000, 'Description cannot exceed 4000 characters'],
    },
    screenshot: {
      type: String,
      trim: true,
      maxlength: [500, 'Screenshot URL cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ centreCode: 1, status: 1 });

supportTicketSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('SupportTicket', supportTicketSchema);

