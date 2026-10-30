import { useEffect, useRef, useState, useCallback } from 'react';
import { qrApi, QrCurrentResponse } from '../../services/api';

const ROTATION_BUFFER_SECS = 2; // refresh 2s before TTL expires

export default function QrDisplay() {
  const [qrData, setQrData] = useState<QrCurrentResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const res = await qrApi.current();
      setQrData(res);
      startCountdown(res.ttlSeconds);
      scheduleRefresh(res.ttlSeconds);
    } catch (err: any) {
      setError(err.message || 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  }, []);

  function startCountdown(ttl: number) {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(Math.max(0, ttl));
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function scheduleRefresh(ttl: number) {
    if (refreshRef.current) clearTimeout(refreshRef.current);
    const delay = Math.max(1000, (ttl - ROTATION_BUFFER_SECS) * 1000);
    refreshRef.current = setTimeout(() => load(), delay);
  }

  useEffect(() => {
    load(true);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (refreshRef.current) clearTimeout(refreshRef.current);
    };
  }, [load]);

  async function forceRotate() {
    setRotating(true);
    setError('');
    try {
      await qrApi.rotate();
      await load();
    } catch (err: any) {
      setError(err.message || 'Rotation failed');
    } finally {
      setRotating(false);
    }
  }

  const urgency = countdown <= 5 ? 'text-red-500' : countdown <= 10 ? 'text-amber-500' : 'text-green-600';
  const barWidth = qrData ? Math.max(0, (countdown / qrData.ttlSeconds) * 100) : 0;
  const barColor = countdown <= 5 ? 'bg-red-400' : countdown <= 10 ? 'bg-amber-400' : 'bg-green-400';

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#172554] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Live Attendance QR Code</h2>
          <p className="text-xs text-blue-300 mt-0.5">Rotates every 30 seconds · 15s grace window</p>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-10 h-10 border-4 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Loading QR code…</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-sm mb-3">{error}</div>
              <button
                onClick={() => load(true)}
                className="px-4 py-2 bg-[#1D4ED8] text-white text-xs rounded-lg hover:bg-[#1e40af]"
              >
                Retry
              </button>
            </div>
          ) : qrData ? (
            <>
              {/* QR Image */}
              <div className="flex justify-center mb-4">
                <div className="p-3 border-4 border-[#1D4ED8] rounded-xl bg-white inline-block shadow-sm">
                  <img
                    src={qrData.imageDataUrl}
                    alt="QR Code for employee attendance scan"
                    className="w-52 h-52 block"
                  />
                </div>
              </div>

              {/* Countdown */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Expires in</span>
                  <span className={`text-lg font-bold tabular-nums ${urgency}`}>
                    {countdown}s
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${barColor}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              {/* Token info */}
              <div className="text-center text-[11px] text-gray-400 mb-4">
                Token #{qrData.tokenId} · Auto-refreshes when expired
              </div>

              {/* Force Rotate */}
              <button
                onClick={forceRotate}
                disabled={rotating}
                className="w-full py-2.5 px-4 bg-[#1D4ED8] hover:bg-[#1e40af] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className={`w-4 h-4 ${rotating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {rotating ? 'Rotating…' : 'Force Rotate Now'}
              </button>

              <p className="text-center text-[11px] text-gray-400 mt-2">
                Employees scan this QR with the mobile app to record attendance
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
