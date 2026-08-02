const AuditLog = require('../models/AuditLog');

/**
 * Write an immutable audit log entry
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.userName
 * @param {string} params.userRole
 * @param {string} params.action - Must be one of AuditLog enum values
 * @param {string} params.entityType
 * @param {string} params.entityId
 * @param {string} params.description
 * @param {string} [params.ipAddress]
 */
const writeAuditLog = async ({
  userId,
  userName,
  userRole,
  action,
  entityType,
  entityId,
  description,
  ipAddress,
}) => {
  try {
    await AuditLog.create({
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId: entityId?.toString(),
      description,
      ipAddress,
    });
  } catch (error) {
    // Audit log failure should not crash the main request
    console.error('[AUDIT LOG ERROR]', error.message);
  }
};

/**
 * Express middleware to auto-log from req.user
 */
const auditMiddleware = (action, entityType, getEntityId) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (data.success !== false && req.user) {
        await writeAuditLog({
          userId: req.user._id,
          userName: req.user.name,
          userRole: req.user.role,
          action,
          entityType,
          entityId: getEntityId ? getEntityId(req, data) : req.params.id,
          description: `${action} by ${req.user.name}`,
          ipAddress: req.ip,
        });
      }
      return originalJson(data);
    };
    next();
  };
};

module.exports = { writeAuditLog, auditMiddleware };
