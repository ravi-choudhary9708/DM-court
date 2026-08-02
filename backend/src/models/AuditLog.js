const mongoose = require('mongoose');

// Immutable audit log — never update or delete entries
const auditLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now, immutable: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', immutable: true },
    userName: { type: String, immutable: true },
    // userRole can be 'admin'|'peshkar'|'dm'|'system' (OCR worker, background jobs)
    userRole: { type: String, immutable: true },
    action: {
      type: String,
      required: true,
      immutable: true,
      enum: [
        'USER_LOGIN',
        'USER_LOGOUT',
        'USER_CREATED',
        'CASE_CREATED',
        'CASE_UPDATED',
        'DOCUMENT_UPLOADED',
        'DOCUMENT_VERIFIED',
        'OCR_COMPLETED',
        'OCR_FAILED',
        'EMBEDDING_FAILED',
        'EVIDENCE_EXTRACTED',
        'EVIDENCE_VERIFIED',
        'AI_ANALYSIS_GENERATED',
        'DRAFT_ORDER_GENERATED',
        'DRAFT_ORDER_REVIEWED',
        'ORDER_APPROVED',
        'ORDER_REJECTED',
        'LEGAL_SECTION_ADDED',
        'RULE_CHECK_RUN',
      ],
    },
    entityType: { type: String, immutable: true },
    entityId: { type: String, immutable: true },
    description: { type: String, immutable: true },
    ipAddress: { type: String, immutable: true },
    sessionId: { type: String, immutable: true },
  }
);

// Prevent updates and deletes on audit log
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('AuditLog is immutable — entries cannot be modified');
});
auditLogSchema.pre('deleteOne', function () {
  throw new Error('AuditLog is immutable — entries cannot be deleted');
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
