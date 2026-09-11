const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema(
  {
    caseNumber: {
      type: String,
      required: [true, 'Case number is required'],
      unique: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },
    caseType: {
      type: String,
      required: [true, 'Case type is required'],
      enum: [
        'land_dispute',
        'mutation',
        'arms_act',
        'excise',
        'public_order',
        'eviction',
        'succession',
        'other',
      ],
    },
    subject: {
      type: String,
      required: [true, 'Case subject is required'],
      trim: true,
    },
    // Party A (Petitioner / Applicant)
    partyA: {
      name: { type: String, required: true, trim: true },
      address: { type: String, trim: true },
      contact: { type: String, trim: true },
      advocate: { type: String, trim: true },
    },
    // Party B (Respondent / Opposite Party)
    partyB: {
      name: { type: String, required: true, trim: true },
      address: { type: String, trim: true },
      contact: { type: String, trim: true },
      advocate: { type: String, trim: true },
    },
    // Applicable Acts (references to LegalAct)
    applicableActs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LegalAct' }],
    filedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    nextHearingDate: Date,
    status: {
      type: String,
      enum: ['open', 'hearing', 'evidence_stage', 'arguments', 'order_pending', 'decided', 'appealed'],
      default: 'open',
    },
    // Assigned staff
    peshkar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dm: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Hearing dates log
    hearings: [
      {
        date: Date,
        notes: String,
        nextDate: Date,
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    // AI processing status
    aiAnalysisStatus: {
      type: String,
      enum: ['not_started', 'processing', 'completed', 'failed'],
      default: 'not_started',
    },
    // Stores AI analysis summaries and metadata (populated by analysisController)
    analysisResult: {
      summaryA: { type: String },         // Party A's submission summary
      summaryB: { type: String },         // Party B's submission summary
      completedAt: { type: Date },
      documentCount: { type: Number },
      evidenceCount: { type: Number },
      issueCount: { type: Number },
    },
    district: { type: String, default: 'Bihar' },
    policeStation: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Index for fast search
caseSchema.index({ status: 1 });
caseSchema.index({ 'partyA.name': 'text', 'partyB.name': 'text', subject: 'text' });

module.exports = mongoose.model('Case', caseSchema);
