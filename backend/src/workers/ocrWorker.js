const Bull = require('bull');
const Document = require('../models/Document');
const { extractTextFromDocument } = require('../services/geminiService');
const { generateEmbedding } = require('../config/gemini');
const { writeAuditLog } = require('../utils/auditLogger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const queueOpts = redisUrl.startsWith('rediss://')
  ? { redis: { tls: { rejectUnauthorized: false } } }
  : {};
const ocrQueue = new Bull('ocr', redisUrl, queueOpts);


ocrQueue.process(async (job) => {
  const { documentId, cloudinaryUrl } = job.data;
  console.log(`[OCR Worker] Processing document ${documentId}`);

  // Mark as processing
  await Document.findByIdAndUpdate(documentId, { ocrStatus: 'processing' });

  const document = await Document.findById(documentId);
  if (!document) throw new Error(`Document ${documentId} not found`);

  // Determine mime type from file extension
  const ext = document.fileName.split('.').pop().toLowerCase();
  const mimeTypeMap = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };
  const mimeType = mimeTypeMap[ext] || 'application/pdf';

  // ── Step 1: Run Gemini Vision OCR ─────────────────────────────────────────
  const { text, languages, success, error } = await extractTextFromDocument(
    cloudinaryUrl,
    mimeType
  );

  if (!success || !text) {
    await Document.findByIdAndUpdate(documentId, {
      ocrStatus: 'failed',
      ocrError: error || 'OCR produced no text',
    });

    await writeAuditLog({
      userId: null,
      userName: 'System (OCR Worker)',
      userRole: 'system',
      action: 'OCR_FAILED',
      entityType: 'Document',
      entityId: documentId,
      description: `OCR failed for document '${document.fileName}': ${error || 'no text extracted'}`,
    });

    throw new Error(`OCR failed: ${error}`);
  }

  // ── Step 2: Generate embedding for RAG ────────────────────────────────────
  let embedding = null;
  let embeddingStatus = 'failed';

  try {
    // Use first 8000 chars for embedding (model token limit)
    embedding = await generateEmbedding(text.substring(0, 8000));
    embeddingStatus = 'done';
  } catch (embErr) {
    console.error('[EMBEDDING ERROR]', embErr.message);

    // Log embedding failure — non-fatal, OCR text is still saved
    await writeAuditLog({
      userId: null,
      userName: 'System (OCR Worker)',
      userRole: 'system',
      action: 'EMBEDDING_FAILED',
      entityType: 'Document',
      entityId: documentId,
      description: `Embedding failed for '${document.fileName}': ${embErr.message}`,
    });
  }

  // ── Step 3: Persist OCR results to MongoDB ────────────────────────────────
  await Document.findByIdAndUpdate(documentId, {
    ocrStatus: 'done',
    ocrText: text,
    ocrLanguages: languages,
    ocrError: null,
    embedding,
    embeddingStatus,
  });

  await writeAuditLog({
    userId: null,
    userName: 'System (OCR Worker)',
    userRole: 'system',
    action: 'OCR_COMPLETED',
    entityType: 'Document',
    entityId: documentId,
    description: `OCR completed for '${document.fileName}'. Languages: ${languages.join(', ')}. Chars: ${text.length}. Embedding: ${embeddingStatus}.`,
  });

  console.log(`[OCR Worker] Completed document ${documentId} (${languages.join(', ')})`);
  return { documentId, success: true, languages, textLength: text.length, embeddingStatus };
});

// ── Queue event handlers ───────────────────────────────────────────────────────

ocrQueue.on('failed', async (job, error) => {
  console.error(`[OCR Worker] Job ${job.id} failed after all retries:`, error.message);
  try {
    await Document.findByIdAndUpdate(job.data.documentId, {
      ocrStatus: 'failed',
      ocrError: `Failed after ${job.opts.attempts} attempts: ${error.message}`,
    });
  } catch (dbErr) {
    console.error('[OCR Worker] Could not update document failure state:', dbErr.message);
  }
});

ocrQueue.on('completed', (job, result) => {
  console.log(`[OCR Worker] Job ${job.id} completed — doc ${result?.documentId}`);
});

ocrQueue.on('stalled', (job) => {
  console.warn(`[OCR Worker] Job ${job.id} stalled — will be retried`);
});

console.log('✅ OCR Worker started and listening for jobs');

module.exports = ocrQueue;
