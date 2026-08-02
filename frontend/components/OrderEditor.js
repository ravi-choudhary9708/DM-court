'use client';

import { useState, useEffect } from 'react';
import { ordersAPI } from '@/lib/api';
import { hasRole, getUser } from '@/lib/auth';

const ORDER_SECTIONS = [
  { key: 'background', label: '1. Factual Background', labelHindi: 'मामला का इतिहास' },
  { key: 'partyASubmissions', label: '2. Submissions of Party A (Petitioner)', labelHindi: 'वादी का पक्ष' },
  { key: 'partyBSubmissions', label: '3. Submissions of Party B (Respondent)', labelHindi: 'प्रतिवादी का पक्ष' },
  { key: 'documentsConsidered', label: '4. Documents & Evidence Examined', labelHindi: 'विचारित दस्तावेज़ एवं साक्ष्य' },
  { key: 'applicableProvisions', label: '5. Applicable Laws & Provisions', labelHindi: 'लागू कानून एवं धाराएं' },
  { key: 'issuesForDetermination', label: '6. Issues for Determination', labelHindi: 'अवधार्य प्रश्न' },
  { key: 'analysisAndFindings', label: '7. Judicial Analysis & Findings', labelHindi: 'न्यायिक विश्लेषण एवं निष्कर्ष' },
  { key: 'decision', label: '8. Final Decision / Finding', labelHindi: 'अंतिम निर्णय' },
  { key: 'directions', label: '9. Directions & Operational Orders', labelHindi: 'आदेश एवं निर्देश' },
];

const STATUS_BADGES = {
  draft: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  peshkar_review: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  dm_review: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  approved: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function OrderEditor({ caseId, caseData, onStatusChange }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingHindi, setGeneratingHindi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  // 'edit' | 'print' (English official) | 'hindi' (Hindi official)
  const [viewMode, setViewMode] = useState('edit');

  const user = getUser();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.list(caseId);
      if (res.success) {
        setOrders(res.data);
        if (res.data.length > 0) {
          const latest = res.data[0];
          setSelectedOrder(latest);
          setContent(latest.content || {});
        }
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [caseId]);

  const handleSelectVersion = (ord) => {
    setSelectedOrder(ord);
    setContent(ord.content || {});
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await ordersAPI.generate(caseId);
      if (res.success) {
        await fetchOrders();
        setViewMode('edit');
      }
    } catch (err) {
      alert(err.message || 'Failed to generate order');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateHindi = async () => {
    setGeneratingHindi(true);
    try {
      const res = await ordersAPI.generateHindi(caseId);
      if (res.success) {
        // Update the selected order with Hindi content
        setSelectedOrder(res.data);
        setContent(res.data.content || {});
        await fetchOrders();
        setViewMode('hindi'); // Auto-switch to Hindi view after generation
      }
    } catch (err) {
      alert(err.message || 'Hindi order generation failed');
    } finally {
      setGeneratingHindi(false);
    }
  };

  const handleSectionChange = (key, val) => {
    setContent((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveEdits = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await ordersAPI.update(selectedOrder._id, { content });
      if (res.success) {
        setSelectedOrder(res.data);
        alert('Order section edits saved.');
      }
    } catch (err) {
      alert(err.message || 'Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToDM = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await ordersAPI.submit(selectedOrder._id, { content });
      if (res.success) {
        setSelectedOrder(res.data);
        fetchOrders();
        alert('Order submitted for District Magistrate review!');
      }
    } catch (err) {
      alert(err.message || 'Failed to submit order');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAndSign = async () => {
    if (!selectedOrder) return;
    if (!confirm('Are you sure you want to APPROVE and digitally SIGN this Court Order? This will set case status to DECIDED.')) return;
    setSaving(true);
    try {
      const res = await ordersAPI.approve(selectedOrder._id, {
        decision: content.decision,
        directions: content.directions,
      });
      if (res.success) {
        setSelectedOrder(res.data);
        fetchOrders();
        onStatusChange && onStatusChange('decided');
        alert('Court Order officially APPROVED and SIGNED!');
      }
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder || !rejectionReason.trim()) return;
    setSaving(true);
    try {
      const res = await ordersAPI.reject(selectedOrder._id, { rejectionReason });
      if (res.success) {
        setSelectedOrder(res.data);
        setShowRejectModal(false);
        setRejectionReason('');
        fetchOrders();
        alert('Order returned for revision.');
      }
    } catch (err) {
      alert(err.message || 'Rejection failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-xs">Loading Court Order workspace...</p>
      </div>
    );
  }

  const isApproved = selectedOrder?.status === 'approved';
  const statusBadge = STATUS_BADGES[selectedOrder?.status] || STATUS_BADGES.draft;
  const hasHindi = Boolean(selectedOrder?.hindiContent);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h2 className="text-white font-semibold text-base">Court Order Workbench / न्यायालय आदेश</h2>
            {selectedOrder && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statusBadge} font-mono uppercase font-bold`}>
                {selectedOrder.status.replace('_', ' ')} (v{selectedOrder.version})
              </span>
            )}
            {selectedOrder?.orderLanguage === 'bilingual' && (
              <span className="text-xs px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-300 border-orange-500/30">
                🇮🇳 Hindi + English
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs">
            Generate English structured draft or authentic Hindi court order (न्यायालय समाहर्त्ता format).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode switcher */}
          {orders.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'edit' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ✏️ Edit Draft
              </button>
              <button
                onClick={() => setViewMode('print')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'print' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                📄 English Order
              </button>
              <button
                onClick={() => setViewMode('hindi')}
                disabled={!hasHindi}
                title={!hasHindi ? 'Generate Hindi order first' : 'Hindi Official View'}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'hindi'
                    ? 'bg-orange-700/40 text-orange-200'
                    : hasHindi
                    ? 'text-orange-300 hover:text-orange-200 hover:bg-orange-900/20'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                🏛️ हिंदी आदेश
              </button>
            </div>
          )}

          {/* English generate */}
          {hasRole('admin', 'peshkar') && (
            <button
              id="generate-new-order-btn"
              onClick={handleGenerate}
              disabled={generating || generatingHindi}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-900/20"
            >
              {generating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Drafting...</span>
                </>
              ) : (
                <>
                  <span>✍️</span>
                  <span>{orders.length > 0 ? 'New English Draft' : 'Generate English Draft'}</span>
                </>
              )}
            </button>
          )}

          {/* Hindi generate */}
          {hasRole('admin', 'peshkar') && (
            <button
              id="generate-hindi-order-btn"
              onClick={handleGenerateHindi}
              disabled={generating || generatingHindi}
              className="px-4 py-2 bg-gradient-to-r from-orange-700 to-red-700 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-red-900/20"
            >
              {generatingHindi ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>हिंदी आदेश...</span>
                </>
              ) : (
                <>
                  <span>🏛️</span>
                  <span>{hasHindi ? 'पुनः हिंदी आदेश' : 'हिंदी आदेश बनाएं'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Version Selector */}
      {orders.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-slate-500 text-xs font-semibold mr-1">Versions:</span>
          {orders.map((ord) => (
            <button
              key={ord._id}
              onClick={() => handleSelectVersion(ord)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 flex-shrink-0 ${
                selectedOrder?._id === ord._id
                  ? 'bg-amber-600/20 border-amber-500/50 text-amber-300 font-bold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <span>v{ord.version}</span>
              <span className="opacity-60">({ord.status})</span>
              {ord.hindiContent && <span className="text-orange-400" title="Hindi order available">🏛️</span>}
            </button>
          ))}
        </div>
      )}

      {/* Rejection Notice Banner */}
      {selectedOrder?.status === 'rejected' && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-xl flex-shrink-0">⛔</span>
          <div>
            <p className="text-red-300 font-semibold text-xs mb-1">Order Rejected by District Magistrate</p>
            <p className="text-slate-300 text-xs leading-relaxed italic">"{selectedOrder.rejectionReason}"</p>
            <p className="text-slate-500 text-[11px] mt-1">Please revise the sections below and re-submit.</p>
          </div>
        </div>
      )}

      {!selectedOrder ? (
        /* ── EMPTY STATE ── */
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-5">
          <span className="text-5xl block">⚖️</span>
          <div>
            <h3 className="text-white font-medium text-base">No Draft Order Generated</h3>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Generate an <span className="text-amber-300">English structured draft</span> (9 sections, editable) or an authentic{' '}
              <span className="text-orange-300">Hindi court order</span> in the real{' '}
              <span className="font-semibold">न्यायालय समाहर्त्ता</span> format used by Bihar DM courts.
            </p>
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            {hasRole('admin', 'peshkar') && (
              <>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  ✍️ Generate English Draft
                </button>
                <button
                  onClick={handleGenerateHindi}
                  disabled={generatingHindi}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-700 to-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  🏛️ हिंदी आदेश बनाएं
                </button>
              </>
            )}
          </div>
        </div>
      ) : viewMode === 'hindi' ? (
        /* ── HINDI OFFICIAL COURT ORDER VIEW ── */
        <div>
          {/* AI Label & Print Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-lg border bg-orange-500/10 text-orange-300 border-orange-500/30 flex items-center gap-1.5">
                🤖 AI-Generated Hindi Draft
              </span>
              {selectedOrder.hindiGeneratedAt && (
                <span className="text-slate-500 text-xs">
                  Generated: {new Date(selectedOrder.hindiGeneratedAt).toLocaleString('hi-IN')}
                </span>
              )}
            </div>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              🖨️ Print
            </button>
          </div>

          {/* AI Advisory */}
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-2.5 mb-4 flex items-start gap-2">
            <span className="text-amber-400 text-sm flex-shrink-0">⚠️</span>
            <p className="text-amber-200/80 text-xs leading-relaxed">
              <span className="font-semibold text-amber-300">AI-प्रारूप आदेश:</span> यह आदेश AI (Gemini 2.0 Flash) द्वारा तैयार किया गया है।
              जिला पदाधिकारी की समीक्षा और हस्ताक्षर के बाद ही यह आदेश विधिक रूप से प्रभावी होगा।
              All judicial decisions remain with the District Magistrate.
            </p>
          </div>

          {/* Actual Hindi Court Order */}
          <div
            id="hindi-print-area"
            className="bg-white text-slate-900 rounded-2xl p-10 max-w-4xl mx-auto shadow-2xl"
            style={{ fontFamily: "'Noto Sans Devanagari', 'Mangal', serif", lineHeight: '1.8' }}
          >
            {/* Order content rendered as formal Hindi prose */}
            <pre
              className="whitespace-pre-wrap text-sm leading-loose text-justify"
              style={{ fontFamily: 'inherit' }}
            >
              {selectedOrder.hindiContent}
            </pre>

            {/* Draft watermark for non-approved */}
            {!isApproved && (
              <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-xs text-slate-400">
                <span>NyayaSahayak Ref: {selectedOrder._id}</span>
                <span className="text-amber-600 font-bold uppercase tracking-wider">प्रारूप — अनुमोदन हेतु लंबित</span>
              </div>
            )}
            {isApproved && (
              <div className="mt-8 pt-4 border-t-2 border-slate-900">
                <p className="text-green-700 font-bold text-sm">✓ अनुमोदित एवं हस्ताक्षरित — {new Date(selectedOrder.finalOrderDate).toLocaleDateString('hi-IN')}</p>
                <p className="text-slate-700 font-semibold">{selectedOrder.orderSignedBy?.name || 'जिला पदाधिकारी'}</p>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'print' ? (
        /* ── ENGLISH OFFICIAL COURT ORDER PRINT VIEW ── */
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              🖨️ Print
            </button>
          </div>
          <div className="bg-white text-slate-900 rounded-2xl p-8 max-w-4xl mx-auto shadow-2xl space-y-6 font-serif">
            {/* Header Seal */}
            <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
              <div className="text-3xl">🏛️</div>
              <h1 className="text-xl font-bold uppercase tracking-wide">In the Court of the District Magistrate</h1>
              <p className="text-sm font-semibold uppercase">{caseData?.district || 'Bihar'}, State of Bihar</p>
              <p className="text-xs text-slate-600 font-sans mt-2">Case No: <span className="font-bold">{caseData?.caseNumber}</span> / Year: {caseData?.year}</p>
            </div>

            {/* Cause Title */}
            <div className="grid grid-cols-5 text-sm py-2 bg-slate-50 p-4 rounded border border-slate-300 font-sans">
              <div className="col-span-2">
                <p className="font-bold">{caseData?.partyA?.name}</p>
                <p className="text-xs text-slate-600">Petitioner / Applicant (वादी)</p>
              </div>
              <div className="col-span-1 text-center font-bold self-center text-slate-500">VERSUS</div>
              <div className="col-span-2 text-right">
                <p className="font-bold">{caseData?.partyB?.name}</p>
                <p className="text-xs text-slate-600">Respondent / Opposite Party (प्रतिवादी)</p>
              </div>
            </div>

            {/* Order Content Sections */}
            <div className="space-y-5 text-sm leading-relaxed text-justify">
              {ORDER_SECTIONS.map((sec) =>
                content[sec.key] ? (
                  <div key={sec.key} className="space-y-1">
                    <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider border-b border-slate-200 pb-1">
                      {sec.label}
                    </h3>
                    <p className="whitespace-pre-wrap text-slate-800 font-sans text-xs leading-relaxed">
                      {content[sec.key]}
                    </p>
                  </div>
                ) : null
              )}
            </div>

            {/* Digital Signature / Seal Block */}
            <div className="pt-8 border-t-2 border-slate-900 flex items-end justify-between font-sans text-xs">
              <div>
                <p className="text-slate-500">Order Version: v{selectedOrder.version}</p>
                <p className="text-slate-500">Date: {selectedOrder.finalOrderDate ? new Date(selectedOrder.finalOrderDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</p>
                <div className="mt-2 text-[10px] text-slate-400">
                  NyayaSahayak Audit Hash: {selectedOrder._id}
                </div>
              </div>

              <div className="text-center border-2 border-slate-900 p-4 rounded-lg bg-slate-50 min-w-[220px]">
                {isApproved ? (
                  <>
                    <div className="text-green-600 font-bold text-base mb-1">✓ OFFICIALLY SIGNED</div>
                    <p className="font-bold text-slate-900">{selectedOrder.orderSignedBy?.name || 'District Magistrate'}</p>
                    <p className="text-slate-600 text-[11px]">District Magistrate & Collector</p>
                    <p className="text-slate-500 text-[10px] mt-1">{new Date(selectedOrder.finalOrderDate).toLocaleString('en-IN')}</p>
                  </>
                ) : (
                  <>
                    <div className="text-amber-600 font-bold text-sm mb-1">DRAFT ORDER</div>
                    <p className="text-slate-500 text-[11px]">Pending DM Review & Approval</p>
                    <p className="text-slate-400 text-[10px] italic">Not legally binding until signed</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── EDITABLE DRAFT ORDER SECTIONS ── */
        <div className="space-y-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-6">
            {ORDER_SECTIONS.map((sec) => (
              <div key={sec.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-amber-300 font-medium text-xs uppercase tracking-wider">
                    {sec.label} <span className="text-slate-500 lowercase font-normal">/ {sec.labelHindi}</span>
                  </label>
                </div>
                <textarea
                  value={content[sec.key] || ''}
                  onChange={(e) => handleSectionChange(sec.key, e.target.value)}
                  disabled={isApproved}
                  rows={4}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60 resize-y font-sans leading-relaxed"
                />
              </div>
            ))}
          </div>

          {/* Workflow Bottom Actions */}
          {!isApproved && (
            <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdits}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl text-xs transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : '💾 Save Draft Changes'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Peshkar submit button */}
                {hasRole('admin', 'peshkar') && selectedOrder.status !== 'dm_review' && (
                  <button
                    onClick={handleSubmitToDM}
                    disabled={saving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-blue-900/30 disabled:opacity-50"
                  >
                    📤 Submit for DM Review
                  </button>
                )}

                {/* DM actions */}
                {hasRole('admin', 'dm') && (
                  <>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={saving}
                      className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      ⛔ Reject / Return
                    </button>
                    <button
                      onClick={handleApproveAndSign}
                      disabled={saving}
                      className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-green-900/30 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>✍️</span>
                      <span>Approve & Sign Court Order</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-semibold text-base">Return Order for Revision</h3>
            <p className="text-slate-400 text-xs">Specify what changes or additional inquiries are required by court staff.</p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Please clarify land survey boundary report from CO before final order..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={saving || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Return Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
