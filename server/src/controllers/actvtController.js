const { makeRecordCrud } = require('../utils/recordCrud');

const clubs = makeRecordCrud('ActivityClub', ['name', 'incharge', 'meetingDay', 'description', 'members', 'activities']);
const houses = makeRecordCrud('ActivityHouse', ['name', 'color', 'incharge', 'motto', 'members', 'activityType', 'activities']);
const tours = makeRecordCrud('ActivityTour', ['title', 'destination', 'startDate', 'endDate', 'classes', 'description', 'students', 'feedback']);
const sports = makeRecordCrud('ActivitySportsMeet', ['title', 'year', 'venue', 'startDate', 'endDate', 'events', 'results']);
const functions = makeRecordCrud('ActivityFunction', ['title', 'functionType', 'date', 'venue', 'incharge', 'plan', 'outcome']);

module.exports = { clubs, houses, tours, sports, functions };
