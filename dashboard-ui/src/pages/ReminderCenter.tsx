import { useState } from 'react';
import { Send, Clock, CheckCircle, Users, MessageCircle, ChevronDown } from 'lucide-react';

const reminderCategories = [
  { id: 'morning', label: 'Missing Morning Update', count: 8, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'evening', label: 'Missing Evening Update', count: 11, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'both', label: 'Missing Both Updates', count: 5, color: 'bg-red-100 text-red-600 border-red-200' },
  { id: 'weekly', label: 'Pending Weekly Task', count: 18, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'overdue', label: 'Overdue Task', count: 7, color: 'bg-red-100 text-red-700 border-red-200' },
];

const missingMembers = [
  { name: 'Saman Wickrama', role: 'Field Supervisor', type: 'Both Updates', phone: '+94 77 123 4567' },
  { name: 'Amaya Dissanayake', role: 'Environment Officer', type: 'Both Updates', phone: '+94 71 234 5678' },
  { name: 'Ruwan Bandara', role: 'Community Officer', type: 'Evening Update', phone: '+94 76 345 6789' },
  { name: 'Dilani Jayawardena', role: 'Data Analyst', type: 'Evening Update', phone: '+94 70 456 7890' },
  { name: 'Priya Fernando', role: 'Finance Officer', type: 'On Leave', phone: '+94 72 567 8901' },
];

const reminderHistory = [
  { member: 'Saman Wickrama', type: 'Morning Update', date: '22 Sep 2026', time: '9:00 AM', status: 'delivered' },
  { member: 'Amaya Dissanayake', type: 'Morning Update', date: '22 Sep 2026', time: '9:00 AM', status: 'delivered' },
  { member: 'Ruwan Bandara', type: 'Weekly Task', date: '21 Sep 2026', time: '4:30 PM', status: 'sent' },
  { member: 'Saman Wickrama', type: 'Weekly Task', date: '20 Sep 2026', time: '3:00 PM', status: 'delivered' },
  { member: 'Priya Fernando', type: 'Evening Update', date: '19 Sep 2026', time: '5:45 PM', status: 'sent' },
];

export default function ReminderCenter() {
  const [selected, setSelected] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('morning');
  const [recipient, setRecipient] = useState('');
  const [reminderType, setReminderType] = useState('Missing Daily Update');
  const [message, setMessage] = useState('Hi [Member Name], your daily work update has not yet been received. Please submit your update when possible. Thank you.');
  const [toast, setToast] = useState('');
  const [confirmModal, setConfirmModal] = useState(false);

  const toggleSelect = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const selectAll = () => {
    if (selected.length === missingMembers.length) setSelected([]);
    else setSelected(missingMembers.map(m => m.name));
  };

  const sendReminder = () => {
    setConfirmModal(false);
    setToast(`Reminder sent to ${selected.length > 0 ? selected.length + ' members' : 'selected member'} via WhatsApp!`);
    setSelected([]);
    setTimeout(() => setToast(''), 3500);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reminder Center</h1>
        <p className="text-sm text-slate-500 mt-0.5">Send WhatsApp reminders to staff members for missing updates and overdue tasks</p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {reminderCategories.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`text-left p-4 rounded-xl border shadow-sm transition-all ${
              activeCategory === c.id ? 'ring-2 ring-green-400 ' + c.color : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-2xl font-bold text-slate-800 mb-1">{c.count}</div>
            <div className={`text-xs font-medium ${activeCategory === c.id ? '' : 'text-slate-600'}`}>{c.label}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Member selection */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users size={15} className="text-slate-400" /> Missing Members
            </h2>
            <button onClick={selectAll} className="text-xs text-green-600 font-medium hover:text-green-800">
              {selected.length === missingMembers.length ? 'Deselect All' : 'Select All Missing'}
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {missingMembers.map(m => (
              <div
                key={m.name}
                className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                  selected.includes(m.name) ? 'bg-green-50' : 'hover:bg-slate-50'
                }`}
                onClick={() => toggleSelect(m.name)}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(m.name)}
                  onChange={() => toggleSelect(m.name)}
                  className="w-4 h-4 accent-green-600"
                  onClick={e => e.stopPropagation()}
                />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {m.name[0]}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.role}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  m.type.includes('Both') ? 'bg-red-100 text-red-600' :
                  m.type.includes('Evening') ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {m.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Message composer */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MessageCircle size={15} className="text-green-500" />
            Message Composer
            <span className="ml-1 text-[11px] font-normal text-slate-400 flex items-center gap-1">
              via
              <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">WhatsApp</span>
            </span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Recipient</label>
            <div className="relative">
              <input
                value={selected.length > 0 ? `${selected.length} member(s) selected` : recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="Select members or type name..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-green-400 bg-slate-50"
              />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Reminder Type</label>
            <select
              value={reminderType}
              onChange={e => setReminderType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-green-400 bg-slate-50"
            >
              <option>Missing Daily Update</option>
              <option>Missing Morning Update</option>
              <option>Missing Evening Update</option>
              <option>Pending Weekly Task</option>
              <option>Overdue Task</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-green-400 resize-none bg-slate-50 leading-relaxed"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setConfirmModal(true)}
              disabled={selected.length === 0 && !recipient}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Send size={14} /> Send Reminder
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50">
              <Clock size={14} /> Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Reminder history */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Reminder History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-left">
              {['Member', 'Reminder Type', 'Sent Date', 'Sent Time', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reminderHistory.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {r.member[0]}
                    </div>
                    <span className="text-sm font-medium text-slate-800">{r.member}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{r.type}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{r.date}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{r.time}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    r.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {r.status === 'delivered' ? <CheckCircle size={11} /> : <Clock size={11} />}
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Confirm Send Reminder</h3>
            <p className="text-sm text-slate-600 mb-1">
              You are about to send a WhatsApp reminder to <strong>{selected.length} member(s)</strong>.
            </p>
            <p className="text-xs text-slate-400 mb-5">This action will send a message via WhatsApp and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={sendReminder} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
                ✓ Confirm Send
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-700 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium z-50">✓ {toast}</div>
      )}
    </div>
  );
}
