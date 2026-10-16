import { useEffect, useState } from 'react';
import { Search, Bell, Send, ChevronDown, X, Eye } from 'lucide-react';

/** The hour of the day in Colombo, whatever the viewer's own clock says. */
function colomboHour(now: Date): number {
  return +new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo', hour: '2-digit', hour12: false
  }).format(now);
}

/** "Monday, 16 October 2026", in Colombo. */
function colomboDate(now: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(now);
}

function greeting(hour: number): string {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const notifications = [
  { id: 1, icon: '🌅', msg: '5 staff members have not submitted their Morning Update.', time: '8:45 AM', type: 'warning' },
  { id: 2, icon: '🌆', msg: '7 staff members have not submitted their Evening Update.', time: '5:30 PM', type: 'warning' },
  { id: 3, icon: '📋', msg: '3 Monday tasks are still incomplete — deadline approaching.', time: 'Yesterday', type: 'danger' },
  { id: 4, icon: '⏰', msg: 'Weekly task deadline is approaching for 4 members.', time: '2h ago', type: 'info' },
  { id: 5, icon: '✅', msg: 'Nimal Perera submitted both morning and evening updates.', time: '3h ago', type: 'success' },
];

export default function Header() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Kept live, so a dashboard left open overnight still shows the right day
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0 relative z-30">
      {/* Greeting */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800">
          {greeting(colomboHour(now))}, Admin 👋
        </div>
        <div className="text-xs text-slate-400">{colomboDate(now)}</div>
      </div>

      {/* Search */}
      <div className="relative hidden md:block">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search members, tasks..."
          className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg w-64 outline-none focus:border-green-400 focus:bg-white transition-colors"
        />
      </div>

      {/* Send Reminder quick action */}
      <button
        onClick={() => showToast('Reminder sent successfully!')}
        className="hidden sm:flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        <Send size={13} />
        Send Reminder
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <span className="text-sm font-semibold text-slate-800">Notifications</span>
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">5</span>
              </div>
              <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.map(n => (
                <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-relaxed">{n.msg}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                  </div>
                  <button className="shrink-0 text-blue-500 hover:text-blue-700">
                    <Eye size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 text-center">
              <button className="text-xs text-green-600 font-medium hover:text-green-800">Mark all as read</button>
            </div>
          </div>
        )}
      </div>

      {/* Admin avatar */}
      <div className="flex items-center gap-2 cursor-pointer group">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-sm font-bold">
          A
        </div>
        <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600" />
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-green-700 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 z-50 animate-pulse">
          ✓ {toastMsg}
        </div>
      )}
    </header>
  );
}