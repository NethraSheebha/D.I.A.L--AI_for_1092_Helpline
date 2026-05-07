import React from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  ChevronRight,
  Clock,
  MapPin,
  Shield
} from 'lucide-react';
import { MOCK_HISTORY } from '../mocks';
import { cn } from '../utils/cn';

export const CallHistory: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
            <History className="text-blue-500" size={32} />
            CALL HISTORY
          </h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-medium">
            Operational Records // Central Database
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH CALL ID..." 
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-all w-64"
            />
          </div>
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-all">
            <Filter size={14} />
            FILTERS
          </button>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]">
            <Download size={14} />
            EXPORT DATA
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Total Logs', value: '14.2k', color: 'blue' },
          { label: 'Avg Duration', value: '04:22', color: 'zinc' },
          { label: 'Critical Res.', value: '98.2%', color: 'green' },
          { label: 'Escalations', value: '412', color: 'red' }
        ].map((stat, i) => (
          <div key={i} className="bg-[#0a0a0b] border border-[#1a1a1c] p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 blur-[40px] group-hover:bg-${stat.color}-500/10 transition-all`} />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-white tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="bg-[#0a0a0b] border border-[#1a1a1c] rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900/50 border-b border-[#1a1a1c]">
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Incident ID</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Language</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">District</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Duration</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Urgency</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Final Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1c]">
            {MOCK_HISTORY.map((call) => (
              <tr key={call.id} className="hover:bg-zinc-900/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-mono font-bold text-white tracking-tight">{call.callerId}</span>
                    <span className="text-[10px] text-zinc-600 font-medium tracking-widest uppercase">{call.date}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded bg-blue-500/5 border border-blue-500/10 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    {call.language}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <MapPin size={12} className="text-zinc-600" />
                    {call.district}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Clock size={12} className="text-zinc-600" />
                    {call.duration}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    call.urgency === 'critical' ? 'text-red-500' :
                    call.urgency === 'high' ? 'text-orange-500' :
                    'text-zinc-400'
                  )}>
                    {call.urgency}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      call.status === 'Resolved' ? 'bg-green-500' :
                      call.status === 'Escalated' ? 'bg-red-500' :
                      'bg-blue-500'
                    )} />
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{call.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-blue-500/50 transition-all">
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
