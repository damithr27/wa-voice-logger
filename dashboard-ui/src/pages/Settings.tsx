import { Bell, Users, Shield, Smartphone, Save } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure system preferences and notifications</p>
      </div>

      {[
        {
          icon: Bell,
          title: 'Reminder Settings',
          fields: [
            { label: 'Morning reminder time', type: 'time', value: '09:00' },
            { label: 'Evening reminder time', type: 'time', value: '17:30' },
            { label: 'Auto-send reminders', type: 'toggle', value: true },
            { label: 'Reminder message template', type: 'textarea', value: 'Hi [Name], your daily update has not been received. Please submit when possible.' },
          ]
        },
        {
          icon: Smartphone,
          title: 'WhatsApp Integration',
          fields: [
            { label: 'WhatsApp API endpoint', type: 'text', value: 'https://api.whatsapp.gcfknuckles.lk/v1' },
            { label: 'API key', type: 'password', value: '••••••••••••••••' },
            { label: 'Default sender number', type: 'text', value: '+94 11 234 5678' },
          ]
        },
        {
          icon: Users,
          title: 'General Settings',
          fields: [
            { label: 'Organization name', type: 'text', value: 'GCF Knuckles Project' },
            { label: 'Working days', type: 'text', value: 'Monday – Friday' },
            { label: 'Timezone', type: 'select', value: 'Asia/Colombo' },
          ]
        },
        {
          icon: Shield,
          title: 'Admin Account',
          fields: [
            { label: 'Admin name', type: 'text', value: 'Admin User' },
            { label: 'Email address', type: 'email', value: 'admin@gcfknuckles.lk' },
            { label: 'New password', type: 'password', value: '' },
          ]
        },
      ].map(section => (
        <div key={section.title} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <section.icon size={16} />
            </div>
            <h2 className="text-sm font-semibold text-slate-700">{section.title}</h2>
          </div>
          <div className="p-5 space-y-4">
            {section.fields.map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{f.label}</label>
                {f.type === 'toggle' ? (
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${f.value ? 'bg-green-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${f.value ? 'left-5' : 'left-0.5'}`} />
                    </div>
                    <span className="text-sm text-slate-600">{f.value ? 'Enabled' : 'Disabled'}</span>
                  </div>
                ) : f.type === 'textarea' ? (
                  <textarea
                    defaultValue={f.value as string}
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-green-400 resize-none bg-slate-50"
                  />
                ) : f.type === 'select' ? (
                  <select defaultValue={f.value as string} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-green-400 bg-slate-50">
                    <option>Asia/Colombo</option>
                    <option>UTC</option>
                  </select>
                ) : (
                  <input
                    type={f.type}
                    defaultValue={f.value as string}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-green-400 bg-slate-50"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <Save size={14} /> Save Settings
        </button>
      </div>
    </div>
  );
}
