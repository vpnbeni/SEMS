const crypto = require('crypto');
const { PAGINATION, REGEX_PATTERNS } = require('./constants');

// Generate random string
const generateRandomString = (length = 10) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate unique ID
const generateUniqueId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}${timestamp}${random}`.toUpperCase();
};

// Slugify text
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Capitalize first letter
const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Format name (proper case)
const formatName = (name) => {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

// Validate email
const isValidEmail = (email) => {
  return REGEX_PATTERNS.EMAIL.test(email);
};

// Validate phone number
const isValidPhone = (phone) => {
  return REGEX_PATTERNS.PHONE.test(phone);
};

// Format phone number
const formatPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned;
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned.slice(1);
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.slice(2);
  }
  return phone;
};

// Pagination helper
const getPaginationParams = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// Build pagination response
const buildPaginationResponse = (data, totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
};

// Build sort object from query
const buildSortObject = (sortQuery = '-createdAt') => {
  const sortObj = {};
  
  if (sortQuery.startsWith('-')) {
    sortObj[sortQuery.slice(1)] = -1;
  } else {
    sortObj[sortQuery] = 1;
  }
  
  return sortObj;
};

// Build filter object from query
const buildFilterObject = (query, allowedFields = []) => {
  const filter = {};
  
  allowedFields.forEach(field => {
    if (query[field] !== undefined) {
      if (field === 'search') {
        // Handle search across multiple fields
        const searchRegex = new RegExp(query[field], 'i');
        filter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ];
      } else if (field === 'isActive') {
        filter[field] = query[field] === 'true';
      } else if (field === 'class' || field === 'section' || field === 'role') {
        filter[field] = query[field];
      } else if (field === 'startDate' || field === 'endDate') {
        if (!filter.createdAt) filter.createdAt = {};
        if (field === 'startDate') {
          filter.createdAt.$gte = new Date(query[field]);
        }
        if (field === 'endDate') {
          filter.createdAt.$lte = new Date(query[field]);
        }
      } else {
        filter[field] = query[field];
      }
    }
  });
  
  return filter;
};

// Format date for display
const formatDate = (date, format = 'DD/MM/YYYY') => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return d.toISOString().split('T')[0];
  }
};

// Format time for display
const formatTime = (time) => {
  if (typeof time === 'string' && time.includes(':')) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }
  return time;
};

// Generate roll number
const generateRollNumber = (prefix = 'STU', year = new Date().getFullYear()) => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${prefix}${year}${timestamp}${random}`;
};

// Generate subject code
const generateSubjectCode = (subjectName, className) => {
  const nameCode = subjectName.replace(/[^A-Z]/g, '').substring(0, 3);
  const classCode = className.replace(/[^0-9]/g, '');
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${nameCode}${classCode}${random}`;
};

// Clean object (remove undefined/null values)
const cleanObject = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

// Generate API response
const generateResponse = (success = true, message = '', data = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

// Error response helper
const errorResponse = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = {
  generateRandomString,
  generateUniqueId,
  slugify,
  capitalize,
  formatName,
  isValidEmail,
  isValidPhone,
  formatPhone,
  getPaginationParams,
  buildPaginationResponse,
  buildSortObject,
  buildFilterObject,
  formatDate,
  formatTime,
  generateRollNumber,
  generateSubjectCode,
  cleanObject,
  deepClone,
  isEmpty,
  generateResponse,
  errorResponse
};