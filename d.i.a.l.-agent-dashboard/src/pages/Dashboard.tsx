import React from 'react';
import { useStore } from '../stores/useStore';
import { PriorityQueue } from '../components/PriorityQueue';
import { ActiveIncident } from '../components/ActiveIncident';
import { LiveTelemetry } from '../components/LiveTelemetry';
import { SignalBreakdown } from '../components/SignalBreakdown';
import { VerificationPanel } from '../components/VerificationPanel';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Bot, 
  Activity, 
  Zap,
  LayoutDashboard,
  BellRing
} from 'lucide-react';
import { cn } from '../utils/cn';

const Dashboard: React.FC = () => {
  const { selectedCallId, activeCalls, showReport, setShowReport } = useStore();
  const call = selectedCallId ? activeCalls[selectedCallId] : null;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Dashboard Top HUD */}
      <div className="flex items-center justify-between shrink-0 bg-[#0a0a0b] border border-[#1a1a1c] px-8 py-4 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px] pointer-events-none" />
        
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-500">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">D.I.A.L OPS</h2>
            </div>
          </div>

          <div className="h-10 w-[1px] bg-zinc-800" />

          {/* New Consolidated Metadata Bar */}
          <div className="flex items-center gap-10">
            {/* Session Info */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">
                {call ? 'Current Session' : 'Recent Escalation'}
              </span>
              <div className="flex items-center gap-2 text-zinc-300">
                <ShieldAlert size={14} className={cn(
                  call?.vitals.stress > 0.7 ? "text-red-500" : 
                  call?.vitals.stress > 0.4 ? "text-amber-500" : "text-blue-500"
                )} />
                <span className="text-[11px] font-bold uppercase">
                  {call ? `${call.call_id} // ${call.turns?.[call.turns.length - 1]?.intent?.intent || 'Active'}` : 'TOKEN-8821 // ROAD COLLAPSE'}
                </span>
              </div>
            </div>

            {/* Language Info */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Detected Language</span>
              <div className="flex items-center gap-2 text-zinc-300">
                <Bot size={14} className="text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-widest">
                   {call?.dialect || 'Awaiting Uplink'}
                </span>
              </div>
            </div>

            {/* Urgency Index */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Urgency Index</span>
              <div className="flex items-center gap-2">
                 <span className={cn(
                   "text-[11px] font-black uppercase",
                   call?.vitals.stress > 0.7 ? "text-red-500" : 
                   call?.vitals.stress > 0.4 ? "text-amber-500" : "text-green-500"
                 )}>
                   {call ? `${(call.vitals.stress * 100).toFixed(0)}% ${call.vitals.stress > 0.7 ? "CRITICAL" : "MODERATE"}` : "---"}
                 </span>
              </div>
            </div>

            {/* AI Prediction Short */}
            <div className="flex flex-col max-w-[200px]">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">AI Recommendation</span>
              <p className="text-[10px] text-zinc-400 font-bold uppercase truncate">
                {call ? 'Validate Location coordinates' : 'Ready for Intercept'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Queue Load</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={cn("w-1 h-3 rounded-full", i <= 3 ? "bg-amber-500" : "bg-zinc-800")} />
                  ))}
                </div>
                <span className="text-xs font-mono font-bold text-amber-500">MODERATE</span>
              </div>
            </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-6">
        {/* Left: Queue (Compact) */}
        <div className="w-80 shrink-0">
          <PriorityQueue />
        </div>

        {/* Center: Operational Telemetry */}
        <div className="w-[400px] shrink-0 flex flex-col gap-6">
          <LiveTelemetry />
          
          <div className="bg-[#0a0a0b] border border-[#1a1a1c] p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-blue-500" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Network Stability</span>
            </div>
            <div className="flex items-end gap-1 h-8">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 bg-blue-600/20 rounded-full",
                    i % 4 === 0 ? "h-8 bg-blue-600/40" : "h-4"
                  )} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Conversation Terminal (Clean Full-Height) */}
        <div className="flex-1 min-w-0">
          <ActiveIncident />
        </div>
      </div>

      {showReport && call && (
        <SignalBreakdown 
          call={call} 
          onClose={() => setShowReport(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
