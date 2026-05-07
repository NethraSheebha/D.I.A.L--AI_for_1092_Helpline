import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Globe2, 
  AlertTriangle, 
  Zap,
  Activity,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { MOCK_ANALYTICS } from '../mocks';
import { cn } from '../utils/cn';

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
            <BarChart3 className="text-blue-500" size={32} />
            OPERATIONAL ANALYTICS
          </h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-medium">
            Intelligence Reports // System Throughput
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#0a0a0b] border border-[#1a1a1c] p-1.5 rounded-xl">
          {['24H', '7D', '30D', 'ALL'].map((range) => (
            <button 
              key={range}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all",
                range === '7D' ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Total Incidents', value: MOCK_ANALYTICS.totalIncidents.toLocaleString(), icon: Activity, color: 'blue' },
          { label: 'Escalation Rate', value: '6.2%', icon: TrendingUp, color: 'red' },
          { label: 'AI Confidence', value: `${(MOCK_ANALYTICS.avgConfidence * 100).toFixed(1)}%`, icon: Zap, color: 'amber' },
          { label: 'Resolution Rate', value: '94.8%', icon: CheckCircle2, color: 'green' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#0a0a0b] border border-[#1a1a1c] p-6 rounded-2xl group hover:border-blue-500/30 transition-all relative overflow-hidden">
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${stat.color}-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg bg-zinc-900 border border-zinc-800", `text-${stat.color}-500`)}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-zinc-600 tracking-[0.2em]">LIVE</span>
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-white tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Language Distribution */}
        <div className="col-span-1 bg-[#0a0a0b] border border-[#1a1a1c] p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <Globe2 size={14} className="text-blue-500" />
              Linguistic Spread
            </h3>
          </div>
          <div className="space-y-6">
            {MOCK_ANALYTICS.languageDistribution.map((lang) => (
              <div key={lang.name} className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-400">{lang.name}</span>
                  <span className="text-white">{lang.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                    style={{ width: `${lang.value}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Pressure Heatmap (Simulated) */}
        <div className="col-span-2 bg-[#0a0a0b] border border-[#1a1a1c] p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-blue-500" />
              Incident Load Trend
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-zinc-800" /> Low
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-blue-600" /> High
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between h-48 gap-4 px-4">
            {MOCK_ANALYTICS.urgencyHeatmap.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-4">
                <div 
                  className="w-full bg-blue-600/20 border-t border-blue-600/40 rounded-t-lg relative group transition-all hover:bg-blue-600/40"
                  style={{ height: `${(day.value / 300) * 100}%` }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.value}
                  </div>
                </div>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{day.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* District Intelligence */}
      <div className="bg-[#0a0a0b] border border-[#1a1a1c] p-6 rounded-2xl">
        <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest flex items-center gap-2 mb-6">
          <Shield size={14} className="text-blue-500" />
          District Risk Assessment
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { district: 'Bangalore Central', risk: 'Elevated', incidents: 124 },
            { district: 'Mysuru Urban', risk: 'Moderate', incidents: 82 },
            { district: 'Mangalore Coastal', risk: 'Low', incidents: 45 },
            { district: 'Hubbali Junction', risk: 'High', incidents: 156 },
          ].map((d) => (
            <div key={d.district} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex flex-col gap-3">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{d.district}</span>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-white">{d.incidents} <span className="text-[10px] text-zinc-600 font-medium">INCIDENTS</span></span>
                <span className={cn(
                  "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest",
                  d.risk === 'High' ? "text-red-500 border-red-500/20 bg-red-500/5" :
                  d.risk === 'Elevated' ? "text-orange-500 border-orange-500/20 bg-orange-500/5" :
                  "text-blue-500 border-blue-500/20 bg-blue-500/5"
                )}>
                  {d.risk}
                </span>
              </div>
            </div>
          ))}
        </div>
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
