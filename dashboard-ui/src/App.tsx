import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyMonitoring from './pages/DailyMonitoring';
import VoiceTranscripts from './pages/VoiceTranscripts';
import WeeklyTaskTracker from './pages/WeeklyTaskTracker';
import ReminderCenter from './pages/ReminderCenter';
import Members from './pages/Members';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

type Page = 'dashboard' | 'daily' | 'transcripts' | 'weekly' | 'reminders' | 'members' | 'reports' | 'settings';

const pageComponents: Record<Page, React.ComponentType> = {
  dashboard: Dashboard,
  daily: DailyMonitoring,
  transcripts: VoiceTranscripts,
  weekly: WeeklyTaskTracker,
  reminders: ReminderCenter,
  members: Members,
  reports: Reports,
  settings: Settings,
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  const PageComponent = pageComponents[page];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile sidebar overlay */}
      {!sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(true)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-30 md:z-auto h-full transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar
          current={page}
          onNav={(id) => { setPage(id as Page); if (window.innerWidth < 768) setSidebarOpen(false); }}
          collapsed={false}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header with mobile menu toggle */}
        <div className="relative">
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 md:hidden z-10 p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <Header />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
