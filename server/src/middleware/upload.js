const path = require('path');
const fs = require('fs');

// File upload configuration
const uploadConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  allowedTypes: {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
    all: []
  }
};

// Initialize allowed types for all
uploadConfig.allowedTypes.all = [
  ...uploadConfig.allowedTypes.images,
  ...uploadConfig.allowedTypes.documents,
  ...uploadConfig.allowedTypes.spreadsheets
];

// Validate file type
const validateFileType = (allowedTypes = 'all') => {
  return (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files were uploaded'
      });
    }

    const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
    const allowedMimeTypes = uploadConfig.allowedTypes[allowedTypes] || uploadConfig.allowedTypes.all;

    for (const file of files) {
      if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
        });
      }

      if (file.size > uploadConfig.maxFileSize) {
        return res.status(400).json({
          success: false,
          error: `File too large. Maximum size: ${uploadConfig.maxFileSize / (1024 * 1024)}MB`
        });
      }
    }

    next();
  };
};

// Create upload directory if it doesn't exist
const ensureUploadDir = (uploadPath) => {
  return (req, res, next) => {
    const fullPath = path.join(__dirname, '../../uploads', uploadPath);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    req.uploadPath = fullPath;
    next();
  };
};

// Handle file upload
const handleFileUpload = (uploadPath = 'general', allowedTypes = 'all') => {
  return [
    ensureUploadDir(uploadPath),
    validateFileType(allowedTypes),
    (req, res, next) => {
      try {
        const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
        const uploadedFiles = [];

        files.forEach((file, index) => {
          // Generate unique filename
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const extension = path.extname(file.name);
          const filename = `${timestamp}_${randomString}${extension}`;
          const filepath = path.join(req.uploadPath, filename);

          // Move file to upload directory
          file.mv(filepath, (err) => {
            if (err) {
              console.error('File upload error:', err);
              return res.status(500).json({
                success: false,
                error: 'File upload failed'
              });
            }
          });

          uploadedFiles.push({
            originalName: file.name,
            filename: filename,
            path: filepath,
            relativePath: `uploads/${uploadPath}/${filename}`,
            size: file.size,
            mimetype: file.mimetype
          });
        });

        req.uploadedFiles = uploadedFiles;
        next();
      } catch (error) {
        console.error('Upload handling error:', error);
        return res.status(500).json({
          success: false,
          error: 'File upload processing failed'
        });
      }
    }
  ];
};

// Delete file helper
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Clean up temporary files
const cleanupFiles = (files) => {
  if (!files || files.length === 0) return;

  files.forEach(async (file) => {
    try {
      await deleteFile(file.path);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  });
};

module.exports = {
  handleFileUpload,
  validateFileType,
  ensureUploadDir,
  deleteFile,
  cleanupFiles,
  uploadConfig
};