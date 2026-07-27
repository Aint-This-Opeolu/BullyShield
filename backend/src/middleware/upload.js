const multer = require('multer');
const path = require('path');

// Secure file uploads (Section 4.4/4.7 security requirements):
// - files are held in memory only long enough to be encrypted and written
//   under a server-generated name (never the client-supplied filename)
// - MIME type and extension are both checked (defense against spoofed
//   Content-Type headers)
// - size is capped

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
]);

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error('Unsupported file type. Allowed: images, PDF, DOC/DOCX.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5,
  },
});

module.exports = upload;
