import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Rewind,
  Volume2,
  Share2,
  Download,
  AlertTriangle,
  MessageSquare,
  Activity,
  User,
  Bot
} from 'lucide-react';
import { cn } from '../utils/cn';

export const IncidentReplay: React.FC = () => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [volume, setVolume] = React.useState(80);
  const [isMuted, setIsMuted] = React.useState(false);
  const [voicesLoaded, setVoicesLoaded] = React.useState(false);
  const totalDuration = 312; // 05:12 in seconds
  const synth = window.speechSynthesis;
  const lastSpokenIndex = React.useRef(-1);

  const transcript = [
    { type: 'citizen', text: 'ಹಲೋ, ಹೆಬ್ಬಾಳ ಫ್ಲೈಓವರ್ ಮೇಲೆ ರಸ್ತೆ ಕುಸಿದಿದೆ! ದಯವಿಟ್ಟು ಸಹಾಯ ಮಾಡಿ!', time: '00:10', seconds: 10, lang: 'kn-IN' },
    { type: 'ai', text: 'ನಾನು ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಹೆಬ್ಬಾಳ ಫ್ಲೈಓವರ್ ಎಂದು ಗುರುತಿಸಿದ್ದೇನೆ. ತುರ್ತು ಘಟಕಗಳನ್ನು ತಕ್ಷಣವೇ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ. ನೀವು ಸುರಕ್ಷಿತ ಪ್ರದೇಶದಲ್ಲಿದ್ದೀರಾ?', time: '00:25', seconds: 25, lang: 'kn-IN' },
    { type: 'citizen', text: 'ಹೌದು, ನಾನು ಕಾರಿನಿಂದ ಹೊರಬಂದಿದ್ದೇನೆ. ಆದರೆ ಬಹಳಷ್ಟು ವಾಹನಗಳು ಸಿಲುಕಿಕೊಂಡಿವೆ.', time: '01:45', seconds: 105, lang: 'kn-IN' },
    { type: 'ai', text: 'ತಿಳಿದಿದೆ. ಎನ್.ಡಿ.ಆರ್.ಎಫ್ ಮತ್ತು ವೈದ್ಯಕೀಯ ತಂಡಗಳು ೪ ನಿಮಿಷಗಳಲ್ಲಿ ಅಲ್ಲಿಗೆ ತಲುಪಲಿವೆ. ಲೈನ್‌ನಲ್ಲಿಯೇ ಇರಿ.', time: '02:02', seconds: 122, lang: 'kn-IN' },
    { type: 'system', text: 'Escalation Triggered: Multi-Vehicle Entrapment - Critical Urgency', time: '02:45', seconds: 165, lang: 'en-US' },
  ];

  // Robust Voice Loading
  React.useEffect(() => {
    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      if (availableVoices.length > 0) setVoicesLoaded(true);
    };
    loadVoices();
    synth.onvoiceschanged = loadVoices;
  }, []);

  const currentTimeSeconds = (progress / 100) * totalDuration;
  const activeIndex = transcript.reduce((acc, msg, i) => {
    if (currentTimeSeconds >= msg.seconds) return i;
    return acc;
  }, -1);

  const speak = (text: string, lang: string) => {
    if (!voicesLoaded) return;
    
    // Stop any existing speech
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = isMuted ? 0 : volume / 100;
    utterance.rate = 1.0;

    const voices = synth.getVoices();
    
    // 1. Try exact match for Kannada
    let voice = voices.find(v => v.lang === lang || v.lang === 'kn-IN');
    
    // 2. Fallback: Any Kannada voice (partial match)
    if (!voice) voice = voices.find(v => v.lang.startsWith('kn'));
    
    // 3. Fallback: Any Indian English voice (better than nothing for phonetics)
    if (!voice) voice = voices.find(v => v.lang.includes('IN'));
    
    // 4. Ultimate Fallback: System Default
    if (!voice) {
      console.warn(`No Kannada voice found. Falling back to system default for: ${text}`);
      // Don't set utterance.voice, let the system decide
    } else {
      utterance.voice = voice;
      utterance.lang = voice.lang; // Use the actual voice's language to prevent browser silencers
    }

    // Force language for English alerts
    if (lang === 'en-US') {
       utterance.lang = 'en-US';
       const enVoice = voices.find(v => v.lang.startsWith('en'));
       if (enVoice) utterance.voice = enVoice;
    }

    synth.speak(utterance);
  };

  React.useEffect(() => {
    if (isPlaying && activeIndex !== -1 && activeIndex !== lastSpokenIndex.current) {
      lastSpokenIndex.current = activeIndex;
      speak(transcript[activeIndex].text, transcript[activeIndex].lang);
    }
  }, [activeIndex, isPlaying, voicesLoaded]);

  React.useEffect(() => {
    if (!isPlaying) synth.cancel();
  }, [isPlaying]);

  React.useEffect(() => {
    let interval: any;
    if (isPlaying && progress < 100) {
      interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 0.1, 100));
      }, 50);
    } else {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, progress]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6 animate-in fade-in duration-700">
      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tighter">INCIDENT REPLAY // TOKEN-8821</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Critical Incident</span>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sector: Bangalore Central</span>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Location: Hebbal Flyover</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border text-[10px] font-black transition-all uppercase tracking-widest",
            voicesLoaded ? "bg-green-600/10 border-green-600/20 text-green-500" : "bg-red-600/10 border-red-600/20 text-red-500"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", voicesLoaded ? "bg-green-500" : "bg-red-500 animate-pulse")} />
            Audio Engine: {voicesLoaded ? "Ready" : "Loading..."}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-black text-zinc-400 hover:text-white transition-all uppercase tracking-widest">
            <Share2 size={14} />
            Share Log
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-black text-zinc-400 hover:text-white transition-all uppercase tracking-widest">
            <Download size={14} />
            Download Audio
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-6">
        {/* Left: Player & Timeline */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Waveform Visualization Panel */}
          <div className="flex-1 bg-[#0a0a0b] border border-[#1a1a1c] rounded-3xl relative overflow-hidden flex flex-col items-center justify-center p-12">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)]" />
              <div className="w-full h-full flex items-center px-8 gap-1">
                {Array.from({ length: 80 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 rounded-full transition-all duration-300",
                      (i / 80) * 100 < progress ? "bg-blue-600" : "bg-zinc-800",
                      isPlaying && (i / 80) * 100 < progress ? "animate-pulse" : ""
                    )}
                    style={{ height: `${Math.sin(i * 0.2 + (progress * 0.1)) * 30 + 50}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Replay Overlay Info */}
            <div className="z-10 text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] shadow-2xl">
                <AlertTriangle size={12} className={progress > 52 ? "animate-pulse" : ""} />
                {progress > 52 ? "Linguistic Distress Detected" : "Analyzing Stream..."}
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter">
                {formatTime(currentTimeSeconds)} / {formatTime(totalDuration)}
              </h2>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="bg-[#0a0a0b] border border-[#1a1a1c] p-6 rounded-3xl space-y-6">
            <div 
              className="relative h-2 w-full bg-zinc-900 rounded-full cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setProgress((x / rect.width) * 100);
                lastSpokenIndex.current = -1; 
                synth.cancel();
              }}
            >
              <div 
                className="absolute top-0 left-0 h-full bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progress}%` }}
              />
              {/* Markers */}
              <div className="absolute top-[-4px] left-[52%] w-1.5 h-4 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button 
                  className="text-zinc-500 hover:text-white transition-colors"
                  onClick={() => { setProgress(0); setIsPlaying(false); lastSpokenIndex.current = -1; synth.cancel(); }}
                >
                  <RotateCcw size={20} />
                </button>
                <div className="flex items-center gap-4">
                  <button className="text-zinc-500 hover:text-white transition-colors" onClick={() => { setProgress(prev => Math.max(0, prev - 5)); lastSpokenIndex.current = -1; synth.cancel(); }}>
                    <Rewind size={24} fill="currentColor" />
                  </button>
                  <button 
                    onClick={() => {
                      if (!isPlaying) {
                        // Gesture to activate audio context
                        speak('', 'en-US'); 
                      }
                      setIsPlaying(!isPlaying);
                    }}
                    className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:scale-110 active:scale-95 transition-all"
                  >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                  </button>
                  <button className="text-zinc-500 hover:text-white transition-colors" onClick={() => { setProgress(prev => Math.min(100, prev + 5)); lastSpokenIndex.current = -1; synth.cancel(); }}>
                    <FastForward size={24} fill="currentColor" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-500 hover:text-white transition-colors">
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div className="relative w-24 h-1 bg-zinc-900 rounded-full cursor-pointer group"
                     onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const x = e.clientX - rect.left;
                       setVolume((x / rect.width) * 100);
                       setIsMuted(false);
                     }}>
                  <div className="absolute top-0 left-0 h-full bg-zinc-500 rounded-full" style={{ width: `${isMuted ? 0 : volume}%` }} />
                </div>
                <div className="ml-4 flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Speed</span>
                  <span className="text-xs font-bold text-white uppercase">1.0x</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Transcript Sync */}
        <div className="w-[400px] bg-[#0a0a0b] border border-[#1a1a1c] rounded-3xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-[#1a1a1c] flex items-center justify-between">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={14} className="text-blue-500" />
              Synced Transcript
            </h3>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Kn/En Localized</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            {transcript.map((msg, i) => (
              <div key={i} className={cn(
                "flex gap-4 group transition-all duration-500",
                activeIndex >= i ? "opacity-100 scale-100" : "opacity-20 scale-95 blur-[1px]"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border transition-colors",
                  msg.type === 'citizen' ? "bg-zinc-900 border-zinc-800 text-zinc-500" :
                  msg.type === 'ai' ? "bg-blue-600/10 border-blue-600/20 text-blue-500" :
                  "bg-red-600/10 border-red-600/20 text-red-500"
                )}>
                  {msg.type === 'citizen' ? <User size={16} /> : msg.type === 'ai' ? <Bot size={16} /> : <AlertTriangle size={16} />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                      {msg.type === 'citizen' ? 'Citizen' : msg.type === 'ai' ? 'D.I.A.L AI' : 'System Alert'}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-700">{msg.time}</span>
                  </div>
                  <p className={cn(
                    "text-xs leading-relaxed",
                    activeIndex === i ? "text-white font-bold" : "text-zinc-500"
                  )}>
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const VolumeX = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
);
