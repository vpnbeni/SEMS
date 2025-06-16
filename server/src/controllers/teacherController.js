const asyncHandler = require('../middleware/asyncHandler');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const { generateResponse, getPaginationParams, buildPaginationResponse, buildFilterObject, buildSortObject } = require('../utils/helpers');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Private
const getTeachers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req);
  const { search, department, subject, isActive, minExperience, maxExperience, sort = '-createdAt' } = req.query;

  // Build filter object
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (department) {
    filter.department = { $regex: department, $options: 'i' };
  }
  
  if (subject) {
    filter.subjects = subject;
  }
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  
  if (minExperience !== undefined || maxExperience !== undefined) {
    filter.experience = {};
    if (minExperience !== undefined) {
      filter.experience.$gte = parseInt(minExperience);
    }
    if (maxExperience !== undefined) {
      filter.experience.$lte = parseInt(maxExperience);
    }
  }

  // Get total count for pagination
  const totalCount = await Teacher.countDocuments(filter);

  // Get teachers with pagination
  const teachers = await Teacher.find(filter)
    .populate('subjects', 'name code class')
    .sort(buildSortObject(sort))
    .skip(skip)
    .limit(limit)
    .lean();

  const response = buildPaginationResponse(teachers, totalCount, page, limit);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, response)
  );
});

// @desc    Get single teacher
// @route   GET /api/teachers/:id
// @access  Private
const getTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id)
    .populate('subjects', 'name code class type duration maxMarks');

  if (!teacher) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Teacher not found')
    );
  }

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, teacher)
  );
});

// @desc    Create new teacher
// @route   POST /api/teachers
// @access  Private
const createTeacher = asyncHandler(async (req, res) => {
  // Check if email already exists
  const existingEmail = await Teacher.findOne({ email: req.body.email });
  if (existingEmail) {
    return res.status(HTTP_STATUS.CONFLICT).json(
      generateResponse(false, 'Teacher with this email already exists')
    );
  }

  // Check if employee ID already exists
  const existingEmployeeId = await Teacher.findOne({ employeeId: req.body.employeeId });
  if (existingEmployeeId) {
    return res.status(HTTP_STATUS.CONFLICT).json(
      generateResponse(false, 'Teacher with this employee ID already exists')
    );
  }

  // Validate subjects if provided
  if (req.body.subjects && req.body.subjects.length > 0) {
    const validSubjects = await Subject.find({ 
      _id: { $in: req.body.subjects },
      isActive: true 
    });
    
    if (validSubjects.length !== req.body.subjects.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        generateResponse(false, 'One or more invalid subject IDs provided')
      );
    }
  }

  const teacher = await Teacher.create(req.body);

  // Populate subjects before sending response
  await teacher.populate('subjects', 'name code class');

  res.status(HTTP_STATUS.CREATED).json(
    generateResponse(true, SUCCESS_MESSAGES.CREATED, teacher)
  );
});

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private
const updateTeacher = asyncHandler(async (req, res) => {
  let teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Teacher not found')
    );
  }

  // Check for email conflicts (exclude current teacher)
  if (req.body.email && req.body.email !== teacher.email) {
    const existingEmail = await Teacher.findOne({ 
      email: req.body.email,
      _id: { $ne: req.params.id }
    });
    if (existingEmail) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        generateResponse(false, 'Teacher with this email already exists')
      );
    }
  }

  // Validate subjects if provided
  if (req.body.subjects && req.body.subjects.length > 0) {
    const validSubjects = await Subject.find({ 
      _id: { $in: req.body.subjects },
      isActive: true 
    });
    
    if (validSubjects.length !== req.body.subjects.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        generateResponse(false, 'One or more invalid subject IDs provided')
      );
    }
  }

  teacher = await Teacher.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate('subjects', 'name code class');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.UPDATED, teacher)
  );
});

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
// @access  Private
const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Teacher not found')
    );
  }

  // Soft delete - set isActive to false
  teacher.isActive = false;
  await teacher.save();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.DELETED)
  );
});

// @desc    Assign subjects to teacher
// @route   POST /api/teachers/:id/subjects
// @access  Private
const assignSubjects = asyncHandler(async (req, res) => {
  const { subjectIds } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Teacher not found')
    );
  }

  // Validate subjects
  const validSubjects = await Subject.find({ 
    _id: { $in: subjectIds },
    isActive: true 
  });
  
  if (validSubjects.length !== subjectIds.length) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'One or more invalid subject IDs provided')
    );
  }

  // Assign subjects
  await teacher.assignSubjects(subjectIds);

  // Populate and return updated teacher
  const updatedTeacher = await Teacher.findById(req.params.id)
    .populate('subjects', 'name code class');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Subjects assigned successfully', updatedTeacher)
  );
});

// @desc    Remove subjects from teacher
// @route   DELETE /api/teachers/:id/subjects
// @access  Private
const removeSubjects = asyncHandler(async (req, res) => {
  const { subjectIds } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Teacher not found')
    );
  }

  // Remove subjects
  await teacher.removeSubjects(subjectIds);

  // Populate and return updated teacher
  const updatedTeacher = await Teacher.findById(req.params.id)
    .populate('subjects', 'name code class');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Subjects removed successfully', updatedTeacher)
  );
});

// @desc    Get teachers by department
// @route   GET /api/teachers/department/:department
// @access  Private
const getTeachersByDepartment = asyncHandler(async (req, res) => {
  const { department } = req.params;

  const teachers = await Teacher.findByDepartment(department)
    .populate('subjects', 'name code class')
    .sort('name');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, teachers)
  );
});

// @desc    Get teachers by subject
// @route   GET /api/teachers/subject/:subjectId
// @access  Private
const getTeachersBySubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;

  // Validate subject exists
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Subject not found')
    );
  }

  const teachers = await Teacher.findBySubject(subjectId)
    .populate('subjects', 'name code class')
    .sort('name');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, teachers)
  );
});

// @desc    Get teacher statistics
// @route   GET /api/teachers/stats
// @access  Private
const getTeacherStats = asyncHandler(async (req, res) => {
  const stats = await Teacher.getStats();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Teacher statistics fetched successfully', stats)
  );
});

// @desc    Bulk create teachers
// @route   POST /api/teachers/bulk
// @access  Private
const bulkCreateTeachers = asyncHandler(async (req, res) => {
  const { teachers, skipDuplicates = false, updateExisting = false } = req.body;

  const results = {
    created: [],
    updated: [],
    skipped: [],
    errors: []
  };

  for (const teacherData of teachers) {
    try {
      // Check for existing teacher by email or employee ID
      const existingTeacher = await Teacher.findOne({
        $or: [
          { email: teacherData.email },
          { employeeId: teacherData.employeeId }
        ]
      });

      if (existingTeacher) {
        if (updateExisting) {
          const updatedTeacher = await Teacher.findByIdAndUpdate(
            existingTeacher._id,
            teacherData,
            { new: true, runValidators: true }
          );
          results.updated.push(updatedTeacher);
        } else if (skipDuplicates) {
          results.skipped.push({
            email: teacherData.email,
            reason: 'Duplicate entry'
          });
        } else {
          results.errors.push({
            email: teacherData.email,
            reason: 'Teacher already exists'
          });
        }
      } else {
        // Validate subjects if provided
        if (teacherData.subjects && teacherData.subjects.length > 0) {
          const validSubjects = await Subject.find({ 
            _id: { $in: teacherData.subjects },
            isActive: true 
          });
          
          if (validSubjects.length !== teacherData.subjects.length) {
            results.errors.push({
              email: teacherData.email,
              reason: 'Invalid subject IDs'
            });
            continue;
          }
        }

        const newTeacher = await Teacher.create(teacherData);
        results.created.push(newTeacher);
      }
    } catch (error) {
      results.errors.push({
        email: teacherData.email,
        reason: error.message
      });
    }
  }

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Bulk teacher operation completed', results)
  );
});

module.exports = {
  getTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignSubjects,
  removeSubjects,
  getTeachersByDepartment,
  getTeachersBySubject,
  getTeacherStats,
  bulkCreateTeachers
};