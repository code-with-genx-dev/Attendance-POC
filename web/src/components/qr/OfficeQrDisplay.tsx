import { useEffect, useRef, useState, useCallback } from 'react';
import { qrApi, QrCurrentResponse } from '../../services/api';

export default function OfficeQrDisplay() {
  const [qrData, setQrData] = useState<QrCurrentResponse | null>(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const sessionStartRef = useRef<number>(Date.now());
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await qrApi.current();
      setQrData(res);
      setCountdown(Math.max(0, res.ttlSeconds));
      
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      
      if (refreshRef.current) clearTimeout(refreshRef.current);
      const refreshDelay = Math.max(1000, (res.ttlSeconds - 2) * 1000);
      refreshRef.current = setTimeout(() => load(), refreshDelay);
    } catch (err: any) {
      setError(err.message || 'Failed to load QR code');
    }
  }, []);

  useEffect(() => {
    load();
    
    durationRef.current = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (refreshRef.current) clearTimeout(refreshRef.current);
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [load]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const urgency = countdown <= 5 ? 'text-red-600' : countdown <= 10 ? 'text-amber-600' : 'text-green-600';
  const barWidth = qrData ? Math.max(0, (countdown / qrData.ttlSeconds) * 100) : 0;
  const barColor = countdown <= 5 ? 'bg-red-500' : countdown <= 10 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#172554] to-[#1e3a8a] px-8 py-6 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Office Attendance QR</h1>
            <p className="text-blue-200 text-sm">Scan with mobile app to mark attendance</p>
          </div>

          <div className="p-8">
            {error ? (
              <div className="text-center py-12">
                <div className="text-red-600 text-lg mb-4">{error}</div>
                <button
                  onClick={() => load()}
                  className="px-6 py-3 bg-[#1D4ED8] text-white rounded-lg hover:bg-[#1e40af] font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : qrData ? (
              <div className="space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="p-4 border-8 border-[#1D4ED8] rounded-2xl bg-white shadow-xl">
                      <img
                        src={qrData.imageDataUrl}
                        alt="Office QR Code"
                        className="w-80 h-80 block"
                      />
                    </div>
                    <div className="absolute -top-3 -right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                      LIVE
                    </div>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="text-center space-y-3">
                  <div className="text-sm text-gray-500 uppercase tracking-wide">Expires in</div>
                  <div className={`text-7xl font-bold tabular-nums ${urgency} transition-colors`}>
                    {countdown}s
                  </div>
                  <div className="w-full max-w-md mx-auto h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ${barColor}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400">
                    Auto-rotates every 30 seconds
                  </div>
                </div>

                {/* Session Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Session Active:</span>
                    <span className="font-semibold text-[#172554]">{formatDuration(sessionDuration)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Token ID:</span>
                    <span className="font-mono text-[#172554]">#{qrData.tokenId}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-gray-500">Live Rotation Active</span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-center space-y-2 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    📱 Open the mobile app and tap "Scan QR"
                  </p>
                  <p className="text-xs text-gray-400">
                    This display will remain active for multiple hours
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => window.close()}
                  className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close Session
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-20 gap-4">
                <div className="w-16 h-16 border-4 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-500">Loading QR code...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
