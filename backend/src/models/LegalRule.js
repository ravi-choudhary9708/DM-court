const mongoose = require('mongoose');

const legalRuleSchema = new mongoose.Schema(
  {
    ruleCode: { type: String, required: true, unique: true }, // e.g. RULE-001
    description: { type: String, required: true },
    descriptionHindi: { type: String },
    caseTypes: [String], // applicable case types, empty = all
    // Condition as structured JSON
    condition: {
      type: { type: String, enum: ['document_required', 'field_required', 'date_check', 'custom'] },
      documentType: String,
      party: String, // 'A', 'B', 'both', 'court'
      field: String,
      customCheck: String,
    },
    // What to do if rule fails
    action: {
      type: String,
      enum: ['BLOCK_PROCEED', 'FLAG_INCOMPLETE', 'WARN', 'INFO'],
      default: 'FLAG_INCOMPLETE',
    },
    message: { type: String }, // Message to show Peshkar when rule fails
    mandatory: { type: Boolean, default: true },
    jurisdiction: { type: String, default: 'Bihar' },
    isActive: { type: Boolean, default: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LegalRule', legalRuleSchema);
