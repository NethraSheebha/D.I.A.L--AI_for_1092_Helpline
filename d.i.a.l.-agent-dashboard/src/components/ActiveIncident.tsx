import React, { useEffect, useRef } from 'react';
import { useStore } from '../stores/useStore';
import { cn } from '../utils/cn';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  User, 
  Bot, 
  AlertCircle, 
  ShieldCheck, 
  Globe2,
  Activity,
  ChevronDown
} from 'lucide-react';
import { VerificationPanel } from './VerificationPanel';
import { LiveAudioPlayer } from './LiveAudioPlayer';

export const ActiveIncident: React.FC = () => {
  const { activeCalls, selectedCallId } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const call = selectedCallId ? activeCalls[selectedCallId] : null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [call?.turns]);

  if (!call) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#050506] rounded-3xl border border-[#1a1a1c] border-dashed relative overflow-hidden group">
        <div className="absolute inset-0 bg-blue-600/5 blur-[120px] opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-20 h-20 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mb-6 text-zinc-700">
           <Activity size={32} />
        </div>
        <p className="text-zinc-500 font-black uppercase tracking-[0.4em] text-[10px]">Frequency Silent</p>
        <p className="text-zinc-700 text-[9px] mt-4 uppercase tracking-widest font-bold">Select Active Incident to Intercept Stream</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0c] border border-[#1a1a1c] rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative">
      {/* Terminal Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] animate-scanline bg-gradient-to-b from-transparent via-blue-500 to-transparent h-20 w-full z-50" />

      {/* Main Content Area: Full-Width Transcript Stream */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Live Transcript Stream */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth scrollbar-hide relative bg-[#0a0a0c]"
        >
          <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-[#0a0a0c] to-transparent pointer-events-none z-10" />
          
          {call.turns.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
               <Bot size={48} />
               <p className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Live Uplink...</p>
            </div>
          )}

          {call.turns.map((turn, i) => (
            <div key={turn.turn_id} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto w-full">
              {/* Citizen Turn */}
              <div className="flex gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-lg group-hover:border-zinc-700 transition-all">
                  <User size={20} className="text-zinc-500" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Source Transceiver</span>
                    <span className="text-[10px] font-mono text-zinc-700">{turn.timestamp.split('T')[1]?.split('.')[0] || '12:00:00'}</span>
                    {turn.sentiment?.label && (
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest",
                        turn.sentiment.label === 'Panicked' || turn.sentiment.label === 'Distressed' ? "text-red-500 border-red-500/20 bg-red-500/5" : "text-blue-500 border-blue-500/20 bg-blue-500/5"
                      )}>
                        {turn.sentiment.label}
                      </span>
                    )}
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-none bg-[#0c0c0e] border border-[#1a1a1c] text-zinc-300 text-sm leading-relaxed shadow-lg font-medium">
                    {turn.transcript}
                  </div>
                </div>
              </div>

              {/* AI Response Turn */}
              {turn.ai_response && (
                <div className="flex gap-4 justify-end">
                  <div className="space-y-2 flex-1 flex flex-col items-end">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-500">
                        <ShieldCheck size={10} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Verified Intent</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-700">{turn.timestamp.split('T')[1]?.split('.')[0] || '12:00:00'}</span>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">D.I.A.L Assistant</span>
                    </div>
                    <div className="p-4 rounded-2xl rounded-tr-none bg-blue-600/5 border border-blue-600/20 text-zinc-100 text-sm leading-relaxed shadow-[0_0_40px_rgba(37,99,235,0.05)] font-medium">
                      {turn.ai_response}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
                    <Bot size={20} className="text-blue-500" />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <div className="flex justify-center py-6">
             <button className="flex items-center gap-2 text-zinc-700 hover:text-zinc-500 transition-colors">
                <ChevronDown size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">End of Stream</span>
             </button>
          </div>
        </div>

        {/* Compact Bottom Control Bar */}
        <div className="px-8 py-4 border-t border-[#1a1a1c] bg-[#050506] flex items-center justify-between z-20">
          <div className="flex-1">
            <LiveAudioPlayer />
          </div>
        </div>
      </div>
    </div>
  );
};
