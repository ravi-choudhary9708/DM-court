'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL;

function StatCard({ icon, value, label, color, href }) {
  return (
    <Link href={href || '#'}>
      <div className={`bg-slate-800/50 border ${color} rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 cursor-pointer group`}>
        <div className="flex items-start justify-between mb-4">
          <span className="text-3xl">{icon}</span>
          <div className={`text-xs px-2 py-1 rounded-lg border ${color} opacity-60`}>View →</div>
        </div>
        <div className="text-3xl font-bold text-white mb-1">{value ?? '—'}</div>
        <div className="text-slate-400 text-sm">{label}</div>
      </div>
    </Link>
  );
}

function RecentCaseRow({ caseItem }) {
  const statusColors = {
    open: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    hearing: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    order_pending: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    decided: 'bg-green-500/20 text-green-300 border-green-500/30',
    evidence_stage: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };
  const color = statusColors[caseItem.status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  const statusLabel = caseItem.status?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Link href={`/cases/${caseItem._id}`}>
      <div className="flex items-center gap-4 p-4 hover:bg-slate-700/30 rounded-xl transition-colors group">
        <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-lg">📋</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {caseItem.caseNumber} — {caseItem.subject}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            {caseItem.partyA?.name} <span className="text-slate-600">vs</span> {caseItem.partyB?.name}
          </p>
        </div>
        <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-lg border ${color}`}>{statusLabel}</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/cases/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-sm font-medium mb-1">{greeting()}</p>
            <h1 className="text-white text-3xl font-bold">
              {user?.name || 'Welcome'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Bihar District Magistrate Court · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/legal"
              className="text-xs px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 rounded-xl transition-colors font-medium flex items-center gap-1.5"
            >
              <span>📖</span> Legal DB
            </Link>
            {user?.role === 'admin' && (
              <>
                <Link
                  href="/admin/rules"
                  className="text-xs px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 rounded-xl transition-colors font-medium flex items-center gap-1.5"
                >
                  <span>⚙️</span> Rules Engine
                </Link>
                <Link
                  href="/admin/audit"
                  className="text-xs px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 rounded-xl transition-colors font-medium flex items-center gap-1.5"
                >
                  <span>📜</span> Audit Trail
                </Link>
              </>
            )}
            <Link
              href="/cases/new"
              id="new-case-btn"
              className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-amber-900/30 text-sm ml-1"
            >
              <span>➕</span> New Case
            </Link>
          </div>

        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6 animate-pulse h-36" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard icon="📋" value={stats?.total} label="Total Cases" color="border-slate-700/50" href="/cases" />
          <StatCard icon="🔵" value={stats?.open} label="Open" color="border-blue-500/30" href="/cases?status=open" />
          <StatCard icon="⚡" value={stats?.hearing} label="In Hearing" color="border-amber-500/30" href="/cases?status=hearing" />
          <StatCard icon="⏳" value={stats?.orderPending} label="Order Pending" color="border-orange-500/30" href="/cases?status=order_pending" />
          <StatCard icon="✅" value={stats?.decided} label="Decided" color="border-green-500/30" href="/cases?status=decided" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent cases */}
        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold text-lg">Recent Cases</h2>
            <Link href="/cases" className="text-amber-400 text-sm hover:text-amber-300 transition-colors">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-700/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : stats?.recentCases?.length > 0 ? (
            <div className="space-y-1">
              {stats.recentCases.map((c) => <RecentCaseRow key={c._id} caseItem={c} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-3">📂</span>
              <p className="text-slate-400">No cases yet</p>
              <Link href="/cases/new" className="text-amber-400 text-sm mt-2 hover:underline">Create your first case →</Link>
            </div>
          )}
        </div>

        {/* Quick actions + AI disclaimer */}
        <div className="space-y-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: '/cases/new', icon: '➕', label: 'File New Case', sub: 'नया वाद दर्ज करें' },
                { href: '/cases?status=order_pending', icon: '✍️', label: 'Pending Orders', sub: 'लंबित आदेश' },
                { href: '/legal', icon: '📚', label: 'Legal Database', sub: 'विधि डेटाबेस' },
                { href: '/audit', icon: '🔐', label: 'Audit Log', sub: 'ऑडिट लॉग' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 hover:bg-slate-700/50 rounded-xl transition-colors group"
                >
                  <span className="text-xl">{action.icon}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{action.label}</p>
                    <p className="text-slate-500 text-xs">{action.sub}</p>
                  </div>
                  <span className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* AI disclaimer */}
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-xl mt-0.5">⚠️</span>
              <div>
                <p className="text-amber-300 font-semibold text-sm mb-1">AI Advisory System</p>
                <p className="text-amber-200/70 text-xs leading-relaxed">
                  All AI-generated analysis is advisory only. The District Magistrate retains full judicial authority and must review and approve every order.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
