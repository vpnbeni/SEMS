const asyncHandler = require('../middleware/asyncHandler');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const { generateResponse, buildSortObject } = require('../utils/helpers');
const { SUCCESS_MESSAGES, HTTP_STATUS } = require('../utils/constants');

// Helper function to convert JSON to CSV
const jsonToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Create CSV header
  const csvHeaders = headers.map(h => h.label).join(',');
  
  // Create CSV rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      let value = row;
      
      // Handle nested properties (e.g., 'address.city')
      const keys = header.key.split('.');
      for (const key of keys) {
        value = value?.[key];
      }
      
      // Handle arrays (e.g., subjects)
      if (Array.isArray(value)) {
        value = value.map(v => typeof v === 'object' ? v.name || v.code || v._id : v).join('; ');
      }
      
      // Handle objects
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Escape quotes and wrap in quotes if contains comma or newline
      value = String(value).replace(/"/g, '""');
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        value = `"${value}"`;
      }
      
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
};

// @desc    Get teachers export preview count
// @route   GET /api/export/teachers/preview
// @access  Private
const getTeachersPreview = asyncHandler(async (req, res) => {
  const { search, department, subject, isActive, minExperience, maxExperience, joiningDateFrom, joiningDateTo } = req.query;

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
    filter.isActive = isActive === true || isActive === 'true';
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

  if (joiningDateFrom || joiningDateTo) {
    filter.dateOfJoining = {};
    if (joiningDateFrom) {
      filter.dateOfJoining.$gte = new Date(joiningDateFrom);
    }
    if (joiningDateTo) {
      const toDate = new Date(joiningDateTo);
      toDate.setHours(23, 59, 59, 999);
      filter.dateOfJoining.$lte = toDate;
    }
  }

  // Get counts
  const totalCount = await Teacher.countDocuments({});
  const filteredCount = await Teacher.countDocuments(filter);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Preview fetched successfully', {
      total: totalCount,
      filtered: filteredCount
    })
  );
});

// @desc    Export teachers to CSV
// @route   GET /api/export/teachers
// @access  Private
const exportTeachers = asyncHandler(async (req, res) => {
  const { search, department, subject, isActive, minExperience, maxExperience, joiningDateFrom, joiningDateTo, sort = 'name' } = req.query;

  // Build filter object (same as getTeachers)
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
    filter.isActive = isActive === true || isActive === 'true';
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

  if (joiningDateFrom || joiningDateTo) {
    filter.dateOfJoining = {};
    if (joiningDateFrom) {
      filter.dateOfJoining.$gte = new Date(joiningDateFrom);
    }
    if (joiningDateTo) {
      const toDate = new Date(joiningDateTo);
      toDate.setHours(23, 59, 59, 999);
      filter.dateOfJoining.$lte = toDate;
    }
  }

  // Get all teachers matching the filter (no pagination for export)
  const teachers = await Teacher.find(filter)
    .populate('subjects', 'name code')
    .sort(buildSortObject(sort))
    .lean();

  // Define CSV headers
  const headers = [
    { label: 'Employee ID', key: 'employeeId' },
    { label: 'Name', key: 'name' },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    { label: 'Department', key: 'department' },
    { label: 'Designation', key: 'designation' },
    { label: 'Experience (Years)', key: 'experience' },
    { label: 'Qualification', key: 'qualification' },
    { label: 'Subjects', key: 'subjects' },
    { label: 'Date of Joining', key: 'dateOfJoining' },
    { label: 'Date of Birth', key: 'dateOfBirth' },
    { label: 'Status', key: 'isActive' },
    { label: 'Street', key: 'address.street' },
    { label: 'City', key: 'address.city' },
    { label: 'State', key: 'address.state' },
    { label: 'Pincode', key: 'address.pincode' },
    { label: 'Emergency Contact Name', key: 'emergencyContact.name' },
    { label: 'Emergency Contact Phone', key: 'emergencyContact.phone' },
    { label: 'Emergency Contact Relation', key: 'emergencyContact.relation' },
  ];

  // Transform data for CSV
  const transformedData = teachers.map(teacher => ({
    ...teacher,
    isActive: teacher.isActive ? 'Active' : 'Inactive',
    dateOfJoining: teacher.dateOfJoining ? new Date(teacher.dateOfJoining).toLocaleDateString() : '',
    dateOfBirth: teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : '',
  }));

  // Convert to CSV
  const csv = jsonToCSV(transformedData, headers);

  // Set headers for file download
  const filename = `teachers_export_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  res.status(HTTP_STATUS.OK).send(csv);
});

// @desc    Export students to CSV
// @route   GET /api/export/students
// @access  Private
const exportStudents = asyncHandler(async (req, res) => {
  const { search, class: className, section, status, sort = 'name' } = req.query;

  // Build filter object
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (className) {
    filter.class = className;
  }
  
  if (section) {
    filter.section = section;
  }
  
  if (status) {
    filter.status = status;
  }

  // Get all students matching the filter
  const students = await Student.find(filter)
    .sort(buildSortObject(sort))
    .lean();

  // Define CSV headers
  const headers = [
    { label: 'Roll Number', key: 'rollNumber' },
    { label: 'Name', key: 'name' },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    { label: 'Class', key: 'class' },
    { label: 'Section', key: 'section' },
    { label: 'Date of Birth', key: 'dateOfBirth' },
    { label: 'Gender', key: 'gender' },
    { label: 'Status', key: 'status' },
    { label: 'Street', key: 'address.street' },
    { label: 'City', key: 'address.city' },
    { label: 'State', key: 'address.state' },
    { label: 'Pincode', key: 'address.pincode' },
    { label: 'Guardian Name', key: 'guardian.name' },
    { label: 'Guardian Phone', key: 'guardian.phone' },
    { label: 'Guardian Relation', key: 'guardian.relation' },
  ];

  // Transform data for CSV
  const transformedData = students.map(student => ({
    ...student,
    dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '',
  }));

  // Convert to CSV
  const csv = jsonToCSV(transformedData, headers);

  // Set headers for file download
  const filename = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  res.status(HTTP_STATUS.OK).send(csv);
});

// @desc    Get students export preview count
// @route   GET /api/export/students/preview
// @access  Private
const getStudentsPreview = asyncHandler(async (req, res) => {
  const { search, class: className, section, status } = req.query;

  // Build filter object
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (className) {
    filter.class = className;
  }
  
  if (section) {
    filter.section = section;
  }
  
  if (status) {
    filter.status = status;
  }

  // Get counts
  const totalCount = await Student.countDocuments({});
  const filteredCount = await Student.countDocuments(filter);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Preview fetched successfully', {
      total: totalCount,
      filtered: filteredCount
    })
  );
});

module.exports = {
  exportTeachers,
  exportStudents,
  getTeachersPreview,
  getStudentsPreview,
};
