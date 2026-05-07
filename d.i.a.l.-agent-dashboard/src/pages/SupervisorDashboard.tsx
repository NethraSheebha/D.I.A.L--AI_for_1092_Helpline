import React from 'react';
import { cn } from '../utils/cn';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  BarChart3,
  ShieldAlert,
  Zap,
  CheckCircle2,
  MapPin,
  Search
} from 'lucide-react';
import { MOCK_AGENTS, MOCK_ANALYTICS } from '../mocks';

export const SupervisorDashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
            <ShieldAlert className="text-blue-500" size={32} />
            SUPERVISOR COMMAND
          </h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-[0.3em] mt-1">Cross-Sector Operational Intelligence // LEVEL 4 ACCESS</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-red-600/5 border border-red-600/20 px-6 py-2.5 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.05)]">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-red-500 text-[10px] font-black uppercase tracking-[0.2em]">3 PRIORITY ESCALATIONS ACTIVE</span>
          </div>
          <button className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white transition-all">
            <Search size={20} />
          </button>
        </div>
      </div>

      {/* High-Level Fleet Stats */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Active Agents', value: '42 / 50', icon: Users, color: 'blue' },
          { label: 'Queue Pressure', value: 'ELEVATED', icon: TrendingUp, color: 'red' },
          { label: 'Avg Wait Time', value: '01:12s', icon: Clock, color: 'amber' },
          { label: 'System Health', value: '99.9%', icon: CheckCircle2, color: 'green' },
        ].map((s, i) => (
          <div key={i} className="bg-[#0a0a0b] border border-[#1a1a1c] p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${s.color}-500/5 blur-[40px] group-hover:bg-${s.color}-500/10 transition-all`} />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{s.label}</span>
              <s.icon size={18} className={cn(s.color === 'blue' ? 'text-blue-500' : s.color === 'red' ? 'text-red-500' : s.color === 'amber' ? 'text-amber-500' : 'text-green-500')} />
            </div>
            <div className="text-3xl font-bold text-white tracking-tighter">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Agent Monitoring Grid */}
        <div className="col-span-2 space-y-6">
          <div className="bg-[#0a0a0b] border border-[#1a1a1c] rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-8 py-6 bg-zinc-900/20 border-b border-[#1a1a1c] flex items-center justify-between">
              <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={14} className="text-blue-500" />
                Live Fleet Tracking
              </h2>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Wrap-up</span>
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              {MOCK_AGENTS.map(agent => (
                <div key={agent.id} className="bg-zinc-950/50 border border-zinc-900 p-5 rounded-2xl space-y-4 hover:border-blue-500/30 transition-all group cursor-pointer relative overflow-hidden">
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1",
                    agent.status === 'ACTIVE' ? "bg-green-500" : agent.status === 'WRAP-UP' ? "bg-amber-500" : "bg-zinc-800"
                  )} />
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-blue-500 transition-colors">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight">{agent.name}</h3>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{agent.id} // SEC-B</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                      agent.status === 'ACTIVE' ? "text-green-500 border-green-500/20 bg-green-500/5" :
                      agent.status === 'WRAP-UP' ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
                      "text-zinc-500 border-zinc-800 bg-zinc-900"
                    )}>
                      {agent.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Workload</span>
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        agent.workload === 'High' ? "text-orange-500" : agent.workload === 'Critical' ? "text-red-500" : "text-blue-500"
                      )}>{agent.workload}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Assigned</span>
                      <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-tight">{agent.callId || 'None'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operational Intelligence */}
        <div className="space-y-6">
          <div className="bg-[#0a0a0b] border border-[#1a1a1c] rounded-3xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[50px]" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600/10 border border-blue-600/20 text-blue-500">
                <MapPin size={20} />
              </div>
              <div>
                <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Grid Pressure</h2>
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Bangalore Sector C-4</p>
              </div>
            </div>

            <div className="grid grid-cols-4 grid-rows-4 gap-2 h-48">
              {[...Array(16)].map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "rounded-md border transition-all duration-1000",
                    i === 5 || i === 10 ? "bg-red-600/20 border-red-600/30 shadow-[0_0_15px_rgba(220,38,38,0.2)] animate-pulse" :
                    i % 3 === 0 ? "bg-blue-600/20 border-blue-600/30 shadow-[0_0_15px_rgba(37,99,235,0.1)]" :
                    "bg-zinc-900/50 border-zinc-800/50"
                  )}
                />
              ))}
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-zinc-500" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Queue Load</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-white">82%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all duration-1000" style={{ width: '82%' }} />
              </div>
            </div>
          </div>

          {/* Quick Alerts */}
          <div className="bg-red-600/5 border border-red-600/20 p-6 rounded-3xl flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={24} className="text-red-500 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-1">Critical Event</p>
              <p className="text-xs font-bold text-zinc-300 leading-snug">Severe Stress Detection in Sector 8 Metro Junction.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
