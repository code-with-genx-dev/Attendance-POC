import { useEffect, useState } from 'react';
import { correctionApi, CorrectionRequest } from '../../services/api';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return iso; }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200'
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border capitalize ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

interface ReviewModalProps {
  correction: CorrectionRequest;
  onClose: () => void;
  onReviewed: () => void;
}

function ReviewModal({ correction, onClose, onReviewed }: ReviewModalProps) {
  const [decision, setDecision] = useState<'approved' | 'rejected' | ''>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!decision) { setError('Please select Approve or Reject.'); return; }
    if (!reason.trim()) { setError('Decision reason is required.'); return; }
    setLoading(true);
    setError('');
    try {
      await correctionApi.review(correction.id, decision, reason.trim());
      onReviewed();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
        <div className="bg-[#172554] px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Review Correction Request</h3>
          <button onClick={onClose} className="text-blue-300 hover:text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {/* Employee Info */}
          <div className="bg-[#EFF6FF] rounded-lg px-4 py-3 mb-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs">Employee</span>
              <span className="font-medium text-[#172554] text-xs">{correction.employee_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs">Punch Type</span>
              <span className="font-medium text-[#172554] text-xs capitalize">{correction.punch_type.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs">Requested Time</span>
              <span className="font-medium text-[#172554] text-xs">{formatDateTime(correction.requested_time)}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-500 text-xs shrink-0">Reason</span>
              <span className="text-[#172554] text-xs text-right">{correction.reason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs">Submitted</span>
              <span className="text-gray-500 text-xs">{formatDateTime(correction.created_at)}</span>
            </div>
          </div>

          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>
          )}

          {/* Decision Buttons */}
          <div className="mb-4">
            <label className="block text-[11px] font-medium text-[#172554] mb-2 uppercase tracking-wide">Decision</label>
            <div className="flex gap-3">
              <button
                onClick={() => setDecision('approved')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  decision === 'approved'
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'border-green-300 text-green-700 hover:bg-green-50'
                }`}
              >
                ✓ Approve
              </button>
              <button
                onClick={() => setDecision('rejected')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  decision === 'rejected'
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-red-300 text-red-700 hover:bg-red-50'
                }`}
              >
                ✗ Reject
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-medium text-[#172554] mb-1.5 uppercase tracking-wide">
              Decision Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Provide a clear reason for this decision…"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] text-[#172554] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-[#E2E8F0] text-[#172554] rounded-lg hover:bg-[#EFF6FF]"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading || !decision}
              className="flex-1 px-4 py-2 text-sm bg-[#1D4ED8] hover:bg-[#1e40af] disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CorrectionReviewList() {
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState<CorrectionRequest | null>(null);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await correctionApi.listAdmin(statusFilter || undefined);
      setCorrections(res.corrections);
    } catch (err: any) {
      setError(err.message || 'Failed to load corrections');
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = corrections.filter(c => c.status === 'pending').length;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-3">
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[#1D4ED8] text-white'
                : 'bg-white border border-[#E2E8F0] text-[#172554] hover:bg-[#EFF6FF]'
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            {s === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>
      )}

      {/* Corrections Table */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#172554] text-white">
                <th className="text-left px-3 py-2 font-medium">Employee</th>
                <th className="text-left px-3 py-2 font-medium">Type</th>
                <th className="text-left px-3 py-2 font-medium">Requested Time</th>
                <th className="text-left px-3 py-2 font-medium">Reason</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">Submitted</th>
                <th className="text-center px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">Loading…</td>
                </tr>
              ) : corrections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                    No {statusFilter || ''} correction requests found.
                  </td>
                </tr>
              ) : (
                corrections.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-[#172554]">{c.employee_name}</div>
                      {c.employee_code && (
                        <div className="text-gray-400 text-[10px]">#{c.employee_code}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 capitalize">
                      {c.punch_type.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2 text-[#172554] font-medium">
                      {formatDateTime(c.requested_time)}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={c.reason}>
                      {c.reason}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={c.status} />
                      {c.decision_reason && (
                        <div className="text-[10px] text-gray-500 mt-1" title={c.decision_reason}>
                          {c.reviewer_name || 'Admin'}: {c.decision_reason.substring(0, 30)}
                          {c.decision_reason.length > 30 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(c.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {c.status === 'pending' ? (
                        <button
                          onClick={() => setSelected(c)}
                          className="px-3 py-1 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-[11px] font-medium rounded transition-colors"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer with count */}
        {!loading && corrections.length > 0 && (
          <div className="px-3 py-2 border-t border-[#E2E8F0] bg-gray-50 text-xs text-gray-500 font-medium">
            {corrections.length} record{corrections.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {selected && (
        <ReviewModal
          correction={selected}
          onClose={() => setSelected(null)}
          onReviewed={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
