'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getToken, hasRole } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

const ACT_TYPE_COLORS = {
  central:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  state:        'bg-amber-500/20 text-amber-300 border-amber-500/30',
  rule:         'bg-purple-500/20 text-purple-300 border-purple-500/30',
  notification: 'bg-green-500/20 text-green-300 border-green-500/30',
  circular:     'bg-slate-500/20 text-slate-300 border-slate-500/30',
  order:        'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const STATUS_COLORS = {
  active:   'text-green-400',
  repealed: 'text-red-400',
  amended:  'text-amber-400',
};

// ─── Search Results ───────────────────────────────────────────────────────────

function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query || query.length < 3) { setResults([]); setSearched(false); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/legal/search?q=${encodeURIComponent(query)}&topK=6`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) setResults(data.data);
        setSearched(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 600); // Debounce 600ms

    return () => clearTimeout(timer);
  }, [query]);

  if (!query || query.length < 3) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-white font-semibold text-sm">
          🔍 Search Results for "{query}"
        </h2>
        {loading && <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />}
        {!loading && searched && (
          <span className="text-slate-500 text-xs">{results.length} sections found</span>
        )}
      </div>

      {!loading && searched && results.length === 0 && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 text-center">
          <p className="text-slate-400 text-sm">No relevant sections found in the legal database.</p>
          <p className="text-slate-600 text-xs mt-1">Try different keywords or run the seed script to populate the database.</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((section, i) => (
          <div
            key={section._id}
            className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:border-amber-500/20 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-amber-400 text-xs font-mono font-bold">§ {section.sectionNumber}</span>
                {section.rerankScore !== undefined && (
                  <span className="text-xs px-2 py-0.5 rounded border bg-purple-500/10 text-purple-300 border-purple-500/20">
                    Relevance: {section.rerankScore}/10
                  </span>
                )}
              </div>
              <span className="text-slate-500 text-xs flex-shrink-0">#{i + 1}</span>
            </div>

            <p className="text-white font-medium text-sm mb-1">
              {section.sectionTitle || `Section ${section.sectionNumber}`}
            </p>
            {section.sectionTitleHindi && (
              <p className="text-slate-500 text-xs mb-2">{section.sectionTitleHindi}</p>
            )}

            <p className="text-slate-300 text-xs leading-relaxed mb-3">
              {section.text?.substring(0, 300)}{section.text?.length > 300 ? '...' : ''}
            </p>

            {section.rerankReason && (
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl px-3 py-2 mb-3">
                <p className="text-purple-300 text-xs">
                  <span className="font-semibold">AI Relevance Note: </span>
                  {section.rerankReason}
                </p>
                <p className="text-slate-600 text-xs mt-0.5">⚠️ AI-generated — verify against source</p>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              {section.actId && (
                <span className="text-slate-400 text-xs">
                  📖 {section.actId.actName} ({section.actId.actYear})
                </span>
              )}
              {section.effectiveFrom && (
                <span className="text-slate-600 text-xs">
                  From {new Date(section.effectiveFrom).getFullYear()}
                </span>
              )}
              {section.effectiveTo && (
                <span className="text-amber-400 text-xs">
                  Until {new Date(section.effectiveTo).getFullYear()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Act Card ─────────────────────────────────────────────────────────────────

function ActCard({ act, onSelect, selected }) {
  const typeColor = ACT_TYPE_COLORS[act.actType] || ACT_TYPE_COLORS.state;
  const statusColor = STATUS_COLORS[act.status] || STATUS_COLORS.active;

  return (
    <button
      onClick={() => onSelect(act)}
      className={`w-full text-left bg-slate-800/40 border rounded-2xl p-5 transition-all duration-150 hover:border-amber-500/30 ${
        selected ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded border ${typeColor}`}>{act.actType}</span>
        <span className={`text-xs font-medium ${statusColor}`}>{act.status}</span>
      </div>
      <p className="text-white font-semibold text-sm leading-snug">{act.actName}</p>
      {act.actNameHindi && <p className="text-slate-500 text-xs mt-0.5">{act.actNameHindi}</p>}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-amber-400 text-xs font-mono">{act.shortName}</span>
        <span className="text-slate-600 text-xs">· {act.actYear}</span>
      </div>
    </button>
  );
}

// ─── Sections Panel ───────────────────────────────────────────────────────────

function SectionsPanel({ act }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!act) return;
    setSections([]);
    setLoading(true);
    setExpanded(null);

    fetch(`${API}/legal/acts/${act._id}/sections?limit=100`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) setSections(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [act]);

  if (!act) return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-8">
      <span className="text-4xl mb-3 opacity-30">📖</span>
      <p className="text-slate-500 text-sm">Select an Act to view its sections</p>
    </div>
  );

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-white font-semibold">{act.actName}</h2>
        <p className="text-slate-500 text-xs mt-0.5">
          {act.actNameHindi && `${act.actNameHindi} · `}{act.actYear} · {act.jurisdiction}
        </p>
        {act.description && (
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">{act.description}</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-700/20 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">No sections seeded for this Act yet.</p>
          <p className="text-xs mt-1">Run <code className="bg-slate-800 px-1 rounded">npm run seed</code> in the backend to populate.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((section) => (
            <div
              key={section._id}
              className="bg-slate-800/40 border border-slate-700/30 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === section._id ? null : section._id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 text-xs font-mono font-bold w-12 flex-shrink-0">
                    § {section.sectionNumber}
                  </span>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">
                      {section.sectionTitle || `Section ${section.sectionNumber}`}
                    </p>
                    {section.sectionTitleHindi && (
                      <p className="text-slate-500 text-xs">{section.sectionTitleHindi}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {section.embeddingStatus === 'done' && (
                    <span className="text-xs text-green-500 opacity-60" title="Embedding ready for RAG">⚡</span>
                  )}
                  <span className="text-slate-500 text-xs">
                    {expanded === section._id ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {expanded === section._id && (
                <div className="px-4 pb-4 border-t border-slate-700/30">
                  <p className="text-slate-300 text-sm leading-relaxed mt-3">{section.text}</p>
                  {section.textHindi && (
                    <p className="text-slate-500 text-xs leading-relaxed mt-2">{section.textHindi}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-slate-600">
                    <span>From: {new Date(section.effectiveFrom).toLocaleDateString('en-IN')}</span>
                    {section.effectiveTo && <span>Until: {new Date(section.effectiveTo).toLocaleDateString('en-IN')}</span>}
                    {section.versionNote && <span>· {section.versionNote}</span>}
                    {section.keywords?.length > 0 && (
                      <span className="text-slate-700">· {section.keywords.join(', ')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Content ────────────────────────────────────────────────────────

function LegalDBContent() {
  const router = useRouter();
  const [acts, setActs] = useState([]);
  const [actsLoading, setActsLoading] = useState(true);
  const [selectedAct, setSelectedAct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actTypeFilter, setActTypeFilter] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }

    fetch(`${API}/legal/acts?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) setActs(data.data); })
      .catch(console.error)
      .finally(() => setActsLoading(false));
  }, [router]);

  const filteredActs = acts.filter((a) => {
    if (actTypeFilter && a.actType !== actTypeFilter) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Legal Database / विधि डेटाबेस</h1>
        <p className="text-slate-400 text-sm mt-1">
          Bihar DM Court — Acts, Sections & RAG Search · {acts.length} acts loaded
        </p>
      </div>

      {/* Search bar */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input
              id="legal-search"
              type="text"
              placeholder="Search laws... e.g. land mutation, arms licence, excise prohibition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <select
            id="act-type-filter"
            value={actTypeFilter}
            onChange={(e) => setActTypeFilter(e.target.value)}
            className="bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">All Types</option>
            <option value="central">Central</option>
            <option value="state">State (Bihar)</option>
            <option value="rule">Rule</option>
            <option value="notification">Notification</option>
          </select>
        </div>
        {searchQuery.length >= 3 && (
          <p className="text-amber-400/70 text-xs mt-2 flex items-center gap-1.5">
            <span>🤖</span>
            AI-powered hybrid search (keyword + semantic). Results are advisory — verify against official text.
          </p>
        )}
      </div>

      {/* RAG Search Results */}
      {searchQuery.length >= 3 && <SearchResults query={searchQuery} />}

      {/* Acts + Sections split */}
      {searchQuery.length < 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Acts list */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">Acts / अधिनियम</h2>
              {hasRole('admin') && (
                <Link
                  href="/admin/legal/acts/new"
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  + Add Act
                </Link>
              )}
            </div>

            {actsLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-28 bg-slate-700/20 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredActs.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-sm mb-2">No acts in database.</p>
                <p className="text-xs">
                  Run <code className="bg-slate-800 px-1 rounded">npm run seed</code> in backend to seed Bihar Acts.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {filteredActs.map((act) => (
                  <ActCard
                    key={act._id}
                    act={act}
                    selected={selectedAct?._id === act._id}
                    onSelect={setSelectedAct}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sections panel */}
          <div className="lg:col-span-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 min-h-96 overflow-y-auto max-h-[80vh]">
            <SectionsPanel act={selectedAct} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-7xl mx-auto">
        <div className="h-8 w-64 bg-slate-700/30 rounded-xl animate-pulse mb-4" />
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-2 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-slate-700/20 rounded-2xl animate-pulse" />)}
          </div>
          <div className="col-span-3 h-96 bg-slate-700/20 rounded-2xl animate-pulse" />
        </div>
      </div>
    }>
      <LegalDBContent />
    </Suspense>
  );
}
