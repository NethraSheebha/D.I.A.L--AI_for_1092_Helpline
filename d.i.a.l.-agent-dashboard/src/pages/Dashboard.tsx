import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  MicOff, 
  Mic, 
  PhoneOff, 
  ArrowUpRight, 
  AlertCircle, 
  User, 
  Clock, 
  Globe, 
  Activity,
  Smile,
  Frown,
  Meh,
  AlertTriangle,
  Info,
  LogOut,
  Settings,
  ChevronDown,
  MoreVertical,
  X,
  Volume2,
  Check,
  Terminal,
  MessageSquare
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LanguageBadge, 
  UrgencyBadge, 
  StatusDot, 
  ConfidenceDot, 
  PrimaryButton, 
  GhostButton, 
  DangerButton, 
  IconButton, 
  EditableTextField, 
  SectionCard,
  NotificationToast,
  Divider,
  SearchBar
} from '../components/Shared';
import { MOCK_QUEUE, MOCK_TRANSCRIPT_BASE, MOCK_CLUSTERS, TranscriptLineData, CallSignals, QueueItemData } from '../mocks';
import { cn } from '../lib/utils';
import { fetchRecentCalls, fetchCallContext, mapTurnsToTranscript, subscribeAgentUpdates, escalateCall, sendAgentResponse } from '../lib/backend';

function mapSentimentToEmotion(label?: string): CallSignals['emotion'] {
  switch ((label || '').toLowerCase()) {
    case 'calm':
      return 'Calm';
    case 'confused':
      return 'Confused';
    case 'urgent':
    case 'anxious':
      return 'Anxious';
    case 'distressed':
      return 'Distressed';
    case 'panicked':
      return 'Panicked';
    default:
      return 'Calm';
  }
}

function getSpeedRateFromWPM(wpm: number): CallSignals['speechRate'] {
  if (wpm > 180) return 'Fast';
  if (wpm < 80) return 'Slow';
  return 'Normal';
}

function getStressLabel(intensity?: number): string {
  if (!intensity) return 'Normal';
  if (intensity >= 4.5) return 'Critical';
  if (intensity >= 3.5) return 'High';
  if (intensity >= 2.5) return 'Moderate';
  if (intensity >= 1.5) return 'Elevated';
  return 'Calm';
}

function getAcousticLabel(feature?: number): string {
  if (!feature) return 'Normal';
  if (feature > 0.8) return 'High';
  if (feature > 0.6) return 'Moderate';
  if (feature > 0.4) return 'Elevated';
  return 'Low';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialCall = location.state?.initialCall as QueueItemData | null;

  const [transcript, setTranscript] = React.useState<TranscriptLineData[]>(MOCK_TRANSCRIPT_BASE);
  const [signals, setSignals] = React.useState<CallSignals>({ 
    confidence: 92, 
    emotion: 'Anxious', 
    speechRate: 'Fast', 
    wpm: 145, 
    stressScore: 0.65,
    stressIntensity: 3,
    intent: 'Hazard Report',
    intentConfidence: 0.92,
    acousticFeatures: { zcr: 0.12, rms: 0.45, centroid: 2100 }
  });
  const [timer, setTimer] = React.useState(154);
  const [queue, setQueue] = React.useState<QueueItemData[]>(MOCK_QUEUE);
  const [isMuted, setIsMuted] = React.useState(false);
  const [activeCall, setActiveCall] = React.useState<QueueItemData | null>(initialCall || MOCK_QUEUE[0]);
  const [summaryScript, setSummaryScript] = React.useState("I understand you are reporting a Level 4 pothole hazard at Silk Board Junction. Help is on the way.");
  const [isEditingScript, setIsEditingScript] = React.useState(false);
  const [isSummaryReady, setIsSummaryReady] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ msg: string; type: 'info' | 'warning' | 'critical' } | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = React.useState(false);
  const [isSignalDetailOpen, setIsSignalDetailOpen] = React.useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = React.useState(false);
  const [correctionTurnId, setCorrectionTurnId] = React.useState<string | null>(null);
  const [correctionText, setCorrectionText] = React.useState('');
  const [expandedClusterId, setExpandedClusterId] = React.useState<string | null>(null);
  const [isQueueCollapsed, setIsQueueCollapsed] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    fetchRecentCalls()
      .then((liveCalls) => {
        if (!mounted || liveCalls.length === 0) {
          return;
        }

        setQueue(liveCalls);
        if (!initialCall) {
          setActiveCall(liveCalls[0] ?? null);
        }
      })
      .catch(() => {
        // Keep mock queue when backend is unavailable.
      });

    return () => {
      mounted = false;
    };
  }, [initialCall]);

  // Filter for Priority Queue (Critical/High only)
  const priorityQueue = queue.filter(item => 
    (item.urgency === 'critical' || item.urgency === 'high') && 
    item.id !== activeCall?.id
  );

  // Auto-dismiss toast
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Ref for auto-scrolling transcript
  const transcriptEndRef = React.useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(scrollToBottom, [transcript]);

  // Keep queue aging and on-screen timer running for the operator UI.
  React.useEffect(() => {
    const tick = setInterval(() => {
      setTimer(t => t + 1);
      setQueue(q => q.map(item => ({ ...item, waitTime: item.waitTime + 1 })));
    }, 1000);

    return () => {
      clearInterval(tick);
    };
  }, []);

  React.useEffect(() => {
    if (!activeCall) {
      return;
    }

    let mounted = true;

    fetchCallContext(activeCall.id)
      .then((context) => {
        if (!mounted) {
          return;
        }

        const turns = mapTurnsToTranscript(context.turns || []);
        if (turns.length > 0) {
          setTranscript(turns);
        }
      })
      .catch(() => {
        // Keep existing transcript when context retrieval fails.
      });

    const unsubscribe = subscribeAgentUpdates(activeCall.id, {
      onMessage: (envelope) => {
        if (envelope.type !== 'call_update') {
          return;
        }

        const update = envelope.data as Record<string, unknown>;
        const updateType = String(update.type || '');

        if (updateType === 'turn_processed') {
          const transcriptText = String(update.transcript || '').trim();
          const confidenceRaw = Number(update.confidence ?? 0);
          const confidencePct = Math.round(Math.max(0, Math.min(1, confidenceRaw)) * 100);
          const sentiment = update.sentiment as Record<string, unknown> | undefined;
          const wpm = Number(update.speech_speed_wpm ?? 0);
          const stressScore = sentiment?.ipl ? (Number(sentiment.ipl) / 5) : 0;
          const stressIntensity = Number(sentiment?.ipl ?? 1);
          const intentData = update.intent as Record<string, unknown> | undefined;
          const acousticFeatures = sentiment?.features as Record<string, number> | undefined;
          const aiResponse = String(update.ai_response || '').trim();

          if (transcriptText) {
            setTranscript((prev) => [
              ...prev,
              {
                id: `live-${Date.now()}`,
                speaker: 'citizen',
                text: transcriptText,
              },
            ]);
          }

          setSignals((curr) => ({
            ...curr,
            confidence: confidencePct,
            emotion: mapSentimentToEmotion(sentiment?.label as string),
            speechRate: getSpeedRateFromWPM(wpm),
            wpm: Math.round(wpm),
            stressScore: stressScore,
            stressIntensity: stressIntensity,
            intent: String(intentData?.intent ?? 'Unknown'),
            intentConfidence: Number(intentData?.confidence ?? 0),
            acousticFeatures: acousticFeatures,
          }));
          
          if (aiResponse) {
            setSummaryScript(aiResponse);
          }
          
          setIsSummaryReady(true);
          setToast({ msg: 'AI Response Generated - Ready for Review', type: 'info' });
        }

        if (updateType === 'escalation' || updateType === 'manual_escalation') {
          setToast({ msg: 'Escalation triggered. Supervisor notified.', type: 'critical' });
        }

        if (updateType === 'ai_chunk') {
          const chunk = String(update.chunk || '').trim();
          if (chunk) {
            setSummaryScript((prev) => (prev ? `${prev} ${chunk}` : chunk));
            setIsSummaryReady(true);
          }
        }

        if (updateType === 'confirmation') {
          const result = String(update.result || '');
          if (result === 'full_match') {
            setToast({ msg: 'Citizen confirmed understanding.', type: 'info' });
          }
        }
      },
      onError: () => {
        setToast({ msg: 'Live feed disconnected. Retrying on call switch.', type: 'warning' });
      },
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [activeCall]);

  const handleEndCall = () => navigate('/agent/wrap-up');
  const handleLogout = () => navigate('/login');
  const handleReturnToHome = () => navigate('/agent/home');
  
  const handleHotHandoff = () => {
    if (!activeCall) {
      return;
    }

    escalateCall(activeCall.id, 'manual_supervisor_handoff')
      .then(() => {
        setToast({ msg: "HOT HANDOFF INITIATED. Syncing context with Supervisor...", type: 'critical' });
        setTimeout(() => handleEndCall(), 2000);
      })
      .catch(() => {
        setToast({ msg: 'Unable to escalate call. Backend unavailable.', type: 'warning' });
      });
  };

  const handleApproveSummary = () => {
    if (!activeCall) return;
    
    setToast({ msg: "Sending response to citizen...", type: 'info' });
    sendAgentResponse(activeCall.id, summaryScript)
      .then(() => {
        setIsSummaryReady(false);
        setTranscript(prev => [...prev, { id: `a${Date.now()}`, speaker: 'agent', text: summaryScript }]);
        setToast({ msg: "Response delivered to citizen.", type: 'info' });
      })
      .catch(() => {
        setToast({ msg: 'Failed to send response. Please try again.', type: 'warning' });
      });
  };

  const handleQueueSwitch = (item: QueueItemData) => {
    setToast({ msg: `Loading Session: ${item.callerId}`, type: 'info' });
    setQueue(q => q.filter(i => i.id !== item.id));
    if (activeCall) setQueue(prev => [...prev, activeCall]);
    setActiveCall(item);
    setTimer(0);
    setTranscript([]);
    setIsSummaryReady(false);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-brand-bg text-gray-200 font-sans">
      <AnimatePresence>
        {toast && <NotificationToast message={toast.msg} type={toast.type} onClear={() => setToast(null)} />}
      </AnimatePresence>

      {/* --- TOP BAR: Caller Profile Strip --- */}
      <header className="h-16 border-b border-brand-border bg-brand-card/80 backdrop-blur-md flex items-center px-6 justify-between shrink-0 z-40">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 relative group">
            <button 
              onClick={() => setIsLeaveModalOpen(true)}
              className="w-10 h-10 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center hover:border-brand-primary transition-all active:scale-95 group/ag"
            >
              <div className="text-[10px] font-black text-brand-primary transition-colors group-hover/ag:text-white">BP</div>
            </button>
            <div className="cursor-pointer" onClick={() => setShowSettings(!showSettings)}>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-white transition-colors">
                AGENT ID: 7721
                <ChevronDown size={10} className={cn("transition-transform", showSettings && "rotate-180")} />
              </div>
              <div className="text-lg font-display font-black text-white leading-none">
                {activeCall?.callerId || "STANDBY"}
              </div>
            </div>

            <AnimatePresence>
              {showSettings && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/20" 
                    onClick={() => setShowSettings(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-14 left-0 w-56 bg-brand-card border border-brand-border rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
                  >
                    <div className="p-4 bg-black/20 border-b border-brand-border">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Authenticated As</p>
                      <p className="text-xs font-bold text-white">Balarathi P (Senior Agent)</p>
                      <p className="text-[9px] text-brand-primary font-bold mt-1">HELPLINE CONSOLE</p>
                    </div>
                    <button className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-brand-bg hover:text-brand-primary flex items-center gap-3 transition-colors">
                      <Settings size={14} />
                      Dashboard Prefs
                    </button>
                    <Divider />
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-brand-danger hover:bg-brand-danger/10 flex items-center gap-3 transition-colors"
                    >
                      <LogOut size={14} />
                      Terminate Session
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <Divider className="h-10 w-px" />

          <div className="flex items-center gap-4">
            <LanguageBadge language={activeCall?.language || "Detecting"} dialect={activeCall?.dialect || "Wait"} />
            <UrgencyBadge level={activeCall?.urgency || 'low'} />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-success/10 border border-brand-success/20 animate-pulse">
              <StatusDot status={activeCall ? "connected" : "disconnected"} />
              <span className="text-[10px] uppercase font-black text-brand-success tracking-widest">Live Feed</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-brand-primary bg-brand-primary/5 px-4 py-2 rounded-lg border border-brand-primary/20 shadow-inner">
            <Clock size={18} />
            <span className="font-mono text-xl font-bold tabular-nums tracking-tight">
              {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
            </span>
          </div>
          <IconButton onClick={() => setToast({ msg: "Alert History Cleared", type: "info" })} className="relative bg-brand-card border border-brand-border shadow-lg">
            <Bell size={20} />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-danger rounded-full ring-2 ring-brand-card" />
          </IconButton>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* --- LEFT SIDEBAR: Call Queue --- */}
        <aside className={cn("border-r border-brand-border bg-brand-bg shrink-0 flex flex-col transition-all duration-300 relative", isQueueCollapsed ? "w-0" : "w-72")}>
          <button 
            onClick={() => setIsQueueCollapsed(!isQueueCollapsed)}
            className="absolute -right-3 top-8 z-50 w-6 h-6 rounded-full bg-brand-card border border-brand-border flex items-center justify-center text-gray-500 hover:text-white shadow-xl transition-transform active:scale-90"
          >
            <ChevronDown size={14} className={cn("transition-transform", isQueueCollapsed ? "-rotate-90" : "rotate-90")} />
          </button>

          <div className={cn("flex flex-col h-full overflow-hidden transition-opacity duration-200", isQueueCollapsed ? "opacity-0 invisible" : "opacity-100 visible")}>
            <div className="p-5 border-b border-brand-border h-[120px] shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Priority Queue ({priorityQueue.length})</h2>
                <div className="w-5 h-5 rounded-full bg-brand-danger/10 flex items-center justify-center text-brand-danger">
                  <Activity size={12} />
                </div>
              </div>
              <SearchBar placeholder="Search Priority ID..." className="mb-2" />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide mask-fade-bottom">
              <AnimatePresence mode="popLayout">
                {priorityQueue.sort((a,b) => b.urgency === 'critical' ? 1 : -1).map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => handleQueueSwitch(item)}
                    className={cn(
                      "group relative p-4 bg-brand-card border border-brand-border rounded-xl hover:border-brand-primary cursor-pointer transition-all duration-300 hover:shadow-[0_10px_30px_rgba(59,130,246,0.1)] active:scale-95",
                      item.urgency === 'critical' && "border-l-2 border-l-brand-danger"
                    )}
                  >
                    {item.urgency === 'critical' && (
                      <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-brand-danger animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono text-gray-500 font-bold group-hover:text-brand-primary transition-colors">{item.callerId}</span>
                      <UrgencyBadge level={item.urgency} className="text-[8px] h-4" />
                    </div>
                    <div className="space-y-3">
                      <LanguageBadge language={item.language} dialect={item.dialect} className="bg-transparent border-none p-0 text-[9px]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                          <Clock size={12} className="text-gray-600" />
                          <span>{Math.floor(item.waitTime / 60)}m {item.waitTime % 60}s</span>
                        </div>
                        <ChevronDown size={14} className="text-gray-700 -rotate-90 group-hover:text-brand-primary transition-all" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* --- CENTER: Live Transcript & Workspace --- */}
        <main className="flex-1 flex flex-col min-w-0 bg-brand-bg relative h-full">
          {/* Top zone (~60% height) — LiveTranscriptPanel */}
          <div className="flex-[0.6] min-h-0 overflow-y-auto px-10 py-10 scrollbar-hide border-b border-brand-border/50">
            <div className="space-y-6 max-w-3xl mx-auto w-full mb-10">
              <AnimatePresence initial={false}>
                {transcript.map((line) => (
                  <motion.div 
                    key={line.id} 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex flex-col gap-2",
                      line.speaker === 'agent' ? "items-end" : "items-start"
                    )}
                  >
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-600">
                        {line.speaker === 'agent' ? "Internal Agent" : "Live Citizen Component"}
                      </span>
                      {line.speaker === 'citizen' && <ConfidenceDot level={signals.confidence > 70 ? 'high' : 'medium'} />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] px-6 py-4 rounded-2xl shadow-xl text-sm leading-relaxed font-medium relative group",
                      line.speaker === 'agent' 
                        ? "bg-brand-primary text-white rounded-tr-none" 
                        : "bg-brand-card border border-brand-border text-gray-200 rounded-tl-none"
                    )}>
                      {line.ambiguities ? (
                        <p>
                          {line.text.split('').map((char, i) => {
                            const amb = line.ambiguities?.find(a => i >= a.start && i < a.start + a.length);
                            if (amb) return (
                              <span key={i} className="underline decoration-brand-danger/60 decoration-dashed underline-offset-4 cursor-help group/amb relative transition-all hover:decoration-brand-danger">
                                {char}
                                <span className="absolute bottom-full left-0 mb-2 hidden group-hover/amb:block bg-brand-danger px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xl z-20 whitespace-normal min-w-[200px]">
                                  <span className="text-white/60 mb-1 block font-bold">ASR Uncertainty Correction:</span>
                                  {amb.suggestions.join(' | ')}
                                </span>
                              </span>
                            );
                            return char;
                          })}
                        </p>
                      ) : line.text}
                      {/* Per-turn actions for citizen turns */}
                      {line.speaker === 'citizen' && (
                        <div className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setCorrectionTurnId(line.id);
                              setCorrectionText('');
                              setIsCorrectionOpen(true);
                            }}
                            className="bg-brand-card border border-brand-border text-[10px] px-2 py-1 rounded-md hover:bg-brand-primary/10"
                          >
                            Correct Intent
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={transcriptEndRef} />
            </div>
          </div>

          {/* Bottom zone (~40% height) */}
          <div className="flex-[0.4] min-h-0 pb-24 p-8 flex flex-col items-center bg-brand-bg relative">
            <div className="w-full max-w-4xl flex-1 flex flex-col h-full">
              <AnimatePresence>
                {isSummaryReady && (
                   <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex-1 flex flex-col bg-brand-card/40 border border-brand-border rounded-lg overflow-hidden shadow-2xl"
                  >
                    <div className="px-5 py-3 border-b border-brand-border bg-brand-card/80 flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Verification Required</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                        <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest">Protocol Active</span>
                      </div>
                    </div>

                    <div className="flex-1 p-5 min-h-0 overflow-hidden flex flex-col">
                      <div className="flex-1 min-h-0 bg-brand-bg/60 border border-brand-border/50 rounded-lg p-6 flex flex-col shadow-inner relative">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Synthesis Output:</p>
                          <button 
                            onClick={() => setIsEditingScript(!isEditingScript)}
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors",
                              isEditingScript ? "bg-brand-primary text-white" : "text-brand-primary hover:bg-brand-primary/10"
                            )}
                          >
                            {isEditingScript ? 'SAVE OVERRIDE' : 'MANUAL EDIT'}
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
                          <EditableTextField 
                            value={summaryScript} 
                            isEditing={isEditingScript}
                            multiline={true}
                            onChange={(v) => { setSummaryScript(v); setIsEditingScript(false); }} 
                            className="text-lg font-display font-medium text-white leading-relaxed"
                          />
                        </div>
                        {isEditingScript && (
                          <div className="absolute top-0 right-0 p-2 pointer-events-none">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 flex gap-3">
                        <PrimaryButton 
                          onClick={handleApproveSummary} 
                          className="flex-1 py-3 text-[10px] tracking-[0.2em] shadow-xl shadow-brand-primary/20 rounded font-black h-12"
                        >
                          PUSH RESPONSE TO CALLER
                        </PrimaryButton>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* --- BOTTOM ACTION BAR --- */}
          <footer className="absolute bottom-0 inset-x-0 h-20 bg-brand-bg border-t border-brand-border flex items-center px-10 justify-between z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-4">
               <button 
                onClick={handleHotHandoff}
                className="flex items-center gap-3 px-6 h-10 bg-brand-card border border-brand-border text-white text-[10px] font-black uppercase tracking-widest hover:border-white transition-all group rounded-sm"
               >
                <ArrowUpRight size={14} className="group-hover:rotate-45 transition-transform" />
                HOT HANDOFF
              </button>
            </div>

            <div className="flex items-center gap-12">
               <div className="flex items-center gap-4">
                  <IconButton className="text-gray-500 hover:text-white transition-colors bg-brand-card/50 border border-brand-border h-10 w-10"><MessageSquare size={18} /></IconButton>
               </div>

               <div className="flex flex-col items-center">
                  <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Microphone</p>
                  <div className="flex items-center gap-2 bg-brand-card/30 px-3 py-1 rounded-full border border-brand-border/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">On Air</span>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <button onClick={() => setIsMuted(!isMuted)} className={cn("transition-colors hover:text-white", isMuted ? "text-brand-danger" : "text-gray-500")}>
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <button className="text-gray-500 hover:text-white transition-colors"><Volume2 size={18} /></button>
               </div>
            </div>

            <button 
              onClick={handleEndCall}
              className="flex items-center gap-3 px-8 h-10 bg-brand-danger text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all rounded shadow-xl shadow-brand-danger/20"
            >
              <PhoneOff size={16} />
              END CALL & WRAP
            </button>
          </footer>
        </main>

        {/* --- RIGHT SIDEBAR: Signals --- */}
        <aside className="w-80 bg-black border-l border-brand-border shrink-0 flex flex-col p-8 space-y-10 overflow-y-auto scrollbar-hide relative">
          <div className="space-y-8">
            {/* Tone Detected - Clickable */}
            <button onClick={() => setIsSignalDetailOpen(true)} className="w-full text-left hover:opacity-80 transition-opacity">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Activity size={20} className="text-gray-600" />
                  <div>
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Tone Detected</p>
                    <p className="text-sm font-bold text-white tracking-wide">{signals.emotion}</p>
                  </div>
                </div>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full mt-2 shadow-lg",
                  signals.emotion === 'Panicked' ? 'bg-brand-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]' :
                  signals.emotion === 'Distressed' ? 'bg-brand-danger shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                  signals.emotion === 'Anxious' ? 'bg-brand-warning shadow-[0_0_8px_rgba(217,119,6,0.6)]' :
                  signals.emotion === 'Confused' ? 'bg-brand-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]' :
                  'bg-brand-success shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                )} />
              </div>
            </button>

            {/* Speech Rate */}
            <div className="flex items-center gap-4">
              <Volume2 size={20} className="text-gray-600" />
              <div>
                <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Speech Rate</p>
                <p className="text-sm font-bold text-white tracking-wide">{signals.wpm} WPM ({signals.speechRate})</p>
              </div>
            </div>

            {/* Intent - Clickable */}
            {signals.intent && (
              <button onClick={() => setIsSignalDetailOpen(true)} className="w-full text-left hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-4">
                  <AlertCircle size={20} className="text-gray-600" />
                  <div>
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Caller Intent</p>
                    <p className="text-sm font-bold text-white tracking-wide">{signals.intent}</p>
                  </div>
                </div>
              </button>
            )}

            {/* ML Confidence */}
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">ML Confidence</h3>
              <div className={cn(
                "px-2.5 py-1 rounded text-[10px] font-black border",
                signals.confidence > 75 ? "bg-brand-success/10 text-brand-success border-brand-success/20" : "bg-brand-warning/10 text-brand-warning border-brand-warning/20"
              )}>
                {Math.round(signals.confidence)}%
              </div>
            </div>
            
            <div className="h-1.5 w-full bg-brand-bg rounded-full overflow-hidden">
                <motion.div 
                  className={cn("h-full transition-all duration-500", signals.confidence > 75 ? "bg-brand-success" : "bg-brand-warning")}
                  animate={{ width: `${signals.confidence}%` }}
                />
            </div>
          </div>

          <Divider className="opacity-20" />

          {/* Correction Modal */}
          <AnimatePresence>
            {isCorrectionOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60" onClick={() => setIsCorrectionOpen(false)} />
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed z-60 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-black border border-brand-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Correct Intent</h4>
                    <IconButton onClick={() => setIsCorrectionOpen(false)}><X size={14} /></IconButton>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400">Turn ID: {correctionTurnId}</p>
                    <EditableTextField value={correctionText} isEditing={true} multiline onChange={(v) => setCorrectionText(v)} className="text-white" />
                    <div className="flex justify-end gap-2">
                      <GhostButton onClick={() => setIsCorrectionOpen(false)}>Cancel</GhostButton>
                      <PrimaryButton onClick={async () => {
                        if (!activeCall || !correctionTurnId) return;
                        try {
                          await (await import('../lib/backend')).correctIntent(activeCall.id, correctionTurnId, { intent: correctionText });
                          setToast({ msg: 'Intent correction saved.', type: 'info' });
                          setIsCorrectionOpen(false);
                        } catch (e) {
                          setToast({ msg: 'Failed to save correction.', type: 'warning' });
                        }
                      }}>Save</PrimaryButton>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Signal Detail Modal */}
          <AnimatePresence>
            {isSignalDetailOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" 
                  onClick={() => setIsSignalDetailOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-black border border-brand-border rounded-lg shadow-2xl z-[110] p-6 max-h-[80vh] overflow-y-auto scrollbar-hide"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Signal Breakdown</h4>
                    <IconButton onClick={() => setIsSignalDetailOpen(false)}>
                      <X size={14} />
                    </IconButton>
                  </div>
                  <div className="space-y-6">
                    {/* Emotion Breakdown */}
                    <div>
                      <p className="text-[9px] font-black text-gray-600 uppercase mb-3 tracking-widest">Emotional State</p>
                      <div className="space-y-2 ml-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">Detected Emotion:</p>
                          <p className="text-xs font-bold text-white">{signals.emotion}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">Stress Intensity:</p>
                          <p className="text-xs font-bold text-white">{signals.stressIntensity}/5 ({getStressLabel(signals.stressIntensity)})</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">Stress Score:</p>
                          <p className="text-xs font-bold text-white">{(signals.stressScore ?? 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Acoustic Features */}
                    {signals.acousticFeatures && (
                      <div>
                        <p className="text-[9px] font-black text-gray-600 uppercase mb-3 tracking-widest">Acoustic Indicators</p>
                        <div className="space-y-2 ml-2">
                          {signals.acousticFeatures.rms !== undefined && (
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-400">Volume (RMS):</p>
                              <p className="text-xs font-bold text-white">{getAcousticLabel(signals.acousticFeatures.rms)}</p>
                            </div>
                          )}
                          {signals.acousticFeatures.zcr !== undefined && (
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-400">Clarity (ZCR):</p>
                              <p className="text-xs font-bold text-white">{(signals.acousticFeatures.zcr * 100).toFixed(1)}%</p>
                            </div>
                          )}
                          {signals.acousticFeatures.centroid !== undefined && (
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-400">Pitch Centroid:</p>
                              <p className="text-xs font-bold text-white">{Math.round(signals.acousticFeatures.centroid)} Hz</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Intent Breakdown */}
                    {signals.intent && (
                      <div>
                        <p className="text-[9px] font-black text-gray-600 uppercase mb-3 tracking-widest">Caller Intent</p>
                        <div className="space-y-2 ml-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-400">Detected Intent:</p>
                            <p className="text-xs font-bold text-white">{signals.intent}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-400">Confidence:</p>
                            <p className="text-xs font-bold text-white">{Math.round((signals.intentConfidence ?? 0) * 100)}%</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Speech Pattern */}
                    <div>
                      <p className="text-[9px] font-black text-gray-600 uppercase mb-3 tracking-widest">Speech Pattern</p>
                      <div className="space-y-2 ml-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">Words Per Minute:</p>
                          <p className="text-xs font-bold text-white">{signals.wpm} WPM</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">Speech Rate:</p>
                          <p className="text-xs font-bold text-white">{signals.speechRate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Live Understanding (Moved from bottom) */}
          <div className="space-y-6 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Live Understanding</h3>
              <StatusDot status="connected" className="opacity-50 h-1.5 w-1.5" />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-4">
              <p className="text-sm font-medium text-gray-300 leading-relaxed italic">
                "Caller is reporting a critical failure at Sector 4. Intent mapping: Structural/Hazard. Dialect: {activeCall?.dialect || 'South-Western'}. Authentication: Verified."
              </p>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Acoustic signal indicates high distress. Speech patterns suggest urgency level: {activeCall?.urgency || 'high'}. Cross-referencing with active utility alerts in the Yelahanka grid.
              </p>
              
              <button 
                onClick={() => setIsDetailDrawerOpen(true)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:text-white transition-colors group/btn pt-2"
              >
                <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                Structured Detail
              </button>
            </div>

            <AnimatePresence>
              {isDetailDrawerOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={() => setIsDetailDrawerOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-black border border-brand-border rounded-lg shadow-2xl z-[110] p-6"
                  >
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Extraction Node</h4>
                        <IconButton onClick={() => setIsDetailDrawerOpen(false)}>
                          <X size={14} />
                        </IconButton>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <p className="text-[9px] font-black text-gray-600 uppercase mb-2 tracking-widest">Intent</p>
                          <p className="text-xs font-bold text-white">Road Hazard / Structural</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-600 uppercase mb-2 tracking-widest">Geolocation</p>
                          <p className="text-xs font-bold text-white">Yelahanka Sector 4 (Grid A-12)</p>
                        </div>
                      </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>

      {/* --- EXTERNAL LAYER: Side Drawer & Pull Tab --- */}
      <div className="fixed right-0 top-0 bottom-0 pointer-events-none z-[60] flex items-center">
        {/* Pull Tab */}
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className={cn(
            "pointer-events-auto h-32 w-8 bg-brand-card border-l border-y border-brand-border rounded-l-xl flex flex-col items-center justify-center gap-4 transition-all hover:w-10 hover:bg-brand-bg group shadow-2xl",
            isDrawerOpen && "translate-x-full"
          )}
        >
          <div className="relative">
            <div className={cn(
              "w-2 h-2 rounded-full",
              MOCK_CLUSTERS.length > 0 ? "bg-brand-warning animate-pulse" : "bg-gray-600"
            )} />
            {MOCK_CLUSTERS.length > 0 && (
              <div className="absolute inset-0 bg-brand-warning rounded-full animate-ping opacity-20" />
            )}
          </div>
          <div className="[writing-mode:vertical-lr] rotate-180 text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-brand-primary transition-colors">
            Intelligence
          </div>
        </button>

        {/* Cluster Drawer */}
        <AnimatePresence>
          {isDrawerOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                onClick={() => setIsDrawerOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-96 bg-brand-card border-l border-brand-border shadow-[0_0_100px_rgba(0,0,0,0.5)] pointer-events-auto flex flex-col overflow-hidden"
              >
                <div className="flex flex-col h-full">
                  <div className="p-8 border-b border-brand-border flex items-center justify-between bg-brand-card/50 backdrop-blur-md">
                    <div className="flex items-center gap-3 text-brand-primary">
                      <Globe size={20} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Network Intelligence</span>
                    </div>
                    <IconButton onClick={() => setIsDrawerOpen(false)} className="bg-brand-bg transition-transform hover:rotate-90">
                      <X size={18} />
                    </IconButton>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 mb-2">Detected Clusters</p>
                    {MOCK_CLUSTERS.map((cluster) => (
                      <div 
                        key={cluster.id}
                        className={cn(
                          "bg-brand-bg/40 border border-brand-border rounded-2xl transition-all duration-300 overflow-hidden",
                          expandedClusterId === cluster.id ? "ring-1 ring-brand-warning/30 border-brand-warning/20 shadow-lg shadow-brand-warning/5" : "hover:border-brand-border/80"
                        )}
                      >
                        {/* Compact Row */}
                        <div 
                          onClick={() => setExpandedClusterId(expandedClusterId === cluster.id ? null : cluster.id)}
                          className="p-4 flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <UrgencyBadge level="high" className="text-[8px] h-4" />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{cluster.location} — {cluster.category}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{cluster.count} Active Calls</p>
                            </div>
                          </div>
                          <ChevronDown size={14} className={cn("text-gray-600 transition-transform", expandedClusterId === cluster.id && "rotate-180")} />
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {expandedClusterId === cluster.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 pt-2 space-y-6">
                                <div className="p-4 bg-brand-warning/5 border border-brand-warning/10 rounded-xl">
                                  <p className="text-xs font-medium text-brand-warning leading-relaxed italic">
                                    "{cluster.count} callers from {cluster.location} reported {cluster.category.toLowerCase()} failure in the last {cluster.timeframe}. High correlation detected across residential grids."
                                  </p>
                                </div>

                                <div className="space-y-3">
                                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Acoustic Signal Fragments</p>
                                  <div className="flex flex-wrap gap-2">
                                    {["No delivery for 3 cycles", "Meter frozen", "Pump pressure drop", "Contamination suspected"].map((phrase, i) => (
                                      <span key={i} className="px-3 py-1.5 rounded-lg bg-black/40 border border-brand-border text-[11px] text-gray-400 font-medium italic">
                                        "{phrase}"
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <GhostButton 
                                  onClick={() => {
                                    setToast({ msg: "Supervisor Notified. Cluster telemetry flagged.", type: 'info' });
                                    setExpandedClusterId(null);
                                  }}
                                  className="w-full py-4 text-[10px] tracking-widest border-brand-warning/20 text-brand-warning hover:bg-brand-warning/10"
                                >
                                  Flag for Supervisor
                                </GhostButton>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  <div className="p-8 border-t border-brand-border bg-brand-card">
                    <p className="text-[9px] text-gray-500 italic leading-relaxed text-center">
                      Auto-clustering active. Telemetry updated every 90 seconds based on regional intent grouping.
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      {/* --- LEAVE CONFIRM MODAL --- */}
      <AnimatePresence>
        {isLeaveModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
              onClick={() => setIsLeaveModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-brand-card border border-brand-border rounded-2xl p-8 z-[110] shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-brand-danger/10 flex items-center justify-center text-brand-danger mb-6">
                  <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-display font-black text-white italic mb-4 uppercase tracking-tight">Active Call Suspension</h2>
                <p className="text-sm font-medium text-gray-400 leading-relaxed mb-8">
                  You are currently on an active session. Returning to the dispatch view will suspend this call and return it to the Priority Queue for another agent to pick up.
                </p>
                
                <div className="flex flex-col w-full gap-3">
                  <PrimaryButton 
                    onClick={handleReturnToHome}
                    className="w-full py-4 text-[10px] tracking-[0.2em] bg-brand-danger hover:bg-red-500 font-black"
                  >
                    RETURN TO HOME & SUSPEND
                  </PrimaryButton>
                  <button 
                    onClick={() => setIsLeaveModalOpen(false)}
                    className="w-full py-4 text-[10px] tracking-[0.2em] font-black text-gray-500 hover:text-white transition-colors"
                  >
                    STAY ON CALL
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
