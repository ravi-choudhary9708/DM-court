'use client';

import { useState } from 'react';
import { hasRole } from '@/lib/auth';

/**
 * EvidenceCard — Component for displaying an extracted evidence item
 * Supports Peshkar verification, rejection, and adding notes.
 */
export default function EvidenceCard({ evidence, onVerify }) {
  const [loading, setLoading] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState(evidence.peshkarNotes || '');

  const handleAction = async (verified) => {
    setLoading(true);
    try {
      await onVerify(evidence._id, verified, noteText);
      setShowNoteForm(false);
    } catch (err) {
      console.error('Evidence verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const partyBadge = {
    A: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    B: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    court: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  }[evidence.party] || 'bg-slate-700 text-slate-300 border-slate-600';

  return (
    <div
      className={`bg-slate-900/60 border rounded-xl p-4 transition-all ${
        evidence.verifiedByPeshkar
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-slate-700/60 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-amber-400 font-mono font-bold text-xs">{evidence.evidenceRef}</span>
          <span className={`text-xs px-2 py-0.5 rounded border ${partyBadge}`}>
            Party {evidence.party}
          </span>
          {evidence.documentId && (
            <span className="text-slate-400 text-xs truncate max-w-[180px]">
              📄 {evidence.documentId.fileName}
            </span>
          )}
          {evidence.pageNumber && (
            <span className="text-slate-500 text-xs">P. {evidence.pageNumber}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {evidence.extractionConfidence && (
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              Confidence: {evidence.extractionConfidence}%
            </span>
          )}

          {evidence.verifiedByPeshkar ? (
            <span className="text-xs px-2 py-0.5 rounded border bg-green-500/20 text-green-300 border-green-500/30 flex items-center gap-1 font-medium">
              ✓ Verified
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">
              Unverified
            </span>
          )}
        </div>
      </div>

      <p className="text-slate-200 text-sm leading-relaxed mb-2 font-sans">
        "{evidence.extractedFact}"
      </p>

      {evidence.peshkarNotes && (
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg p-2.5 mb-2 text-xs text-slate-300">
          <span className="text-amber-400 font-semibold">Peshkar Note: </span>
          {evidence.peshkarNotes}
        </div>
      )}

      {/* Traceability Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-500">
        <span>Trace: Doc ID → {evidence.documentId?._id || 'N/A'}</span>

        {hasRole('admin', 'peshkar') && (
          <div className="flex items-center gap-2">
            {!showNoteForm ? (
              <>
                <button
                  onClick={() => setShowNoteForm(true)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  💬 {evidence.peshkarNotes ? 'Edit Note' : 'Add Note'}
                </button>
                {!evidence.verifiedByPeshkar ? (
                  <button
                    onClick={() => handleAction(true)}
                    disabled={loading}
                    className="px-2.5 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 rounded-lg transition-colors font-medium text-xs disabled:opacity-50"
                  >
                    {loading ? '...' : '✓ Confirm'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction(false)}
                    disabled={loading}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors text-xs disabled:opacity-50"
                  >
                    Unverify
                  </button>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Note Edit Form */}
      {showNoteForm && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add verification notes or corrections..."
            rows={2}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNoteForm(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => handleAction(true)}
              disabled={loading}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              Save & Verify
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
