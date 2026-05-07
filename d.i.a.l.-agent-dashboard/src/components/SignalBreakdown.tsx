import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

interface SignalBreakdownProps {
  call: any;
  onClose: () => void;
}

export const SignalBreakdown: React.FC<SignalBreakdownProps> = ({ call, onClose }) => {
  if (!call) return null;

  const sections = [
    {
      title: "EMOTIONAL STATE",
      items: [
        { label: "Detected Emotion:", value: call.turns?.[call.turns.length - 1]?.sentiment?.label || "Anxious" },
        { label: "Stress Intensity:", value: "3/5 (Moderate)" },
        { label: "Stress Score:", value: (call.vitals?.stress || 0.65).toFixed(2) },
      ]
    },
    {
      title: "ACOUSTIC INDICATORS",
      items: [
        { label: "Volume (RMS):", value: "Elevated" },
        { label: "Clarity (ZCR):", value: "12.0%" },
        { label: "Pitch Centroid:", value: "2100 Hz" },
      ]
    },
    {
      title: "CALLER INTENT",
      items: [
        { label: "Detected Intent:", value: call.turns?.[call.turns.length - 1]?.intent?.intent || "Hazard Report" },
        { label: "Confidence:", value: "92%" },
      ]
    },
    {
      title: "SPEECH PATTERN",
      items: [
        { label: "Words Per Minute:", value: "145 WPM" },
        { label: "Speech Rate:", value: "Fast" },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-[340px] bg-[#050505] border border-zinc-900 rounded-lg shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between">
          <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em]">Signal Breakdown</h2>
          <button 
            onClick={onClose}
            className="text-zinc-600 hover:text-white transition-colors"
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-10 space-y-9">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-5">
              <h3 className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">{section.title}</h3>
              <div className="space-y-3.5">
                {section.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-baseline">
                    <span className="text-[11px] text-zinc-500 font-medium tracking-tight">{item.label}</span>
                    <span className="text-[13px] font-bold text-white tracking-tight">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
