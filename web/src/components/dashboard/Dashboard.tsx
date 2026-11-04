import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceApi, correctionApi, CorrectionRequest } from '../../services/api';

interface DashboardStats {
  totalEmployees: number;
  present: number;
  open: number;
  incomplete: number;
  absent: number;
  pendingCorrections: number;
  approvedCorrections: number;
  rejectedCorrections: number;
}

interface TrendData {
  date: string;
  rate: number;
  present: number;
  total: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    present: 0,
    open: 0,
    incomplete: 0,
    absent: 0,
    pendingCorrections: 0,
    approvedCorrections: 0,
    rejectedCorrections: 0
  });
  const [recentCorrections, setRecentCorrections] = useState<CorrectionRequest[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Load last 7 days for trend analysis
      const weekAgo = new Date(Date.now() - 6 * 86400_000).toISOString().split('T')[0];
      const weekRes = await attendanceApi.list({ from: weekAgo, to: today });
      
      // Load today's attendance
      const attendanceRes = await attendanceApi.list({ from: today, to: today });
      const sessions = attendanceRes.sessions;
      
      // Load corrections
      const correctionsRes = await correctionApi.listAdmin();
      const corrections = correctionsRes.corrections;
      
      // Calculate today's stats
      const completed = sessions.filter(s => s.status === 'completed').length;
      const open = sessions.filter(s => s.status === 'open').length;
      const incomplete = sessions.filter(s => s.status === 'incomplete').length;
      const pending = corrections.filter(c => c.status === 'pending').length;
      const approved = corrections.filter(c => c.status === 'approved').length;
      const rejected = corrections.filter(c => c.status === 'rejected').length;
      
      setStats({
        totalEmployees: sessions.length || 2,
        present: completed + open,
        open,
        incomplete,
        absent: 0,
        pendingCorrections: pending,
        approvedCorrections: approved,
        rejectedCorrections: rejected
      });
      
      // Calculate 7-day trend
      const trend = calculateTrend(weekRes.sessions);
      setTrendData(trend);
      
      setRecentCorrections(corrections.slice(0, 5));
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  function calculateTrend(allSessions: any[]): TrendData[] {
    const last7Days: TrendData[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = allSessions.filter(s => s.work_date === dateStr);
      const dayPresent = daySessions.filter(s => s.status === 'completed' || s.status === 'open').length;
      const dayTotal = daySessions.length;
      const rate = dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : 0;
      
      last7Days.push({
        date: dateStr,
        rate,
        present: dayPresent,
        total: dayTotal
      });
    }
    return last7Days;
  }

  const today = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const attendanceRate = stats.totalEmployees > 0 
    ? Math.round((stats.present / stats.totalEmployees) * 100) 
    : 0;

  const correctionApprovalRate = (stats.approvedCorrections + stats.rejectedCorrections) > 0
    ? Math.round((stats.approvedCorrections / (stats.approvedCorrections + stats.rejectedCorrections)) * 100)
    : 0;

  return (
    <div>
      {/* Header with Refresh */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-[#172554]">Analytics Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Last updated: {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open('/office-qr', '_blank')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Open QR Display
          </button>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1D4ED8] hover:bg-[#1e40af] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Today's Attendance Overview */}
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Today's Attendance</h2>
                <p className="text-xs text-gray-400 mt-0.5">{today}</p>
              </div>
              <button
                onClick={() => navigate('/attendance')}
                className="text-xs text-[#1D4ED8] hover:text-[#1e40af] font-medium"
              >
                View All Records →
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Present Today"
                value={stats.present}
                total={stats.totalEmployees}
                color="green"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <MetricCard
                label="Open Sessions"
                value={stats.open}
                sublabel="Currently checked in"
                color="blue"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <MetricCard
                label="Incomplete"
                value={stats.incomplete}
                sublabel="Missing check-out"
                color="amber"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              />
              <MetricCard
                label="Attendance Rate"
                value={`${attendanceRate}%`}
                sublabel={`${stats.present} of ${stats.totalEmployees}`}
                color="indigo"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* 7-Day Attendance Trend */}
          <div className="mb-4">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[#172554] mb-3">7-Day Attendance Trend</h3>
              <AttendanceTrendChart data={trendData} />
            </div>
          </div>

          {/* Correction Requests Analytics */}
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Correction Requests</h2>
                <p className="text-xs text-gray-400 mt-0.5">Missed punch approvals & analytics</p>
              </div>
              <button
                onClick={() => navigate('/corrections')}
                className="text-xs text-[#1D4ED8] hover:text-[#1e40af] font-medium"
              >
                Review All →
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <CorrectionMetricCard
                label="Pending Review"
                value={stats.pendingCorrections}
                color="amber"
                urgent={stats.pendingCorrections > 0}
              />
              <CorrectionMetricCard
                label="Approved"
                value={stats.approvedCorrections}
                color="green"
              />
              <CorrectionMetricCard
                label="Rejected"
                value={stats.rejectedCorrections}
                color="red"
              />
              <CorrectionMetricCard
                label="Approval Rate"
                value={`${correctionApprovalRate}%`}
                color="blue"
                sublabel="Of reviewed requests"
              />
            </div>

            {/* Recent Corrections Table */}
            {recentCorrections.length > 0 ? (
              <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Recent Requests (Last 5)</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Employee</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Requested Time</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {recentCorrections.map((c, i) => (
                        <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}>
                          <td className="px-3 py-2 text-[#172554]">{c.employee_name}</td>
                          <td className="px-3 py-2 text-gray-600 capitalize">{c.punch_type.replace('_', ' ')}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {new Date(c.requested_time).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={c.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-500">No correction requests yet</p>
                <p className="text-xs text-gray-400 mt-1">Employees can submit missed punch corrections from the mobile app</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg border border-[#E2E8F0] p-3 h-24" />
        ))}
      </div>
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 h-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg border border-[#E2E8F0] p-3 h-20" />
        ))}
      </div>
    </div>
  );
}

function AttendanceTrendChart({ data }: { data: TrendData[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No trend data available
      </div>
    );
  }

  const maxRate = Math.max(...data.map(d => d.rate), 100);

  return (
    <div>
      {/* Chart */}
      <div className="relative h-40 flex items-end justify-between gap-1 mb-2">
        {data.map((d, i) => {
          const heightPercent = (d.rate / maxRate) * 100;
          const color = d.rate >= 90 ? 'bg-green-500' : d.rate >= 70 ? 'bg-blue-500' : 'bg-amber-500';
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative w-full group">
                <div 
                  className={`${color} rounded-t transition-all hover:opacity-80`}
                  style={{ height: `${Math.max(heightPercent, 5)}%` }}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#172554] text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {d.rate}% ({d.present}/{d.total})
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-[10px] text-gray-500 px-1">
        {data.map((d, i) => {
          const date = new Date(d.date);
          const isToday = d.date === new Date().toISOString().split('T')[0];
          return (
            <div key={i} className={`text-center ${isToday ? 'font-bold text-[#1D4ED8]' : ''}`}>
              {date.toLocaleDateString('en-IN', { weekday: 'short' })}
              <br />
              {date.getDate()}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>≥90%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>70-89%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>&lt;70%</span>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  total,
  sublabel,
  color,
  icon
}: {
  label: string;
  value: number | string;
  total?: number;
  sublabel?: string;
  color: 'green' | 'blue' | 'amber' | 'indigo';
  icon: React.ReactNode;
}) {
  const colorMap = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: 'text-green-600'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: 'text-blue-600'
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      icon: 'text-amber-600'
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      icon: 'text-indigo-600'
    }
  };

  const colors = colorMap[color];

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3 transition-all hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`${colors.icon}`}>{icon}</div>
        <span className={`text-xs font-medium ${colors.text}`}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colors.text}`}>{value}</div>
      {sublabel && (
        <div className={`text-xs mt-0.5 ${colors.text} opacity-80`}>{sublabel}</div>
      )}
      {total !== undefined && (
        <div className={`text-xs mt-0.5 ${colors.text} opacity-80`}>of {total}</div>
      )}
    </div>
  );
}

function CorrectionMetricCard({
  label,
  value,
  color,
  urgent,
  sublabel
}: {
  label: string;
  value: number | string;
  color: 'amber' | 'green' | 'red' | 'blue';
  urgent?: boolean;
  sublabel?: string;
}) {
  const colorMap = {
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700'
    }
  };

  const colors = colorMap[color];

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3 transition-all hover:shadow-md relative`}>
      {urgent && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
      <div className={`text-xs font-medium ${colors.text} mb-1`}>{label}</div>
      <div className={`text-2xl font-bold ${colors.text}`}>{value}</div>
      {sublabel && (
        <div className={`text-[10px] mt-0.5 ${colors.text} opacity-70`}>{sublabel}</div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200'
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}
