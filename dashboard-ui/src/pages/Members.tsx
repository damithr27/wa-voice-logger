import { useState } from 'react';
import { UserPlus, Search, Eye, Pencil, UserX, Phone } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useDay, uiStatus } from '../api';

function ComplianceBar({ value, color = 'bg-green-500' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
        <div className={`h-full rounded-full ${value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{value}%</span>
    </div>
  );
}

export default function Members() {
  const { rows, error } = useDay();

  // Phone numbers live in team.json on the bot, not in the sheet
  const members = rows.map(r => {
    const done = (r.morning ? 1 : 0) + (r.evening ? 1 : 0);
    return {
      name: r.name,
      role: r.designation,
      phone: '—',
      wa: '—',
      compliance: done * 50,
      weeklyCompletion: done * 50,
      status: r.leave ? 'on-leave' : 'active',
      morning: r.morning ? 100 : 0,
      evening: r.evening ? 100 : 0
    };
  });

  const summaryCards = [
    { label: 'Total Members', value: members.length, color: 'border-blue-200 bg-blue-50 text-blue-600' },
    { label: 'Reported Today', value: rows.filter(r => r.morning || r.evening).length, color: 'border-green-200 bg-green-50 text-green-600' },
    { label: 'On Leave', value: rows.filter(r => r.leave).length, color: 'border-amber-200 bg-amber-50 text-amber-600' },
    { label: 'No Update', value: rows.filter(r => !r.morning && !r.evening && !r.leave).length, color: 'border-slate-200 bg-slate-50 text-slate-500' },
  ];

  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState<typeof members[0] | null>(null);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Project Members</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage staff members, monitor compliance and activity</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <UserPlus size={16} /> Add Member
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className={`border rounded-xl p-4 shadow-sm ${c.color}`}>
            <div className="text-3xl font-bold text-slate-800">{c.value}</div>
            <div className="text-xs font-medium mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or role..."
            className="pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-green-400 w-full"
          />
        </div>
        <select className="px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 outline-none">
          <option>All Status</option>
          <option>Active</option>
          <option>On Leave</option>
          <option>Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-left">
                {['Member', 'Designation', 'Phone', 'WhatsApp', 'Update Compliance', 'Weekly Task %', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {m.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{m.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{m.role}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{m.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <span className="bg-green-500 text-white text-[9px] px-1 py-0.5 rounded font-bold">WA</span>
                      {m.wa}
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-[120px]"><ComplianceBar value={m.compliance} /></td>
                  <td className="px-4 py-3 min-w-[120px]"><ComplianceBar value={m.weeklyCompletion} /></td>
                  <td className="px-4 py-3"><StatusBadge status={m.status as any} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setProfile(m)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                        <Eye size={12} />
                      </button>
                      <button className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800">
                        <Pencil size={12} />
                      </button>
                      <button className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                        <UserX size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile drawer */}
      {profile && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setProfile(null)}>
          <div className="bg-white h-full w-full max-w-md shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-[#0f2d1a] to-[#15803d] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Member Profile</h2>
                <button onClick={() => setProfile(null)} className="text-green-200 hover:text-white text-xl">×</button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-bold">
                  {profile.name[0]}
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{profile.name}</div>
                  <div className="text-green-200 text-sm">{profile.role}</div>
                  <StatusBadge status={profile.status as any} />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Contact */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</h3>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Phone size={14} className="text-slate-400" /> {profile.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">WA</span> {profile.wa}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Compliance Statistics</h3>
                {[
                  { label: 'Morning Submission', value: profile.morning },
                  { label: 'Evening Submission', value: profile.evening },
                  { label: 'Weekly Task Completion', value: profile.weeklyCompletion },
                  { label: 'Overall Compliance', value: profile.compliance },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{s.label}</span>
                      <span className="font-semibold text-slate-800">{s.value}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div
                        className={`h-full rounded-full ${s.value >= 80 ? 'bg-green-500' : s.value >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${s.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent activity */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Morning Update', time: '6:42 AM today', type: 'success' },
                    { label: 'Evening Update', time: '5:18 PM today', type: 'success' },
                    { label: 'Task: Field survey', time: 'In Progress', type: 'info' },
                    { label: 'Morning Update', time: '7:00 AM yesterday', type: 'success' },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${a.type === 'success' ? 'bg-green-500' : 'bg-blue-400'}`} />
                      <span className="text-slate-700 flex-1">{a.label}</span>
                      <span className="text-slate-400">{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-50">Edit Profile</button>
                <button className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">Send Reminder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
