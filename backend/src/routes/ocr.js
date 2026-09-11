const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getOcrHealth,
  processOcr,
  cleanOcrText,
  extractLegalEntities,
  getSampleDocuments,
} = require('../controllers/ocrController');
const { protect } = require('../middleware/auth');

// Multer in-memory storage for OCR test uploads (up to 30MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

// ── Health & Status ─────────────────────────────────────────────────────────
router.get('/health', getOcrHealth);

// ── Samples ─────────────────────────────────────────────────────────────────
router.get('/samples', getSampleDocuments);

// ── Process OCR (File upload or URL) with Engine selector & Auto-repair ─────
router.post('/process', upload.single('file'), processOcr);

// ── AI Devanagari Text Cleaning & Restoration ───────────────────────────────
router.post('/clean', cleanOcrText);

// ── Downstream AI Entity Extraction ─────────────────────────────────────────
router.post('/extract-entities', protect, extractLegalEntities);

module.exports = router;
