'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getToken, getUser, hasRole } from '@/lib/auth';
import { documentsAPI, analysisAPI } from '@/lib/api';
import DocumentUploadModal from '@/components/DocumentUploadModal';
import FileViewerModal from '@/components/FileViewerModal';
import EvidenceCard from '@/components/EvidenceCard';
import OrderEditor from '@/components/OrderEditor';




const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  open:           'bg-blue-500/20 text-blue-300 border-blue-500/30',
  hearing:        'bg-amber-500/20 text-amber-300 border-amber-500/30',
  evidence_stage: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  arguments:      'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  order_pending:  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  decided:        'bg-green-500/20 text-green-300 border-green-500/30',
  appealed:       'bg-red-500/20 text-red-300 border-red-500/30',
};

const OCR_STATUS = {
  pending:    { label: 'OCR Queued',     cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  processing: { label: 'OCR Running…',  cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  done:       { label: 'OCR Done',       cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
  failed:     { label: 'OCR Failed',     cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

const TABS = [
  { id: 'overview',  label: 'Overview',      labelHindi: 'अवलोकन',     icon: '🏛️' },
  { id: 'documents', label: 'Documents',     labelHindi: 'दस्तावेज़',   icon: '📁' },
  { id: 'analysis',  label: 'AI Analysis',   labelHindi: 'AI विश्लेषण', icon: '🤖' },
  { id: 'order',     label: 'Draft Order',   labelHindi: 'प्रारूप आदेश', icon: '✍️' },
];

const STATUSES = [
  { value: 'open',           label: 'Open' },
  { value: 'hearing',        label: 'Hearing' },
  { value: 'evidence_stage', label: 'Evidence Stage' },
  { value: 'arguments',      label: 'Arguments' },
  { value: 'order_pending',  label: 'Order Pending' },
  { value: 'decided',        label: 'Decided' },
  { value: 'appealed',       label: 'Appealed' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-slate-500 text-sm w-36 flex-shrink-0">{label}</span>
      <span className="text-slate-200 text-sm">{value}</span>
    </div>
  );
}

function PartyCard({ party, label, labelHindi, color }) {
  if (!party) return null;
  const borderColor = color === 'amber' ? 'border-amber-500/20' : 'border-blue-500/20';
  const tagColor = color === 'amber'
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    : 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  return (
    <div className={`bg-slate-800/40 border ${borderColor} rounded-xl p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded border ${tagColor}`}>{label}</span>
        <span className="text-slate-500 text-xs">{labelHindi}</span>
      </div>
      <p className="text-white font-semibold text-base mb-1">{party.name}</p>
      {party.address && <p className="text-slate-400 text-xs mb-1">📍 {party.address}</p>}
      {party.contact && <p className="text-slate-400 text-xs mb-1">📞 {party.contact}</p>}
      {party.advocate && <p className="text-slate-400 text-xs">⚖️ Adv. {party.advocate}</p>}
    </div>
  );
}

function RuleCheckPanel({ caseId }) {
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cases/${caseId}/rules`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data.results);
        setSummary(data.data.summary);
        setRan(true);
      }
    } catch (err) {
      console.error('Rule check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = { SATISFIED: '✅', FAILED: '❌', SKIPPED: '⚠️' };
  const statusCls  = {
    SATISFIED: 'border-green-500/30 bg-green-500/5',
    FAILED:    'border-red-500/30 bg-red-500/10',
    SKIPPED:   'border-slate-600 bg-slate-700/20',
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm">Rule Checks / नियम जाँच</h3>
          <p className="text-slate-500 text-xs mt-0.5">Deterministic legal rule validation (zero AI)</p>
        </div>
        <button
          id="run-rules-btn"
          onClick={run}
          disabled={loading}
          className="px-3 py-1.5 bg-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-600/30 rounded-xl text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? (
            <><div className="w-3 h-3 border border-amber-300/30 border-t-amber-300 rounded-full animate-spin" /> Running…</>
          ) : (
            '▶ Run Checks'
          )}
        </button>
      </div>

      {!ran && !loading && (
        <div className="text-center py-6 text-slate-500 text-sm">
          Click "Run Checks" to validate mandatory legal rules for this case
        </div>
      )}

      {ran && summary && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-4 mb-4 p-3 bg-slate-900/40 rounded-xl">
            <div className="text-center">
              <p className="text-green-400 font-bold text-lg">{summary.satisfied}</p>
              <p className="text-slate-500 text-xs">Passed</p>
            </div>
            <div className="text-center">
              <p className="text-red-400 font-bold text-lg">{summary.failed}</p>
              <p className="text-slate-500 text-xs">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 font-bold text-lg">{summary.skipped}</p>
              <p className="text-slate-500 text-xs">Skipped</p>
            </div>
            <div className="ml-auto">
              {summary.canProceed ? (
                <span className="text-xs px-2.5 py-1 rounded-lg border bg-green-500/10 text-green-300 border-green-500/20">
                  ✓ Can Proceed
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-lg border bg-red-500/10 text-red-300 border-red-500/20">
                  ⛔ Blocked
                </span>
              )}
            </div>
          </div>

          {/* Rule list */}
          {results.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No rules configured for this case type.</p>
          ) : (
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`border rounded-xl p-3 ${statusCls[r.status] || statusCls.SKIPPED}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-base flex-shrink-0">{statusIcon[r.status] || '⚠️'}</span>
                      <div>
                        <p className="text-white text-xs font-medium">{r.ruleCode}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{r.description}</p>
                        {r.message && <p className="text-red-300 text-xs mt-1 font-medium">{r.message}</p>}
                      </div>
                    </div>
                    {r.mandatory && (
                      <span className="text-xs px-1.5 py-0.5 rounded border border-red-500/30 text-red-300 bg-red-500/10 flex-shrink-0">
                        Mandatory
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DocumentColumn({ title, titleHindi, party, partyColor, documents, onUpload, onView }) {
  const borderColor = {
    amber:  'border-amber-500/20',
    blue:   'border-blue-500/20',
    purple: 'border-purple-500/20',
  }[partyColor] || 'border-slate-700/50';

  const headerColor = {
    amber:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
    blue:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  }[partyColor] || 'bg-slate-700/20 text-slate-300 border-slate-600';

  const btnColor = {
    amber:  'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-900/30',
    blue:   'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-900/30',
    purple: 'from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 shadow-purple-900/30',
  }[partyColor] || 'from-slate-600 to-slate-500 shadow-slate-900/30';

  const docs = documents.filter((d) => d.party === party);

  return (
    <div className={`bg-slate-800/30 border ${borderColor} rounded-2xl flex flex-col overflow-hidden`}>
      {/* Column header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded border ${headerColor}`}>{title}</span>
          <span className="text-slate-500 text-xs">{titleHindi}</span>
          <span className="text-slate-600 text-xs">({docs.length})</span>
        </div>
        {hasRole('admin', 'peshkar') && (
          <button
            id={`upload-btn-${party}`}
            onClick={() => onUpload(party)}
            className={`text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r ${btnColor} text-white font-medium shadow-lg transition-all duration-200 hover:scale-105`}
          >
            + Upload
          </button>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <span className="text-3xl mb-2 opacity-30">📄</span>
            <p className="text-slate-600 text-xs">No documents uploaded</p>
          </div>
        ) : (
          docs.map((doc) => {
            const ocr = OCR_STATUS[doc.ocrStatus] || OCR_STATUS.pending;
            return (
              <div
                key={doc._id}
                className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate flex items-center gap-1.5">
                      <span>{doc.fileName?.endsWith('.pdf') ? '📄' : '🖼️'}</span>
                      <span className="truncate">{doc.fileName}</span>
                    </p>
                    <p className="text-slate-500 text-xs mt-1 truncate">
                      {doc.docTypeLabel || doc.docType?.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${ocr.cls}`}>
                        {ocr.label}
                      </span>
                      {doc.verified && (
                        <span className="text-xs px-1.5 py-0.5 rounded border bg-green-500/10 text-green-300 border-green-500/20">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onView(doc)}
                    id={`view-doc-${doc._id}`}
                    className="flex-shrink-0 px-2.5 py-1.5 bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-lg text-xs transition-colors"
                  >
                    View
                  </button>
                </div>
                {doc.description && (
                  <p className="text-slate-600 text-xs mt-1.5 italic truncate">{doc.description}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id;

  const [caseData, setCaseData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusEditing, setStatusEditing] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Upload modal
  const [uploadModal, setUploadModal] = useState({ open: false, party: 'A' });
  // File viewer modal
  const [viewerModal, setViewerModal] = useState({ open: false, doc: null });

  // Hearing note form
  const [hearingForm, setHearingForm] = useState({ open: false, notes: '', nextDate: '' });
  const [hearingSubmitting, setHearingSubmitting] = useState(false);

  // Analysis state
  const [analysisData, setAnalysisData] = useState({ evidence: [], issues: [], analysisResult: null, status: 'not_started' });
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);

  // ── Fetch case ───────────────────────────────────────────────────────────────
  const fetchCase = useCallback(async () => {
    try {
      const res = await fetch(`${API}/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setCaseData(data.data);
        setNewStatus(data.data.status);
      } else {
        router.push('/cases');
      }
    } catch {
      router.push('/cases');
    } finally {
      setLoading(false);
    }
  }, [caseId, router]);

  // ── Fetch documents ──────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetch(`${API}/documents/${caseId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setDocuments(data.data);
    } catch (err) {
      console.error('Docs fetch error:', err);
    } finally {
      setDocsLoading(false);
    }
  }, [caseId]);

  // ── Fetch analysis ───────────────────────────────────────────────────────────
  const fetchAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    try {
      const data = await analysisAPI.get(caseId);
      if (data.success) {
        setAnalysisData(data.data);
      }
    } catch (err) {
      console.error('Fetch analysis error:', err);
    } finally {
      setAnalysisLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    fetchCase();
    fetchDocuments();
  }, [fetchCase, fetchDocuments, router]);

  useEffect(() => {
    if (activeTab === 'analysis') {
      fetchAnalysis();
    }
  }, [activeTab, fetchAnalysis]);

  // Poll analysis status if processing
  useEffect(() => {
    const isProcessing = analysisData.status === 'processing' || caseData?.aiAnalysisStatus === 'processing';
    if (!isProcessing) return;

    const timer = setInterval(async () => {
      try {
        const data = await analysisAPI.status(caseId);
        if (data.success) {
          const newStatus = data.data.aiAnalysisStatus;
          if (newStatus !== 'processing') {
            fetchAnalysis();
            fetchCase();
          }
        }
      } catch (err) {
        console.warn('Analysis status poll error:', err);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [analysisData.status, caseData?.aiAnalysisStatus, caseId, fetchAnalysis, fetchCase]);

  const handleRunAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const res = await analysisAPI.run(caseId);
      if (res.success) {
        setCaseData((prev) => ({ ...prev, aiAnalysisStatus: 'processing' }));
        setAnalysisData((prev) => ({ ...prev, status: 'processing' }));
      }
    } catch (err) {
      alert(err.message || 'Failed to start AI Analysis');
    } finally {
      setRunningAnalysis(false);
    }
  };

  const handleVerifyEvidence = async (evidenceId, verified, notes) => {
    try {
      const res = await analysisAPI.verifyEvidence(evidenceId, { verified, peshkarNotes: notes });
      if (res.success) {
        setAnalysisData((prev) => ({
          ...prev,
          evidence: prev.evidence.map((ev) => (ev._id === evidenceId ? res.data : ev)),
        }));
      }
    } catch (err) {
      console.error('Verify evidence error:', err);
    }
  };


  // ── Poll OCR status every 10s using lightweight endpoint ────────────────────
  useEffect(() => {
    const hasPending = documents.some(
      (d) => d.ocrStatus === 'pending' || d.ocrStatus === 'processing'
    );
    if (!hasPending) return;

    const timer = setInterval(async () => {
      try {
        const data = await documentsAPI.ocrStatus(caseId);
        if (!data.success) return;

        // Merge only the status fields into existing document state
        setDocuments((prev) =>
          prev.map((doc) => {
            const updated = data.data.find((d) => d._id === doc._id);
            if (!updated) return doc;
            return {
              ...doc,
              ocrStatus: updated.ocrStatus,
              ocrLanguages: updated.ocrLanguages,
              ocrError: updated.ocrError,
              embeddingStatus: updated.embeddingStatus,
              verified: updated.verified,
            };
          })
        );
      } catch (err) {
        // Silent — polling failures shouldn't disrupt the UI
        console.warn('[OCR Poll]', err.message);
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [documents, caseId]);


  // ── Update status ────────────────────────────────────────────────────────────
  const handleStatusUpdate = async () => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`${API}/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCaseData((prev) => ({ ...prev, status: newStatus }));
        setStatusEditing(false);
      }
    } catch (err) {
      console.error('Status update error:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  // ── Add hearing ──────────────────────────────────────────────────────────────
  const handleAddHearing = async () => {
    if (!hearingForm.notes) return;
    setHearingSubmitting(true);
    try {
      const hearingEntry = {
        hearings: [
          ...(caseData.hearings || []),
          {
            date: new Date(),
            notes: hearingForm.notes,
            nextDate: hearingForm.nextDate || undefined,
          },
        ],
        ...(hearingForm.nextDate ? { nextHearingDate: hearingForm.nextDate } : {}),
      };
      const res = await fetch(`${API}/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(hearingEntry),
      });
      const data = await res.json();
      if (data.success) {
        setCaseData(data.data);
        setHearingForm({ open: false, notes: '', nextDate: '' });
      }
    } catch (err) {
      console.error('Hearing add error:', err);
    } finally {
      setHearingSubmitting(false);
    }
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-slate-700/30 rounded-xl animate-pulse" />
        <div className="h-4 w-48 bg-slate-700/20 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-700/20 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-700/20 rounded-2xl animate-pulse mt-4" />
      </div>
    );
  }

  if (!caseData) return null;

  const statusLabel = caseData.status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const statusCls = STATUS_COLORS[caseData.status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
        <span>/</span>
        <Link href="/cases" className="hover:text-slate-300 transition-colors">Cases</Link>
        <span>/</span>
        <span className="text-slate-300 font-mono">{caseData.caseNumber}</span>
      </div>

      {/* Case header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-white text-2xl font-bold font-mono">{caseData.caseNumber}</h1>
            <span className={`text-sm px-3 py-1 rounded-xl border ${statusCls}`}>{statusLabel}</span>
            <span className="text-slate-500 text-sm">{caseData.caseType?.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-slate-300 text-base mb-1">{caseData.subject}</p>
          <p className="text-slate-500 text-sm">
            {caseData.partyA?.name} <span className="text-slate-600">vs</span> {caseData.partyB?.name}
            {caseData.district && <span className="ml-3">· {caseData.district}</span>}
          </p>
        </div>

        {/* Status editor (peshkar/admin only) */}
        {hasRole('admin', 'peshkar') && (
          <div className="flex-shrink-0">
            {statusEditing ? (
              <div className="flex items-center gap-2">
                <select
                  id="status-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  id="status-save-btn"
                  onClick={handleStatusUpdate}
                  disabled={statusUpdating}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {statusUpdating ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => { setStatusEditing(false); setNewStatus(caseData.status); }}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                id="edit-status-btn"
                onClick={() => setStatusEditing(true)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 rounded-xl text-sm transition-colors"
              >
                ✏️ Edit Status
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className="opacity-50 text-xs hidden md:inline">/ {tab.labelHindi}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Parties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PartyCard party={caseData.partyA} label="Party A — Petitioner" labelHindi="वादी" color="amber" />
            <PartyCard party={caseData.partyB} label="Party B — Respondent" labelHindi="प्रतिवादी" color="blue" />
          </div>

          {/* Case meta */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Case Details / वाद विवरण</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MetaRow label="Case Number" value={caseData.caseNumber} />
              <MetaRow label="Year" value={caseData.year} />
              <MetaRow label="Case Type" value={caseData.caseType?.replace(/_/g, ' ')} />
              <MetaRow label="District" value={caseData.district} />
              <MetaRow label="Police Station" value={caseData.policeStation} />
              <MetaRow label="Filed Date" value={caseData.filedDate ? new Date(caseData.filedDate).toLocaleDateString('en-IN') : '—'} />
              <MetaRow label="Next Hearing" value={caseData.nextHearingDate ? new Date(caseData.nextHearingDate).toLocaleDateString('en-IN') : '—'} />
              <MetaRow label="AI Analysis" value={caseData.aiAnalysisStatus?.replace(/_/g, ' ')} />
              <MetaRow label="Peshkar" value={caseData.peshkar?.name} />
              <MetaRow label="DM" value={caseData.dm?.name} />
            </div>
            {caseData.notes && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-slate-500 text-xs mb-1">Notes</p>
                <p className="text-slate-300 text-sm">{caseData.notes}</p>
              </div>
            )}
          </div>

          {/* Hearing log */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Hearing Log / पेशी लॉग</h3>
              {hasRole('admin', 'peshkar') && (
                <button
                  id="add-hearing-btn"
                  onClick={() => setHearingForm({ open: !hearingForm.open, notes: '', nextDate: '' })}
                  className="text-xs px-3 py-1.5 bg-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-600/30 rounded-xl transition-colors"
                >
                  + Add Hearing
                </button>
              )}
            </div>

            {/* Add hearing form */}
            {hearingForm.open && (
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-4 space-y-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Hearing Notes / नोट</label>
                  <textarea
                    id="hearing-notes"
                    rows={3}
                    placeholder="Notes from today's hearing..."
                    value={hearingForm.notes}
                    onChange={(e) => setHearingForm({ ...hearingForm, notes: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Next Hearing Date / अगली तारीख</label>
                  <input
                    id="next-hearing-date"
                    type="date"
                    value={hearingForm.nextDate}
                    onChange={(e) => setHearingForm({ ...hearingForm, nextDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHearingForm({ open: false, notes: '', nextDate: '' })}
                    className="px-4 py-2 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-hearing-btn"
                    onClick={handleAddHearing}
                    disabled={hearingSubmitting || !hearingForm.notes}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs transition-colors disabled:opacity-50"
                  >
                    {hearingSubmitting ? 'Saving…' : 'Save Hearing'}
                  </button>
                </div>
              </div>
            )}

            {/* Hearing history */}
            {!caseData.hearings?.length ? (
              <p className="text-slate-500 text-sm text-center py-4">No hearings recorded yet</p>
            ) : (
              <div className="space-y-2">
                {[...caseData.hearings].reverse().map((h, i) => (
                  <div key={i} className="flex gap-4 p-3 bg-slate-900/30 border border-slate-700/30 rounded-xl">
                    <div className="flex-shrink-0 text-center w-14">
                      <p className="text-amber-400 text-xs font-bold">
                        {h.date ? new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-200 text-sm">{h.notes}</p>
                      {h.nextDate && (
                        <p className="text-slate-500 text-xs mt-1">
                          Next: {new Date(h.nextDate).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rule checks */}
          <RuleCheckPanel caseId={caseId} />
        </div>
      )}

      {/* ── TAB: DOCUMENTS ──────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-semibold">Documents / दस्तावेज़</h2>
              <p className="text-slate-500 text-sm mt-0.5">
                {documents.length} file{documents.length !== 1 ? 's' : ''} uploaded
                {documents.some((d) => d.ocrStatus === 'pending' || d.ocrStatus === 'processing') && (
                  <span className="ml-2 text-amber-400 text-xs animate-pulse">· OCR processing…</span>
                )}
              </p>
            </div>
          </div>

          {docsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-700/20 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Petition type summary bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <span className="text-amber-400 text-lg">📋</span>
                  <div>
                    <p className="text-amber-300 text-xs font-semibold">अपीलकर्त्ता / Appellant</p>
                    <p className="text-slate-500 text-[11px]">Petition &amp; supporting evidence</p>
                  </div>
                  <span className="ml-auto text-amber-400 font-bold text-sm">{documents.filter(d => d.party === 'A').length}</span>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <span className="text-blue-400 text-lg">📋</span>
                  <div>
                    <p className="text-blue-300 text-xs font-semibold">प्रतिवादी / Respondent</p>
                    <p className="text-slate-500 text-[11px]">Counter-reply &amp; evidence</p>
                  </div>
                  <span className="ml-auto text-blue-400 font-bold text-sm">{documents.filter(d => d.party === 'B').length}</span>
                </div>
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <span className="text-purple-400 text-lg">🏛️</span>
                  <div>
                    <p className="text-purple-300 text-xs font-semibold">न्यायालय अभिलेख</p>
                    <p className="text-slate-500 text-[11px]">Notices, CO reports, records</p>
                  </div>
                  <span className="ml-auto text-purple-400 font-bold text-sm">{documents.filter(d => d.party === 'court').length}</span>
                </div>
              </div>

              {/* Document columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DocumentColumn
                  title="अर्जी / Petition" titleHindi="अपीलकर्त्ता पक्ष"
                  party="A" partyColor="amber"
                  documents={documents}
                  onUpload={(p) => setUploadModal({ open: true, party: p })}
                  onView={(doc) => setViewerModal({ open: true, doc })}
                />
                <DocumentColumn
                  title="प्रतिउत्तर / Counter" titleHindi="प्रतिवादी पक्ष"
                  party="B" partyColor="blue"
                  documents={documents}
                  onUpload={(p) => setUploadModal({ open: true, party: p })}
                  onView={(doc) => setViewerModal({ open: true, doc })}
                />
                <DocumentColumn
                  title="न्यायालय अभिलेख" titleHindi="Court Records"
                  party="court" partyColor="purple"
                  documents={documents}
                  onUpload={(p) => setUploadModal({ open: true, party: p })}
                  onView={(doc) => setViewerModal({ open: true, doc })}
                />
              </div>
            </div>
          )}
        </div>
      )}


      {/* ── TAB: AI ANALYSIS ────────────────────────────────────────────────── */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {/* Top Banner & Control */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-white font-semibold text-base">AI Legal Analysis / AI कानूनी विश्लेषण</h2>
                <span className="text-xs px-2 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/30">
                  Advisory Only
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                Extracts facts, frames legal issues, and links applicable Bihar & Central Acts.
              </p>
            </div>

            {hasRole('admin', 'peshkar') && (
              <button
                id="run-analysis-btn"
                onClick={handleRunAnalysis}
                disabled={runningAnalysis || analysisData.status === 'processing'}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 text-sm flex items-center gap-2 shadow-lg shadow-amber-900/30 flex-shrink-0"
              >
                {runningAnalysis || analysisData.status === 'processing' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Documents...</span>
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    <span>{analysisData.status === 'completed' ? 'Re-run AI Analysis' : 'Run AI Analysis'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* AI Advisory Warning Box */}
          <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex items-start gap-3">
            <span className="text-amber-400 text-xl flex-shrink-0">⚠️</span>
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <p className="font-semibold text-amber-300 mb-0.5">Mandatory Judicial Protocol (Rule 4)</p>
              AI outputs are advisory drafts intended to assist court staff. The District Magistrate retains sole decision-making authority. Every claim must cite specific Evidence IDs and Act Sections.
            </div>
          </div>

          {/* Processing State */}
          {(analysisData.status === 'processing' || caseData?.aiAnalysisStatus === 'processing') && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="text-white font-medium text-base">AI Engine is Processing Case Documents</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Extracting evidence, running RAG legal section retrieval, and framing issues...
                </p>
              </div>
            </div>
          )}

          {/* Not Started State */}
          {analysisData.status === 'not_started' && caseData?.aiAnalysisStatus !== 'processing' && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <span className="text-4xl block">📊</span>
              <div>
                <h3 className="text-white font-medium text-base">No Analysis Generated Yet</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Click "Run AI Analysis" above to process uploaded documents and extract legal evidence.
                </p>
              </div>
            </div>
          )}

          {/* Completed Analysis Content */}
          {analysisData.status === 'completed' && (
            <div className="space-y-6">
              {/* Summaries of Party Submissions */}
              {analysisData.analysisResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/40 border border-amber-500/20 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                      <h3 className="text-amber-300 font-semibold text-sm">Party A Submissions / वादी पक्ष</h3>
                      <span className="text-slate-500 text-xs">AI Generated</span>
                    </div>
                    <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {analysisData.analysisResult.summaryA}
                    </div>
                  </div>

                  <div className="bg-slate-800/40 border border-blue-500/20 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                      <h3 className="text-blue-300 font-semibold text-sm">Party B Submissions / प्रतिवादी पक्ष</h3>
                      <span className="text-slate-500 text-xs">AI Generated</span>
                    </div>
                    <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {analysisData.analysisResult.summaryB}
                    </div>
                  </div>
                </div>
              )}

              {/* Framed Legal Issues & RAG Sections */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm">Framed Legal Issues & Applicable Laws</h3>
                  <span className="text-slate-500 text-xs">
                    {analysisData.issues.length} Issues Framed
                  </span>
                </div>

                {analysisData.issues.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">No issues framed.</p>
                ) : (
                  <div className="space-y-4">
                    {analysisData.issues.map((issue) => (
                      <div
                        key={issue._id}
                        className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-bold">
                            Issue #{issue.issueNumber}
                          </span>
                          <div className="flex-1">
                            <h4 className="text-white font-medium text-sm leading-snug">
                              {issue.issueText}
                            </h4>
                            {issue.aiAnalysis && (
                              <p className="text-slate-300 text-xs mt-2 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <span className="text-amber-400 font-medium">Factual Analysis: </span>
                                {issue.aiAnalysis}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* RAG Applicable Sections */}
                        {issue.applicableSections?.length > 0 && (
                          <div className="pt-2 border-t border-slate-800">
                            <p className="text-slate-400 text-xs font-semibold mb-2">
                              Applicable Legal Sections (Retrieved via RAG):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {issue.applicableSections.map((sec) => (
                                <div
                                  key={sec._id || sec}
                                  className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs flex items-center gap-2"
                                >
                                  <span className="text-amber-400 font-mono font-bold">
                                    § {sec.sectionNumber}
                                  </span>
                                  <span className="text-slate-200">
                                    {sec.sectionTitle || 'Section'}
                                  </span>
                                  {sec.actId?.actName && (
                                    <span className="text-slate-500 text-[11px]">
                                      ({sec.actId.actName})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extracted Evidence List */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-sm">
                      Extracted Evidence Items / साक्ष्य सूची
                    </h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Peshkar verification progress:{' '}
                      <span className="text-green-400 font-medium">
                        {analysisData.evidence.filter((e) => e.verifiedByPeshkar).length}
                      </span>{' '}
                      / {analysisData.evidence.length} items verified
                    </p>
                  </div>
                </div>

                {analysisData.evidence.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-6">
                    No evidence items extracted.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analysisData.evidence.map((ev) => (
                      <EvidenceCard
                        key={ev._id}
                        evidence={ev}
                        onVerify={handleVerifyEvidence}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}


      {/* ── TAB: DRAFT ORDER ────────────────────────────────────────────────── */}
      {activeTab === 'order' && (
        <OrderEditor
          caseId={caseId}
          caseData={caseData}
          onStatusChange={(st) => setCaseData((prev) => ({ ...prev, status: st }))}
        />
      )}


      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      <DocumentUploadModal
        isOpen={uploadModal.open}
        onClose={() => setUploadModal({ open: false, party: 'A' })}
        caseId={caseId}
        party={uploadModal.party}
        onSuccess={(newDoc) => {
          setDocuments((prev) => [newDoc, ...prev]);
          setActiveTab('documents');
        }}
      />

      <FileViewerModal
        isOpen={viewerModal.open}
        onClose={() => setViewerModal({ open: false, doc: null })}
        document={viewerModal.doc}
        onVerify={(updatedDoc) => {
          setDocuments((prev) =>
            prev.map((d) => (d._id === updatedDoc._id ? updatedDoc : d))
          );
          setViewerModal({ open: false, doc: null });
        }}
        onRetryOCR={() => {
          fetchDocuments();
          setViewerModal({ open: false, doc: null });
        }}
      />
    </div>
  );
}
