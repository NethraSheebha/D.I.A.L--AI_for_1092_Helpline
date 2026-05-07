import React from 'react';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Cpu, 
  Volume2, 
  Save,
  Globe2,
  Lock,
  Eye
} from 'lucide-react';
import { cn } from '../utils/cn';

export const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
            <Settings className="text-blue-500" size={32} />
            SYSTEM CONFIGURATION
          </h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-medium">
            Agent Preferences // Terminal Settings
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow-[0_0_25px_rgba(37,99,235,0.3)] uppercase tracking-widest">
          <Save size={16} />
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Nav Tabs */}
        <div className="col-span-1 space-y-2">
          {[
            { label: 'Profile Settings', icon: User, active: true },
            { label: 'Notifications', icon: Bell, active: false },
            { label: 'Security & Access', icon: Shield, active: false },
            { label: 'AI Thresholds', icon: Cpu, active: false },
            { label: 'Audio Monitoring', icon: Volume2, active: false },
            { label: 'Regional Prefs', icon: Globe2, active: false },
          ].map((item) => (
            <button 
              key={item.label}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl transition-all border group",
                item.active 
                  ? "bg-blue-600/10 border-blue-600/20 text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.05)]" 
                  : "bg-zinc-900/30 border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              )}
            >
              <item.icon size={18} className={cn(item.active ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300")} />
              <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="col-span-2 space-y-8">
          {/* Section: Agent Identity */}
          <div className="bg-[#0a0a0b] border border-[#1a1a1c] p-8 rounded-3xl space-y-6">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Agent Identity</h3>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative group cursor-pointer">
                <User size={32} className="text-zinc-700 group-hover:text-blue-500 transition-colors" />
                <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Update</span>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Operator Name</label>
                    <input type="text" defaultValue="Balarathi P" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Operator ID</label>
                    <input type="text" defaultValue="GOV-7721" disabled className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2 text-xs font-bold text-zinc-500 cursor-not-allowed" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: AI Thresholds */}
          <div className="bg-[#0a0a0b] border border-[#1a1a1c] p-8 rounded-3xl space-y-6">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">AI Operational Thresholds</h3>
            <div className="space-y-8">
              {[
                { label: 'Auto-Escalation Confidence', desc: 'Threshold for system-triggered agent handoff', value: 85 },
                { label: 'Sentiment Panic Sensitivity', desc: 'Intensity detection for immediate critical tagging', value: 92 },
              ].map((slider) => (
                <div key={slider.label} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{slider.label}</p>
                      <p className="text-[10px] text-zinc-600 font-medium mt-1">{slider.desc}</p>
                    </div>
                    <span className="text-sm font-mono font-bold text-blue-500">{slider.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${slider.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Security */}
          <div className="bg-[#0a0a0b] border border-[#1a1a1c] p-8 rounded-3xl space-y-4">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Security</h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900">
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-zinc-500" />
                <div>
                  <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Multi-Factor Authentication</p>
                  <p className="text-[9px] text-zinc-600 font-medium tracking-wider">Required for Supervisor Access</p>
                </div>
              </div>
              <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-900">
              <div className="flex items-center gap-3">
                <Eye size={16} className="text-zinc-500" />
                <div>
                  <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Terminal Privacy Mode</p>
                  <p className="text-[9px] text-zinc-600 font-medium tracking-wider">Hide sensitive citizen PII in dashboard</p>
                </div>
              </div>
              <div className="w-10 h-5 bg-zinc-800 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 w-3 h-3 bg-zinc-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
