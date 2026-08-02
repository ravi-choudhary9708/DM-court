const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getCaseDocuments,
  getDocument,
  verifyDocument,
  retriggerOCR,
  getOcrStatus,
  getQueueStats,
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { roles } = require('../middleware/roles');
const { uploadCourtDoc } = require('../config/cloudinary');

// ── Document Management ────────────────────────────────────────────────────────

// Upload document for a case (multipart/form-data)
router.post(
  '/upload/:caseId',
  protect,
  roles('admin', 'peshkar'),
  uploadCourtDoc.single('document'),
  uploadDocument
);

// Get all docs for a case (grouped by party)
router.get('/:caseId', protect, getCaseDocuments);

// ── Lightweight OCR Status Polling ────────────────────────────────────────────
// Returns only {_id, ocrStatus, ocrLanguages, embeddingStatus} — no heavy OCR text
// Frontend polls this every 10s instead of fetching full documents
router.get('/:caseId/ocr-status', protect, getOcrStatus);

// ── Queue Stats (admin/peshkar) ────────────────────────────────────────────────
router.get('/queue/stats', protect, roles('admin', 'peshkar'), getQueueStats);

// ── Single Document Operations ─────────────────────────────────────────────────

// Get single doc with full OCR text
router.get('/doc/:id', protect, getDocument);

// Verify doc (peshkar/admin only)
router.put('/doc/:id/verify', protect, roles('admin', 'peshkar'), verifyDocument);

// Retry OCR manually
router.post('/doc/:id/ocr', protect, roles('admin', 'peshkar'), retriggerOCR);

module.exports = router;
