const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    party: { type: String, enum: ['A', 'B', 'court'], required: true },
    // e.g. EV-A-023
    evidenceRef: { type: String, required: true, unique: true },
    // The specific fact extracted
    extractedFact: { type: String, required: true },
    pageNumber: { type: Number },
    paragraphRef: { type: String },
    // Which legal sections this evidence relates to
    relatedSections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LegalSection' }],
    // Issues this evidence is relevant to
    relatedIssues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
    extractionMethod: { type: String, enum: ['ai', 'manual'], default: 'ai' },
    extractionConfidence: { type: Number, min: 0, max: 100 },
    // Peshkar must verify AI-extracted evidence
    verifiedByPeshkar: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    peshkarNotes: { type: String },
  },
  { timestamps: true }
);

evidenceSchema.index({ caseId: 1, party: 1 });
evidenceSchema.index({ evidenceRef: 1 });

module.exports = mongoose.model('Evidence', evidenceSchema);
