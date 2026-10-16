import { useState } from 'react';
import { Users, Sunrise, Sunset, CheckCircle2, XCircle, AlertTriangle, Eye, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import StatusBadge from '../components/StatusBadge';
import DateBar from '../components/DateBar';
import { useDay, useWeek, uiStatus, addDays, weekRange, mondayOf, prettyDate } from '../api';

const filters = ['All Members', 'Complete', 'Partial', 'No Update', 'On Leave'];

export default function Dashboard() {
  const [filter, setFilter] = useState('All Members');
  const [toast, setToast] = useState('');

  // today, goTo and shift are what the date picker needs
  const { rows, date, today, error, updatedAt, goTo, shift } = useDay();
  const { week, monday } = useWeek(date);

  // Used to stop the week arrows running past the current week
  const mondayOfToday = today ? mondayOf(today) : '';

  // Every row turned into what the table expects
  const members = rows.map(r => ({
    name: r.name,
    role: r.designation,
    morning: r.morning ? 'received' : 'missing',
    evening: r.evening ? 'received' : 'missing',
    status: uiStatus(r),
    time: r.kind || '—'
  }));

  const count = (f: (s: string) => boolean) => members.filter(m => f(m.status)).length;
  const morningCount = rows.filter(r => r.morning).length;
  const eveningCount = rows.filter(r => r.evening).length;
  const bothCount = count(s => s === 'complete');
  const noneCount = count(s => s === 'no-update');
  const leaveCount = count(s => s === 'on-leave');
  const total = rows.length;
  const pct = total ? Math.round((bothCount / total) * 100) : 0;

  const kpiCards = [
    { label: 'Total Members', value: String(total), icon: Users, color: 'bg-blue-50 text-blue-600', border: 'border-blue-200', trend: '', sub: 'Project staff' },
    { label: 'Morning Updates', value: String(morningCount), icon: Sunrise, color: 'bg-green-50 text-green-600', border: 'border-green-200', trend: '', sub: `of ${total} received` },
    { label: 'Evening Updates', value: String(eveningCount), icon: Sunset, color: 'bg-amber-50 text-amber-600', border: 'border-amber-200', trend: '', sub: `of ${total} received` },
    { label: 'Both Completed', value: String(bothCount), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200', trend: `${pct}% completion`, sub: 'full compliance' },
    { label: 'No Update', value: String(noneCount), icon: XCircle, color: 'bg-red-50 text-red-500', border: 'border-red-200', trend: '', sub: 'members missing' },
    { label: 'On Leave', value: String(leaveCount), icon: AlertTriangle, color: 'bg-orange-50 text-orange-500', border: 'border-orange-200', trend: '', sub: 'marked as leave' }
  ];

  const dailyChartData = week;

  // Task data is not collected yet — this is still sample data
  const weeklyTaskData = [
    { name: 'Completed', value: bothCount, color: '#16a34a' },
    { name: 'Partial', value: count(s => s === 'partial'), color: '#f59e0b' },
    { name: 'No Update', value: noneCount, color: '#ef4444' },
    { name: 'On Leave', value: leaveCount, color: '#94a3b8' }
  ];

  const sendReminder = (name: string) => {
    setToast(`Reminder sent to ${name} successfully!`);
    setTimeout(() => setToast(''), 3000);
  };

  const filtered = filter === 'All Members'
    ? members
    : members.filter(m => {
        if (filter === 'Complete') return m.status === 'complete';
        if (filter === 'Partial') return m.status === 'partial';
        if (filter === 'No Update') return m.status === 'no-update';
        if (filter === 'On Leave') return m.status === 'on-leave';
        return true;
      });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          Could not reach the bot: {error}. Is it running?
        </div>
      )}
      {/* Page title + date selector */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor daily staff updates and weekly task progress</p>
        </div>
        <DateBar date={date} today={today} shift={shift} goTo={goTo} updatedAt={updatedAt} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className={`bg-white rounded-xl border ${card.border} p-4 shadow-sm`}>
            <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <card.icon size={18} />
            </div>
            <div className="text-2xl font-bold text-slate-800">{card.value}</div>
            <div className="text-xs font-medium text-slate-600 mt-0.5">{card.label}</div>
            <div className="text-[10px] text-slate-400 mt-1">{card.sub}</div>
            {card.trend && <div className="text-[10px] text-green-600 mt-1 font-medium">{card.trend}</div>}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily status bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Daily Update Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">{monday ? weekRange(monday) : ''}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goTo(addDays(date, -7))}
                title="Previous week"
                className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => goTo(addDays(date, 7) > today ? today : addDays(date, 7))}
                disabled={monday === mondayOfToday}
                title="Next week"
                className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyChartData} barSize={10} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                labelFormatter={(_l, p) => {
                  const d = p && p[0] && (p[0].payload as { date?: string }).date;
                  return d ? prettyDate(d) : '';
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="morning" fill="#16a34a" name="Morning" radius={[3,3,0,0]} />
              <Bar dataKey="evening" fill="#2563eb" name="Evening" radius={[3,3,0,0]} />
              <Bar dataKey="both" fill="#22c55e" name="Both" radius={[3,3,0,0]} />
              <Bar dataKey="none" fill="#ef4444" name="No Update" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly task pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            {date === today ? "Today's Breakdown" : 'Breakdown'}
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={weeklyTaskData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                {weeklyTaskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {weeklyTaskData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-[11px] text-slate-600">{d.name} <span className="font-semibold">{d.value}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's status table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">
            {date === today ? "Today's Update Status" : 'Update Status'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  filter === f
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-slate-200 text-slate-600 hover:border-green-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {['Member', 'Designation', 'Morning Update', 'Evening Update', 'Daily Status', 'Last Update', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {m.name[0]}
                      </div>
                      <span className="font-medium text-slate-800 whitespace-nowrap">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{m.role}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.morning as any} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.evening as any} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status as any} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{m.time}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => sendReminder(m.name)}
                        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium"
                      >
                        <Send size={13} /> Remind
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filtered.length} of {members.length} members{updatedAt && ` · updated ${updatedAt}`}</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50">Previous</button>
            <button className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-700 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium z-50">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}