import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FileDown, FileSpreadsheet, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle } from 'lucide-react';

const morningData = [
  { week: 'W1 Sep', rate: 82 },
  { week: 'W2 Sep', rate: 88 },
  { week: 'W3 Sep', rate: 78 },
  { week: 'W4 Sep', rate: 86 },
];

const completionData = [
  { day: 'Mon', morning: 30, evening: 28 },
  { day: 'Tue', morning: 32, evening: 29 },
  { day: 'Wed', morning: 28, evening: 25 },
  { day: 'Thu', morning: 31, evening: 27 },
  { day: 'Fri', morning: 27, evening: 24 },
];

const missedTrend = [
  { day: 'Mon', missed: 5 },
  { day: 'Tue', missed: 3 },
  { day: 'Wed', missed: 7 },
  { day: 'Thu', missed: 4 },
  { day: 'Fri', missed: 8 },
];

const summaryCards = [
  { label: 'Best Daily Compliance', value: '98%', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', sub: 'Kamani Silva' },
  { label: 'Total Missing Updates', value: '42', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', sub: 'This month' },
  { label: 'Total Completed Tasks', value: '218', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'September 2026' },
  { label: 'Total Overdue Tasks', value: '17', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50', sub: 'Needs attention' },
];

export default function Reports() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Comprehensive analysis of staff performance and update compliance</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors">
            <FileDown size={14} /> Export PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors">
            <FileSpreadsheet size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm items-center">
        <span className="text-xs font-semibold text-slate-500">Filters:</span>
        <select className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 outline-none focus:border-green-400">
          <option>September 2026</option>
          <option>August 2026</option>
        </select>
        <select className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 outline-none">
          <option>All Designations</option>
          <option>Field Officer</option>
          <option>Project Coordinator</option>
        </select>
        <select className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 outline-none">
          <option>All Members</option>
          <option>Nimal Perera</option>
          <option>Kamani Silva</option>
        </select>
        <select className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 outline-none">
          <option>All Updates</option>
          <option>Morning Plan</option>
          <option>Evening Achievement</option>
        </select>
        <button className="ml-auto px-4 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700">
          Generate Report
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${c.bg} ${c.color} flex items-center justify-center mb-3`}>
              <c.icon size={18} />
            </div>
            <div className="text-2xl font-bold text-slate-800">{c.value}</div>
            <div className="text-xs font-medium text-slate-600 mt-0.5">{c.label}</div>
            <div className="text-[10px] text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Morning Update Compliance — Weekly</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={morningData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="rate" fill="#16a34a" name="Compliance Rate" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Missed Update Trends — This Week</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={missedTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} name="Missed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Daily Update Completion — Morning vs Evening</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={completionData} barSize={20} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="morning" fill="#16a34a" name="Morning Updates" radius={[3,3,0,0]} />
            <Bar dataKey="evening" fill="#2563eb" name="Evening Updates" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Member compliance table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Member Compliance Summary — September 2026</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-left">
              {['Member', 'Designation', 'Morning %', 'Evening %', 'Overall %', 'Tasks Done', 'Tasks Overdue', 'Rank'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[
              { name: 'Kamani Silva', role: 'Project Coordinator', m: 98, e: 96, o: 97, tasks: 24, overdue: 0, rank: 1 },
              { name: 'Nimal Perera', role: 'Field Officer', m: 92, e: 88, o: 90, tasks: 22, overdue: 1, rank: 2 },
              { name: 'Chathura Rajapaksa', role: 'IT Officer', m: 96, e: 90, o: 93, tasks: 20, overdue: 0, rank: 2 },
              { name: 'Dilani Jayawardena', role: 'Data Analyst', m: 82, e: 74, o: 78, tasks: 18, overdue: 2, rank: 4 },
              { name: 'Ruwan Bandara', role: 'Community Officer', m: 78, e: 60, o: 69, tasks: 15, overdue: 3, rank: 5 },
              { name: 'Saman Wickrama', role: 'Field Supervisor', m: 60, e: 45, o: 53, tasks: 12, overdue: 4, rank: 6 },
            ].map((m, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {m.name[0]}
                    </div>
                    <span className="font-medium text-slate-800 text-sm">{m.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{m.role}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold text-sm ${m.m >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{m.m}%</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold text-sm ${m.e >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{m.e}%</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold text-sm ${m.o >= 80 ? 'text-green-600' : m.o >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{m.o}%</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 font-medium">{m.tasks}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${m.overdue > 0 ? 'text-red-500' : 'text-green-600'}`}>{m.overdue}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.rank === 1 ? 'bg-amber-100 text-amber-700' : m.rank === 2 ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>
                    #{m.rank}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
