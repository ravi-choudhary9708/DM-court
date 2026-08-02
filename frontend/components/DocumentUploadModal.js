'use client';

import { useState, useRef, useCallback } from 'react';
import { getToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

const DOC_TYPES_BY_PARTY = {
  A: [
    // Petition documents (Party A — Appellant/Petitioner)
    { value: 'petition', label: '📋 अर्जी / Petition', group: 'petition' },
    { value: 'appeal_petition', label: '📋 अपील अर्जी / Appeal Petition', group: 'petition' },
    { value: 'revision_petition', label: '📋 पुनरीक्षण अर्जी / Revision Petition', group: 'petition' },
    { value: 'affidavit', label: '🗒 शपथ पत्र / Affidavit', group: 'petition' },
    { value: 'application', label: '📄 आवेदन / Application', group: 'petition' },
    // Supporting evidence
    { value: 'land_record', label: '🗺 भूमि अभिलेख / Land Record', group: 'evidence' },
    { value: 'jamabandi', label: '📑 जमाबंदी / Jamabandi', group: 'evidence' },
    { value: 'revenue_receipt', label: '🧾 राजस्व रसीद / Revenue Receipt', group: 'evidence' },
    { value: 'sale_deed', label: '📜 विक्रय पत्र / Sale Deed', group: 'evidence' },
    { value: 'partition_deed', label: '📜 बंटवारा पत्र / Partition Deed', group: 'evidence' },
    { value: 'poa', label: '📜 Power of Attorney / वकालतनामा', group: 'evidence' },
    { value: 'identity_proof', label: '🪪 पहचान पत्र / Identity Proof', group: 'evidence' },
    { value: 'other', label: '📁 अन्य / Other', group: 'other' },
  ],
  B: [
    // Counter petition documents (Party B — Respondent)
    { value: 'reply', label: '📋 प्रतिउत्तर / Counter Reply', group: 'petition' },
    { value: 'counter_petition', label: '📋 प्रति-अर्जी / Counter Petition', group: 'petition' },
    { value: 'affidavit', label: '🗒 शपथ पत्र / Affidavit', group: 'petition' },
    { value: 'application', label: '📄 आवेदन / Application', group: 'petition' },
    // Supporting evidence
    { value: 'land_record', label: '🗺 भूमि अभिलेख / Land Record', group: 'evidence' },
    { value: 'jamabandi', label: '📑 जमाबंदी / Jamabandi', group: 'evidence' },
    { value: 'revenue_receipt', label: '🧾 राजस्व रसीद / Revenue Receipt', group: 'evidence' },
    { value: 'sale_deed', label: '📜 विक्रय पत्र / Sale Deed', group: 'evidence' },
    { value: 'partition_deed', label: '📜 बंटवारा पत्र / Partition Deed', group: 'evidence' },
    { value: 'poa', label: '📜 Power of Attorney / वकालतनामा', group: 'evidence' },
    { value: 'identity_proof', label: '🪪 पहचान पत्र / Identity Proof', group: 'evidence' },
    { value: 'other', label: '📁 अन्य / Other', group: 'other' },
  ],
  court: [
    // Court-initiated documents
    { value: 'notice', label: '📢 नोटिस / Notice', group: 'court' },
    { value: 'tameela_report', label: '📝 तामिला प्रतिवेदन / Tameela Report', group: 'court' },
    { value: 'co_report', label: '📊 सी.ओ. रिपोर्ट / CO Report', group: 'court' },
    { value: 'survey_report', label: '📊 सर्वे रिपोर्ट / Survey Report', group: 'court' },
    { value: 'spot_inspection', label: '📊 स्थल निरीक्षण / Spot Inspection', group: 'court' },
    { value: 'police_report', label: '🚔 पुलिस रिपोर्ट / Police Report', group: 'court' },
    { value: 'government_order', label: '📜 सरकारी आदेश / Govt Order', group: 'court' },
    { value: 'lower_court_record', label: '🏛 निम्न न्यायालय अभिलेख / Lower Court Record', group: 'court' },
    { value: 'other', label: '📁 अन्य / Other', group: 'other' },
  ],
};

const PARTY_CONFIG = {
  A: {
    label: 'Party A',
    labelHindi: 'अपीलकर्त्ता / वादी',
    roleLabel: 'Appellant / Petitioner',
    roleHindi: 'अर्जी / Petition दस्तावेज़',
    color: 'amber',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-300',
    icon: '📋',
    guidance: 'Upload the petition / application and all supporting evidence for the appellant (Party A).',
    guidanceHindi: 'अपीलकर्त्ता की अर्जी, शपथ पत्र एवं सभी सहायक दस्तावेज़ अपलोड करें।',
  },
  B: {
    label: 'Party B',
    labelHindi: 'प्रतिवादी / विपक्षी',
    roleLabel: 'Respondent / Opposite Party',
    roleHindi: 'प्रतिउत्तर / Counter-Reply दस्तावेज़',
    color: 'blue',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-300',
    icon: '📋',
    guidance: 'Upload the counter-reply / written statement and all supporting evidence for the respondent (Party B).',
    guidanceHindi: 'प्रतिवादी का प्रतिउत्तर, शपथ पत्र एवं सहायक दस्तावेज़ अपलोड करें।',
  },
  court: {
    label: 'Court',
    labelHindi: 'न्यायालय अभिलेख',
    roleLabel: 'Court Documents',
    roleHindi: 'नोटिस, सी.ओ. रिपोर्ट, तामिला प्रतिवेदन',
    color: 'purple',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-300',
    icon: '🏛️',
    guidance: 'Upload court-issued notices, CO reports, tameela reports, and lower court records.',
    guidanceHindi: 'न्यायालय द्वारा जारी नोटिस, तामिला प्रतिवेदन, सी.ओ. रिपोर्ट एवं निम्न न्यायालय अभिलेख अपलोड करें।',
  },
};


/**
 * DocumentUploadModal
 * Props:
 *   isOpen {boolean}
 *   onClose {function}
 *   caseId {string}
 *   party {'A'|'B'|'court'}
 *   onSuccess {function} — called after successful upload with document data
 */
export default function DocumentUploadModal({ isOpen, onClose, caseId, party, onSuccess }) {
  const fileRef = useRef(null);
  const dropRef = useRef(null);

  const partyConfig = PARTY_CONFIG[party] || PARTY_CONFIG.A;
  const docTypes = DOC_TYPES_BY_PARTY[party] || DOC_TYPES_BY_PARTY.A;

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [docType, setDocType] = useState(docTypes[0]?.value || 'other');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);


  const resetState = () => {
    setFile(null);
    setDocType('other');
    setDescription('');
    setUploading(false);
    setUploaded(false);
    setError('');
    setProgress(0);
    setDragging(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const validateAndSetFile = (f) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(f.type)) {
      setError('Only PDF, JPG, or PNG files are allowed.');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('File size must be under 20MB.');
      return;
    }
    setError('');
    setFile(f);
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }
    setUploading(true);
    setError('');
    setProgress(30);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('party', party);
      formData.append('docType', docType);
      if (description) formData.append('description', description);

      setProgress(60);

      const res = await fetch(`${API}/documents/upload/${caseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      setProgress(90);
      const data = await res.json();

      if (!data.success) throw new Error(data.message || 'Upload failed');

      setProgress(100);
      setUploaded(true);
      onSuccess && onSuccess(data.data);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <span>{partyConfig.icon}</span>
              <span>Upload — {partyConfig.label}</span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {partyConfig.roleLabel} · <span className={partyConfig.textColor}>{partyConfig.roleHindi}</span>
            </p>
          </div>
          <button
            id="upload-modal-close"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Context guidance banner */}
        <div className={`mx-6 mt-4 px-4 py-3 rounded-xl border ${partyConfig.bgColor} ${partyConfig.borderColor}`}>
          <p className={`text-xs font-medium ${partyConfig.textColor} mb-0.5`}>{partyConfig.guidanceHindi}</p>
          <p className="text-slate-400 text-xs">{partyConfig.guidance}</p>
        </div>


        <div className="p-6 space-y-5">
          {/* Success state */}
          {uploaded ? (
            <div className="flex flex-col items-center py-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-3xl">
                ✅
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Document Uploaded</p>
                <p className="text-slate-400 text-sm mt-1">
                  OCR processing has been queued. Text will be extracted shortly.
                </p>
              </div>
              <button
                id="upload-another-btn"
                onClick={resetState}
                className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
              >
                + Upload another document
              </button>
              <button
                onClick={handleClose}
                className="px-5 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl hover:bg-slate-700 transition-colors text-sm"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  dragging
                    ? 'border-amber-500 bg-amber-500/10'
                    : file
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && validateAndSetFile(e.target.files[0])}
                />

                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">{file.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                    <p className="text-white text-sm font-medium truncate max-w-xs">{file.name}</p>
                    <p className="text-slate-400 text-xs">{formatBytes(file.size)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-red-400 hover:text-red-300 mt-1"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl text-slate-500">📁</span>
                    <p className="text-slate-300 text-sm font-medium">
                      Drag & drop or <span className="text-amber-400">click to browse</span>
                    </p>
                    <p className="text-slate-500 text-xs">PDF, JPG, PNG · Max 20MB</p>
                  </div>
                )}
              </div>

              {/* Doc type */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Document Type <span className="text-slate-500">/ दस्तावेज़ प्रकार</span>
                </label>
                <select
                  id="upload-doc-type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                >
                  {docTypes.map((dt) => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Description <span className="text-slate-500">/ विवरण (optional)</span>
                </label>
                <input
                  id="upload-description"
                  type="text"
                  placeholder="Brief description of the document..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm flex items-center gap-2">
                  <span>⚠</span> {error}
                </div>
              )}

              {/* Progress bar */}
              {uploading && (
                <div className="space-y-2">
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-xs text-center">Uploading... {progress}%</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  disabled={uploading}
                  className="flex-1 py-2.5 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  id="upload-submit-btn"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    '⬆ Upload Document'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
