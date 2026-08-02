'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, hasRole } from '@/lib/auth';
import { auditAPI } from '@/lib/api';

const ACTION_COLORS = {
  USER_LOGIN: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  USER_LOGOUT: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  USER_CREATED: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  CASE_CREATED: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  CASE_UPDATED: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  DOCUMENT_UPLOADED: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  DOCUMENT_VERIFIED: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  OCR_COMPLETED: 'bg-green-500/20 text-green-300 border-green-500/30',
  OCR_FAILED: 'bg-red-500/20 text-red-300 border-red-500/30',
  EVIDENCE_EXTRACTED: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  EVIDENCE_VERIFIED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  AI_ANALYSIS_GENERATED: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  DRAFT_ORDER_GENERATED: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  DRAFT_ORDER_REVIEWED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ORDER_APPROVED: 'bg-green-500/20 text-green-300 border-green-500/30 font-bold',
  ORDER_REJECTED: 'bg-red-500/20 text-red-300 border-red-500/30',
  LEGAL_SECTION_ADDED: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  RULE_CHECK_RUN: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const ACTION_OPTIONS = [
  'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED',
  'CASE_CREATED', 'CASE_UPDATED',
  'DOCUMENT_UPLOADED', 'DOCUMENT_VERIFIED', 'OCR_COMPLETED', 'OCR_FAILED',
  'EVIDENCE_EXTRACTED', 'EVIDENCE_VERIFIED', 'AI_ANALYSIS_GENERATED',
  'DRAFT_ORDER_GENERATED', 'DRAFT_ORDER_REVIEWED', 'ORDER_APPROVED', 'ORDER_REJECTED',
  'LEGAL_SECTION_ADDED', 'RULE_CHECK_RUN'
];

function AuditLogContent() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchLogs = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 30 };
      if (actionFilter) params.action = actionFilter;
      if (roleFilter) params.userRole = roleFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await auditAPI.list(params);
      if (res.success) {
        setLogs(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Fetch audit log error:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, roleFilter, searchTerm]);

  useEffect(() => {
    if (!hasRole('admin')) {
      router.push('/dashboard');
      return;
    }
    fetchLogs(1);
  }, [router, actionFilter, roleFilter, fetchLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold">System Audit Trail / सम्परीक्षा लॉग</h1>
        <p className="text-slate-400 text-sm mt-1">
          Immutable, tamper-proof system activity log for Bihar DM Court proceedings.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Search by user, description, or entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">All Actions ({ACTION_OPTIONS.length})</option>
            {ACTION_OPTIONS.map((act) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="peshkar">Peshkar</option>
            <option value="dm">DM</option>
            <option value="system">System Worker</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-700/20 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No audit log entries match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-700/50 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">User / Role</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Entity</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => {
                  const badgeCls = ACTION_COLORS[log.action] || 'bg-slate-700 text-slate-300 border-slate-600';
                  return (
                    <tr key={log._id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="p-4 text-slate-400 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <p className="text-white font-medium">{log.userName || 'System'}</p>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">{log.userRole}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono ${badgeCls}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-300">
                        {log.entityType ? (
                          <span>
                            <span className="text-amber-400 font-medium">{log.entityType}</span>
                            {log.entityId && <span className="text-slate-500 font-mono ml-1">#{log.entityId.substring(0, 8)}...</span>}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-4 text-slate-200 leading-relaxed max-w-md">
                        {log.description}
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {log.ipAddress || 'internal'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-slate-500 text-xs">
            Showing Page {pagination.page} of {pagination.pages} ({pagination.total} total logs)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs hover:bg-slate-700 disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs hover:bg-slate-700 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="p-6 max-w-7xl mx-auto text-slate-400">Loading audit log...</div>}>
      <AuditLogContent />
    </Suspense>
  );
}
