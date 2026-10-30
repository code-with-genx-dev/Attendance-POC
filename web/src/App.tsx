import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Database, Clock } from 'lucide-react';

interface HealthData {
  status: string;
  service: string;
  serverTimestamp: string;
  officeTimezone: string;
  currentOfficeTime: string;
  database: {
    status: string;
    mode: string;
    targetDatabase: string;
    message: string;
  };
}

export function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Dense Top Bar */}
      <header className="bg-brand-navy text-white px-4 py-2.5 flex items-center justify-between border-b border-brand-border">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-primary"></div>
          <h1 className="font-semibold text-sm tracking-tight">Attendance POC Admin</h1>
          <span className="text-[11px] bg-blue-950 px-2 py-0.5 rounded text-blue-200 border border-blue-800">
            Phase 1 Scaffolding
          </span>
        </div>
        <div className="flex items-center space-x-4 text-xs text-blue-200">
          <div className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{health ? health.currentOfficeTime : 'Loading server time...'}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 space-y-4">
        {/* Page Title & Breadcrumb */}
        <div className="flex items-center justify-between border-b border-brand-border pb-2">
          <div>
            <h2 className="text-dense-title font-bold text-brand-navy">Architecture & System Health</h2>
            <p className="text-xs text-brand-muted mt-0.5">
              Verified single Express API + MySQL database target (BRD v1.1 Minimal Dense Blue UI)
            </p>
          </div>
        </div>

        {/* Dense Status Strip (BRD Section 10 Specification) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-brand-border rounded p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-brand-muted uppercase tracking-wider">Backend API</span>
              <Activity className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="mt-1 text-sm font-semibold text-brand-text">
              {loading ? 'Connecting...' : error ? 'Offline / Error' : 'Running (Port 5000)'}
            </div>
            <div className="text-[11px] text-brand-muted mt-0.5">
              {health ? `Uptime: ${health.service}` : 'Checking Express service'}
            </div>
          </div>

          <div className="bg-white border border-brand-border rounded p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-brand-muted uppercase tracking-wider">Database Target</span>
              <Database className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="mt-1 text-sm font-semibold text-brand-text">
              {health?.database.status === 'configured' ? 'MySQL Configured' : 'Safe Mock / Unconfigured'}
            </div>
            <div className="text-[11px] text-brand-muted mt-0.5 truncate" title={health?.database.message}>
              {health ? health.database.message : 'Awaiting credentials via .env'}
            </div>
          </div>

          <div className="bg-white border border-brand-border rounded p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-brand-muted uppercase tracking-wider">Role Access</span>
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="mt-1 text-sm font-semibold text-brand-text">
              Strict RBAC (Admin / Employee)
            </div>
            <div className="text-[11px] text-brand-muted mt-0.5">
              Zero unapproved employee fields
            </div>
          </div>
        </div>

        {/* Diagnostic Card */}
        <div className="bg-white border border-brand-border rounded p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase text-brand-navy tracking-wider">
            Phase 1 Diagnostic Payload
          </h3>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto font-mono">
            {loading ? 'Fetching diagnostics from /api/health...' : JSON.stringify(health || { error }, null, 2)}
          </pre>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-white px-4 py-2 text-center text-xs text-brand-muted">
        Employee Attendance Automation POC • BRD v1.1 • Phase 1 Scaffolding
      </footer>
    </div>
  );
}

export default App;

