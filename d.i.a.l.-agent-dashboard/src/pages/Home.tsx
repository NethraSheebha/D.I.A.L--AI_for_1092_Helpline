import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PhoneCall, 
  Search, 
  Filter, 
  Plus, 
  MapPin, 
  Clock, 
  Zap,
  Activity,
  ChevronRight,
  ShieldAlert,
  Bot
} from 'lucide-react';
import { MOCK_QUEUE } from '../mocks';
import { cn } from '../utils/cn';
import { useStore } from '../stores/useStore';

export default function Home() {
  const navigate = useNavigate();
  const { selectCall, updateCall } = useStore();

  const handleJoinCall = (call: any) => {
    const stressMap = {
      critical: 0.88,
      high: 0.65,
      medium: 0.45,
      low: 0.22
    };

    const urgencyMap = {
      critical: 'high',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };

    const conversationMap = {
      'TOKEN-8821': [
        { turn_id: 't1', turn_number: 1, transcript: "Help! The Hebbal flyover main road just collapsed!", intent: { intent: 'Road Collapse' }, sentiment: { label: 'Panicked', ipl: 5 }, ai_response: "Stay calm. Are you in a safe location? Emergency units are being dispatched to Hebbal Flyover immediately.", timestamp: new Date(Date.now() - 60000).toISOString() },
        { turn_id: 't2', turn_number: 2, transcript: "Yes, I am out of the car. Many vehicles are trapped down there!", intent: { intent: 'Road Collapse' }, sentiment: { label: 'Panicked', ipl: 5 }, ai_response: "Understood. Maintaining uplink. NDRF and medical teams are 4 minutes away.", timestamp: new Date().toISOString() }
      ],
      'TOKEN-4492': [
        { turn_id: 't1', turn_number: 1, transcript: "ಕೆ.ಆರ್ ಮಾರುಕಟ್ಟೆಯ ವಾಣಿಜ್ಯ ಸಂಕೀರ್ಣದಲ್ಲಿ ಭಾರಿ ಬೆಂಕಿ ಕಾಣಿಸಿಕೊಂಡಿದೆ!", intent: { intent: 'Fire Hazard' }, sentiment: { label: 'Distressed', ipl: 4 }, ai_response: "ನಾನು ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಕೆ.ಆರ್ ಮಾರುಕಟ್ಟೆ ಎಂದು ಗುರುತಿಸಿದ್ದೇನೆ. ಬೆಂಕಿ ಹತ್ತಿರದ ಅಂಗಡಿಗಳಿಗೆ ಹರಡುತ್ತಿದೆಯೇ?", timestamp: new Date(Date.now() - 45000).toISOString() },
        { turn_id: 't2', turn_number: 2, transcript: "ಹೌದು, ಗಾಳಿ ಜೋರಾಗಿದೆ. ದಯವಿಟ್ಟು ಬೇಗ ಅಗ್ನಿಶಾಮಕ ದಳವನ್ನು ಕಳುಹಿಸಿ!", intent: { intent: 'Fire Hazard' }, sentiment: { label: 'Distressed', ipl: 5 }, ai_response: "ವಿಕ್ಟೋರಿಯಾ ಆಸ್ಪತ್ರೆ ನಿಲ್ದಾಣದಿಂದ ಅಗ್ನಿಶಾಮಕ ಘಟಕಗಳು ಬರುತ್ತಿವೆ. ಈಗಲೇ ಆ ಪ್ರದೇಶವನ್ನು ಖಾಲಿ ಮಾಡಿ.", timestamp: new Date().toISOString() }
      ],
      'TOKEN-7710': [
        { turn_id: 't1', turn_number: 1, transcript: "सिल्क बोर्ड जंक्शन पर गड्ढा बहुत खतरनाक होता जा रहा है। यह बहुत बड़ा है।", intent: { intent: 'Infrastructure' }, sentiment: { label: 'Frustrated', ipl: 3 }, ai_response: "समझ गया। मैं इसे बीबीएमपी रैपिड रिस्पांस टीम के लिए दर्ज कर रहा हूं। क्या यह ट्रैफिक को रोक रहा है?", timestamp: new Date(Date.now() - 30000).toISOString() },
        { turn_id: 't2', turn_number: 2, transcript: "हां, दोपहिया वाहन लगभग गिर रहे हैं। यहां बैरिकेड की जरूरत है।", intent: { intent: 'Infrastructure' }, sentiment: { label: 'Frustrated', ipl: 3 }, ai_response: "समझ गया। तत्काल बैरिकेडिंग के लिए स्थानीय ट्रैफिक पुलिस को अलर्ट कर रहा हूं।", timestamp: new Date().toISOString() }
      ],
      'TOKEN-1102': [
        { turn_id: 't1', turn_number: 1, transcript: "Hello, I am calling to report a water pipe leakage in Whitefield near the park.", intent: { intent: 'Maintenance' }, sentiment: { label: 'Patient', ipl: 1 }, ai_response: "Thank you for reporting. Is the water flow heavy or just a seep?", timestamp: new Date(Date.now() - 120000).toISOString() },
        { turn_id: 't2', turn_number: 2, transcript: "It is quite heavy now, wasting a lot of water.", intent: { intent: 'Maintenance' }, sentiment: { label: 'Concerned', ipl: 2 }, ai_response: "Got it. BWSSB maintenance crew has been ticketed for this location.", timestamp: new Date().toISOString() }
      ]
    };

    updateCall(call.id, {
      call_id: call.callerId,
      state: 'active',
      dialect: `${call.language} - ${call.dialect}`,
      urgency: (urgencyMap[call.urgency] || 'medium') as any,
      vitals: { 
        rms: 0.15, 
        pitch: 180, 
        stress: stressMap[call.urgency] || 0.45, 
        wpm: 120 
      },
      turns: conversationMap[call.callerId] || [
        {
          turn_id: 't1',
          turn_number: 1,
          transcript: call.transcript || "Help needed immediately.",
          intent: { intent: call.intent || 'Emergency' },
          sentiment: { label: call.sentiment || 'Anxious', ipl: 3 },
          confidence: 0.92,
          timestamp: new Date().toISOString()
        }
      ]
    });
    selectCall(call.id);
    navigate('/agent/dashboard');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
            <PhoneCall className="text-blue-500" size={32} />
            ACTIVE INCIDENTS
          </h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-medium">
            Live Dispatch Queue // Priority Navigation
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="FILTER INCIDENTS..." 
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-all w-64"
            />
          </div>
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest">
            <Filter size={14} />
            Sort
          </button>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] uppercase tracking-widest">
            <Plus size={16} />
            New Entry
          </button>
        </div>
      </div>

      {/* Incident Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {MOCK_QUEUE.map((call) => (
          <div 
            key={call.id} 
            className="bg-[#0a0a0b] border border-[#1a1a1c] rounded-3xl overflow-hidden hover:border-blue-500/40 transition-all group shadow-2xl relative"
          >
            {/* Status Bar */}
            <div className={cn(
              "h-1.5 w-full",
              call.urgency === 'critical' ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' :
              call.urgency === 'high' ? 'bg-orange-500' : 'bg-blue-500'
            )} />

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Token</span>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">LIVE</span>
                  </div>
                  <h3 className="text-xl font-mono font-bold text-white tracking-tight">{call.callerId}</h3>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest",
                  call.urgency === 'critical' ? 'text-red-500 border-red-500/20 bg-red-500/5' :
                  call.urgency === 'high' ? 'text-orange-500 border-orange-500/20 bg-orange-500/5' :
                  'text-blue-500 border-blue-500/20 bg-blue-500/5'
                )}>
                  {call.urgency} Priority
                </div>
              </div>

              {/* Context Bits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={10} /> Location
                  </span>
                  <p className="text-[11px] font-bold text-zinc-300 truncate">{call.location}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> Wait Time
                  </span>
                  <p className="text-[11px] font-bold text-white font-mono">{Math.floor(call.waitTime / 60)}m {call.waitTime % 60}s</p>
                </div>
              </div>

              {/* Live Snippet */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                  <Zap size={12} className="text-blue-500 animate-pulse" />
                </div>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Live Transcript (Detected: {call.language})</span>
                <p className="text-xs text-zinc-300 font-medium italic leading-relaxed">
                  "{call.transcript}"
                </p>
              </div>

              {/* Badges & Status */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="bg-zinc-900 px-2 py-1 rounded text-[9px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-800">
                    {call.sentiment}
                  </span>
                  <div className="flex items-center gap-1.5 bg-blue-600/5 px-2 py-1 rounded border border-blue-600/10 text-blue-500">
                    <Bot size={10} />
                    <span className="text-[9px] font-black uppercase tracking-widest">AI {call.ai_status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => handleJoinCall(call)}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all"
                >
                  Join Call
                  <ChevronRight size={14} />
                </button>
                <button className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <ShieldAlert size={14} />
                  Escalate
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty Entry Placeholder */}
        <div className="bg-[#050505] border border-zinc-900 border-dashed rounded-3xl flex flex-col items-center justify-center p-12 text-zinc-800 space-y-4 hover:border-zinc-700 transition-all cursor-pointer group">
          <div className="w-16 h-16 rounded-full border border-zinc-900 border-dashed flex items-center justify-center group-hover:border-zinc-700 transition-all">
            <Plus size={32} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] group-hover:text-zinc-600 transition-all">Monitor New Frequency</span>
        </div>
      </div>
    </div>
  );
}
