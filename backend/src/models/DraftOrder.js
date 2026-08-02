const mongoose = require('mongoose');

const draftOrderSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    version: { type: Number, default: 1 },
    // Structured order sections
    content: {
      background: { type: String },
      partyASubmissions: { type: String },
      partyBSubmissions: { type: String },
      documentsConsidered: { type: String },
      applicableProvisions: { type: String },
      issuesForDetermination: { type: String },
      analysisAndFindings: { type: String },
      // DM fills these
      decision: { type: String },
      directions: { type: String },
    },
    // Evidence and sections cited in this draft
    evidenceCited: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
    sectionsCited: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LegalSection' }],
    // AI generation metadata
    generatedByAI: { type: Boolean, default: true },
    aiModel: { type: String },
    generatedAt: Date,
    // Hindi order (authentic न्यायालय समाहर्त्ता format — full Hindi prose)
    hindiContent: { type: String },          // Full Hindi order as a single prose string
    hindiGeneratedAt: Date,
    orderLanguage: {
      type: String,
      enum: ['english', 'hindi', 'bilingual'],
      default: 'english',
    },
    // Peshkar review
    peshkarReviewed: { type: Boolean, default: false },
    peshkarReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    peshkarReviewedAt: Date,
    peshkarEdits: { type: String }, // Notes on what Peshkar changed
    // DM review
    dmReviewed: { type: Boolean, default: false },
    dmReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dmReviewedAt: Date,
    dmEdits: { type: String },
    status: {
      type: String,
      enum: ['draft', 'peshkar_review', 'dm_review', 'approved', 'rejected', 'revised'],
      default: 'draft',
    },
    rejectionReason: { type: String },
    // Final approved order metadata
    finalOrderDate: Date,
    orderSignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

draftOrderSchema.index({ caseId: 1, version: -1 });

module.exports = mongoose.model('DraftOrder', draftOrderSchema);
