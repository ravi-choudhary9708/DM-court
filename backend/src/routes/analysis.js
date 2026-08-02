const express = require('express');
const router = express.Router();
const {
  runAnalysis,
  getAnalysis,
  getAnalysisStatus,
  verifyEvidence,
  updateIssueNotes,
} = require('../controllers/analysisController');
const { protect } = require('../middleware/auth');
const { roles } = require('../middleware/roles');

// ── Analysis Pipeline ───────────────────────────────────────────────────────
// Start AI analysis for a case (async, returns immediately)
router.post('/:caseId/run', protect, roles('admin', 'peshkar'), runAnalysis);

// Get full analysis results (evidence + issues + summaries)
router.get('/:caseId', protect, getAnalysis);

// Lightweight status poll (aiAnalysisStatus only)
router.get('/:caseId/status', protect, getAnalysisStatus);

// ── Evidence Management ─────────────────────────────────────────────────────
// Peshkar verifies or rejects an AI-extracted evidence item
router.put('/evidence/:id/verify', protect, roles('admin', 'peshkar'), verifyEvidence);

// ── Issue Management ────────────────────────────────────────────────────────
// Peshkar adds notes to a legal issue
router.put('/issues/:id/notes', protect, roles('admin', 'peshkar'), updateIssueNotes);

module.exports = router;
