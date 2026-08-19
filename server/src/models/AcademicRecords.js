const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const withActive = (definition) => new mongoose.Schema({
  ...definition,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const lessonPlanSchema = withActive({
  title: { type: String, required: true, trim: true },
  teacherName: { type: String, trim: true, default: '' },
  className: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  subject: { type: String, trim: true, default: '' },
  date: { type: String, trim: true, default: '' },
  topic: { type: String, trim: true, default: '' },
  objectives: { type: String, trim: true, default: '' },
  activities: { type: String, trim: true, default: '' },
  resources: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
});

const homeworkSchema = withActive({
  title: { type: String, required: true, trim: true },
  teacherName: { type: String, trim: true, default: '' },
  className: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  subject: { type: String, trim: true, default: '' },
  assignedDate: { type: String, trim: true, default: '' },
  dueDate: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
});

const assignmentSchema = withActive({
  title: { type: String, required: true, trim: true },
  teacherName: { type: String, trim: true, default: '' },
  className: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  subject: { type: String, trim: true, default: '' },
  assignedDate: { type: String, trim: true, default: '' },
  dueDate: { type: String, trim: true, default: '' },
  maxMarks: { type: Number, default: 20 },
  instructions: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
});

const quizSchema = withActive({
  title: { type: String, required: true, trim: true },
  teacherName: { type: String, trim: true, default: '' },
  className: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  subject: { type: String, trim: true, default: '' },
  topic: { type: String, trim: true, default: '' },
  date: { type: String, trim: true, default: '' },
  durationMinutes: { type: Number, default: 15 },
  questions: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
});

const curriculumSchema = withActive({
  className: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  bookTitle: { type: String, required: true, trim: true },
  author: { type: String, trim: true, default: '' },
  publisher: { type: String, trim: true, default: '' },
  sessionType: { type: String, enum: ['current', 'next'], default: 'current' },
  academicSession: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['proposed', 'selected'], default: 'proposed' },
});

module.exports = {
  AcademicLessonPlan: createContextModelProxy('AcademicLessonPlan', lessonPlanSchema),
  AcademicHomework: createContextModelProxy('AcademicHomework', homeworkSchema),
  AcademicAssignment: createContextModelProxy('AcademicAssignment', assignmentSchema),
  AcademicQuiz: createContextModelProxy('AcademicQuiz', quizSchema),
  AcademicCurriculum: createContextModelProxy('AcademicCurriculum', curriculumSchema),
};
