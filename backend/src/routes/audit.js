const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/auth');
const { roles } = require('../middleware/roles');

// ── Immutable Audit Log Inspection ──────────────────────────────────────────
router.get('/', protect, roles('admin'), getAuditLogs);

module.exports = router;
