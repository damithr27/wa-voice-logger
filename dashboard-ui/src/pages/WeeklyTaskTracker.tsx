import { useState } from 'react';
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, XCircle, Eye, Send, ChevronDown } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import StatusBadge from '../components/StatusBadge';

const kpis = [
  { label: 'Total Tasks', value: 105, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Completed', value: 48, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'In Progress', value: 32, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: 'Pending', value: 18, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Overdue', value: 7, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
];

const tasks = [
  { task: 'Erosion survey at Lagalla sector', member: 'Nimal Perera', source: 'Monday Morning Voice Update', start: '21 Sep', due: '25 Sep', status: 'in-progress', progress: 65, update: 'Field survey 65% complete' },
  { task: 'NGO partner coordination & MOU finalization', member: 'Kamani Silva', source: 'Admin Assigned Task', start: '21 Sep', due: '24 Sep', status: 'complete', progress: 100, update: 'MOU signed and submitted' },
  { task: 'Biodiversity data analysis — July dataset', member: 'Dilani Jayawardena', source: 'Monday Morning Voice Update', start: '21 Sep', due: '25 Sep', status: 'in-progress', progress: 40, update: 'Charts 40% complete' },
  { task: 'Community awareness sessions — 3 villages', member: 'Ruwan Bandara', source: 'Monday Morning Voice Update', start: '21 Sep', due: '25 Sep', status: 'pending', progress: 10, update: 'Only 1 of 3 sessions done' },
  { task: 'Dashboard maintenance and backup', member: 'Chathura Rajapaksa', source: 'Admin Assigned Task', start: '22 Sep', due: '22 Sep', status: 'complete', progress: 100, update: 'All tasks completed' },
  { task: 'Q3 Financial report compilation', member: 'Priya Fernando', source: 'Admin Assigned Task', start: '15 Sep', due: '20 Sep', status: 'overdue', progress: 30, update: 'Member on leave — no progress' },
  { task: 'Water level monitoring — 5 streams', member: 'Saman Wickrama', source: 'Monday Morning Voice Update', start: '21 Sep', due: '25 Sep', status: 'overdue', progress: 0, update: 'No update submitted' },
];

const fridayCheck = [
  { task: 'Community awareness sessions — 3 villages', member: 'Ruwan Bandara', mondayTarget: 'Complete 3 awareness sessions by Friday', status: 'overdue', daysPending: 3, update: 'Only 1 of 3 sessions conducted' },
  { task: 'Water level monitoring — 5 streams', member: 'Saman Wickrama', mondayTarget: 'Monitor all 5 stream sites and submit data', status: 'overdue', daysPending: 5, update: 'No update or progress reported' },
  { task: 'Q3 Financial report', member: 'Priya Fernando', mondayTarget: 'Finalize Q3 report draft for review', status: 'overdue', daysPending: 7, update: 'Member on leave, no progress' },
];

export default function WeeklyTaskTracker() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState('');

  const sendReminder = (name: string) => {
    setToast(`Reminder sent to ${name}!`);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredTasks = statusFilter === 'All' ? tasks : tasks.filter(t => t.status === statusFilter.toLowerCase().replace(' ', '-'));

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Weekly Task Progress</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor tasks planned at the beginning of the week and verify completion by Friday</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-xs text-slate-500">Week:</span>
          <span className="text-sm font-semibold text-slate-800">21 Sep – 25 Sep 2026</span>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>

      {/* KPIs + completion gauge */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}>
              <k.icon size={18} />
            </div>
            <div className="text-2xl font-bold text-slate-800">{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
        {/* Completion gauge */}
        <div className="bg-white border border-green-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
          <div className="relative w-20 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{ value: 72, fill: '#16a34a' }]}>
                <RadialBar dataKey="value" cornerRadius={4} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-green-700">72%</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1 text-center">Weekly<br/>Completion</div>
        </div>
      </div>

      {/* Task table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Weekly Task List</h2>
          <div className="flex flex-wrap gap-2">
            {['All', 'Complete', 'In Progress', 'Pending', 'Overdue'].map(f => (
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
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-left">
                {['Task', 'Member', 'Source', 'Start', 'Due', 'Status', 'Progress', 'Latest Update', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTasks.map((t, i) => (
                <tr key={i} className={`hover:bg-slate-50/50 transition-colors ${t.status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">{t.task}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {t.member[0]}
                      </div>
                      <span className="text-xs text-slate-700 whitespace-nowrap">{t.member.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      t.source.includes('Voice') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {t.source.includes('Voice') ? '🎙 Voice Update' : '👤 Admin'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{t.start}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{t.due}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status as any} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${t.status === 'overdue' ? 'bg-red-400' : t.status === 'complete' ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">{t.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px]">
                    <p className="line-clamp-2">{t.update}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                        <Eye size={12} /> View
                      </button>
                      {t.status !== 'complete' && (
                        <button onClick={() => sendReminder(t.member)} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800">
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

      {/* Friday completion check */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Friday Completion Check</h2>
            <p className="text-xs text-slate-500">Tasks from Monday's morning update not yet completed by Friday</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {fridayCheck.map((t, i) => (
            <div key={i} className="bg-white border border-red-200 rounded-xl p-4 shadow-sm ring-1 ring-red-100">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 leading-tight flex-1 pr-2">{t.task}</h3>
                <span className="shrink-0 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-semibold rounded-full">OVERDUE</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                  {t.member[0]}
                </div>
                <span className="text-xs text-slate-600">{t.member}</span>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-3">
                <div className="text-[10px] font-semibold text-amber-600 mb-1">Monday Target</div>
                <p className="text-xs text-slate-600">{t.mondayTarget}</p>
              </div>
              <div className="text-xs text-red-600 mb-3 font-medium">⚠ {t.daysPending} days overdue — {t.update}</div>
              <div className="flex gap-2">
                <button className="flex-1 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">View Details</button>
                <button onClick={() => sendReminder(t.member)} className="flex-1 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium">
                  Send Reminder
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-700 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium z-50">✓ {toast}</div>
      )}
    </div>
  );
}
