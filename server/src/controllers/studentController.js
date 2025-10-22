const asyncHandler = require('../middleware/asyncHandler');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const { generateResponse, getPaginationParams, buildPaginationResponse } = require('../utils/helpers');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');
const path = require('path');
const fs = require('fs').promises;
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../config/cloudinary');

// @desc    Get all students
// @route   GET /api/students
// @access  Private
const getStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req);
  const { 
    search, 
    class: className, 
    section, 
    subject, 
    isActive, 
    category,
    sort = '-createdAt' 
  } = req.query;

  // Build filter object
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } },
      { fatherName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (className) {
    filter.class = className;
  }
  
  if (section) {
    filter.section = section.toUpperCase();
  }
  
  if (subject) {
    filter.subjects = subject;
  }
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  if (category) {
    filter.category = category;
  }

  // Get total count for pagination
  const totalCount = await Student.countDocuments(filter);

  // Execute query with pagination
  const students = await Student.find(filter)
    .populate('subjects', 'name code type')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  // Build pagination response
  const pagination = buildPaginationResponse(page, limit, totalCount);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, {
      students,
      pagination
    })
  );
});

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('subjects', 'name code type description');

  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, student)
  );
});

// @desc    Create new student
// @route   POST /api/students
// @access  Private
const createStudent = asyncHandler(async (req, res) => {
  const {
    rollNumber,
    name,
    email,
    phone,
    class: className,
    section,
    subjects,
    fatherName,
    motherName,
    guardianPhone,
    address,
    dateOfBirth,
    admissionDate,
    aadharNumber,
    category,
    religion,
    nationality,
    previousSchool,
    medicalInfo,
    notes
  } = req.body;

  // Check if roll number already exists
  const existingStudent = await Student.findOne({ rollNumber });
  if (existingStudent) {
    return res.status(HTTP_STATUS.CONFLICT).json(
      generateResponse(false, 'Student with this roll number already exists')
    );
  }

  // Check if email exists (if provided)
  if (email) {
    const existingEmail = await Student.findOne({ email });
    if (existingEmail) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        generateResponse(false, 'Student with this email already exists')
      );
    }
  }

  // Validate subjects exist
  if (subjects && subjects.length > 0) {
    const validSubjects = await Subject.find({ _id: { $in: subjects } });
    if (validSubjects.length !== subjects.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        generateResponse(false, 'One or more subjects are invalid')
      );
    }
  }

  // Create student
  const student = await Student.create({
    rollNumber,
    name,
    email,
    phone,
    class: className,
    section: section.toUpperCase(),
    subjects: subjects || [],
    fatherName,
    motherName,
    guardianPhone,
    address,
    dateOfBirth,
    admissionDate,
    aadharNumber,
    category,
    religion,
    nationality,
    previousSchool,
    medicalInfo,
    notes
  });

  // Populate subjects before sending response
  await student.populate('subjects', 'name code type');

  res.status(HTTP_STATUS.CREATED).json(
    generateResponse(true, SUCCESS_MESSAGES.CREATED, student)
  );
});

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // Check if student exists
  const existingStudent = await Student.findById(id);
  if (!existingStudent) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  // Check if roll number is being changed and if it already exists
  if (updateData.rollNumber && updateData.rollNumber !== existingStudent.rollNumber) {
    const duplicateRollNumber = await Student.findOne({ 
      rollNumber: updateData.rollNumber,
      _id: { $ne: id }
    });
    if (duplicateRollNumber) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        generateResponse(false, 'Student with this roll number already exists')
      );
    }
  }

  // Check if email is being changed and if it already exists
  if (updateData.email && updateData.email !== existingStudent.email) {
    const duplicateEmail = await Student.findOne({ 
      email: updateData.email,
      _id: { $ne: id }
    });
    if (duplicateEmail) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        generateResponse(false, 'Student with this email already exists')
      );
    }
  }

  // Validate subjects if being updated
  if (updateData.subjects && updateData.subjects.length > 0) {
    const validSubjects = await Subject.find({ _id: { $in: updateData.subjects } });
    if (validSubjects.length !== updateData.subjects.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        generateResponse(false, 'One or more subjects are invalid')
      );
    }
  }

  // Ensure section is uppercase
  if (updateData.section) {
    updateData.section = updateData.section.toUpperCase();
  }

  // Update student
  const student = await Student.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('subjects', 'name code type');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.UPDATED, student)
  );
});

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);

  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  // Delete associated files if any
  if (student.documents && student.documents.length > 0) {
    for (const doc of student.documents) {
      try {
        await fs.unlink(doc.path);
      } catch (error) {
        console.error(`Failed to delete file: ${doc.path}`, error);
      }
    }
  }

  // Delete profile image from Cloudinary if exists
  if (student.profileImage) {
    const publicId = extractPublicId(student.profileImage);
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
        console.log(`Deleted profile image from Cloudinary: ${publicId}`);
      } catch (error) {
        console.error(`Failed to delete profile image from Cloudinary: ${publicId}`, error);
      }
    }
  }

  await student.deleteOne();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.DELETED)
  );
});

// @desc    Get students by class
// @route   GET /api/students/class/:className
// @access  Private
const getStudentsByClass = asyncHandler(async (req, res) => {
  const { className } = req.params;
  const { section, isActive = true } = req.query;

  const filter = { 
    class: className,
    isActive: isActive === 'true'
  };

  if (section) {
    filter.section = section.toUpperCase();
  }

  const students = await Student.find(filter)
    .populate('subjects', 'name code type')
    .sort('section rollNumber')
    .lean();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, students)
  );
});

// @desc    Get students by class and section
// @route   GET /api/students/class/:className/section/:section
// @access  Private
const getStudentsByClassSection = asyncHandler(async (req, res) => {
  const { className, section } = req.params;
  const { isActive = true } = req.query;

  const students = await Student.find({ 
    class: className,
    section: section.toUpperCase(),
    isActive: isActive === 'true'
  })
    .populate('subjects', 'name code type')
    .sort('rollNumber')
    .lean();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, students)
  );
});

// @desc    Get students by subject
// @route   GET /api/students/subject/:subjectId
// @access  Private
const getStudentsBySubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { class: className, section, isActive = true } = req.query;

  const filter = { 
    subjects: subjectId,
    isActive: isActive === 'true'
  };

  if (className) {
    filter.class = className;
  }

  if (section) {
    filter.section = section.toUpperCase();
  }

  const students = await Student.find(filter)
    .populate('subjects', 'name code type')
    .sort('class section rollNumber')
    .lean();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, students)
  );
});

// @desc    Assign subjects to student
// @route   POST /api/students/:id/subjects
// @access  Private
const assignSubjects = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subjectIds } = req.body;

  const student = await Student.findById(id);
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  // Validate subjects exist
  const validSubjects = await Subject.find({ _id: { $in: subjectIds } });
  if (validSubjects.length !== subjectIds.length) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'One or more subjects are invalid')
    );
  }

  await student.assignSubjects(subjectIds);
  await student.populate('subjects', 'name code type');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Subjects assigned successfully', student)
  );
});

// @desc    Remove subjects from student
// @route   DELETE /api/students/:id/subjects
// @access  Private
const removeSubjects = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subjectIds } = req.body;

  const student = await Student.findById(id);
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  await student.removeSubjects(subjectIds);
  await student.populate('subjects', 'name code type');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Subjects removed successfully', student)
  );
});

// @desc    Get student statistics
// @route   GET /api/students/stats
// @access  Private
const getStudentStats = asyncHandler(async (req, res) => {
  const stats = await Student.getStats();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Student statistics fetched successfully', stats)
  );
});

// @desc    Generate next roll number
// @route   GET /api/students/next-roll-number
// @access  Private
const getNextRollNumber = asyncHandler(async (req, res) => {
  const { class: className, section } = req.query;

  if (!className || !section) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Class and section are required')
    );
  }

  // Get the latest student in the class and section
  const latestStudent = await Student.findOne({
    class: className,
    section: section.toUpperCase()
  }).sort({ rollNumber: -1 });

  let nextRollNumber;
  if (latestStudent) {
    // Extract number from roll number and increment
    const match = latestStudent.rollNumber.match(/(\d+)$/);
    if (match) {
      const currentNumber = parseInt(match[1]);
      const nextNumber = currentNumber + 1;
      const prefix = latestStudent.rollNumber.replace(/\d+$/, '');
      nextRollNumber = `${prefix}${nextNumber.toString().padStart(match[1].length, '0')}`;
    } else {
      // If no number found, create new format
      nextRollNumber = `${className}${section.toUpperCase()}001`;
    }
  } else {
    // First student in this class and section
    nextRollNumber = `${className}${section.toUpperCase()}001`;
  }

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Next roll number generated successfully', { rollNumber: nextRollNumber })
  );
});

// @desc    Bulk create students
// @route   POST /api/students/bulk
// @access  Private
const bulkCreateStudents = asyncHandler(async (req, res) => {
  const { students } = req.body;

  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Students array is required')
    );
  }

  const results = {
    successful: [],
    failed: [],
    total: students.length
  };

  for (let i = 0; i < students.length; i++) {
    try {
      const studentData = students[i];
      
      // Check for duplicate roll number
      const existingStudent = await Student.findOne({ rollNumber: studentData.rollNumber });
      if (existingStudent) {
        results.failed.push({
          index: i,
          data: studentData,
          error: 'Student with this roll number already exists'
        });
        continue;
      }

      // Check for duplicate email if provided
      if (studentData.email) {
        const existingEmail = await Student.findOne({ email: studentData.email });
        if (existingEmail) {
          results.failed.push({
            index: i,
            data: studentData,
            error: 'Student with this email already exists'
          });
          continue;
        }
      }

      // Ensure section is uppercase
      if (studentData.section) {
        studentData.section = studentData.section.toUpperCase();
      }

      // Create student
      const student = await Student.create(studentData);
      results.successful.push(student);

    } catch (error) {
      results.failed.push({
        index: i,
        data: students[i],
        error: error.message
      });
    }
  }

  const statusCode = results.failed.length === 0 ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;
  const message = results.failed.length === 0 
    ? 'All students created successfully' 
    : `${results.successful.length} students created, ${results.failed.length} failed`;

  res.status(statusCode).json(
    generateResponse(true, message, results)
  );
});

// @desc    Upload student document
// @route   POST /api/students/:id/documents
// @access  Private
const uploadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  if (!req.files || !req.files.document) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Document file is required')
    );
  }

  const student = await Student.findById(id);
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  const file = req.files.document;
  const uploadDir = path.join(__dirname, '../../uploads/documents');
  
  // Create upload directory if it doesn't exist
  await fs.mkdir(uploadDir, { recursive: true });

  // Generate unique filename
  const fileExtension = path.extname(file.name);
  const fileName = `${student.rollNumber}_${type}_${Date.now()}${fileExtension}`;
  const filePath = path.join(uploadDir, fileName);

  // Move file to upload directory
  await file.mv(filePath);

  // Add document to student
  const documentData = {
    type,
    filename: fileName,
    originalName: file.name,
    path: filePath
  };

  await student.addDocument(documentData);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Document uploaded successfully', student)
  );
});

// @desc    Delete student document
// @route   DELETE /api/students/:id/documents/:docId
// @access  Private
const deleteDocument = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;

  const student = await Student.findById(id);
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  const document = student.documents.id(docId);
  if (!document) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Document not found')
    );
  }

  // Delete file from filesystem
  try {
    await fs.unlink(document.path);
  } catch (error) {
    console.error(`Failed to delete file: ${document.path}`, error);
  }

  // Remove document from student
  await student.removeDocument(docId);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Document deleted successfully', student)
  );
});

// @desc    Upload student profile image
// @route   POST /api/students/:id/profile-image
// @access  Private
const uploadProfileImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.files || !req.files.profileImage) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Profile image file is required')
    );
  }

  const student = await Student.findById(id);
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  const file = req.files.profileImage;
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed')
    );
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'File size must be less than 5MB')
    );
  }

  try {
    // Delete old profile image from Cloudinary if exists
    if (student.profileImage) {
      const oldPublicId = extractPublicId(student.profileImage);
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId);
          console.log(`Deleted old profile image: ${oldPublicId}`);
        } catch (error) {
          console.error(`Failed to delete old profile image from Cloudinary: ${oldPublicId}`, error);
        }
      }
    }

    // Upload to Cloudinary
    // Use the temporary file path from express-fileupload
    const publicId = `student_${student.rollNumber}_${Date.now()}`;
    const uploadResult = await uploadToCloudinary(
      file.tempFilePath,
      'students/profiles',
      publicId
    );

    // Update student profile image with Cloudinary URL
    student.profileImage = uploadResult.url;
    await student.save();

    // Clean up temporary file
    try {
      await fs.unlink(file.tempFilePath);
    } catch (error) {
      console.error('Failed to delete temporary file:', error);
    }

    res.status(HTTP_STATUS.OK).json(
      generateResponse(true, 'Profile image uploaded successfully', student)
    );
  } catch (error) {
    console.error('Profile image upload error:', error);
    
    // Clean up temporary file in case of error
    try {
      if (file.tempFilePath) {
        await fs.unlink(file.tempFilePath);
      }
    } catch (cleanupError) {
      console.error('Failed to delete temporary file:', cleanupError);
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      generateResponse(false, error.message || 'Failed to upload profile image')
    );
  }
});

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentsByClass,
  getStudentsByClassSection,
  getStudentsBySubject,
  assignSubjects,
  removeSubjects,
  getStudentStats,
  getNextRollNumber,
  bulkCreateStudents,
  uploadDocument,
  deleteDocument,
  uploadProfileImage
};