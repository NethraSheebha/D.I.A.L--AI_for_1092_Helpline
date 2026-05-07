import React, { useState } from 'react';
import { useStore } from '../stores/useStore';
import { audioEngine } from '../audio/AudioEngine';
import { AudioWaveform } from './AudioWaveform';
import { 
  Volume2, 
  VolumeX, 
  Wifi, 
  WifiOff, 
  Activity, 
  ShieldAlert,
  Mic,
  Zap
} from 'lucide-react';
import { cn } from '../utils/cn';

export const LiveAudioPlayer: React.FC = () => {
  const { connectionStatus } = useStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioStarted, setIsAudioStarted] = useState(false);

  const toggleAudio = async () => {
    if (!isAudioStarted) {
      await audioEngine.resume();
      setIsAudioStarted(true);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return { color: 'text-blue-500', icon: Wifi, label: 'Stable Tunnel' };
      case 'RECONNECTING':
        return { color: 'text-amber-500', icon: Activity, label: 'Uplink Syncing' };
      case 'DEGRADED':
        return { color: 'text-red-400', icon: ShieldAlert, label: 'Packet Loss' };
      default:
        return { color: 'text-zinc-600', icon: WifiOff, label: 'Offline' };
    }
  };

  const status = getStatusConfig();

  return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={cn(
            "flex items-center gap-3 px-4 py-1.5 rounded-xl border transition-all",
            connectionStatus === 'CONNECTED' ? "bg-blue-600/5 border-blue-600/20 shadow-[0_0_15px_rgba(37,99,235,0.05)]" : "bg-zinc-900 border-zinc-800"
          )}>
            <status.icon size={14} className={cn(status.color, connectionStatus === 'CONNECTED' ? "animate-pulse" : "")} />
            <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", status.color)}>
              {status.label}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <Mic size={14} className="text-zinc-700" />
            Vocal Intercept: Active
          </div>
        </div>

        <button 
          onClick={toggleAudio}
          className={cn(
            "flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            !isAudioStarted ? "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]" :
            isMuted ? "bg-zinc-900 border border-zinc-800 text-zinc-500" : 
            "bg-blue-600/10 border border-blue-600/20 text-blue-500"
          )}
        >
          {!isAudioStarted ? (
            <>START MONITORING <Zap size={14} fill="currentColor" /></>
          ) : isMuted ? (
            <><VolumeX size={16} /> Stream Muted</>
          ) : (
            <><Volume2 size={16} /> Live Stream</>
          )}
        </button>
      </div>
  );
};
