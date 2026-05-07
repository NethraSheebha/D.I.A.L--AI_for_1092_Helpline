import React from 'react';
import { useStore } from '../stores/useStore';
import { cn } from '../utils/cn';
import { Activity, Zap, Brain, Thermometer, TrendingUp } from 'lucide-react';

export const LiveTelemetry: React.FC = () => {
  const { activeCalls, selectedCallId } = useStore();
  const call = selectedCallId ? activeCalls[selectedCallId] : null;

  const Metric: React.FC<{ label: string; value: string | number; icon: any; color: string }> = ({ label, value, icon: Icon, color }) => (
    <div className="bg-[#050505] border border-[#1a1a1c] p-4 rounded-xl space-y-3 shadow-inner">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white tracking-tighter">{value}</span>
        {label === 'Confidence' && <span className="text-zinc-500 text-xs">%</span>}
      </div>
      <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-1000", color.replace('text-', 'bg-'))}
          style={{ width: `${typeof value === 'number' ? value : 75}%` }}
        />
      </div>
    </div>
  );

  if (!call) return null;

  const lastTurn = call.turns[call.turns.length - 1];

  return (
    <div className="w-80 flex flex-col h-full bg-[#0a0a0b] border border-[#1a1a1c] rounded-xl overflow-hidden shadow-2xl p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={16} className="text-blue-500" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Acoustic Intelligence</h2>
      </div>

      <div className="space-y-4">
        <Metric 
          label="Stress Intensity" 
          value={(call.vitals.stress * 100).toFixed(0)} 
          icon={Zap} 
          color={call.vitals.stress > 0.7 ? "text-red-500" : "text-amber-500"} 
        />
        
        <Metric 
          label="AI Confidence" 
          value={lastTurn ? ((lastTurn.confidence || 0.92) * 100).toFixed(0) : "85"} 
          icon={Brain} 
          color="text-blue-500" 
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#050505] border border-[#1a1a1c] p-3 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Volume RMS</span>
            <span className="text-sm font-mono text-zinc-300">{(call.vitals.rms * 100).toFixed(1)} dB</span>
          </div>
          <div className="bg-[#050505] border border-[#1a1a1c] p-3 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Speech Rate</span>
            <span className="text-sm font-mono text-zinc-300">{call.vitals.wpm} WPM</span>
          </div>
        </div>

        {/* Intent Insight */}
        <div className="bg-blue-600/5 border border-blue-600/20 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-400" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">ML Interpretation</span>
          </div>
          <p className="text-xs text-blue-100/70 leading-relaxed italic">
            "{lastTurn?.intent?.issue || 'Detecting caller intent from acoustic signals and linguistic patterns...'}"
          </p>
        </div>

        {/* Real-time Heatmap Placeholder */}
        <div className="flex-1 flex flex-col justify-end">
          <div className="h-20 bg-zinc-950 rounded-lg border border-zinc-900 relative overflow-hidden flex items-end gap-[2px] p-2">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i} 
                className="flex-1 bg-blue-500/20 rounded-t-sm"
                style={{ height: `${Math.random() * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-[0.3em]">Signal Persistence</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
