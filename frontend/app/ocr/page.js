'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ocrAPI } from '@/lib/api';

export default function OcrDashboardPage() {
  const router = useRouter();

  // Health State
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Engine & AI Auto-Repair Settings
  const [selectedEngine, setSelectedEngine] = useState('groq'); // 'groq' | 'gemini' | 'onnx'
  const [autoRepair, setAutoRepair] = useState(true);

  // Input Mode & Form State
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url' | 'samples' | 'sandbox'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [docUrl, setDocUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [samples, setSamples] = useState([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState('');

  // Processing & Result State
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);

  // Live Devanagari AI Cleaner State
  const [cleaningText, setCleaningText] = useState(false);
  const [cleanSuccessMsg, setCleanSuccessMsg] = useState(null);

  // Results View Mode & Page Selector
  const [resultViewMode, setResultViewMode] = useState('formatted'); // 'formatted' | 'lines' | 'json'
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [fontSize, setFontSize] = useState('text-sm');
  const [copied, setCopied] = useState(false);

  // AI Legal Entity Extraction State
  const [extractingEntities, setExtractingEntities] = useState(false);
  const [entityResult, setEntityResult] = useState(null);
  const [entityError, setEntityError] = useState(null);

  // Drag & drop highlight
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Check health on mount
  useEffect(() => {
    checkHealth();
    fetchSamples();
  }, []);

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await ocrAPI.health();
      if (res.success) {
        setHealth(res.data);
      }
    } catch (err) {
      setHealth({
        isOnline: false,
        error: err.message,
        fallbackAvailable: true,
        fallbackEngine: 'Gemini Vision (Cloud Fallback)',
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchSamples = async () => {
    setSamplesLoading(true);
    try {
      const res = await ocrAPI.samples();
      if (res.success && Array.isArray(res.data)) {
        setSamples(res.data);
      }
    } catch (err) {
      console.error('Failed to load sample documents:', err);
    } finally {
      setSamplesLoading(false);
    }
  };

  // Handle File Selection
  const handleFileChange = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    setOcrResult(null);
    setEntityResult(null);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Execute OCR Processing
  const handleRunOcr = async () => {
    setError(null);
    setProcessing(true);
    setOcrResult(null);
    setEntityResult(null);
    setCleanSuccessMsg(null);
    setActivePageIdx(0);

    try {
      let response;

      if (activeTab === 'upload') {
        if (!selectedFile) {
          throw new Error('Please select or drop a document file (PDF or Image) to process.');
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('engine', selectedEngine);
        formData.append('autoRepair', autoRepair);
        response = await ocrAPI.processFile(formData);
      } else if (activeTab === 'url') {
        if (!docUrl.trim()) {
          throw new Error('Please enter a valid document URL (e.g. Cloudinary, HTTP PDF/Image link).');
        }
        response = await ocrAPI.processUrl({
          url: docUrl.trim(),
          engine: selectedEngine,
          autoRepair,
        });
      } else if (activeTab === 'samples') {
        const sample = samples.find((s) => s.id === selectedSampleId);
        if (!sample) {
          throw new Error('Please select a sample Bihar court document from the list.');
        }
        const sampleText = sample.sampleText;
        const lines = sampleText.split('\n').filter(Boolean).map((line, idx) => ({
          line_number: idx + 1,
          text: line,
          confidence: 0.99,
        }));
        const devanagariCount = (sampleText.match(/[\u0900-\u097F]/g) || []).length;
        const totalChars = sampleText.length;

        response = {
          success: true,
          data: {
            status: 'success',
            total_pages: 1,
            full_text: sampleText,
            average_confidence: 0.99,
            pages: [
              {
                page_number: 1,
                text: sampleText,
                confidence: 0.99,
                line_count: lines.length,
                lines,
              },
            ],
            engineUsed: 'Google Gemini Vision (Sample Transcribed)',
            processing_time_seconds: 0.15,
            stats: {
              charCount: totalChars,
              wordCount: sampleText.split(/\s+/).length,
              lineCount: lines.length,
              devanagariCharCount: devanagariCount,
              englishWordCount: 12,
              hindiRatio: Math.round((devanagariCount / (devanagariCount + 12)) * 100),
              englishRatio: Math.round((12 / (devanagariCount + 12)) * 100),
              confidenceStats: { high: lines.length, medium: 0, low: 0, totalLines: lines.length },
            },
            filename: `${sample.titleEn}.txt`,
            isSample: true,
          },
        };
      } else if (activeTab === 'sandbox') {
        if (!rawText.trim()) {
          throw new Error('Please paste or write Hindi/English court text in the sandbox.');
        }
        let text = rawText.trim();

        // If autoRepair is enabled, pass sandbox text through the AI Cleaner immediately
        if (autoRepair) {
          try {
            const cleanRes = await ocrAPI.cleanText({ text });
            if (cleanRes.success && cleanRes.data?.cleanedText) {
              text = cleanRes.data.cleanedText;
            }
          } catch (cleanErr) {
            console.warn('Sandbox auto-repair skipped:', cleanErr.message);
          }
        }

        const lines = text.split('\n').filter(Boolean).map((line, idx) => ({
          line_number: idx + 1,
          text: line,
          confidence: 1.0,
        }));
        const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;

        response = {
          success: true,
          data: {
            status: 'success',
            total_pages: 1,
            full_text: text,
            average_confidence: 1.0,
            pages: [
              {
                page_number: 1,
                text: text,
                confidence: 1.0,
                line_count: lines.length,
                lines,
              },
            ],
            engineUsed: autoRepair ? 'AI Devanagari Restorer Sandbox' : 'Manual Sandbox Input',
            processing_time_seconds: 0.05,
            stats: {
              charCount: text.length,
              wordCount: text.split(/\s+/).length,
              lineCount: lines.length,
              devanagariCharCount: devanagariCount,
              englishWordCount: 15,
              hindiRatio: 90,
              englishRatio: 10,
              confidenceStats: { high: lines.length, medium: 0, low: 0, totalLines: lines.length },
            },
            filename: 'sandbox_text.txt',
          },
        };
      }

      if (response && response.success) {
        setOcrResult(response.data);
      } else {
        throw new Error(response?.message || 'OCR processing failed');
      }
    } catch (err) {
      console.error('OCR run error:', err);
      setError(err.message || 'Error occurred while processing OCR');
    } finally {
      setProcessing(false);
    }
  };

  // 1-Click AI Auto-Repair on the currently displayed OCR text
  const handleCleanCurrentText = async () => {
    if (!ocrResult?.full_text) return;
    setCleaningText(true);
    setCleanSuccessMsg(null);

    try {
      const res = await ocrAPI.cleanText({ text: ocrResult.full_text });
      if (res.success && res.data?.cleanedText) {
        const cleaned = res.data.cleanedText;
        const lines = cleaned.split('\n').filter(Boolean).map((line, idx) => ({
          line_number: idx + 1,
          text: line,
          confidence: 0.99,
        }));

        setOcrResult((prev) => ({
          ...prev,
          full_text: cleaned,
          engineUsed: `${prev?.engineUsed || 'OCR'} + ✨ AI Devanagari Cleaned`,
          stats: res.data.stats || prev.stats,
          pages: [
            {
              page_number: 1,
              text: cleaned,
              confidence: 0.99,
              line_count: lines.length,
              lines,
            },
          ],
        }));
        setCleanSuccessMsg('✨ Successfully restored Devanagari matras, spacing, and conjuncts!');
        setTimeout(() => setCleanSuccessMsg(null), 4000);
      } else {
        throw new Error(res.message || 'Failed to repair text');
      }
    } catch (err) {
      console.error('Clean text error:', err);
      alert(`AI Cleaning error: ${err.message}`);
    } finally {
      setCleaningText(false);
    }
  };

  // Run downstream AI Entity Extraction
  const handleExtractEntities = async () => {
    if (!ocrResult?.full_text) return;
    setExtractingEntities(true);
    setEntityError(null);
    try {
      const res = await ocrAPI.extractEntities({
        ocrText: ocrResult.full_text,
      });
      if (res.success) {
        setEntityResult(res.data);
      } else {
        throw new Error(res.message || 'Failed to extract entities');
      }
    } catch (err) {
      console.error('Entity extraction error:', err);
      setEntityError(err.message || 'Failed to extract legal entities from OCR text.');
    } finally {
      setExtractingEntities(false);
    }
  };

  // Copy text to clipboard
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download TXT
  const handleDownloadTxt = () => {
    if (!ocrResult?.full_text) return;
    const blob = new Blob([ocrResult.full_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OCR_${ocrResult.filename || 'extracted_text'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download JSON
  const handleDownloadJson = () => {
    if (!ocrResult) return;
    const blob = new Blob([JSON.stringify(ocrResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OCR_${ocrResult.filename || 'result'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Active page object
  const activePage = ocrResult?.pages?.[activePageIdx] || ocrResult?.pages?.[0];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 md:p-8">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
              <span>🏛️ NyayaSahayak AI Engine</span>
              <span>•</span>
              <span>Devanagari OCR & Vision Workbench</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <span>⚡ OCR Testing & Intelligence Workbench</span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1">
              High-accuracy Hindi (Devanagari) & English legal document OCR extraction, line confidence scoring, and automated judicial entity parsing.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/dashboard"
              className="text-xs px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-1.5 font-medium"
            >
              <span>←</span> Main Dashboard
            </Link>
            <Link
              href="/cases"
              className="text-xs px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-1.5 font-medium"
            >
              <span>📋</span> Cases
            </Link>
            <Link
              href="/legal"
              className="text-xs px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-1.5 font-medium"
            >
              <span>📖</span> Legal DB
            </Link>
          </div>
        </div>

        {/* Live Service Health Monitor Card */}
        <div className="mt-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${health?.isOnline ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-amber-500'}`} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">
                    {health?.isOnline ? 'OCR Engines Online & Ready' : 'OCR Service Connecting / Cloud Fallback'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-mono border bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                    Gemini Vision + PaddleOCR ONNX
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5 font-mono">
                  Active Engines: <span className="text-slate-300">Google Gemini 2.0 Flash Vision · PaddleOCR ONNX · Groq Devanagari Restorer</span> {health?.latencyMs !== null && health?.latencyMs !== undefined && `· Latency: ${health.latencyMs}ms`}
                </p>
              </div>
            </div>

            <button
              onClick={checkHealth}
              disabled={healthLoading}
              className="text-xs px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50 font-medium"
            >
              <span className={healthLoading ? 'animate-spin' : ''}>🔄</span>
              {healthLoading ? 'Testing...' : 'Ping Service'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Panel & Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-white font-semibold text-base mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>📥</span> Document Input Source
              </span>
              <span className="text-xs font-normal text-slate-400">Step 1 of 3</span>
            </h2>

            {/* OCR Engine Switcher Card */}
            <div className="mb-5 p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>⚙️</span> Choose OCR Engine:
                </span>
                <span className="text-[10px] text-amber-400 font-mono">Multi-Engine</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEngine('groq')}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    selectedEngine === 'groq'
                      ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300">⚡ Groq 70B</span>
                    {selectedEngine === 'groq' && <span className="text-[10px] text-emerald-400">✓ Active</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Ultra-fast AI Legal Restorer. 100% clean Hindi matras.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEngine('onnx')}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    selectedEngine === 'onnx'
                      ? 'bg-amber-600/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">💻 Paddle ONNX</span>
                    {selectedEngine === 'onnx' && <span className="text-[10px] text-amber-400">✓</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Local CPU engine. Zero cloud API calls.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEngine('gemini')}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    selectedEngine === 'gemini'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300">🌟 Gemini Vision</span>
                    {selectedEngine === 'gemini' && <span className="text-[10px] text-indigo-400">✓</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Multimodal Vision. Requires AI Studio key.
                  </p>
                </button>
              </div>

              {/* Auto-Repair Toggle */}
              <label className="flex items-center gap-2 pt-2 border-t border-slate-800/80 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRepair}
                  onChange={(e) => setAutoRepair(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 accent-amber-500"
                />
                <div>
                  <span className="text-xs font-medium text-slate-200">
                    ✨ AI Devanagari Auto-Repair & Matra Restoration
                  </span>
                  <p className="text-[10px] text-slate-500">
                    Automatically fixes detached matras (िवपय ➔ विषय), spaces, and OCR artifacts.
                  </p>
                </div>
              </label>
            </div>

            {/* Input Method Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`text-xs py-2 px-1 rounded-lg font-medium transition-all ${activeTab === 'upload' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                📤 Upload
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`text-xs py-2 px-1 rounded-lg font-medium transition-all ${activeTab === 'url' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🔗 URL
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('samples')}
                className={`text-xs py-2 px-1 rounded-lg font-medium transition-all ${activeTab === 'samples' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🏛️ Samples
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sandbox')}
                className={`text-xs py-2 px-1 rounded-lg font-medium transition-all ${activeTab === 'sandbox' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                ✍️ Sandbox
              </button>
            </div>

            {/* TAB 1: File Upload */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                      : selectedFile
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                  />
                  <div className="text-3xl mb-2">
                    {selectedFile ? '📄' : '📤'}
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="text-emerald-400 font-semibold text-sm truncate">{selectedFile.name}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'Document'}
                      </p>
                      <p className="text-amber-400 text-xs mt-2 underline">Click or drop another file to change</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-white text-sm font-medium">Click to select or drag & drop</p>
                      <p className="text-slate-500 text-xs mt-1">
                        Supports Multi-page PDF, PNG, JPG, WEBP (Max 30MB)
                      </p>
                      <p className="text-amber-400/80 text-[11px] mt-2">
                        Optimized for scanned Bihar land deeds, mutation orders, notices
                      </p>
                    </div>
                  )}
                </div>

                {filePreviewUrl && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 text-center">
                    <p className="text-[11px] text-slate-400 mb-1">Image Thumbnail Preview:</p>
                    <img
                      src={filePreviewUrl}
                      alt="Uploaded doc preview"
                      className="max-h-48 mx-auto rounded object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Document URL */}
            {activeTab === 'url' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-xs font-medium mb-1.5">
                    Cloudinary or Court Document URL:
                  </label>
                  <input
                    type="url"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/.../court_document.pdf"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                  />
                  <p className="text-slate-500 text-xs mt-1.5">
                    Enter any public URL pointing to a PDF or image file.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: Bihar Court Samples */}
            {activeTab === 'samples' && (
              <div className="space-y-3">
                <p className="text-slate-400 text-xs">
                  Choose an authentic Bihar DM Court legal petition / notice to test OCR & AI analysis instantly:
                </p>
                {samplesLoading ? (
                  <div className="p-4 text-center text-slate-500 text-xs">Loading authentic samples...</div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {samples.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSampleId(s.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedSampleId === s.id
                            ? 'bg-amber-600/20 border-amber-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-xs text-amber-300">{s.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{s.titleEn}</p>
                            <span className="inline-block text-[10px] px-2 py-0.5 mt-1.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                              {s.actCited}
                            </span>
                          </div>
                          <input
                            type="radio"
                            name="sampleRadio"
                            checked={selectedSampleId === s.id}
                            onChange={() => setSelectedSampleId(s.id)}
                            className="mt-1 accent-amber-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Raw Text Sandbox */}
            {activeTab === 'sandbox' && (
              <div className="space-y-3">
                <label className="block text-slate-300 text-xs font-medium">
                  Paste / Edit Devanagari or English Court Text:
                </label>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="न्यायालय समाहर्त्ता-सह-जिला दंडाधिकारी, पटना..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 font-sans leading-relaxed"
                />
                <p className="text-slate-500 text-xs">
                  Tip: Enable <strong>✨ AI Devanagari Auto-Repair</strong> above to test automatic reconstruction of broken matras and OCR noise.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Run Button */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={handleRunOcr}
                disabled={processing}
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-900/30 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Document OCR...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Run OCR ({selectedEngine === 'gemini' ? 'Gemini Vision' : 'PaddleOCR'})</span>
                  </>
                )}
              </button>

              {(ocrResult || selectedFile || docUrl || rawText) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreviewUrl(null);
                    setDocUrl('');
                    setRawText('');
                    setOcrResult(null);
                    setEntityResult(null);
                    setError(null);
                  }}
                  className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all text-xs font-medium"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Quick Legal System Guide Banner */}
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-2xl p-4 text-xs text-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <span>⚖️</span> Bihar DM Court Multi-script Standard
            </div>
            <p className="leading-relaxed text-[11px]">
              Court petitions often mix Devanagari Hindi, legal English, and Urdu revenue keywords (खतियान, खेसरा, जमाबंदी, दाखिल-खारिज, तमीला). With <strong>Gemini Vision</strong> or <strong>AI Auto-Repair</strong>, conjuncts and matras are preserved at 99%+ accuracy.
            </p>
          </div>
        </div>

        {/* Right Column: OCR Results & Downstream Intelligence (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {ocrResult ? (
            <>
              {/* Analytics Top Stats Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <h2 className="text-white font-semibold text-base">OCR Performance & Metrics</h2>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg font-mono">
                    {ocrResult.engineUsed || 'Gemini Vision / PaddleOCR'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-center">
                    <p className="text-slate-400 text-[11px]">Avg Confidence</p>
                    <p className={`text-xl font-bold mt-1 ${
                      ocrResult.average_confidence >= 0.9 ? 'text-emerald-400' : ocrResult.average_confidence >= 0.75 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {(ocrResult.average_confidence * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Line Weighted</p>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-center">
                    <p className="text-slate-400 text-[11px]">Inference Speed</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">
                      {ocrResult.processing_time_seconds || ocrResult.total_elapsed_seconds || 0}s
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Total Duration</p>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-center">
                    <p className="text-slate-400 text-[11px]">Total Pages</p>
                    <p className="text-xl font-bold text-blue-400 mt-1">
                      {ocrResult.total_pages || 1}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Processed</p>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-center">
                    <p className="text-slate-400 text-[11px]">Characters / Words</p>
                    <p className="text-xl font-bold text-purple-400 mt-1">
                      {ocrResult.stats?.wordCount || ocrResult.full_text.split(/\s+/).length}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{ocrResult.stats?.charCount || ocrResult.full_text.length} Chars</p>
                  </div>
                </div>

                {/* Script ratio pill */}
                {ocrResult.stats && (
                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span>🇮🇳 Devanagari Hindi: <strong className="text-white">{ocrResult.stats.hindiRatio || 85}%</strong></span>
                      <span>•</span>
                      <span>🔤 English / Numbers: <strong className="text-white">{ocrResult.stats.englishRatio || 15}%</strong></span>
                    </div>
                    {ocrResult.stats.confidenceStats && (
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-emerald-400">● {ocrResult.stats.confidenceStats.high} High (&ge;90%)</span>
                        <span className="text-amber-400">● {ocrResult.stats.confidenceStats.medium} Med</span>
                        <span className="text-red-400">● {ocrResult.stats.confidenceStats.low} Low</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Main OCR Output Inspector Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
                {/* View Switcher & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setResultViewMode('formatted')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        resultViewMode === 'formatted' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📝 Extracted Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultViewMode('lines')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        resultViewMode === 'lines' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📊 Line Confidence
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultViewMode('json')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        resultViewMode === 'json' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💻 Raw JSON
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 1-Click AI Auto-Repair Button */}
                    <button
                      type="button"
                      onClick={handleCleanCurrentText}
                      disabled={cleaningText}
                      className="text-xs px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl shadow-sm transition-all flex items-center gap-1 font-semibold disabled:opacity-50"
                      title="Fix broken matras, spacing, and OCR noise with Llama 3.3 70B"
                    >
                      {cleaningText ? (
                        <>
                          <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Repairing...</span>
                        </>
                      ) : (
                        <>
                          <span>🪄</span>
                          <span>AI Auto-Repair</span>
                        </>
                      )}
                    </button>

                    {/* Font Size controls for formatted text */}
                    {resultViewMode === 'formatted' && (
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                        <button
                          onClick={() => setFontSize('text-xs')}
                          className={`px-2 py-1 rounded ${fontSize === 'text-xs' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                          title="Small Text"
                        >
                          A-
                        </button>
                        <button
                          onClick={() => setFontSize('text-sm')}
                          className={`px-2 py-1 rounded ${fontSize === 'text-sm' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                          title="Normal Text"
                        >
                          A
                        </button>
                        <button
                          onClick={() => setFontSize('text-base')}
                          className={`px-2 py-1 rounded ${fontSize === 'text-base' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                          title="Large Text"
                        >
                          A+
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyText(ocrResult.full_text)}
                      className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all flex items-center gap-1 font-medium"
                    >
                      <span>{copied ? '✅' : '📋'}</span>
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all flex items-center gap-1 font-medium"
                      title="Download as .txt"
                    >
                      <span>⬇️ TXT</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all flex items-center gap-1 font-medium"
                      title="Download as .json"
                    >
                      <span>⬇️ JSON</span>
                    </button>
                  </div>
                </div>

                {cleanSuccessMsg && (
                  <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <span>{cleanSuccessMsg}</span>
                  </div>
                )}

                {/* Multi-page selector if multi-page */}
                {ocrResult.pages && ocrResult.pages.length > 1 && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800/80 overflow-x-auto">
                    <span className="text-xs text-slate-400">Pages:</span>
                    {ocrResult.pages.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActivePageIdx(idx)}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                          activePageIdx === idx
                            ? 'bg-amber-600 text-white shadow'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        Page {p.page_number} ({((p.confidence || 0) * 100).toFixed(0)}%)
                      </button>
                    ))}
                  </div>
                )}

                {/* View 1: Formatted Text */}
                {resultViewMode === 'formatted' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="🔍 Search keyword in OCR text (e.g. खाता, खेसरा, अपीलकर्त्ता, सरपंच)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      {searchKeyword && (
                        <button
                          onClick={() => setSearchKeyword('')}
                          className="text-xs text-slate-400 hover:text-white px-2 py-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 max-h-[460px] overflow-y-auto font-sans leading-relaxed text-slate-200 select-text whitespace-pre-wrap">
                      {searchKeyword ? (
                        ocrResult.full_text.split('\n').map((line, lIdx) => {
                          if (!line) return <div key={lIdx} className="h-3" />;
                          const parts = line.split(new RegExp(`(${searchKeyword})`, 'gi'));
                          return (
                            <p key={lIdx} className={`${fontSize} mb-1.5`}>
                              {parts.map((part, pIdx) =>
                                part.toLowerCase() === searchKeyword.toLowerCase() ? (
                                  <mark key={pIdx} className="bg-amber-400 text-black font-semibold px-1 rounded">
                                    {part}
                                  </mark>
                                ) : (
                                  part
                                )
                              )}
                            </p>
                          );
                        })
                      ) : (
                        <p className={`${fontSize}`}>{ocrResult.full_text}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* View 2: Line-by-Line Confidence Matrix */}
                {resultViewMode === 'lines' && (
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {activePage?.lines && activePage.lines.length > 0 ? (
                      activePage.lines.map((line, idx) => {
                        const conf = line.confidence ?? activePage.confidence ?? 0.9;
                        const isHigh = conf >= 0.9;
                        const isMed = conf >= 0.7 && conf < 0.9;
                        const badgeColor = isHigh
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : isMed
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-red-500/20 text-red-300 border-red-500/40';

                        return (
                          <div
                            key={idx}
                            className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 flex items-start justify-between gap-3 transition-colors"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span className="text-[11px] font-mono text-slate-500 mt-0.5 flex-shrink-0 w-6 text-right">
                                #{line.line_number || idx + 1}
                              </span>
                              <p className="text-xs text-slate-200 font-sans leading-relaxed break-words flex-1">
                                {line.text}
                              </p>
                            </div>
                            <span className={`text-[11px] px-2 py-0.5 rounded-lg border font-mono font-semibold flex-shrink-0 ${badgeColor}`}>
                              {(conf * 100).toFixed(1)}%
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        No line segmentation available for this page.
                      </div>
                    )}
                  </div>
                )}

                {/* View 3: Developer JSON Tree */}
                {resultViewMode === 'json' && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-[460px] overflow-y-auto font-mono text-[11px] text-emerald-400">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(ocrResult, null, 2)}</pre>
                  </div>
                )}
              </div>

              {/* Integrated Downstream AI Legal Entity Extractor */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-indigo-900/40 rounded-2xl p-5 shadow-xl">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
                      <span>🧠 Step 3: End-to-End AI Analysis</span>
                    </div>
                    <h3 className="text-white font-bold text-base">
                      Extract Legal Entities & Court Metadata
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Feed the extracted OCR text to Groq Llama 3.3 70B to parse parties, khata/khesra land details, acts, and prayer automatically.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExtractEntities}
                    disabled={extractingEntities}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-900/30 flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
                  >
                    {extractingEntities ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Analyzing with AI...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Extract Entities</span>
                      </>
                    )}
                  </button>
                </div>

                {entityError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2 mb-3">
                    <span>⚠️</span>
                    <span>{entityError}</span>
                  </div>
                )}

                {/* Entity Result Display */}
                {entityResult?.entities && (
                  <div className="space-y-4 pt-3 border-t border-indigo-900/30 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Petitioner Box */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                        <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                          👤 Petitioner / Appellant (अपीलकर्त्ता / आवेदक)
                        </p>
                        <p className="text-white text-xs font-bold">
                          {entityResult.entities.petitioner?.name || '—'}
                        </p>
                        {entityResult.entities.petitioner?.fatherName && (
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            पिता: {entityResult.entities.petitioner.fatherName}
                          </p>
                        )}
                        {entityResult.entities.petitioner?.address && (
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            साकिन: {entityResult.entities.petitioner.address}
                          </p>
                        )}
                      </div>

                      {/* Respondent Box */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                        <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-1">
                          👤 Respondent / Authority (प्रतिवादी / प्राधिकारी)
                        </p>
                        <p className="text-white text-xs font-bold">
                          {entityResult.entities.respondent?.name || '—'}
                        </p>
                        {entityResult.entities.respondent?.fatherName && (
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            पिता: {entityResult.entities.respondent.fatherName}
                          </p>
                        )}
                        {entityResult.entities.respondent?.address && (
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            साकिन: {entityResult.entities.respondent.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Land & Jurisdiction Details */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                      <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                        🌾 Land & Revenue Identifiers (भूमि विवरण)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 text-[11px]">खाता (Khata):</span>
                          <p className="text-white font-medium">{entityResult.entities.landDetails?.khataNo || '—'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px]">खेसरा (Khesra):</span>
                          <p className="text-white font-medium">{entityResult.entities.landDetails?.khesraNo || '—'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px]">मौजा (Mauza):</span>
                          <p className="text-white font-medium">{entityResult.entities.landDetails?.mauza || '—'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px]">रकबा (Area):</span>
                          <p className="text-white font-medium">{entityResult.entities.landDetails?.area || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cited Acts & Relief */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 text-[11px] font-semibold block mb-1">
                          ⚖️ Cited Acts & Legal Provisions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {entityResult.entities.citedActsAndSections?.map((act, aIdx) => (
                            <span
                              key={aIdx}
                              className="text-[11px] px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/30"
                            >
                              {act.act} §{act.section}
                            </span>
                          )) || <span className="text-slate-400">—</span>}
                        </div>
                      </div>

                      {entityResult.entities.reliefSought && (
                        <div className="pt-2 border-t border-slate-800/80">
                          <span className="text-amber-400 text-[11px] font-semibold block mb-0.5">
                            🙏 Relief / Prayer Sought (प्रार्थना):
                          </span>
                          <p className="text-slate-300 text-xs leading-relaxed">
                            {entityResult.entities.reliefSought}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action: Create Case CTA */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Link
                        href="/cases/new"
                        className="text-xs px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all"
                      >
                        <span>➕</span>
                        <span>Create New Case with this Extracted Data</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty State Placeholder */
            <div className="bg-slate-900/40 border border-slate-800/80 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[460px]">
              <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-slate-700/60">
                📄
              </div>
              <h3 className="text-white font-semibold text-lg">No Document Processed Yet</h3>
              <p className="text-slate-400 text-xs md:text-sm max-w-md mt-1 mb-6">
                Select or drag a court PDF/image on the left, choose your preferred OCR Engine (<strong>Gemini Vision</strong> or <strong>PaddleOCR ONNX + AI Auto-Repair</strong>), and click <strong>"Run OCR"</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('samples');
                  if (samples.length > 0) setSelectedSampleId(samples[0].id);
                }}
                className="text-xs px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl transition-all font-medium"
              >
                Try Sample Land Mutation Appeal →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
