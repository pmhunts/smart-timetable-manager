const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const AVATAR_DIR = path.resolve(__dirname, '../../uploads/avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const EXT_BY_MIME = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    // Never trust the client file name.
    filename: (req, file, cb) => cb(null, `${req.user.id}-${crypto.randomBytes(8).toString('hex')}${EXT_BY_MIME[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) return cb(ApiError.badRequest('Only PNG, JPG or WEBP images are allowed', 'VALIDATION_ERROR'));
    return cb(null, true);
  },
}).single('avatar');

module.exports = { avatarUpload, AVATAR_DIR };
