const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const withActive = (definition) => new mongoose.Schema({
  ...definition,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const clubSchema = withActive({
  name: { type: String, required: true, trim: true },
  incharge: { type: String, trim: true, default: '' },
  meetingDay: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  members: { type: String, trim: true, default: '' },
  activities: { type: String, trim: true, default: '' },
});

const houseSchema = withActive({
  name: { type: String, required: true, trim: true },
  color: { type: String, trim: true, default: '' },
  incharge: { type: String, trim: true, default: '' },
  motto: { type: String, trim: true, default: '' },
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

module.exports = {
  ActivityClub: createContextModelProxy('ActivityClub', clubSchema),
  ActivityHouse: createContextModelProxy('ActivityHouse', houseSchema),
  ActivityTour: createContextModelProxy('ActivityTour', tourSchema),
  ActivitySportsMeet: createContextModelProxy('ActivitySportsMeet', sportsSchema),
  ActivityFunction: createContextModelProxy('ActivityFunction', functionSchema),
};
