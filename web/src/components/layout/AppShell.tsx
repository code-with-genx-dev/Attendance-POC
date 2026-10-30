import React, { useState } from 'react';

export type NavView = 'dashboard' | 'attendance' | 'corrections' | 'qr-display' | 'employees';

interface NavItem {
  id: NavView;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface Props {
  user: { full_name: string; company_email: string; role: string };
  activeView: NavView;
  onNavigate: (view: NavView) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview & daily metrics',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    id: 'attendance',
    label: 'Attendance',
    description: 'Daily logs & CSV exports',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  },
  {
    id: 'corrections',
    label: 'Corrections',
    description: 'Missed-punch review queue',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  },
  {
    id: 'qr-display',
    label: 'QR Code Station',
    description: 'Live 30s rotating kiosk',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    )
  },
  {
    id: 'employees',
    label: 'Employees',
    description: 'Roster & onboarding',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  }
];

export default function AppShell({ user, activeView, onNavigate, onLogout, children }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeItem = navItems.find(item => item.id === activeView) || navItems[0];

  return (
    <div className="min-h-screen bg-[#EFF6FF] flex flex-col md:flex-row">
      {/* ─── SIDEBAR (Desktop) ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-[#172554] text-white h-screen sticky top-0 shrink-0 border-r border-[#1E3A8A] shadow-xl z-20">
        {/* Brand / Logo Header */}
        <div className="h-16 flex items-center px-5 gap-3 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1D4ED8] shadow-md shadow-blue-900/50">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-wide leading-tight">Attendance</div>
            <div className="text-[11px] text-blue-300 font-medium tracking-wider uppercase">Admin Portal</div>
          </div>
        </div>

        {/* Navigation Modules Section */}
        <div className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-blue-300/80 uppercase tracking-wider">
              Navigation Modules
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                      isActive
                        ? 'bg-[#1D4ED8] text-white shadow-md shadow-blue-900/40 font-semibold'
                        : 'text-blue-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive ? 'bg-white/20 text-white' : 'text-blue-300 group-hover:text-white'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium leading-tight truncate">{item.label}</div>
                      <div className={`text-[10px] leading-tight truncate mt-0.5 ${
                        isActive ? 'text-blue-100' : 'text-blue-300/70'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick System Badge */}
          <div className="px-3">
            <div className="rounded-xl bg-blue-950/60 border border-blue-800/40 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-blue-100">POC System Active</span>
              </div>
              <p className="text-[10px] text-blue-300/80 leading-relaxed">
                Asia/Kolkata · 30s QR Engine · Single MySQL Database
              </p>
            </div>
          </div>
        </div>

        {/* User Profile & Logout (Bottom of Sidebar) */}
        <div className="p-3 border-t border-white/10 shrink-0 bg-blue-950/40">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#1D4ED8] flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate leading-tight">{user.full_name}</div>
                <div className="text-[10px] text-blue-300 truncate leading-tight">{user.role}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MOBILE TOP BAR (Phone viewport only) ─────────────────────────── */}
      <header className="md:hidden bg-[#172554] text-white h-14 flex items-center justify-between px-4 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1D4ED8]">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-semibold text-xs text-white tracking-wide">Attendance Admin</span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="w-64 bg-[#172554] text-white h-full p-4 flex flex-col space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-bold text-sm">Navigation</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-blue-300 hover:text-white">✕</button>
            </div>
            <nav className="space-y-1 flex-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs ${
                    activeView === item.id ? 'bg-[#1D4ED8] text-white font-semibold' : 'text-blue-200 hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-blue-200">{user.full_name}</span>
              <button onClick={onLogout} className="text-xs text-red-300 hover:text-red-100">Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar for Desktop */}
        <div className="hidden md:flex h-16 bg-white border-b border-[#E2E8F0] items-center justify-between px-6 shrink-0 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-[#172554] tracking-tight">{activeItem.label}</h2>
            <p className="text-[11px] text-gray-400">{activeItem.description}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-[#1D4ED8] border border-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8]" />
              {user.company_email}
            </span>
          </div>
        </div>

        {/* View Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#EFF6FF]">
          {children}
        </main>
      </div>
    </div>
  );
}
