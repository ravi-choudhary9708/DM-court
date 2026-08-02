const mongoose = require('mongoose');

const legalSectionSchema = new mongoose.Schema(
  {
    actId: { type: mongoose.Schema.Types.ObjectId, ref: 'LegalAct', required: true },
    sectionNumber: { type: String, required: true, trim: true }, // e.g. "48", "4A", "144"
    sectionTitle: { type: String, trim: true },
    sectionTitleHindi: { type: String, trim: true },
    text: { type: String, required: true }, // Full section text
    textHindi: { type: String }, // Hindi version if available
    summary: { type: String }, // Short AI-generated summary for display
    // Versioning — critical for applying correct law at case date
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date }, // null = still in force
    versionNote: { type: String }, // e.g. "Amended by Bihar Act 2022"
    // Embedding for semantic search (stored as array)
    embedding: { type: [Number], select: false },
    embeddingStatus: {
      type: String,
      enum: ['pending', 'done', 'failed'],
      default: 'pending',
    },
    keywords: [String], // For BM25 keyword search
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Text index for keyword search (BM25-style via MongoDB)
legalSectionSchema.index({
  sectionNumber: 'text',
  sectionTitle: 'text',
  text: 'text',
  keywords: 'text',
});
legalSectionSchema.index({ actId: 1, sectionNumber: 1 });
legalSectionSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

module.exports = mongoose.model('LegalSection', legalSectionSchema);
