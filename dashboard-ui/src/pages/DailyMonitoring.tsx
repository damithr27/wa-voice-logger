import { useState } from 'react';
import { Sunrise, Sunset, CheckCircle2, XCircle, ChevronDown, Eye, Send, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useDay, uiStatus, prettyDate, splitEntries } from '../api';



function UpdateIcon({ status }: { status: string }) {
  if (status === 'complete' || status === 'received') return <CheckCheck size={14} className="text-green-500" />;
  if (status === 'partial') return <Clock size={14} className="text-amber-500" />;
  return <AlertCircle size={14} className="text-red-400" />;
}

export default function DailyMonitoring() {
  const { rows, date, error, updatedAt, shift } = useDay();

  // Which cells have been opened up to show every update in full
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const staff = rows.map(r => ({
    name: r.name,
    role: r.designation,
    availability: r.leave ? 'leave' : 'available',
    morningTarget: r.morning || '—',
    morningTime: r.morning ? (r.kind || 'Received') : '—',
    eveningAchievement: r.evening || '—',
    eveningTime: r.evening ? (r.kind || 'Received') : '—',
    // A person may send several updates in one session; they are numbered
    // in the sheet, so they can be counted and shown separately here
    morningCount: splitEntries(r.morning).length,
    eveningCount: splitEntries(r.evening).length,
    morningEn: r.morningEn || '',
    eveningEn: r.eveningEn || '',
    status: uiStatus(r),
    hasReminder: false
  }));

  const morningReceived = rows.filter(r => r.morning).length;
  const eveningReceived = rows.filter(r => r.evening).length;
  const bothDone = rows.filter(r => r.morning && r.evening).length;
  const bothMissed = rows.filter(r => !r.morning && !r.evening && !r.leave).length;

  const summaryCards = [
    { label: 'Morning Received', value: morningReceived, icon: Sunrise, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    { label: 'Morning Missing', value: rows.length - morningReceived, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
    { label: 'Evening Received', value: eveningReceived, icon: Sunset, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Evening Missing', value: rows.length - eveningReceived, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
    { label: 'Both Completed', value: bothDone, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Both Missed', value: bothMissed, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
  ];

  const [statusFilter, setStatusFilter] = useState('All');
  const [viewModal, setViewModal] = useState<typeof staff[0] | null>(null);

  const filtered = statusFilter === 'All' ? staff : staff.filter(s => {
    if (statusFilter === 'Complete') return s.status === 'complete';
    if (statusFilter === 'Partial') return s.status === 'partial';
    if (statusFilter === 'No Update') return s.status === 'no-update';
    if (statusFilter === 'On Leave') return s.status === 'on-leave';
    return true;
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Daily Update Monitoring</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track morning work plans and evening achievements
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-slate-700">{prettyDate(date)}</div>
          <div className="text-xs text-slate-500">
            {updatedAt ? `Updated ${updatedAt}` : ''}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          Could not reach the bot: {error}. Is it running?
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className={`bg-white border ${c.border} rounded-xl p-4 shadow-sm`}>
            <div className={`w-9 h-9 rounded-lg ${c.bg} ${c.color} flex items-center justify-center mb-3`}>
              <c.icon size={18} />
            </div>
            <div className="text-2xl font-bold text-slate-800">{c.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 leading-tight">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-slate-200 px-5 py-3 shadow-sm">
        <span className="text-xs font-semibold text-slate-500">Filter:</span>
        {['All', 'Complete', 'Partial', 'No Update', 'On Leave'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              statusFilter === f ? 'bg-green-600 text-white border-green-600' : 'border-slate-200 text-slate-600 hover:border-green-400'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Search member..."
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-green-400 w-40"
          />
          <button className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
            Date <ChevronDown size={11} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                {['Member', 'Role', 'Status', 'Morning Target', 'Time', 'Evening Achievement', 'Time', 'Daily Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((m, i) => (
                <tr key={i} className={`hover:bg-slate-50/50 transition-colors ${m.status === 'no-update' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {m.name[0]}
                      </div>
                      <span className="font-medium text-slate-800 whitespace-nowrap text-xs">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{m.role}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.availability === 'leave' ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>
                      {m.availability === 'leave' ? 'On Leave' : 'Available'}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[180px] align-top">
                    <div className="flex items-start gap-1.5">
                      <UpdateIcon status={m.morningTime === '—' ? 'missing' : 'received'} />
                      <p className={`text-xs text-slate-600 leading-relaxed whitespace-pre-line ${
                        expanded[m.name + '|M'] ? '' : 'line-clamp-2'
                      }`}>
                        {m.morningTarget}
                      </p>
                    </div>
                    {m.morningCount > 1 && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-white">
                        {m.morningCount} updates
                      </span>
                    )}
                    {expanded[m.name + '|M'] && m.morningEn && (
                      <div className="mt-2 bg-blue-50 border border-blue-100 rounded p-2">
                        <div className="text-[9px] font-semibold text-blue-600 uppercase tracking-wide mb-1">English</div>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{m.morningEn}</p>
                      </div>
                    )}
                    {m.morningTarget !== '—' && (
                      <button
                        onClick={() => toggle(m.name + '|M')}
                        className="block text-[10px] text-blue-500 mt-1 hover:underline"
                      >
                        {expanded[m.name + '|M'] ? 'Show Less' : 'View Full'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{m.morningTime}</td>
                  <td className="px-4 py-3 max-w-[180px] align-top">
                    <div className="flex items-start gap-1.5">
                      <UpdateIcon status={m.eveningTime === '—' ? 'missing' : 'received'} />
                      <p className={`text-xs text-slate-600 leading-relaxed whitespace-pre-line ${
                        expanded[m.name + '|E'] ? '' : 'line-clamp-2'
                      }`}>
                        {m.eveningAchievement}
                      </p>
                    </div>
                    {m.eveningCount > 1 && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-white">
                        {m.eveningCount} updates
                      </span>
                    )}
                    {expanded[m.name + '|E'] && m.eveningEn && (
                      <div className="mt-2 bg-blue-50 border border-blue-100 rounded p-2">
                        <div className="text-[9px] font-semibold text-blue-600 uppercase tracking-wide mb-1">English</div>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{m.eveningEn}</p>
                      </div>
                    )}
                    {m.eveningAchievement !== '—' && (
                      <button
                        onClick={() => toggle(m.name + '|E')}
                        className="block text-[10px] text-blue-500 mt-1 hover:underline"
                      >
                        {expanded[m.name + '|E'] ? 'Show Less' : 'View Full'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{m.eveningTime}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status as any} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewModal(m)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                        <Eye size={12} /> View
                      </button>
                      {m.status !== 'complete' && m.status !== 'on-leave' && (
                        <button className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800">
                          <Send size={12} /> Remind
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                  {viewModal.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{viewModal.name}</div>
                  <div className="text-xs text-slate-500">{viewModal.role}</div>
                </div>
              </div>
              <button onClick={() => setViewModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sunrise size={14} className="text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Morning Target — {viewModal.morningTime}</span>
                </div>
                <p className="text-sm text-slate-700">{viewModal.morningTarget}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sunset size={14} className="text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">Evening Achievement — {viewModal.eveningTime}</span>
                </div>
                <p className="text-sm text-slate-700">{viewModal.eveningAchievement}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setViewModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
