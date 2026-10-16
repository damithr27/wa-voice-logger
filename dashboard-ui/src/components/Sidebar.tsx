import GcfLogo from './GcfLogo';
import {
  LayoutDashboard, CalendarCheck, Mic2, ClipboardList,
  Bell, Users, BarChart3, Settings, LogOut, ChevronRight
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'daily', label: 'Daily Monitoring', icon: CalendarCheck },
  { id: 'transcripts', label: 'Voice Transcripts', icon: Mic2 },
  { id: 'weekly', label: 'Weekly Task Tracker', icon: ClipboardList },
  { id: 'reminders', label: 'Reminder Center', icon: Bell },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  current: string;
  onNav: (id: string) => void;
  collapsed?: boolean;
}

export default function Sidebar({ current, onNav, collapsed = false }: SidebarProps) {
  return (
    <aside
      className={`flex flex-col h-screen bg-[#0f2d1a] transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} shrink-0`}
      style={{ boxShadow: '2px 0 16px rgba(0,0,0,0.18)' }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-green-900/60">
        {collapsed ? (
          <div className="flex justify-center">
            <GcfLogo size="sm" variant="icon" />
          </div>
        ) : (
          <GcfLogo size="md" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = current === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150 relative group
                ${active
                  ? 'text-white bg-green-700/60'
                  : 'text-green-200/70 hover:text-green-100 hover:bg-green-900/40'
                }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-400 rounded-r-full" />
              )}
              <Icon size={18} className={active ? 'text-green-300' : 'text-green-400/60 group-hover:text-green-300'} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <ChevronRight size={14} className="ml-auto text-green-400" />}
            </button>
          );
        })}
      </nav>

      {/* Admin profile */}
      <div className="border-t border-green-900/60 p-4">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">A</div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
              A
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">Admin User</div>
              <div className="text-xs text-green-400/70">Administrator</div>
            </div>
            <button className="text-green-400/50 hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
