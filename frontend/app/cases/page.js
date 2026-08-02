'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

const statusColors = {
  open: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  hearing: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  evidence_stage: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  arguments: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  order_pending: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  decided: 'bg-green-500/20 text-green-300 border-green-500/30',
  appealed: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const caseTypeIcons = {
  land_dispute: '🌾',
  mutation: '📝',
  arms_act: '🔫',
  excise: '🍶',
  public_order: '🚨',
  eviction: '🏠',
  succession: '👨‍👩‍👦',
  other: '📋',
};

function CasesContent() {
  const searchParams = useSearchParams();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    caseType: '',
    search: '',
    page: 1,
  });

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.caseType) params.set('caseType', filters.caseType);
      if (filters.search) params.set('search', filters.search);
      params.set('page', filters.page);
      params.set('limit', '15');

      const res = await fetch(`${API}/cases?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCases(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Cases fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Cases / वाद</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {pagination.total ? `${pagination.total} total cases` : 'Loading...'}
          </p>
        </div>
        <Link
          href="/cases/new"
          id="cases-new-btn"
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold px-4 py-2 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-amber-900/30"
        >
          ➕ New Case
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 mb-5 flex flex-wrap gap-3">
        <input
          id="search-input"
          type="text"
          placeholder="Search cases, parties..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          className="flex-1 min-w-48 bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
        />
        <select
          id="status-filter"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="hearing">Hearing</option>
          <option value="evidence_stage">Evidence Stage</option>
          <option value="arguments">Arguments</option>
          <option value="order_pending">Order Pending</option>
          <option value="decided">Decided</option>
          <option value="appealed">Appealed</option>
        </select>
        <select
          id="type-filter"
          value={filters.caseType}
          onChange={(e) => setFilters({ ...filters, caseType: e.target.value, page: 1 })}
          className="bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">All Types</option>
          <option value="land_dispute">Land Dispute</option>
          <option value="mutation">Mutation</option>
          <option value="arms_act">Arms Act</option>
          <option value="excise">Excise</option>
          <option value="public_order">Public Order</option>
          <option value="eviction">Eviction</option>
          <option value="succession">Succession</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Cases table */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-px">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-700/20 animate-pulse" />
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">📂</span>
            <p className="text-slate-300 font-medium mb-2">No cases found</p>
            <p className="text-slate-500 text-sm mb-4">Try adjusting your filters or create a new case</p>
            <Link href="/cases/new" className="text-amber-400 hover:text-amber-300 text-sm">+ Create new case</Link>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-700/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <div className="col-span-2">Case No.</div>
              <div className="col-span-4">Parties</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Filed</div>
              <div className="col-span-1">Action</div>
            </div>

            {cases.map((c, idx) => {
              const color = statusColors[c.status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
              const statusLabel = c.status?.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
              return (
                <div
                  key={c._id}
                  className={`grid grid-cols-12 gap-4 px-5 py-4 ${idx < cases.length - 1 ? 'border-b border-slate-700/30' : ''} hover:bg-slate-700/20 transition-colors items-center`}
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-xl">{caseTypeIcons[c.caseType] || '📋'}</span>
                    <span className="text-white text-sm font-mono font-semibold">{c.caseNumber}</span>
                  </div>
                  <div className="col-span-4">
                    <p className="text-white text-sm font-medium truncate">{c.partyA?.name}</p>
                    <p className="text-slate-500 text-xs">vs {c.partyB?.name}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 text-xs">{c.caseType?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs px-2 py-1 rounded-lg border ${color}`}>{statusLabel}</span>
                  </div>
                  <div className="col-span-1 text-slate-500 text-xs">
                    {c.filedDate ? new Date(c.filedDate).toLocaleDateString('en-IN') : '—'}
                  </div>
                  <div className="col-span-1">
                    <Link
                      href={`/cases/${c._id}`}
                      className="text-amber-400 hover:text-amber-300 text-xs font-medium transition-colors"
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-500 text-sm">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              ← Prev
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-slate-700/30 rounded-xl animate-pulse" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-700/20 rounded-xl animate-pulse" />
        ))}
      </div>
    }>
      <CasesContent />
    </Suspense>
  );
}
