// backend/routes/uploadVoice.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure uploads/voice directory exists
const voiceDir = path.join(__dirname, '../uploads/voice');
if (!fs.existsSync(voiceDir)) {
  fs.mkdirSync(voiceDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, voiceDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// POST /api/voice
router.post('/', upload.single('voice'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No voice file uploaded' });
  }

  const file = req.file;
  res.json({
    name: file.filename,
    url: `${process.env.SERVER_URL || 'http://localhost:5050'}/uploads/voice/${file.filename}`,
    type: file.mimetype
  });
});

module.exports = router;
