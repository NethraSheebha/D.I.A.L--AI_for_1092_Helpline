import React from 'react';
import { useStore } from '../stores/useStore';
import { cn } from '../utils/cn';
import { Search, Filter, AlertTriangle, Clock } from 'lucide-react';

export const PriorityQueue: React.FC = () => {
  const { activeCalls, selectedCallId, selectCall, setShowReport } = useStore();
  
  const sortedCalls = Object.values(activeCalls).sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 };
    return (priority[a.urgency || 'medium'] || 1) - (priority[b.urgency || 'medium'] || 1);
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0a0b] border border-[#1a1a1c] rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1c] bg-zinc-900/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Live Incident Queue</h2>
          <span className="bg-blue-600/10 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-600/20">
            {sortedCalls.length} Active
          </span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search Incident ID..." 
            className="w-full bg-[#050505] border border-[#1a1a1c] rounded-lg py-2 pl-10 pr-4 text-xs text-zinc-300 focus:outline-none focus:border-blue-600/50 transition-all"
          />
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sortedCalls.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 opacity-50">
            <Filter size={32} />
            <p className="text-[10px] uppercase font-bold tracking-widest">Queue Empty</p>
          </div>
        ) : (
          sortedCalls.map((call) => (
            <button
              key={call.call_id}
              onClick={() => {
                selectCall(call.call_id);
                setShowReport(true);
              }}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-all relative overflow-hidden group",
                selectedCallId === call.call_id 
                  ? "bg-blue-600/5 border-blue-600/30 shadow-[0_0_20px_rgba(37,99,235,0.05)]" 
                  : "bg-[#050505] border-[#1a1a1c] hover:border-zinc-800"
              )}
            >
              {/* Urgency Indicator */}
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1",
                call.urgency === 'high' ? "bg-red-600" : 
                call.urgency === 'medium' ? "bg-amber-500" : "bg-blue-500"
              )} />

              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 leading-none mb-1">INCIDENT TOKEN</p>
                  <p className="text-sm font-bold text-white tracking-tight uppercase">
                    {call.call_id.split('-')[0]}
                  </p>
                </div>
                {call.urgency === 'high' && (
                  <AlertTriangle size={14} className="text-red-500 animate-pulse" />
                )}
              </div>

              <div className="flex items-center gap-3 mt-3">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Dialect</span>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                    {call.dialect || 'Detecting...'}
                  </span>
                </div>
                <div className="h-4 w-[1px] bg-zinc-800" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Wait Time</span>
                  <div className="flex items-center gap-1">
                    <Clock size={8} className="text-zinc-500" />
                    <span className="text-[10px] font-mono text-zinc-400">02:45s</span>
                  </div>
                </div>
              </div>
              
              {/* Pulse for active calls */}
              {selectedCallId === call.call_id && (
                <div className="absolute top-2 right-2 flex gap-1">
                   <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
                   <div className="w-1 h-1 rounded-full bg-blue-500" />
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
