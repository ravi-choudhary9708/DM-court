const express = require('express');
const router = express.Router();
const {
  createCase, getCases, getCaseById, updateCase, runCaseRuleChecks, getDashboardStats
} = require('../controllers/caseController');
const { protect } = require('../middleware/auth');
const { roles } = require('../middleware/roles');

router.get('/stats', protect, getDashboardStats);
router.get('/', protect, getCases);
router.post('/', protect, roles('admin', 'peshkar'), createCase);
router.get('/:id', protect, getCaseById);
router.put('/:id', protect, roles('admin', 'peshkar'), updateCase);
router.get('/:id/rules', protect, runCaseRuleChecks);

module.exports = router;
