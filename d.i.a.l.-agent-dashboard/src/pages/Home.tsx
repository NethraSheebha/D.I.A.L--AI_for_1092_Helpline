import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Clock, 
  Terminal, 
  ShieldCheck, 
  Activity,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { 
  UrgencyBadge, 
  LanguageBadge, 
  NotificationToast, 
  Divider 
} from '../components/Shared';
import { MOCK_QUEUE, QueueItemData } from '../mocks';
import { cn } from '../lib/utils';
import { fetchRecentCalls } from '../lib/backend';

export default function Home() {
  const navigate = useNavigate();
  const [calls, setCalls] = React.useState<QueueItemData[]>(MOCK_QUEUE);
  const [showCriticalToast, setShowCriticalToast] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    fetchRecentCalls()
      .then((liveCalls) => {
        if (!mounted || liveCalls.length === 0) {
          return;
        }
        setCalls(liveCalls);
      })
      .catch(() => {
        // Keep mock data as a graceful fallback when backend is unavailable.
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Sort calls: Critical first, then High, then others
  const sortedCalls = [...calls].sort((a, b) => {
    const priority = { critical: 0, high: 1, medium: 2, low: 3 };
    return priority[a.urgency] - priority[b.urgency];
  });

  // Mock a new critical call after 5 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowCriticalToast(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Update wait times
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCalls(curr => curr.map(c => ({ ...c, waitTime: c.waitTime + 1 })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCallSelect = (call: QueueItemData) => {
    navigate('/agent/dashboard', { state: { initialCall: call } });
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans">
      <AnimatePresence>
        {showCriticalToast && (
          <NotificationToast 
            message="CRITICAL PROTOCOL: NEW INCIDENT DETECTED IN SECTOR 4" 
            type="critical" 
            onClear={() => setShowCriticalToast(false)}
          />
        )}
      </AnimatePresence>

      <header className="h-20 shrink-0 border-b border-brand-border bg-brand-card/50 backdrop-blur-xl flex items-center px-10 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-white italic tracking-tight">D.I.A.L Dispatch</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Active Incident Navigation // GOV-7721</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-black text-brand-success uppercase tracking-widest mb-1">Tunnel Status</p>
            <div className="flex items-center gap-2 px-3 py-1 bg-brand-success/5 border border-brand-success/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
              <span className="text-[9px] font-black text-brand-success tracking-widest">LIVE CONNECTION</span>
            </div>
          </div>
          <Divider className="h-10 w-px" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-white leading-none mb-1">Balarathi P</p>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Senior Field Agent</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-card border border-brand-border flex items-center justify-center text-brand-primary">
              <Terminal size={18} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-10 overflow-y-auto scrollbar-hide">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Available Sessions</h2>
              <div className="px-3 py-1 rounded bg-brand-card border border-brand-border text-[10px] font-bold text-white">
                {calls.length} TOTAL
              </div>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
               <span className="text-gray-600">Filters:</span>
               <button className="text-brand-primary border-b border-brand-primary pb-0.5">All Urgency</button>
               <button className="text-gray-500 hover:text-white transition-colors">By Dialect</button>
               <button className="text-gray-500 hover:text-white transition-colors">By Wait Time</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {sortedCalls.map((call, index) => (
                <motion.div 
                  key={call.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleCallSelect(call)}
                  className={cn(
                    "group relative bg-brand-card/40 border border-brand-border rounded-xl p-3.5 cursor-pointer transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)] hover:border-brand-primary/50 overflow-hidden active:scale-[0.98]",
                    call.urgency === 'critical' && "border-brand-danger/30 bg-brand-danger/5 shadow-[0_5px_15px_rgba(239,68,68,0.05)]"
                  )}
                >
                   {call.urgency === 'critical' && (
                     <div className="absolute top-0 right-0 p-2.5">
                        <Activity className="text-brand-danger animate-pulse" size={12} />
                     </div>
                   )}
                   
                   <div className="flex flex-col h-full gap-3">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest mb-0.5 truncate">Incident Token</p>
                          <h3 className="text-sm font-mono font-bold text-white group-hover:text-brand-primary transition-colors tracking-tight truncate">{call.callerId}</h3>
                        </div>
                        <UrgencyBadge level={call.urgency} className="px-1.5 py-0 text-[7px] h-3.5 shrink-0" />
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest mb-1">Linguistic Context</p>
                          <LanguageBadge language={call.language} dialect={call.dialect} className="px-0 py-0 bg-transparent border-none text-[9px]" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Queue Aging</p>
                            <div className="flex items-center gap-1 text-white font-mono font-bold text-[10px]">
                               <Clock size={10} className="text-brand-primary" />
                               {Math.floor(call.waitTime / 60)}m {call.waitTime % 60}s
                            </div>
                          </div>
                          
                          <div className="w-7 h-7 rounded-full bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all group-hover:translate-x-0.5 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                   </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="h-14 border-t border-brand-border bg-brand-card/20 backdrop-blur-md flex items-center px-10 text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em]">
        <div className="flex gap-8">
           <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-success" /> System Integrity Certified</span>
           <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-primary" /> 14.2k Active Terminals</span>
        </div>
        <div className="ml-auto">
           A.I. Sourced Intelligence Dashboard // VUX-2024.0.1
        </div>
      </footer>
    </div>
  );
}
