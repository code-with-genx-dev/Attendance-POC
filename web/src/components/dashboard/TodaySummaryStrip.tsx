import { useEffect, useState } from 'react';
import { attendanceApi } from '../../services/api';

interface SummaryData {
  present: number;
  incomplete: number;
  noPunch: number;
}

export default function TodaySummaryStrip() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await attendanceApi.list({ from: today, to: today });
      const sessions = res.sessions;
      const completed = sessions.filter(s => s.status === 'completed').length;
      const open = sessions.filter(s => s.status === 'open').length;
      const incomplete = sessions.filter(s => s.status === 'incomplete').length;
      setSummary({
        present: completed + open,
        incomplete,
        noPunch: 0  // computed server-side after cutoff; shown as 0 before cutoff
      });
    } catch (err: any) {
      setError(err.message || 'Could not load summary');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
        ⚠️ Summary unavailable: {error}
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long', day: 'numeric', month: 'long'
  });

  const cards = [
    {
      label: 'Present',
      value: summary?.present ?? 0,
      sub: 'Checked in today',
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      num: 'text-green-600',
      dot: 'bg-green-500'
    },
    {
      label: 'Incomplete',
      value: summary?.incomplete ?? 0,
      sub: 'No check-out yet',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      num: 'text-amber-600',
      dot: 'bg-amber-500'
    },
    {
      label: 'No Punch',
      value: summary?.noPunch ?? 0,
      sub: 'After 14:00 cutoff',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      num: 'text-red-600',
      dot: 'bg-red-500'
    }
  ];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-[#172554]">Today's Overview</h2>
        <span className="text-xs text-gray-500">{today}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {cards.map(card => (
          <div key={card.label} className={`rounded-xl border ${card.border} ${card.bg} p-4`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`inline-block w-2 h-2 rounded-full ${card.dot}`} />
              <span className={`text-xs font-medium ${card.text}`}>{card.label}</span>
            </div>
            <div className={`text-3xl font-bold ${card.num}`}>{card.value}</div>
            <div className={`text-xs mt-1 ${card.text} opacity-80`}>{card.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
