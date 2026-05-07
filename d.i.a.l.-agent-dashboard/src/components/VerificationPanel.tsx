import React from 'react';
import { useStore } from '../stores/useStore';
import { cn } from '../utils/cn';
import { CheckCircle2, AlertCircle, XCircle, ShieldCheck } from 'lucide-react';

export const VerificationPanel: React.FC = () => {
  const { activeCalls, selectedCallId } = useStore();
  const call = selectedCallId ? activeCalls[selectedCallId] : null;

  if (!call || call.state !== 'verifying') return null;

  return (
    <div className="w-80 h-full flex flex-col bg-[#0a0a0c] border-l border-[#1a1a1c] animate-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="bg-blue-600/5 border-b border-blue-600/10 p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(37,99,235,1)]" />
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Verification HUD</span>
        </div>
        <ShieldCheck size={16} className="text-blue-500" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">AI Confidence</p>
            <span className="text-xs font-mono font-bold text-blue-500">92%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
             <div className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all" style={{ width: '92%' }} />
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <button className="w-full flex items-center gap-4 p-5 rounded-3xl bg-green-600/5 border border-green-600/20 text-green-500 hover:bg-green-600/10 transition-all group">
            <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest">Approve</p>
              <p className="text-[8px] text-green-500/60 font-bold uppercase tracking-tighter">Matches Need</p>
            </div>
          </button>
          
          <button className="w-full flex items-center gap-4 p-5 rounded-3xl bg-amber-600/5 border border-amber-600/20 text-amber-500 hover:bg-amber-600/10 transition-all group">
            <AlertCircle size={24} className="group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest">Partial</p>
              <p className="text-[8px] text-amber-500/60 font-bold uppercase tracking-tighter">Need Info</p>
            </div>
          </button>

          <button className="w-full flex items-center gap-4 p-5 rounded-3xl bg-red-600/5 border border-red-600/20 text-red-500 hover:bg-red-600/10 transition-all group">
            <XCircle size={24} className="group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest">Reject</p>
              <p className="text-[8px] text-red-500/60 font-bold uppercase tracking-tighter">Mismatch</p>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 bg-zinc-950/80 border-t border-[#1a1a1c]">
        <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] leading-relaxed text-center">
          HUMAN VALIDATION <br/> OVERRIDE MODE
        </p>
      </div>
    </div>
  );
};
