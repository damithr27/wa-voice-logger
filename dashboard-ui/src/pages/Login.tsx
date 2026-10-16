import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('admin@gcfknuckles.lk');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 1200);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-3/5 bg-gradient-to-br from-[#0a2014] via-[#0f2d1a] to-[#14532d] p-14 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Mountains */}
          <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 800 300" preserveAspectRatio="none">
            <polygon points="0,300 150,120 300,300" fill="#15803d" opacity="0.4"/>
            <polygon points="100,300 280,80 460,300" fill="#16a34a" opacity="0.35"/>
            <polygon points="300,300 500,100 700,300" fill="#22c55e" opacity="0.25"/>
            <polygon points="500,300 680,130 800,300" fill="#15803d" opacity="0.3"/>
            <path d="M0 260 Q200 240 400 260 Q600 280 800 260 L800 300 L0 300 Z" fill="#2563eb" opacity="0.3"/>
          </svg>
          {/* Sun */}
          <svg className="absolute top-20 right-24" width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="28" fill="#f59e0b" opacity="0.25"/>
            <circle cx="60" cy="60" r="18" fill="#f59e0b" opacity="0.3"/>
            {[0,45,90,135,180,225,270,315].map(angle => (
              <line key={angle}
                x1={60 + 24 * Math.cos(angle * Math.PI/180)}
                y1={60 + 24 * Math.sin(angle * Math.PI/180)}
                x2={60 + 40 * Math.cos(angle * Math.PI/180)}
                y2={60 + 40 * Math.sin(angle * Math.PI/180)}
                stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" opacity="0.3"
              />
            ))}
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <svg width="72" height="72" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="12" fill="white" opacity="0.1"/>
              <circle cx="32" cy="20" r="9" fill="#f59e0b" opacity="0.9"/>
              {[0,45,90,135,180,225,270,315].map(a => (
                <line key={a}
                  x1={32 + 13 * Math.cos(a * Math.PI/180)} y1={20 + 13 * Math.sin(a * Math.PI/180)}
                  x2={32 + 18 * Math.cos(a * Math.PI/180)} y2={20 + 18 * Math.sin(a * Math.PI/180)}
                  stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"
                />
              ))}
              <polygon points="2,52 19,26 36,52" fill="#15803d"/>
              <polygon points="14,52 33,28 52,52" fill="#16a34a"/>
              <polygon points="28,52 46,32 64,52" fill="#22c55e" opacity="0.8"/>
              <path d="M0 52 Q16 46 32 52 Q48 58 64 52 L64 64 L0 64 Z" fill="#2563eb" opacity="0.8"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">GCF Knuckles</h1>
          <h2 className="text-xl font-medium text-green-300 mb-4">Staff Voice Update Monitoring System</h2>
          <p className="text-green-200/60 text-sm max-w-sm leading-relaxed">
            Monitor daily staff voice updates, transcripts and weekly task progress from one place. Built for the Knuckles Range conservation project.
          </p>
        </div>

        {/* Stats at bottom */}
        <div className="relative z-10 grid grid-cols-3 gap-6">
          {[
            { label: 'Active Staff', value: '35' },
            { label: 'Tasks This Week', value: '128' },
            { label: 'Compliance Rate', value: '87%' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-green-300/70 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <svg className="mx-auto mb-3" width="56" height="56" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="12" fill="#0f2d1a"/>
              <circle cx="32" cy="20" r="9" fill="#f59e0b"/>
              <polygon points="2,52 19,26 36,52" fill="#15803d"/>
              <polygon points="14,52 33,28 52,52" fill="#16a34a"/>
              <path d="M0 52 Q16 46 32 52 Q48 58 64 52 L64 64 L0 64 Z" fill="#2563eb"/>
            </svg>
            <h1 className="text-xl font-bold text-slate-800">GCF Knuckles</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="mb-7">
              <h3 className="text-2xl font-bold text-slate-800">Admin Login</h3>
              <p className="text-sm text-slate-500 mt-1">Sign in to your monitoring dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all bg-slate-50 focus:bg-white"
                  placeholder="admin@gcfknuckles.lk"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 text-sm border border-slate-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all bg-slate-50 focus:bg-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-green-600 w-4 h-4" />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <button type="button" className="text-sm text-green-600 font-medium hover:text-green-800">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm shadow-green-200"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10"/>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <><LogIn size={16} /> Sign In</>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            GCF Knuckles Project · Monitoring System v2.4
          </p>
        </div>
      </div>
    </div>
  );
}
