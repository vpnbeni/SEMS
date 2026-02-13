const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Candidate = require('../models/Candidate');
const DateSheet = require('../models/DateSheet');
const Room = require('../models/Room');
const AnswerSheet = require('../models/AnswerSheet');
const AnswerSheetDispatch = require('../models/AnswerSheetDispatch');
const FolderMapping = require('../models/FolderMapping');
const CBSEDatesheet = require('../models/CBSEDatesheet');
const CBSECircular = require('../models/CBSECircular');
const Calendar = require('../models/Calendar');
const { Form66, Form66Upload } = require('../models/Form66');
const Guideline = require('../models/Guideline');
const Undertaking = require('../models/Undertaking');
const CentreDetail = require('../models/CentreDetail');

const tenantModelExports = {
  User,
  Teacher,
  Student,
  Subject,
  Candidate,
  DateSheet,
  Room,
  AnswerSheet,
  AnswerSheetDispatch,
  FolderMapping,
  CBSEDatesheet,
  CBSECircular,
  Calendar,
  Form66,
  Form66Upload,
  Guideline,
  Undertaking,
  CentreDetail
};

const registerModelOnConnection = (modelExport, connection) => {
  if (modelExport && typeof modelExport.getModel === 'function') {
    return modelExport.getModel(connection);
  }

  if (modelExport?.modelName && modelExport?.schema) {
    return connection.models[modelExport.modelName]
      || connection.model(modelExport.modelName, modelExport.schema);
  }

  throw new Error('Invalid model export: expected getModel() or { modelName, schema }');
};

const getTenantModelKeys = () => Object.keys(tenantModelExports);

const registerTenantModels = (connection, requestedKeys = getTenantModelKeys()) => {
  const models = {};
  const keys = Array.isArray(requestedKeys) ? requestedKeys : [requestedKeys];

  keys.forEach((key) => {
    if (!tenantModelExports[key]) {
      throw new Error(`Unknown tenant model key '${key}'`);
    }

    models[key] = registerModelOnConnection(tenantModelExports[key], connection);
  });

  return models;
};

module.exports = {
  getTenantModelKeys,
  registerTenantModels
};
