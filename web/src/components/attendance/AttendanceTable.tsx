import { useEffect, useState, useCallback } from 'react';
import { attendanceApi, employeeApi, AttendanceSession, Employee } from '../../services/api';

const PAGE_SIZE = 20;

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function StatusBadge({ status }: { status: AttendanceSession['status'] }) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 border-green-200',
    open: 'bg-blue-100 text-blue-700 border-blue-200',
    incomplete: 'bg-amber-100 text-amber-700 border-amber-200'
  };
  const label: Record<string, string> = { completed: 'Completed', open: 'Open', incomplete: 'Incomplete' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {label[status] || status}
    </span>
  );
}

export default function AttendanceTable() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().split('T')[0];

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [searchName, setSearchName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    try {
      const res = await employeeApi.list();
      setEmployees(res.employees);
    } catch { /* non-critical */ }
  }

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await attendanceApi.list({ from, to, user_id: selectedUserId });
      setSessions(res.sessions);
      setPage(0);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [from, to, selectedUserId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const filtered = sessions.filter(s => {
    if (!searchName) return true;
    const q = searchName.toLowerCase();
    return s.full_name.toLowerCase().includes(q) ||
      (s.employee_code || '').toLowerCase().includes(q) ||
      s.company_email.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSessions = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const isFilterActive = from !== weekAgo || to !== today || selectedUserId !== undefined || searchName !== '';

  function handleResetFilters() {
    setFrom(weekAgo);
    setTo(today);
    setSelectedUserId(undefined);
    setSearchName('');
    setPage(0);
  }

  const csvUrl = attendanceApi.exportCsvUrl({ from, to });

  return (
    <div>
      {/* Filters Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#172554] uppercase tracking-wide">Filters</span>
            {isFilterActive && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Modified
              </span>
            )}
          </div>
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#1D4ED8] hover:text-[#1e40af] font-medium flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset to Defaults
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#172554] mb-1 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={e => setFrom(e.target.value)}
              className="w-full text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] text-[#172554] bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#172554] mb-1 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={to}
              min={from}
              onChange={e => setTo(e.target.value)}
              className="w-full text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] text-[#172554] bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#172554] mb-1 uppercase tracking-wide">Employee</label>
            <select
              value={selectedUserId ?? ''}
              onChange={e => setSelectedUserId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] text-[#172554] bg-white"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#172554] mb-1 uppercase tracking-wide">Search</label>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Name / Code / Email"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                className="w-full text-xs border border-[#E2E8F0] rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] text-[#172554] placeholder-gray-400 bg-white"
              />
              {searchName ? (
                <button
                  type="button"
                  onClick={() => setSearchName('')}
                  className="absolute right-2 text-gray-400 hover:text-gray-600 text-xs"
                  title="Clear search text"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E2E8F0]">
          <span className="text-xs text-gray-500 font-medium">
            {loading ? 'Loading…' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!isFilterActive}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                isFilterActive
                  ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-[#172554] shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Filters
            </button>

            <a
              href={`${csvUrl}&token=${localStorage.getItem('attendance_token') || ''}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              download
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#172554] text-white">
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide">Employee</th>
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide hidden md:table-cell">Code</th>
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide">Date</th>
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide">Check-In</th>
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide">Check-Out</th>
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-gray-400">Loading…</td>
                </tr>
              ) : pageSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-gray-400">
                    No attendance records found for the selected filters.
                  </td>
                </tr>
              ) : (
                pageSessions.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EFF6FF]/40'}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-[#172554] text-[13px] leading-tight">{s.full_name}</div>
                      <div className="text-gray-400 text-[11px] leading-tight">{s.company_email}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-[13px] hidden md:table-cell">
                      {s.employee_code || '—'}
                    </td>
                    <td className="px-3 py-2 text-[#172554] text-[13px]">{s.work_date}</td>
                    <td className="px-3 py-2 text-[13px] text-gray-700">{formatTime(s.check_in_at)}</td>
                    <td className="px-3 py-2 text-[13px] text-gray-700">{formatTime(s.check_out_at)}</td>
                    <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="px-3 py-2.5 border-t border-[#E2E8F0] flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-2.5 py-1 text-xs border border-[#E2E8F0] rounded disabled:opacity-40 hover:bg-[#EFF6FF] text-[#172554]"
              >← Prev</button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1 text-xs border border-[#E2E8F0] rounded disabled:opacity-40 hover:bg-[#EFF6FF] text-[#172554]"
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
