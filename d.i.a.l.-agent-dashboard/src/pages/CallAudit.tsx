import React from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  ChevronRight,
  User,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { MOCK_AUDIT } from '../mocks';
import { cn } from '../utils/cn';

export const CallAudit: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
            <ClipboardCheck className="text-blue-500" size={32} />
            AUDIT WORKFLOW
          </h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-medium">
            Incident Review // Quality Assurance
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH AUDIT ID..." 
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-all w-64"
            />
          </div>
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-all">
            <Filter size={14} />
            FILTERS
          </button>
        </div>
      </div>

      {/* Progress Pipeline */}
      <div className="flex items-center justify-between px-12 py-8 bg-[#0a0a0b] border border-[#1a1a1c] rounded-3xl relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 blur-[100px] pointer-events-none" />
        
        {[
          { label: 'PENDING', count: 12, icon: Clock, color: 'zinc' },
          { label: 'REVIEWING', count: 4, icon: Search, color: 'blue' },
          { label: 'VALIDATED', count: 28, icon: CheckCircle2, color: 'green' },
          { label: 'APPROVED', count: 142, icon: Shield, color: 'blue' }
        ].map((step, i, arr) => (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center gap-4 z-10">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 shadow-2xl",
                step.label === 'REVIEWING' ? "bg-blue-600 border-blue-400 shadow-blue-600/40" : "bg-zinc-900 border-zinc-800"
              )}>
                <step.icon size={24} className={step.label === 'REVIEWING' ? "text-white" : "text-zinc-500"} />
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  step.label === 'REVIEWING' ? "text-blue-400" : "text-zinc-600"
                )}>{step.label}</p>
                <p className="text-lg font-bold text-white mt-1">{step.count}</p>
              </div>
            </div>
            {i < arr.length - 1 && (
              <div className="flex-1 px-8">
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Audit List */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-2">Active Queue</h3>
        {MOCK_AUDIT.map((item) => (
          <div key={item.id} className="bg-[#0a0a0b] border border-[#1a1a1c] rounded-3xl p-6 hover:border-blue-500/30 transition-all group cursor-pointer relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-blue-600/10" />
            <div className="flex gap-8">
              {/* ID & Type */}
              <div className="w-48 shrink-0 space-y-4">
                <div>
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Incident Record</span>
                  <p className="text-lg font-mono font-bold text-white tracking-tight">{item.callerId}</p>
                </div>
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest",
                  item.status === 'PENDING' ? "text-zinc-500 border-zinc-800 bg-zinc-900" :
                  item.status === 'REVIEWING' ? "text-blue-400 border-blue-400/20 bg-blue-400/5" :
                  "text-green-500 border-green-500/20 bg-green-500/5"
                )}>
                  {item.status}
                </div>
              </div>

              {/* Content Preview */}
              <div className="flex-1 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <User size={16} className="text-zinc-500" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 block">Source Transcript</span>
                    <p className="text-sm text-zinc-300 font-medium leading-relaxed italic">{item.transcript}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1 block">AI Interpretation</span>
                    <p className="text-sm text-blue-100/70 font-medium leading-relaxed">{item.ai_interpretation}</p>
                  </div>
                </div>
              </div>

              {/* Metrics & Action */}
              <div className="w-48 shrink-0 flex flex-col justify-between items-end py-2">
                <div className="text-right">
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Urgency Score</span>
                  <p className={cn(
                    "text-2xl font-black tracking-tighter",
                    item.urgency_score > 0.8 ? "text-red-500" : "text-amber-500"
                  )}>{(item.urgency_score * 100).toFixed(0)}<span className="text-xs text-zinc-700 ml-1">%</span></p>
                </div>
                
                <button className="flex items-center gap-2 text-zinc-400 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors group-hover:translate-x-1 transition-transform">
                  Process Audit
                  <ArrowRight size={14} className="text-blue-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Shield = ({ size, className }: { size: number, className: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);
