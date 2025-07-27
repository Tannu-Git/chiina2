const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const AuditLogger = require('../services/AuditLogger');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'general';
    const typeDir = path.join(uploadDir, type);
    
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: fileFilter
});

// @route   POST /api/upload/image
// @desc    Upload single image
// @access  Private
router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.body.type || 'general'}/${req.file.filename}`;
    
    // Log file upload
    await AuditLogger.log(
      'FILE_UPLOADED',
      req.user,
      req,
      {
        resourceType: 'file',
        resourceId: req.file.filename,
        severity: 'low',
        details: {
          filename: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype,
          uploadType: req.body.type || 'general'
        }
      }
    );

    res.json({
      message: 'File uploaded successfully',
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple files
// @access  Private
router.post('/multiple', auth, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      url: `/uploads/${req.body.type || 'general'}/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    // Log multiple file upload
    await AuditLogger.log(
      'MULTIPLE_FILES_UPLOADED',
      req.user,
      req,
      {
        resourceType: 'file',
        severity: 'low',
        details: {
          fileCount: req.files.length,
          totalSize: req.files.reduce((sum, file) => sum + file.size, 0),
          uploadType: req.body.type || 'general',
          files: uploadedFiles.map(f => f.originalName)
        }
      }
    );

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

// @route   DELETE /api/upload/:filename
// @desc    Delete uploaded file
// @access  Private
router.delete('/:type/:filename', auth, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(uploadDir, type, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Get file stats before deletion
    const stats = fs.statSync(filePath);
    
    // Delete file
    fs.unlinkSync(filePath);

    // Log file deletion
    await AuditLogger.log(
      'FILE_DELETED',
      req.user,
      req,
      {
        resourceType: 'file',
        resourceId: filename,
        severity: 'medium',
        details: {
          filename,
          type,
          size: stats.size,
          deletedAt: new Date().toISOString()
        }
      }
    );

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ message: 'File deletion failed' });
  }
});

// @route   GET /api/upload/list/:type
// @desc    List uploaded files by type
// @access  Private
router.get('/list/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const typeDir = path.join(uploadDir, type);

    if (!fs.existsSync(typeDir)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(typeDir).map(filename => {
      const filePath = path.join(typeDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        url: `/uploads/${type}/${filename}`,
        size: stats.size,
        uploadedAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    });

    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ files });
  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({ message: 'Failed to list files' });
  }
});

// @route   GET /api/upload/info/:type/:filename
// @desc    Get file information
// @access  Private
router.get('/info/:type/:filename', auth, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(uploadDir, type, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    const fileInfo = {
      filename,
      url: `/uploads/${type}/${filename}`,
      size: stats.size,
      uploadedAt: stats.birthtime,
      modifiedAt: stats.mtime,
      extension: ext,
      isImage: ['.jpg', '.jpeg', '.png', '.gif'].includes(ext),
      isDocument: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext)
    };

    res.json({ file: fileInfo });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ message: 'Failed to get file info' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 5 files.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected field name.' });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ message: error.message });
  }
  
  console.error('Upload error:', error);
  res.status(500).json({ message: 'Upload failed' });
});

module.exports = router;
