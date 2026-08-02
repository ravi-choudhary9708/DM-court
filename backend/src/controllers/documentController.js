const Document = require('../models/Document');
const { writeAuditLog } = require('../utils/auditLogger');
const Bull = require('bull');

// OCR job queue
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const queueOpts = redisUrl.startsWith('rediss://')
  ? { redis: { tls: { rejectUnauthorized: false } } }
  : {};
const ocrQueue = new Bull('ocr', redisUrl, queueOpts);


// @desc    Upload document for a case
// @route   POST /api/documents/upload/:caseId
// @access  Private (peshkar, admin)
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { party, docType, docTypeLabel, description } = req.body;

    const document = await Document.create({
      caseId: req.params.caseId,
      party: party || 'A',
      fileName: req.file.originalname,
      cloudinaryPublicId: req.file.filename || req.file.public_id,
      cloudinaryUrl: req.file.path || req.file.url,
      cloudinarySecureUrl: req.file.secure_url || req.file.path,
      resourceType: req.file.resource_type || 'auto',
      fileSize: req.file.size,
      docType: docType || 'other',
      docTypeLabel,
      description,
      uploadedBy: req.user._id,
      ocrStatus: 'pending',
    });

    // Queue OCR job
    await ocrQueue.add(
      { documentId: document._id.toString(), cloudinaryUrl: document.cloudinaryUrl },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: document._id,
      description: `Document '${document.fileName}' uploaded for Case ${req.params.caseId} (Party ${party})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all documents for a case
// @route   GET /api/documents/:caseId
// @access  Private
const getCaseDocuments = async (req, res, next) => {
  try {
    const { party } = req.query;
    const query = { caseId: req.params.caseId };
    if (party) query.party = party;

    const documents = await Document.find(query)
      .populate('uploadedBy', 'name role')
      .populate('verifiedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    // Group by party
    const grouped = {
      A: documents.filter((d) => d.party === 'A'),
      B: documents.filter((d) => d.party === 'B'),
      court: documents.filter((d) => d.party === 'court'),
    };

    res.json({ success: true, data: documents, grouped });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single document with OCR text
// @route   GET /api/documents/doc/:id
// @access  Private
const getDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name role')
      .populate('verifiedBy', 'name role');

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify a document (Peshkar confirms it's legitimate)
// @route   PUT /api/documents/doc/:id/verify
// @access  Private (peshkar, admin)
const verifyDocument = async (req, res, next) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { verified: true, verifiedBy: req.user._id, verifiedAt: new Date() },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DOCUMENT_VERIFIED',
      entityType: 'Document',
      entityId: document._id,
      description: `Document '${document.fileName}' verified by ${req.user.name}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger manual OCR retry
// @route   POST /api/documents/doc/:id/ocr
// @access  Private (peshkar, admin)
const retriggerOCR = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    await Document.findByIdAndUpdate(req.params.id, { ocrStatus: 'pending', ocrError: null });
    await ocrQueue.add(
      { documentId: document._id.toString(), cloudinaryUrl: document.cloudinaryUrl },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    res.json({ success: true, message: 'OCR job queued' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lightweight OCR status for all docs in a case (for polling)
// @route   GET /api/documents/:caseId/ocr-status
// @access  Private
const getOcrStatus = async (req, res, next) => {
  try {
    const documents = await Document.find(
      { caseId: req.params.caseId },
      { _id: 1, party: 1, fileName: 1, ocrStatus: 1, ocrLanguages: 1, ocrError: 1, embeddingStatus: 1, verified: 1 }
    ).lean();

    const summary = {
      total: documents.length,
      pending: documents.filter((d) => d.ocrStatus === 'pending').length,
      processing: documents.filter((d) => d.ocrStatus === 'processing').length,
      done: documents.filter((d) => d.ocrStatus === 'done').length,
      failed: documents.filter((d) => d.ocrStatus === 'failed').length,
    };

    res.json({ success: true, data: documents, summary });
  } catch (error) {
    next(error);
  }
};

// @desc    Get OCR queue stats (admin/peshkar dashboard)
// @route   GET /api/documents/queue/stats
// @access  Private (admin, peshkar)
const getQueueStats = async (req, res, next) => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      ocrQueue.getWaitingCount(),
      ocrQueue.getActiveCount(),
      ocrQueue.getCompletedCount(),
      ocrQueue.getFailedCount(),
      ocrQueue.getDelayedCount(),
    ]);

    res.json({
      success: true,
      data: {
        queue: 'ocr',
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getCaseDocuments,
  getDocument,
  verifyDocument,
  retriggerOCR,
  getOcrStatus,
  getQueueStats,
};
