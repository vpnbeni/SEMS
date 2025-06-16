const mongoose = require('mongoose');
const { STUDENT_CLASSES, SUBJECT_TYPES, REGEX_PATTERNS } = require('../utils/constants');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot be more than 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [
      REGEX_PATTERNS.SUBJECT_CODE,
      'Please provide a valid subject code'
    ]
  },
  class: {
    type: String,
    required: [true, 'Class is required'],
    enum: Object.values(STUDENT_CLASSES)
  },
  type: {
    type: String,
    required: [true, 'Subject type is required'],
    enum: Object.values(SUBJECT_TYPES),
    default: SUBJECT_TYPES.CORE
  },
  duration: {
    type: Number,
    required: [true, 'Examination duration is required'],
    min: [30, 'Duration must be at least 30 minutes'],
    max: [300, 'Duration cannot exceed 300 minutes (5 hours)']
  },
  maxMarks: {
    type: Number,
    required: [true, 'Maximum marks is required'],
    min: [1, 'Maximum marks must be at least 1'],
    max: [1000, 'Maximum marks cannot exceed 1000']
  },
  passingMarks: {
    type: Number,
    required: [true, 'Passing marks is required'],
    min: [1, 'Passing marks must be at least 1'],
    validate: {
      validator: function(value) {
        return value <= this.maxMarks;
      },
      message: 'Passing marks cannot be greater than maximum marks'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  syllabus: {
    type: String,
    trim: true,
    maxlength: [2000, 'Syllabus cannot be more than 2000 characters']
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  }],
  isTheorySubject: {
    type: Boolean,
    default: true
  },
  isPracticalSubject: {
    type: Boolean,
    default: false
  },
  theoryMarks: {
    type: Number,
    default: 0,
    min: [0, 'Theory marks cannot be negative'],
    validate: {
      validator: function(value) {
        return value + this.practicalMarks === this.maxMarks;
      },
      message: 'Theory marks + Practical marks must equal maximum marks'
    }
  },
  practicalMarks: {
    type: Number,
    default: 0,
    min: [0, 'Practical marks cannot be negative'],
    validate: {
      validator: function(value) {
        return value + this.theoryMarks === this.maxMarks;
      },
      message: 'Theory marks + Practical marks must equal maximum marks'
    }
  },
  internalAssessmentMarks: {
    type: Number,
    default: 0,
    min: [0, 'Internal assessment marks cannot be negative']
  },
  boardCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Board code cannot be more than 10 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  examPattern: {
    totalQuestions: {
      type: Number,
      min: [1, 'Total questions must be at least 1']
    },
    compulsoryQuestions: {
      type: Number,
      min: [0, 'Compulsory questions cannot be negative']
    },
    optionalQuestions: {
      type: Number,
      default: 0,
      min: [0, 'Optional questions cannot be negative']
    },
    sections: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      marks: {
        type: Number,
        required: true,
        min: [1, 'Section marks must be at least 1']
      },
      questions: {
        type: Number,
        required: true,
        min: [1, 'Section questions must be at least 1']
      }
    }]
  },
  resources: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Resource title cannot be more than 200 characters']
    },
    type: {
      type: String,
      enum: ['book', 'pdf', 'video', 'website', 'other'],
      required: true
    },
    url: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Resource description cannot be more than 500 characters']
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
subjectSchema.index({ code: 1 });
subjectSchema.index({ class: 1 });
subjectSchema.index({ type: 1 });
subjectSchema.index({ isActive: 1 });
subjectSchema.index({ name: 'text', code: 'text', description: 'text' });
subjectSchema.index({ createdAt: -1 });

// Compound indexes
subjectSchema.index({ class: 1, type: 1, isActive: 1 });
subjectSchema.index({ class: 1, isActive: 1 });

// Virtual for display name
subjectSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.code})`;
});

// Virtual for marks distribution
subjectSchema.virtual('marksDistribution').get(function() {
  return {
    total: this.maxMarks,
    theory: this.theoryMarks,
    practical: this.practicalMarks,
    internal: this.internalAssessmentMarks,
    passing: this.passingMarks
  };
});

// Virtual for duration in hours and minutes
subjectSchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
  }
});

// Pre-save middleware to auto-calculate marks
subjectSchema.pre('save', function(next) {
  // Auto-calculate theory and practical marks if not set
  if (this.isTheorySubject && this.theoryMarks === 0 && this.practicalMarks === 0) {
    if (this.isPracticalSubject) {
      this.theoryMarks = Math.floor(this.maxMarks * 0.7);
      this.practicalMarks = this.maxMarks - this.theoryMarks;
    } else {
      this.theoryMarks = this.maxMarks;
      this.practicalMarks = 0;
    }
  }
  
  // Set default passing marks if not provided
  if (!this.passingMarks || this.passingMarks === 0) {
    this.passingMarks = Math.ceil(this.maxMarks * 0.33); // 33% passing marks
  }
  
  next();
});

// Pre-save middleware to format subject name
subjectSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
  next();
});

// Static method to find by class
subjectSchema.statics.findByClass = function(className) {
  return this.find({ class: className, isActive: true });
};

// Static method to find by type
subjectSchema.statics.findByType = function(type, className = null) {
  const query = { type, isActive: true };
  if (className) {
    query.class = className;
  }
  return this.find(query);
};

// Static method to find core subjects
subjectSchema.statics.findCoreSubjects = function(className = null) {
  return this.findByType(SUBJECT_TYPES.CORE, className);
};

// Static method to find elective subjects
subjectSchema.statics.findElectiveSubjects = function(className = null) {
  return this.findByType(SUBJECT_TYPES.ELECTIVE, className);
};

// Static method to get subject statistics
subjectSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: { class: '$class', type: '$type' },
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        averageMarks: { $avg: '$maxMarks' },
        averageDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: { '_id.class': 1, '_id.type': 1 }
    }
  ]);

  const classStats = await this.aggregate([
    {
      $group: {
        _id: '$class',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        }
      }
    }
  ]);

  const total = await this.countDocuments();
  const activeTotal = await this.countDocuments({ isActive: true });

  return {
    total,
    activeTotal,
    byClass: classStats,
    byClassAndType: stats,
    lastUpdated: new Date()
  };
};

// Instance method to assign teachers
subjectSchema.methods.assignTeachers = function(teacherIds) {
  this.teachers = [...new Set([...this.teachers, ...teacherIds])];
  return this.save();
};

// Instance method to remove teachers
subjectSchema.methods.removeTeachers = function(teacherIds) {
  this.teachers = this.teachers.filter(
    teacher => !teacherIds.includes(teacher.toString())
  );
  return this.save();
};

// Instance method to add resource
subjectSchema.methods.addResource = function(resourceData) {
  this.resources.push(resourceData);
  return this.save();
};

// Instance method to remove resource
subjectSchema.methods.removeResource = function(resourceId) {
  this.resources = this.resources.filter(resource => 
    resource._id.toString() !== resourceId.toString()
  );
  return this.save();
};

// Instance method to check if subject has teacher
subjectSchema.methods.hasTeacher = function(teacherId) {
  return this.teachers.some(teacher => teacher.toString() === teacherId.toString());
};

module.exports = mongoose.model('Subject', subjectSchema);