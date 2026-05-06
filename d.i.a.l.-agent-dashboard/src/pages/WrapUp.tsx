import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  LogOut, 
  ChevronRight, 
  Clock, 
  ClipboardCheck, 
  MessageSquare,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  PrimaryButton, 
  GhostButton, 
  SectionCard, 
  EditableTextField,
  DropdownSelect,
  UrgencyBadge,
  LanguageBadge,
  NotificationToast,
  Divider
} from '../components/Shared';
import { cn } from '../lib/utils';
import { fetchDashboardSummary, fetchCallHistory, fetchRecentCalls } from '../lib/backend';

type CallSummary = {
  call_id: string;
  started_at?: string;
  total_turns?: number;
  outcome?: string;
  last_transcript?: string;
};

export default function WrapUp() {
  const navigate = useNavigate();
  const [resolution, setResolution] = React.useState<string | null>(null);
  const [timer, setTimer] = React.useState(30);
  const [correctionCategory, setCorrectionCategory] = React.useState('none');
  const [toast, setToast] = React.useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = React.useState<any | null>(null);
  const [callHistory, setCallHistory] = React.useState<any[] | null>(null);
  const [activeCall, setActiveCall] = React.useState<CallSummary | null>(null);

  React.useEffect(() => {
    const tick = setInterval(() => {
      setTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const recent = await fetchRecentCalls();
        if (!mounted) return;
        if (recent.length > 0) {
          const top = recent[0];
          setActiveCall({ call_id: top.id, started_at: undefined, total_turns: 0, outcome: top.urgency, last_transcript: '' });
          try {
            const history = await fetchCallHistory(top.id);
            if (!mounted) return;
            setCallHistory(history.interactions || []);
          } catch (e) {
            // ignore
          }
        }

        try {
          const summary = await fetchDashboardSummary();
          if (!mounted) return;
          setSessionSummary(summary);
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // keep defaults
      }
    })();

    return () => { mounted = false; };
  }, []);

  const handleManualRedeploy = () => {
    if (!resolution) {
      setToast("Mandatory selection: Please define resolution state.");
      return;
    }
    navigate('/agent/dashboard');
  };

  const resolutions = [
    { id: 'resolved', label: 'Case Resolved', color: 'text-brand-success', icon: CheckCircle, desc: 'Issue verified and log submitted to dept.' },
    { id: 'escalated', label: 'Escalated', color: 'text-brand-warning', icon: AlertTriangle, desc: 'Immediate field intervention required.' },
    { id: 'transferred', label: 'Transferred', color: 'text-brand-primary', icon: RefreshCw, desc: 'Handed over to external jurisdiction.' },
    { id: 'unresolved', label: 'Unresolved', color: 'text-brand-danger', icon: LogOut, desc: 'Caller disconnected or intent invalid.' },
  ];

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-8 font-sans overflow-y-auto">
      <AnimatePresence>
        {toast && <NotificationToast message={toast} type="warning" onClear={() => setToast(null)} />}
      </AnimatePresence>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left: Summary & Analysis */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-2xl bg-brand-success/10 border border-brand-success/20 flex items-center justify-center text-brand-success">
               <ShieldCheck size={28} />
             </div>
             <div>
                <h1 className="text-3xl font-display font-black text-white">Post-Call Audit</h1>
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">{activeCall ? `SESSION: ${activeCall.call_id.slice(0,8).toUpperCase()}` : 'SESSION: N/A'}</div>
             </div>
          </div>

          <SectionCard title="Session Intelligence Recap">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8 py-2">
               <div className="space-y-2">
                 <div className="text-[9px] uppercase font-black text-gray-600 tracking-[0.2em]">Final Intent Class</div>
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                      <MessageSquare size={16} />
                    </div>
                    <span className="text-sm font-bold text-white uppercase tracking-tight">{callHistory && callHistory.length > 0 ? ((callHistory[callHistory.length-1].intent && (callHistory[callHistory.length-1].intent.intent || callHistory[callHistory.length-1].intent)) || 'Unknown') : 'Unknown'}</span>
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="text-[9px] uppercase font-black text-gray-600 tracking-[0.2em]">Dialect Accuracy</div>
                  <div className="flex items-center gap-2">
                    <LanguageBadge language={callHistory && callHistory.length > 0 ? (callHistory[0].detected_lang || 'Detect') : 'Detect'} dialect={callHistory && callHistory.length > 0 ? (callHistory[0].dialect || 'Regional') : 'Regional'} />
                    <div className="px-2 py-1 bg-brand-success/10 text-brand-success text-[10px] font-black rounded border border-brand-success/20 uppercase tracking-tighter">{sessionSummary ? `${Math.round(((sessionSummary.resolved||0) / Math.max(1, sessionSummary.total_calls||1)) * 100)}% Resolution` : 'N/A'}</div>
                  </div>
               </div>
               <div className="sm:col-span-2 space-y-2">
                 <div className="text-[9px] uppercase font-black text-gray-600 tracking-[0.2em]">Verified Resolution Log</div>
                 <div className="p-4 bg-black/40 border border-brand-border rounded-xl">
                   <p className="text-sm text-gray-300 italic leading-relaxed font-medium">
                     {callHistory && callHistory.length > 0 ? (callHistory.map(c => c.transcript).join(' \n') ) : 'No call history available.'}
                   </p>
                 </div>
               </div>
            </div>
          </SectionCard>

          <SectionCard title="AI Feedback Loop">
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
                <DropdownSelect 
                  label="Extraction Accuracy Category"
                  value={correctionCategory}
                  onChange={setCorrectionCategory}
                  options={[
                    { id: 'none', label: 'No Correction: AI Perfect' },
                    { id: 'intent', label: 'Intent Classification Error' },
                    { id: 'dialect', label: 'Dialect Identification Mismatch' },
                    { id: 'location', label: 'Geospatial Extraction Error' },
                    { id: 'sentiment', label: 'Sentiment/Tone Misread' },
                  ]}
                />
                <div className="space-y-2 pb-1">
                   <label className="text-[9px] uppercase font-black text-gray-500 tracking-[0.2em]">Engine Tuning Signal</label>
                   <div className="flex items-center gap-4">
                      <div className="h-2 flex-1 bg-brand-bg rounded-full overflow-hidden border border-brand-border">
                        <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} className="h-full bg-brand-success shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-gray-400">92%</span>
                   </div>
                </div>
              </div>
              <EditableTextField label="Internal Audit Memo (Optional)" value="ASR handled the local Dharwad inflection remarkably well even with high background noise." />
            </div>
          </SectionCard>
        </div>

        {/* Right: State & Ready Controls */}
        <div className="space-y-8">
           <SectionCard title="Define Resolution State">
             <div className="grid grid-cols-1 gap-4 pt-2">
                {resolutions.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => setResolution(res.id)}
                    className={cn(
                      "flex flex-col p-4 rounded-xl border-2 transition-all text-left relative group overflow-hidden",
                      resolution === res.id 
                        ? "bg-brand-primary/5 border-brand-primary shadow-[0_10px_30px_rgba(59,130,246,0.1)]" 
                        : "bg-brand-card border-brand-border hover:border-gray-600"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={cn("transition-colors", resolution === res.id ? res.color : "text-gray-600 group-hover:text-gray-400")}>
                          <res.icon size={22} strokeWidth={2.5} />
                        </div>
                        <span className={cn("text-xs font-black uppercase tracking-[0.1em]", resolution === res.id ? "text-white" : "text-gray-500 group-hover:text-gray-300")}>
                          {res.label}
                        </span>
                      </div>
                      <div className={cn("w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center", resolution === res.id ? "border-brand-primary bg-brand-primary" : "border-brand-border")}>
                        {resolution === res.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className={cn("text-[10px] leading-relaxed font-medium transition-colors", resolution === res.id ? "text-brand-primary/80" : "text-gray-600")}>
                      {res.desc}
                    </p>
                  </button>
                ))}
             </div>
           </SectionCard>

           <div className="bg-brand-card border border-brand-border rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden ring-2 ring-white/5">
              <div className="absolute top-0 inset-x-0 h-1 bg-brand-success/30" />
              
              <div className="relative w-24 h-24 mb-6">
                <svg className="w-full h-full -rotate-90">
                  <circle 
                    cx="48" cy="48" r="44" 
                    fill="none" stroke="currentColor" strokeWidth="6" 
                    className="text-brand-border"
                  />
                  <motion.circle 
                    cx="48" cy="48" r="44" 
                    fill="none" stroke="currentColor" strokeWidth="6" 
                    className="text-brand-success shadow-lg shadow-brand-success/50"
                    strokeDasharray="276"
                    initial={{ strokeDashoffset: 276 }}
                    animate={{ strokeDashoffset: 276 - (276 * (30 - timer) / 30) }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <div className="text-2xl font-display font-black text-white">{timer}</div>
                   <div className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">SEC</div>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-xs font-bold text-gray-200 uppercase tracking-widest mb-1">Station Cooldown</p>
                <p className="text-[10px] text-gray-500 font-medium">Automatic system deployment in progress</p>
              </div>

              <PrimaryButton 
                disabled={!resolution}
                className={cn(
                  "w-full flex items-center justify-center gap-3 py-4 text-xs font-black shadow-2xl transition-all",
                  !resolution && "opacity-20 cursor-not-allowed saturate-0"
                )}
                onClick={handleManualRedeploy}
              >
                <RotateCcw size={18} />
                Accept Next Payload
                <ChevronRight size={18} className="translate-x-0 group-hover:translate-x-1" />
              </PrimaryButton>
              
              <button 
                onClick={() => navigate('/login')}
                className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:text-brand-danger transition-colors py-2"
              >
                Go Offline / Take Break
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}
