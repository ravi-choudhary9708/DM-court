const express = require('express');
const router = express.Router();
const {
  getActs, getActById, createAct, updateAct,
  getSections, createSection, updateSection,
  getRules, createRule, updateRule,
  searchLegal,
} = require('../controllers/legalController');
const { protect } = require('../middleware/auth');
const { roles } = require('../middleware/roles');

// ── RAG Search ──────────────────────────────────────────────────────────────
// Must be before /:id routes to avoid conflicts
router.get('/search', protect, searchLegal);

// ── Legal Acts ──────────────────────────────────────────────────────────────
router.get('/acts', protect, getActs);
router.post('/acts', protect, roles('admin'), createAct);
router.get('/acts/:id', protect, getActById);
router.put('/acts/:id', protect, roles('admin'), updateAct);

// ── Sections (under an act) ─────────────────────────────────────────────────
router.get('/acts/:actId/sections', protect, getSections);
router.post('/acts/:actId/sections', protect, roles('admin'), createSection);
router.put('/sections/:id', protect, roles('admin'), updateSection);

// ── Legal Rules ─────────────────────────────────────────────────────────────
router.get('/rules', protect, getRules);
router.post('/rules', protect, roles('admin'), createRule);
router.put('/rules/:id', protect, roles('admin'), updateRule);

module.exports = router;
