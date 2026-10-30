import React, { useState, useEffect } from 'react';
import LoginPage from './components/auth/LoginPage';
import AppShell from './components/layout/AppShell';
import TodaySummaryStrip from './components/dashboard/TodaySummaryStrip';
import AttendanceTable from './components/attendance/AttendanceTable';
import CorrectionReviewList from './components/corrections/CorrectionReviewList';
import QrDisplay from './components/qr/QrDisplay';
import EmployeeList from './components/employees/EmployeeList';

type View = 'dashboard' | 'attendance' | 'corrections' | 'qr-display' | 'employees';

interface User {
  id: number;
  company_email: string;
  full_name: string;
  role: string;
  status: string;
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('attendance_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('attendance_token'));
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [view, setView] = useState<View>('dashboard');

  // Keep user in localStorage for page reloads
  useEffect(() => {
    if (user) localStorage.setItem('attendance_user', JSON.stringify(user));
    else localStorage.removeItem('attendance_user');
  }, [user]);

  function handleLogin(newToken: string, newUser: User) {
    setToken(newToken);
    setUser(newUser);
  }

  function handleLogout() {
    localStorage.removeItem('attendance_token');
    localStorage.removeItem('attendance_user');
    setToken(null);
    setUser(null);
    setView('dashboard');
  }

  // Not authenticated
  if (!token || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  function renderContent() {
    switch (view) {
      case 'dashboard':
        return <DashboardView onNavigate={setView} />;
      case 'attendance':
        return (
          <section>
            <PageHeader title="Attendance Records" subtitle="View and filter employee check-in/check-out history" />
            <AttendanceTable />
          </section>
        );
      case 'corrections':
        return (
          <section>
            <PageHeader title="Correction Requests" subtitle="Review and approve or reject missed-punch requests from employees" />
            <CorrectionReviewList />
          </section>
        );
      case 'qr-display':
        return (
          <section>
            <PageHeader title="QR Code Station" subtitle="Display this QR code on a screen for employees to scan" />
            <QrDisplay />
          </section>
        );
      case 'employees':
        return (
          <section>
            <PageHeader title="Employees" subtitle="Manage employee accounts and onboard new team members" />
            <EmployeeList />
          </section>
        );
      default:
        return null;
    }
  }

  return (
    <AppShell
      user={user}
      activeView={view}
      onNavigate={setView}
      onLogout={handleLogout}
    >
      {renderContent()}
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-lg font-bold text-[#172554]">{title}</h1>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function DashboardView({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#172554]">Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">Today's attendance overview</p>
      </div>

      <TodaySummaryStrip />

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <QuickCard
          title="Attendance"
          desc="View all records"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
          onClick={() => onNavigate('attendance')}
        />
        <QuickCard
          title="QR Code"
          desc="Show scan screen"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          }
          onClick={() => onNavigate('qr-display')}
        />
        <QuickCard
          title="Corrections"
          desc="Review requests"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
          onClick={() => onNavigate('corrections')}
        />
        <QuickCard
          title="Employees"
          desc="Manage & onboard"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          onClick={() => onNavigate('employees')}
        />
      </div>

      {/* Info Banner */}
      <div className="bg-[#172554] rounded-xl p-4 text-white">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold mb-0.5">Employee Attendance Automation — POC</div>
            <div className="text-xs text-blue-300">
              Timezone: Asia/Kolkata · Cutoff: 14:00 · QR rotates every 30s with 15s grace window
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickCard({
  title, desc, icon, onClick
}: { title: string; desc: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-left hover:border-[#1D4ED8] hover:shadow-sm transition-all group"
    >
      <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] group-hover:bg-[#1D4ED8] flex items-center justify-center text-[#1D4ED8] group-hover:text-white transition-colors mb-3">
        {icon}
      </div>
      <div className="text-sm font-semibold text-[#172554]">{title}</div>
      <div className="text-[11px] text-gray-400 mt-0.5">{desc}</div>
    </button>
  );
}
