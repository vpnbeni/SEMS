const mongoose = require('mongoose');
const { STUDENT_CLASSES, REGEX_PATTERNS } = require('../utils/constants');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

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

  duration: {
    type: Number,
    enum: [2, 3],
    required: [true, 'Exam duration is required'],
    default: 3
  },

  // Answer sheet type for this subject
  answerSheet: {
    type: String,
    enum: ['none', '32_pages', '20_pages', '40_graph'],
    default: 'none'
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
subjectSchema.index({ isActive: 1 });
subjectSchema.index({ name: 'text', code: 'text', description: 'text' });
subjectSchema.index({ createdAt: -1 });

// Compound indexes
subjectSchema.index({ class: 1, isActive: 1 });
// Unique constraint: code + class combination must be unique
subjectSchema.index({ code: 1, class: 1 }, { unique: true });

// Virtual for display name
subjectSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.code})`;
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



// Static method to get subject statistics
subjectSchema.statics.getStats = async function() {
  const classStats = await this.aggregate([
    {
      $group: {
        _id: '$class',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },

        averageDuration: { $avg: '$duration' }
      }
    }
  ]);

  const total = await this.countDocuments();
  const activeTotal = await this.countDocuments({ isActive: true });

  return {
    total,
    activeTotal,
    byClass: classStats,
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

// Post-save hook to update CBSE Datesheet entries when subject is updated
subjectSchema.post('save', async function(doc) {
  try {
    // Only update if name, code, or duration was modified
    if (this.isModified('name') || this.isModified('code') || this.isModified('duration')) {
      const CBSEDatesheet = this.model('CBSEDatesheet');
      
      // Update all datesheet entries that match this subject code and class
      await CBSEDatesheet.updateMany(
        {
          'entries.subject.code': doc.code,
          'entries.subject.class': doc.class
        },
        {
          $set: {
            'entries.$[elem].subject.name': doc.name,
            'entries.$[elem].subject.duration': doc.duration
          }
        },
        {
          arrayFilters: [
            { 
              'elem.subject.code': doc.code,
              'elem.subject.class': doc.class
            }
          ],
          multi: true
        }
      );
      
      console.log(`✅ Updated datesheet entries for subject ${doc.code} (${doc.class})`);
    }
  } catch (error) {
    console.error('Error updating datesheet entries:', error);
    // Don't throw error to prevent subject update from failing
  }
});

// Post-findOneAndUpdate hook to update CBSE Datesheet entries
subjectSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;
  
  try {
    const CBSEDatesheet = doc.constructor.db.model('CBSEDatesheet');
    
    // Update all datesheet entries that match this subject code and class
    await CBSEDatesheet.updateMany(
      {
        'entries.subject.code': doc.code,
        'entries.subject.class': doc.class
      },
      {
        $set: {
          'entries.$[elem].subject.name': doc.name,
          'entries.$[elem].subject.duration': doc.duration
        }
      },
      {
        arrayFilters: [
          { 
            'elem.subject.code': doc.code,
            'elem.subject.class': doc.class
          }
        ],
        multi: true
      }
    );
    
    console.log(`✅ Updated datesheet entries for subject ${doc.code} (${doc.class})`);
  } catch (error) {
    console.error('Error updating datesheet entries:', error);
  }
});

module.exports = createContextModelProxy('Subject', subjectSchema);
