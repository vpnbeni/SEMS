const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const withActive = (definition) => new mongoose.Schema({
  ...definition,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const clubSchema = withActive({
  name: { type: String, required: true, trim: true },
  logo: { type: String, trim: true, default: '' },
  logoPublicId: { type: String, trim: true, default: '' },
  tagline: { type: String, trim: true, default: '' },
  motto: { type: String, trim: true, default: '' },
  color: { type: String, trim: true, default: '' },
  incharge: { type: String, trim: true, default: '' },
  meetingDay: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  members: { type: String, trim: true, default: '' },
  activities: { type: String, trim: true, default: '' },
});

const houseMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, trim: true, default: '' },
  className: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
}, { _id: true });

const houseTeacherSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, trim: true, default: 'House Teacher' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
}, { _id: true });

const houseSchema = withActive({
  name: { type: String, required: true, trim: true },
  logo: { type: String, trim: true, default: '' },
  logoPublicId: { type: String, trim: true, default: '' },
  flag: { type: String, trim: true, default: '' },
  flagPublicId: { type: String, trim: true, default: '' },
  tagline: { type: String, trim: true, default: '' },
  motto: { type: String, trim: true, default: '' },
  color: { type: String, trim: true, default: '' },
  teachers: { type: [houseTeacherSchema], default: [] },
  councilMembers: { type: [houseMemberSchema], default: [] },
  // Legacy fields retained for older records
  incharge: { type: String, trim: true, default: '' },
  members: { type: String, trim: true, default: '' },
  activityType: { type: String, trim: true, default: '' },
  activities: { type: String, trim: true, default: '' },
});

const tourSchema = withActive({
  title: { type: String, required: true, trim: true },
  destination: { type: String, trim: true, default: '' },
  startDate: { type: String, trim: true, default: '' },
  endDate: { type: String, trim: true, default: '' },
  classes: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  students: { type: String, trim: true, default: '' },
  feedback: { type: String, trim: true, default: '' },
});

const sportsSchema = withActive({
  title: { type: String, required: true, trim: true },
  year: { type: String, trim: true, default: '' },
  venue: { type: String, trim: true, default: '' },
  startDate: { type: String, trim: true, default: '' },
  endDate: { type: String, trim: true, default: '' },
  events: { type: String, trim: true, default: '' },
  results: { type: String, trim: true, default: '' },
});

const functionSchema = withActive({
  title: { type: String, required: true, trim: true },
  functionType: { type: String, trim: true, default: '' },
  date: { type: String, trim: true, default: '' },
  venue: { type: String, trim: true, default: '' },
  incharge: { type: String, trim: true, default: '' },
  plan: { type: String, trim: true, default: '' },
  outcome: { type: String, trim: true, default: '' },
});

const eventSchema = withActive({
  title: { type: String, required: true, trim: true },
  date: { type: String, trim: true, default: '' },
  monthKey: { type: String, trim: true, default: '' },
  scopeType: { type: String, trim: true, default: 'school' }, // school | house | club
  houseId: { type: String, trim: true, default: '' },
  houseName: { type: String, trim: true, default: '' },
  clubId: { type: String, trim: true, default: '' },
  clubName: { type: String, trim: true, default: '' },
  venue: { type: String, trim: true, default: '' },
  incharge: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  status: { type: String, trim: true, default: 'planned' }, // planned | completed | cancelled
});

const pointsSchema = withActive({
  title: { type: String, required: true, trim: true },
  date: { type: String, trim: true, default: '' },
  eventId: { type: String, trim: true, default: '' },
  houseId: { type: String, trim: true, default: '' },
  houseName: { type: String, trim: true, default: '' },
  houseColor: { type: String, trim: true, default: '' },
  points: { type: Number, default: 0 },
  category: { type: String, trim: true, default: 'Inter-house' },
  notes: { type: String, trim: true, default: '' },
});

const certificateSchema = withActive({
  title: { type: String, required: true, trim: true },
  eventId: { type: String, trim: true, default: '' },
  eventTitle: { type: String, trim: true, default: '' },
  eventDate: { type: String, trim: true, default: '' },
  houseId: { type: String, trim: true, default: '' },
  houseName: { type: String, trim: true, default: '' },
  participantName: { type: String, required: true, trim: true },
  className: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  role: { type: String, trim: true, default: 'Participant' },
  issuedOn: { type: String, trim: true, default: '' },
  status: { type: String, trim: true, default: 'issued' },
});

module.exports = {
  ActivityClub: createContextModelProxy('ActivityClub', clubSchema),
  ActivityHouse: createContextModelProxy('ActivityHouse', houseSchema),
  ActivityTour: createContextModelProxy('ActivityTour', tourSchema),
  ActivitySportsMeet: createContextModelProxy('ActivitySportsMeet', sportsSchema),
  ActivityFunction: createContextModelProxy('ActivityFunction', functionSchema),
  ActivityEvent: createContextModelProxy('ActivityEvent', eventSchema),
  ActivityPoints: createContextModelProxy('ActivityPoints', pointsSchema),
  ActivityCertificate: createContextModelProxy('ActivityCertificate', certificateSchema),
};
