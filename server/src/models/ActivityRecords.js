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

const sportsFacilitySchema = withActive({
  name: { type: String, required: true, trim: true },
  facilityType: { type: String, trim: true, default: 'Ground' },
  location: { type: String, trim: true, default: '' },
  capacity: { type: String, trim: true, default: '' },
  color: { type: String, trim: true, default: '#0f766e' },
  description: { type: String, trim: true, default: '' },
});

const sportsSchema = withActive({
  eventId: { type: String, trim: true, default: '' },
  title: { type: String, required: true, trim: true },
  year: { type: String, trim: true, default: '' },
  venue: { type: String, trim: true, default: '' },
  facilityId: { type: String, trim: true, default: '' },
  facilityName: { type: String, trim: true, default: '' },
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
  activityType: { type: String, trim: true, default: 'General' },
  scopeType: { type: String, trim: true, default: 'school' }, // school | house | club
  houseId: { type: String, trim: true, default: '' },
  houseName: { type: String, trim: true, default: '' },
  clubId: { type: String, trim: true, default: '' },
  clubName: { type: String, trim: true, default: '' },
  venue: { type: String, trim: true, default: '' },
  incharge: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  status: { type: String, trim: true, default: 'planned' }, // planned | completed | cancelled
  criteriaId: { type: String, trim: true, default: '' },
  criteriaTitle: { type: String, trim: true, default: '' },
});

const criteriaSchema = withActive({
  title: { type: String, required: true, trim: true },
  activityType: { type: String, trim: true, default: 'General' },
  maxMarks: { type: Number, default: 100 },
  criteria: { type: String, trim: true, default: '' }, // one criterion per line
  notes: { type: String, trim: true, default: '' },
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
  studentId: { type: String, trim: true, default: '' },
  participantName: { type: String, required: true, trim: true },
  className: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  role: { type: String, trim: true, default: 'Participant' },
  issuedOn: { type: String, trim: true, default: '' },
  status: { type: String, trim: true, default: 'issued' },
});

const councilSchema = withActive({
  name: { type: String, required: true, trim: true },
  councilType: { type: String, trim: true, default: 'school' }, // school | house
  houseId: { type: String, trim: true, default: '' },
  houseName: { type: String, trim: true, default: '' },
  academicYear: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  status: { type: String, trim: true, default: 'active' }, // draft | active | archived
});

const councilPostSchema = withActive({
  councilId: { type: String, required: true, trim: true },
  councilName: { type: String, trim: true, default: '' },
  councilType: { type: String, trim: true, default: 'school' },
  houseId: { type: String, trim: true, default: '' },
  houseName: { type: String, trim: true, default: '' },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  seats: { type: Number, default: 1 },
  registrationStatus: { type: String, trim: true, default: 'closed' }, // closed | open | accepting
  // Eligibility: empty preferredGender / preferredClasses means any
  preferredGender: { type: String, trim: true, default: '' }, // Boy | Girl | Other | Unspecified | ''
  preferredClasses: { type: [String], default: [] },
});

const councilRegistrationSchema = withActive({
  councilId: { type: String, required: true, trim: true },
  postId: { type: String, required: true, trim: true },
  postTitle: { type: String, trim: true, default: '' },
  studentId: { type: String, trim: true, default: '' },
  studentName: { type: String, required: true, trim: true },
  rollNumber: { type: String, trim: true, default: '' },
  className: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  gender: { type: String, trim: true, default: '' },
  houseId: { type: String, trim: true, default: '' },
  houseName: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  status: { type: String, trim: true, default: 'pending' }, // pending | accepted | rejected
  notes: { type: String, trim: true, default: '' },
});

module.exports = {
  ActivityClub: createContextModelProxy('ActivityClub', clubSchema),
  ActivityHouse: createContextModelProxy('ActivityHouse', houseSchema),
  ActivityTour: createContextModelProxy('ActivityTour', tourSchema),
  ActivitySportsFacility: createContextModelProxy('ActivitySportsFacility', sportsFacilitySchema),
  ActivitySportsMeet: createContextModelProxy('ActivitySportsMeet', sportsSchema),
  ActivityFunction: createContextModelProxy('ActivityFunction', functionSchema),
  ActivityEvent: createContextModelProxy('ActivityEvent', eventSchema),
  ActivityCriteria: createContextModelProxy('ActivityCriteria', criteriaSchema),
  ActivityPoints: createContextModelProxy('ActivityPoints', pointsSchema),
  ActivityCertificate: createContextModelProxy('ActivityCertificate', certificateSchema),
  ActivityCouncil: createContextModelProxy('ActivityCouncil', councilSchema),
  ActivityCouncilPost: createContextModelProxy('ActivityCouncilPost', councilPostSchema),
  ActivityCouncilRegistration: createContextModelProxy('ActivityCouncilRegistration', councilRegistrationSchema),
};
