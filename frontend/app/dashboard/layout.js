'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', icon: '🏛️', label: 'Dashboard', labelHindi: 'डैशबोर्ड' },
  { href: '/cases', icon: '📋', label: 'Cases', labelHindi: 'वाद' },
  { href: '/cases/new', icon: '➕', label: 'New Case', labelHindi: 'नया वाद' },
  { href: '/legal', icon: '📚', label: 'Legal DB', labelHindi: 'विधि डेटाबेस' },
  { href: '/audit', icon: '🔐', label: 'Audit Log', labelHindi: 'ऑडिट लॉग' },
];

const adminItems = [
  { href: '/admin/users', icon: '👥', label: 'Users', labelHindi: 'उपयोगकर्ता' },
  { href: '/admin/rules', icon: '⚙️', label: 'Rules', labelHindi: 'नियम' },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!stored || !token) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roleBadge = {
    admin: { label: 'Admin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    peshkar: { label: 'Peshkar', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    dm: { label: 'DM', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  }[user.role] || { label: user.role, color: 'bg-slate-500/20 text-slate-300' };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-900/30">
            <span className="text-lg">⚖️</span>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight">NyayaSahayak</p>
              <p className="text-amber-400/70 text-xs">न्याय सहायक</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-slate-500 hover:text-white transition-colors"
            id="sidebar-toggle"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  active
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {sidebarOpen && (
                  <div>
                    <p className="text-sm font-medium leading-tight">{item.label}</p>
                    <p className="text-xs opacity-60 leading-tight">{item.labelHindi}</p>
                  </div>
                )}
              </Link>
            );
          })}

          {user.role === 'admin' && (
            <>
              {sidebarOpen && (
                <div className="pt-4 pb-1 px-3">
                  <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Admin</p>
                </div>
              )}
              {adminItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                      active
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-800">
          <div className={`flex items-center gap-3 p-2 rounded-xl ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-white font-bold">{user.name?.charAt(0).toUpperCase()}</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
              </div>
            )}
            {sidebarOpen && (
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-400 transition-colors text-sm"
                title="Logout"
              >
                ↪
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
