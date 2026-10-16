import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `fieldflow-evidence-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpg, jpeg, png, webp) are permitted.'));
  },
});

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `doc-${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

const docUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = /\.(xlsx|xls|csv|pdf|doc|docx|txt|rtf|jpeg|jpg|png|webp)$/i;
    if (allowedExts.test(file.originalname)) {
      return cb(null, true);
    }
    cb(new Error('Only documents and spreadsheets (xlsx, xls, csv, doc, docx, pdf, txt) and images are permitted.'));
  },
});

// Photo upload (evidence)
router.post('/photo', protect, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      // If photo was sent as base64 in body
      if (req.body.imageBase64) {
        const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const filename = `fieldflow-base64-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
        const photoUrl = `/uploads/${filename}`;
        return res.status(201).json({
          success: true,
          message: 'Base64 image saved successfully',
          photoUrl,
          filename,
        });
      }

      return res.status(400).json({ success: false, message: 'No photo file provided.' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      photoUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Document upload (xlsx, doc, pdf, csv, etc.)
router.post('/document', protect, docUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document file provided.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: ext,
      size: req.file.size,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
