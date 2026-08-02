const AuditLog = require('../models/AuditLog');

// @desc    Get paginated audit logs with filters (admin only)
// @route   GET /api/audit
// @access  Private (admin)
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, userRole, entityType, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (action) query.action = action;
    if (userRole) query.userRole = userRole;
    if (entityType) query.entityType = entityType;
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { entityId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs };
