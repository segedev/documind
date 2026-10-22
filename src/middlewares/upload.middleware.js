const multer = require('multer');

// Use memory storage so files can be processed directly via buffers without disk I/O bottlenecks
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Only PDF, TXT, and Markdown files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
});

module.exports = upload;
