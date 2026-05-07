import React from 'react';
import { 
  Bell, 
  Activity, 
  Wifi, 
  User, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../stores/useStore';
import { cn } from '../utils/cn';

export const Topbar: React.FC = () => {
  const { agent, connectionStatus } = useStore();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-20 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-[#1a1a1c] px-8 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Operational Metadata */}
      <div className="flex items-center gap-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Live Feed</span>
          <div className="flex items-center gap-3 text-zinc-300 text-sm font-bold italic tracking-tighter">
            <Activity size={16} className="text-blue-500 animate-pulse" />
            <span>SECTOR: BANGALORE CENTRAL // NODE-42</span>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-zinc-800" />

        <div className="flex flex-col">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1">Operational Time</span>
          <span className="text-sm font-mono font-bold text-zinc-300 tracking-widest">
            {currentTime.toLocaleTimeString('en-GB', { hour12: false })}
          </span>
        </div>
      </div>


      {/* Right: Agent Identity & Status */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end mr-2">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Welcome Back</span>
          <span className="text-xs font-bold text-white tracking-tight">
            Dispatcher {agent?.name || 'Balarathi P'}
          </span>
        </div>

        {/* Connection Status */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-500",
          connectionStatus === 'CONNECTED' 
            ? "bg-green-600/5 border-green-600/20 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
            : "bg-amber-600/5 border-amber-600/20 text-amber-500"
        )}>
          <Wifi size={14} className={cn(connectionStatus === 'CONNECTED' ? "animate-none" : "animate-pulse")} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {connectionStatus}
          </span>
        </div>

        {/* Agent Profile */}
        <div className="flex items-center gap-4 pl-6 border-l border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group cursor-pointer hover:border-blue-600/50 hover:bg-blue-600/5 transition-all">
            <User size={20} className="group-hover:text-blue-400 transition-colors" />
          </div>
        </div>
      </div>
    </header>
  );
};
