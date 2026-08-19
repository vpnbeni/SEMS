const mongoose = require('mongoose');
const { REGEX_PATTERNS } = require('../utils/constants');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Teacher name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  // OASIS ID (exam identity). Unique per tenant DB.
  // NOTE: Older data stored OASIS in `employeeId` — see migration.
  oasisId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    validate: {
      validator: function validateOasisId(value) {
        if (value === null || value === undefined || String(value).trim() === '') return true;
        return /^\d+$/.test(String(value).trim());
      },
      message: 'OASIS ID must contain digits only',
    },
    // Important: do not default to `null`.
    // If we default to null, MongoDB will treat it as a value and can trigger
    // unique index conflicts when multiple teachers have "empty" oasisId.
    default: undefined
  },
  // School employee id (HR). Optional.
  // Use null for "not set" so legacy unique index constraints (if any) don't collide on ''.
  employeeId: {
    type: String,
    trim: true,
    default: null,
    sparse: true
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true,
    maxlength: [50, 'Designation cannot be more than 50 characters']
  },
  gender: {
    type: String,
    trim: true,
    enum: ['Male', 'Female', 'Other', 'Unspecified', ''],
    default: 'Unspecified',
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  subjectCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Subject code cannot be more than 20 characters']
  },
  schoolName: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    maxlength: [200, 'School name cannot be more than 200 characters']
  },
  schoolCode: {
    type: String,
    required: [true, 'School code is required'],
    trim: true,
    maxlength: [20, 'School code cannot be more than 20 characters']
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true,
    maxlength: [120, 'Bank name cannot be more than 120 characters']
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true,
    match: [/^\d+$/, 'Account number must contain digits only'],
    maxlength: [40, 'Account number cannot be more than 40 characters']
  },
  ifscCode: {
    type: String,
    required: [true, 'IFSC code is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'IFSC code cannot be more than 20 characters']
  },
  mobileNo: {
    type: String,
    required: [true, 'Mobile number is required'],
    match: [
      REGEX_PATTERNS.PHONE,
      'Please provide a valid 10-digit mobile number'
    ]
  },
  // Legacy compatibility fields retained as optional.
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
    default: undefined,
    set: (value) => {
      const normalized = String(value ?? '').trim().toLowerCase()
      return normalized ? normalized : undefined
    },
    match: [
      REGEX_PATTERNS.EMAIL,
      'Please provide a valid email'
    ]
  },
  phone: {
    type: String,
    match: [
      REGEX_PATTERNS.PHONE,
      'Please provide a valid 10-digit phone number'
    ]
  },
  department: {
    type: String,
    trim: true,
    maxlength: [50, 'Department cannot be more than 50 characters']
  },
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot be more than 50 years']
  },
  qualification: {
    type: String,
    trim: true,
    maxlength: [200, 'Qualification cannot be more than 200 characters']
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot be more than 200 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot be more than 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot be more than 50 characters']
    },
    pincode: {
      type: String,
      match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
    }
  },
  dateOfJoining: {
    type: Date
  },
  dateOfBirth: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: null
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot be more than 100 characters']
    },
    phone: {
      type: String,
      match: [
        REGEX_PATTERNS.PHONE,
        'Please provide a valid emergency contact phone number'
      ]
    },
    relation: {
      type: String,
      trim: true,
      maxlength: [50, 'Relation cannot be more than 50 characters']
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  dutyType: {
    type: String,
    trim: true,
    enum: {
      values: [
        '',
        'Centre Superintendent',
        'Deputy Centre Superintendent',
        'Observer',
        'Invigilator',
        'ASI (CCTV)',
        'ASI (Frisking Male)',
        'ASI (Frisking Female)',
        'Clerk',
        'Class IV',
        'Others',
        'Teacher',
        'Driver',
        'Conductor',
        'Peon',
        'Sweaper',
        'Admin',
        'Security',
        'Sports Coach'
      ],
      message: '{VALUE} is not a valid duty type'
    },
    default: ''
  },
  // Keep all duty types ever assigned to this functionary.
  dutyHistory: [{
    type: String,
    trim: true,
    enum: {
      values: [
        'Centre Superintendent',
        'Deputy Centre Superintendent',
        'Observer',
        'Invigilator',
        'ASI (CCTV)',
        'ASI (Frisking Male)',
        'ASI (Frisking Female)',
        'Clerk',
        'Class IV',
        'Others',
        'Teacher',
        'Driver',
        'Conductor',
        'Peon',
        'Sweaper',
        'Admin',
        'Security',
        'Sports Coach'
      ],
      message: '{VALUE} is not a valid duty type'
    }
  }],
  // Denormalized record of candidates supervised by this teacher per exam date.
  // Used for fast candidate-overlap eligibility checks during duty assignment.
  supervisionHistory: [{
    examDate: { type: String, required: true },
    roomNo: { type: String, required: true },
    rollNumbers: [{ type: String }],
    _id: false
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// `oasisId` already has unique index via schema option; avoid duplicate index warnings.
teacherSchema.index({ employeeId: 1 });
teacherSchema.index({ schoolName: 1, schoolCode: 1 });
teacherSchema.index({ subjectCode: 1 });
teacherSchema.index({ mobileNo: 1 });
teacherSchema.index({ isActive: 1 });
teacherSchema.index({ name: 'text', oasisId: 'text', employeeId: 'text', schoolName: 'text', schoolCode: 'text' });
teacherSchema.index({ createdAt: -1 });
// Ensure email uniqueness only for real emails (not missing/blank values).
teacherSchema.index(
  { email: 1 },
  {
    unique: true,
    name: 'email_1_unique_nonempty',
    partialFilterExpression: { email: { $type: 'string', $ne: '' } },
  }
);

// Virtual for age
teacherSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;

  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
});

// Virtual for full address
teacherSchema.virtual('fullAddress').get(function () {
  if (!this.address) return '';

  const { street, city, state, pincode } = this.address;
  const parts = [street, city, state, pincode].filter(Boolean);
  return parts.join(', ');
});

// Virtual for years of service
teacherSchema.virtual('yearsOfService').get(function () {
  if (!this.dateOfJoining) return 0;

  const today = new Date();
  const joiningDate = new Date(this.dateOfJoining);
  const diffTime = Math.abs(today - joiningDate);
  const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));

  return diffYears;
});

// Pre-save middleware to format name
teacherSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.name = this.name.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }
  if (this.isModified('mobileNo') && !this.phone) {
    this.phone = this.mobileNo;
  }
  if (this.isModified('ifscCode')) {
    this.ifscCode = String(this.ifscCode || '').toUpperCase();
  }
  next();
});

// Static method to find by department
teacherSchema.statics.findByDepartment = function (department) {
  return this.find({ department, isActive: true });
};

// Static method to find by subject
teacherSchema.statics.findBySubject = function (subjectId) {
  return this.find({ subjects: subjectId, isActive: true });
};

// Static method to get teacher statistics
teacherSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$schoolName',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        outsideSchool: {
          $sum: {
            $cond: [{ $eq: ['$isActive', false] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  const total = await this.countDocuments();
  const activeTotal = await this.countDocuments({ isActive: true });
  const inactiveTotal = await this.countDocuments({ isActive: false });

  return {
    total,
    activeTotal,
    inactiveTotal,
    bySchool: stats,
    lastUpdated: new Date()
  };
};

// Instance method to assign subjects
teacherSchema.methods.assignSubjects = function (subjectIds) {
  this.subjects = [...new Set([...this.subjects, ...subjectIds])];
  return this.save();
};

// Instance method to remove subjects
teacherSchema.methods.removeSubjects = function (subjectIds) {
  this.subjects = this.subjects.filter(
    (subject) => !subjectIds.includes(subject.toString())
  );
  return this.save();
};

// Instance method to check if teacher teaches a subject
teacherSchema.methods.teachesSubject = function (subjectId) {
  return this.subjects.some((subject) => subject.toString() === subjectId.toString());
};

teacherSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('Teacher', teacherSchema);
