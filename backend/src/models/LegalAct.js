const mongoose = require('mongoose');

const legalActSchema = new mongoose.Schema(
  {
    actName: { type: String, required: true, trim: true },
    actNameHindi: { type: String, trim: true }, // Hindi name
    actYear: { type: Number, required: true },
    shortName: { type: String, trim: true }, // e.g. "BLR Act"
    jurisdiction: { type: String, default: 'Bihar' },
    actType: {
      type: String,
      enum: ['central', 'state', 'rule', 'notification', 'circular', 'order'],
      default: 'state',
    },
    status: {
      type: String,
      enum: ['active', 'repealed', 'amended'],
      default: 'active',
    },
    description: { type: String },
    officialSource: { type: String }, // URL to official gazette
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

legalActSchema.index({ actName: 'text', actNameHindi: 'text' });

module.exports = mongoose.model('LegalAct', legalActSchema);
