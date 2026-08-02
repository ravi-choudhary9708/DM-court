const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
    },
    // Which party submitted this document
    party: {
      type: String,
      enum: ['A', 'B', 'court'],
      required: true,
    },
    // Original file name
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    // Document classification
    docType: {
      type: String,
      enum: [
        // Petition types — primary documents filed by parties
        'petition',           // अर्जी — Main petition / application
        'appeal_petition',    // अपील — Appeal petition (like the sample order)
        'counter_petition',   // प्रति-अर्जी — Counter petition
        'revision_petition',  // पुनरीक्षण — Revision petition
        // Reply/response documents
        'application',
        'reply',              // प्रतिउत्तर — Counter reply/written statement
        'affidavit',          // शपथ पत्र
        // Land & Revenue records
        'land_record',        // भूमि अभिलेख
        'jamabandi',          // जमाबंदी
        'revenue_receipt',    // राजस्व रसीद
        'sale_deed',          // विक्रय पत्र / केवाला
        'partition_deed',     // बंटवारा पत्र
        'poa',                // Power of Attorney / वकालतनामा
        // Official reports
        'co_report',          // सी.ओ. रिपोर्ट
        'police_report',      // पुलिस रिपोर्ट
        'survey_report',      // सर्वे रिपोर्ट
        'spot_inspection',    // स्थल निरीक्षण रिपोर्ट
        // Court documents
        'notice',             // नोटिस
        'government_order',   // सरकारी आदेश / पूर्व आदेश
        'lower_court_record', // निम्न न्यायालय अभिलेख
        'tameela_report',     // तामिला प्रतिवेदन
        // Identity
        'identity_proof',     // पहचान पत्र
        'other',
      ],
      default: 'other',
    },
    docTypeLabel: { type: String, trim: true }, // Human-readable label
    // Cloudinary storage details
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    cloudinarySecureUrl: { type: String },
    resourceType: { type: String, default: 'auto' },
    fileSize: Number, // bytes
    // OCR extracted text (Hindi + English + Urdu/Farsi)
    ocrStatus: {
      type: String,
      enum: ['pending', 'processing', 'done', 'failed'],
      default: 'pending',
    },
    ocrText: { type: String },
    ocrLanguages: [String], // detected languages
    ocrError: { type: String },
    // Embedding for semantic search
    embedding: { type: [Number], select: false }, // Don't return in normal queries
    embeddingStatus: {
      type: String,
      enum: ['pending', 'done', 'failed'],
      default: 'pending',
    },
    // Peshkar verification
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, trim: true },
    pageCount: Number,
  },
  { timestamps: true }
);

documentSchema.index({ caseId: 1, party: 1 });
documentSchema.index({ ocrStatus: 1 });

module.exports = mongoose.model('Document', documentSchema);
