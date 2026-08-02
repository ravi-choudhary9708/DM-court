'use client';

import { useEffect, useRef } from 'react';
import { getToken, hasRole } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

const OCR_STATUS_STYLES = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  processing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  done: 'bg-green-500/20 text-green-300 border-green-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
};

/**
 * FileViewerModal
 * Props:
 *   isOpen {boolean}
 *   onClose {function}
 *   document {Object} — the full document object from MongoDB
 *   onVerify {function} — called after document is verified
 *   onRetryOCR {function} — called after OCR retry is triggered
 */
export default function FileViewerModal({ isOpen, onClose, document: doc, onVerify, onRetryOCR }) {
  const overlayRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const isPDF = doc.fileName?.toLowerCase().endsWith('.pdf') ||
    doc.cloudinaryUrl?.includes('.pdf') ||
    doc.resourceType === 'raw';

  const isImage = !isPDF;

  const ocrStatusStyle = OCR_STATUS_STYLES[doc.ocrStatus] || OCR_STATUS_STYLES.pending;

  const handleVerify = async () => {
    try {
      const res = await fetch(`${API}/documents/doc/${doc._id}/verify`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) onVerify && onVerify(data.data);
    } catch (err) {
      console.error('Verify failed:', err);
    }
  };

  const handleRetryOCR = async () => {
    try {
      const res = await fetch(`${API}/documents/doc/${doc._id}/ocr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) onRetryOCR && onRetryOCR();
    } catch (err) {
      console.error('OCR retry failed:', err);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{isPDF ? '📄' : '🖼️'}</span>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{doc.fileName}</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-slate-400 text-xs">
                  Party {doc.party} · {doc.docTypeLabel || doc.docType}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded border ${ocrStatusStyle}`}>
                  OCR: {doc.ocrStatus}
                </span>
                {doc.ocrLanguages?.length > 0 && (
                  <span className="text-slate-500 text-xs">
                    {doc.ocrLanguages.join(', ')}
                  </span>
                )}
                {doc.verified && (
                  <span className="text-xs px-2 py-0.5 rounded border bg-green-500/10 text-green-300 border-green-500/20">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {/* Open in new tab */}
            <a
              href={doc.cloudinarySecureUrl || doc.cloudinaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="file-open-newtab-btn"
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-colors"
            >
              ↗ Open
            </a>

            {/* Retry OCR */}
            {doc.ocrStatus === 'failed' && hasRole('admin', 'peshkar') && (
              <button
                id="retry-ocr-btn"
                onClick={handleRetryOCR}
                className="px-3 py-1.5 bg-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-600/30 rounded-xl text-xs transition-colors"
              >
                🔄 Retry OCR
              </button>
            )}

            {/* Verify */}
            {!doc.verified && hasRole('admin', 'peshkar') && (
              <button
                id="verify-doc-btn"
                onClick={handleVerify}
                className="px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30 rounded-xl text-xs transition-colors"
              >
                ✓ Verify
              </button>
            )}

            {/* Close */}
            <button
              id="file-viewer-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content split pane */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left — Document preview */}
          <div className={`${doc.ocrText ? 'w-3/5' : 'w-full'} bg-slate-950 border-r border-slate-800 flex items-center justify-center overflow-auto`}>
            {isPDF ? (
              <iframe
                src={doc.cloudinarySecureUrl || doc.cloudinaryUrl}
                title={doc.fileName}
                className="w-full h-full"
                style={{ minHeight: '100%' }}
              />
            ) : isImage ? (
              <div className="p-4 flex items-center justify-center w-full h-full">
                <img
                  src={doc.cloudinarySecureUrl || doc.cloudinaryUrl}
                  alt={doc.fileName}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="text-center text-slate-500 p-8">
                <span className="text-4xl mb-3 block">📎</span>
                <p>Preview not available</p>
                <a
                  href={doc.cloudinarySecureUrl || doc.cloudinaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 text-sm mt-2 inline-block"
                >
                  Download to view ↗
                </a>
              </div>
            )}
          </div>

          {/* Right — OCR text pane */}
          {doc.ocrText && (
            <div className="w-2/5 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 flex-shrink-0">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Extracted Text (OCR)
                </span>
                {doc.ocrLanguages?.length > 0 && (
                  <span className="text-slate-600 text-xs">· {doc.ocrLanguages.join(', ')}</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                  {doc.ocrText}
                </p>
              </div>
            </div>
          )}

          {/* OCR pending/processing notice */}
          {!doc.ocrText && doc.ocrStatus !== 'failed' && (
            <div className="absolute bottom-4 right-4">
              {doc.ocrStatus === 'pending' && (
                <div className="bg-amber-900/30 border border-amber-700/40 rounded-xl px-4 py-2 text-amber-300 text-xs flex items-center gap-2">
                  ⏳ OCR extraction queued
                </div>
              )}
              {doc.ocrStatus === 'processing' && (
                <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl px-4 py-2 text-blue-300 text-xs flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                  OCR processing...
                </div>
              )}
            </div>
          )}

          {/* OCR failed notice */}
          {doc.ocrStatus === 'failed' && (
            <div className="absolute bottom-4 right-4">
              <div className="bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-xs max-w-xs">
                <p className="font-semibold mb-1">OCR Failed</p>
                {doc.ocrError && <p className="text-red-400/70">{doc.ocrError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
