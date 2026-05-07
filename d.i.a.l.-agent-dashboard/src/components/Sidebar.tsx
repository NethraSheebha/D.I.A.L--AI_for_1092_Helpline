import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PhoneCall, 
  ClipboardCheck, 
  History, 
  PlayCircle, 
  BarChart3, 
  ShieldAlert, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useStore } from '../stores/useStore';
import { cn } from '../utils/cn';

export const Sidebar: React.FC = () => {
  const { activeCalls } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const activeCount = Object.keys(activeCalls).length;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/agent/dashboard' },
    { icon: PhoneCall, label: 'Active Calls', path: '/agent/home', badge: activeCount },
    { icon: ClipboardCheck, label: 'Call Audit', path: '/agent/audit' },
    { icon: History, label: 'Call History', path: '/agent/history' },
    { icon: PlayCircle, label: 'Incident Replay', path: '/agent/replay' },
    { icon: BarChart3, label: 'Analytics', path: '/agent/analytics' },
    { icon: ShieldAlert, label: 'Supervisor', path: '/agent/supervisor' },
  ];

  return (
    <aside className={cn(
      "h-screen bg-[#0a0a0b] border-r border-[#1a1a1c] transition-all duration-300 flex flex-col",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
          <Zap className="text-white w-5 h-5" />
        </div>
        {!isCollapsed && (
          <span className="font-bold text-lg tracking-tight text-white uppercase">D.I.A.L. Ops</span>
        )}
      </div>

      {/* Nav Section */}
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-all group",
              location.pathname === item.path 
                ? "bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 shrink-0",
              location.pathname === item.path ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300"
            )} />
            {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
            {!isCollapsed && item.badge && (
              <span className="ml-auto bg-red-600/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-600/30">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-[#1a1a1c] space-y-2">
        <Link 
          to="/agent/settings"
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg transition-all group",
            location.pathname === '/agent/settings' 
              ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" 
              : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
          )}
        >
          <Settings className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium text-sm">Settings</span>}
        </Link>
        <button className="w-full flex items-center gap-3 p-3 rounded-lg text-zinc-500 hover:bg-red-600/10 hover:text-red-400 transition-all">
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 mt-4 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 text-zinc-500 border border-[#1a1a1c] transition-all"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};
