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

      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center text-xs text-gray-400 py-8">Loading…</div>
        ) : corrections.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-8">
            No {statusFilter || ''} correction requests found.
          </div>
        ) : (
          corrections.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-[#E2E8F0] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-[#172554] text-sm">{c.employee_name}</span>
                    {c.employee_code && (
                      <span className="text-gray-400 text-[11px]">#{c.employee_code}</span>
                    )}
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    <span className="capitalize">{c.punch_type.replace('_', ' ')}</span>
                    {' · '}
                    <span className="font-medium text-[#172554]">{formatDateTime(c.requested_time)}</span>
                  </div>
                  <div className="text-xs text-gray-600">"{c.reason}"</div>
                  {c.decision_reason && (
                    <div className="mt-1.5 text-xs text-gray-500">
                      <span className="font-medium">{c.reviewer_name || 'Admin'}:</span> {c.decision_reason}
                    </div>
                  )}
                </div>
                {c.status === 'pending' && (
                  <button
                    onClick={() => setSelected(c)}
                    className="shrink-0 px-3 py-1.5 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          ))
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
