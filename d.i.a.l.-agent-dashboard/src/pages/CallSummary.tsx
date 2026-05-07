import React from 'react';
import { cn } from '../utils/cn';
import { 
  FileText, 
  Download, 
  Printer, 
  Share2, 
  MessageSquare,
  Clock,
  Zap,
  Brain,
  ShieldCheck
} from 'lucide-react';

export const CallSummary: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Report Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-500">
            <ShieldCheck size={20} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Official Incident Report // D.I.A.L.</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Incident Summary: ANON-8821</h1>
          <div className="flex items-center gap-4 text-zinc-500 text-[11px] font-mono">
            <span className="flex items-center gap-1"><Clock size={12} /> 2026-05-07 15:12:04</span>
            <span className="h-3 w-[1px] bg-zinc-800" />
            <span className="text-blue-400">Kannada - Dharwad Dialect</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-xl">
            <Printer size={18} />
          </button>
          <button className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-xl">
            <Download size={18} />
          </button>
          <button className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 flex items-center gap-2 px-4">
            <Share2 size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Share</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Core Intelligence */}
        <div className="col-span-2 space-y-6">
          <div className="bg-[#0a0a0b] border border-[#1a1a1c] rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-blue-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">AI Linguistic Summary</h2>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">
              The caller reported a critical road hazard near Silk Board Junction. Acoustic signals indicated high stress (0.82) and urgency. Linguistic patterns suggest the caller was concerned about two-wheeler safety due to a large pothole. The system successfully matched the intent with "Infrastructure Safety" and automatically recommended an immediate field dispatch.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Verified Transcript Segments</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 text-xs text-zinc-400">
                  <span className="text-blue-500 font-bold mr-2">CITIZEN:</span>
                  "...massive pothole... middle of the road... causing a lot of trouble for two-wheelers."
                </div>
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 text-xs text-zinc-400">
                  <span className="text-zinc-600 font-bold mr-2">AGENT:</span>
                  "Understood. We are dispatching a team to your location immediately."
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#0a0a0b] border border-[#1a1a1c] rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Incident Vitals</h2>
            </div>
            
            <div className="space-y-4">
              {[
                { label: 'Avg Stress', val: '82%', color: 'bg-red-500' },
                { label: 'Intent Conf', val: '96%', color: 'bg-blue-500' },
                { label: 'Wait Time', val: '0m 45s', color: 'bg-green-500' },
                { label: 'Dialect Match', val: 'High', color: 'bg-blue-500' },
              ].map(m => (
                <div key={m.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-600">{m.label}</span>
                    <span className="text-zinc-300">{m.val}</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div className={cn("h-full", m.color)} style={{ width: '80%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-600/5 border border-blue-600/20 rounded-2xl p-6 text-center">
             <FileText size={24} className="text-blue-500 mx-auto mb-3" />
             <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Incident Resolution</p>
             <p className="text-xs text-blue-100/70 mt-2">Verified and logged as High-Priority Infrastructure Hazard. Ticket ID: 7721-A</p>
          </div>
        </div>
      </div>
    </div>
  );
};
