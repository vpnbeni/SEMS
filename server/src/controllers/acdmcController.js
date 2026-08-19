const { makeRecordCrud } = require('../utils/recordCrud');

const lessonPlans = makeRecordCrud('AcademicLessonPlan', ['title', 'teacherName', 'className', 'section', 'subject', 'date', 'topic', 'objectives', 'activities', 'resources', 'status']);
const homework = makeRecordCrud('AcademicHomework', ['title', 'teacherName', 'className', 'section', 'subject', 'assignedDate', 'dueDate', 'description', 'status']);
const assignments = makeRecordCrud('AcademicAssignment', ['title', 'teacherName', 'className', 'section', 'subject', 'assignedDate', 'dueDate', 'maxMarks', 'instructions', 'status']);
const quizzes = makeRecordCrud('AcademicQuiz', ['title', 'teacherName', 'className', 'section', 'subject', 'topic', 'date', 'durationMinutes', 'questions', 'status']);
const curriculum = makeRecordCrud('AcademicCurriculum', ['className', 'subject', 'bookTitle', 'author', 'publisher', 'sessionType', 'academicSession', 'status']);

module.exports = { lessonPlans, homework, assignments, quizzes, curriculum };
