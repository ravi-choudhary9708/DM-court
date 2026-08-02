const express = require('express');
const router = express.Router();
const {
  generateOrder,
  generateHindiOrder,
  getOrders,
  getOrderById,
  updateOrder,
  submitForDMReview,
  approveOrder,
  rejectOrder,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { roles } = require('../middleware/roles');

// ── Generate AI Order (English structured) ──────────────────────────────────
router.post('/:caseId/generate', protect, roles('admin', 'peshkar'), generateOrder);

// ── Generate Hindi Order (authentic न्यायालय समाहर्त्ता format) ─────────────
router.post('/:caseId/generate-hindi', protect, roles('admin', 'peshkar'), generateHindiOrder);

// ── Get Orders for Case ──────────────────────────────────────────────────────
router.get('/:caseId', protect, getOrders);

// ── Single Order Routes ──────────────────────────────────────────────────────
router.get('/order/:id', protect, getOrderById);
router.put('/order/:id', protect, roles('admin', 'peshkar', 'dm'), updateOrder);

// ── Review & Approval Workflow Routes ────────────────────────────────────────
// Peshkar submits for DM review
router.put('/order/:id/submit', protect, roles('admin', 'peshkar'), submitForDMReview);

// DM approves and signs order
router.put('/order/:id/approve', protect, roles('admin', 'dm'), approveOrder);

// DM rejects order with reason
router.put('/order/:id/reject', protect, roles('admin', 'dm'), rejectOrder);

module.exports = router;
