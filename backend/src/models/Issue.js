const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    issueNumber: { type: Number, required: true },
    // e.g. "Whether Party A has established ownership of Plot No. 123"
    issueText: { type: String, required: true },
    // Evidence supporting each party on this issue
    supportingEvidenceA: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
    supportingEvidenceB: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
    // Applicable law for this issue
    applicableSections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LegalSection' }],
    // AI analysis text for this issue — Peshkar must review
    aiAnalysis: { type: String },
    aiAnalysisGeneratedAt: Date,
    // Contradictions detected between parties' evidence
    contradictions: [
      {
        evidenceA: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' },
        evidenceB: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' },
        description: String,
      },
    ],
    peshkarNotes: { type: String },
    status: {
      type: String,
      enum: ['pending', 'analysed', 'reviewed', 'decided'],
      default: 'pending',
    },
    // DM's finding on this issue (filled during order approval)
    dmFinding: { type: String },
  },
  { timestamps: true }
);

issueSchema.index({ caseId: 1, issueNumber: 1 });

module.exports = mongoose.model('Issue', issueSchema);
