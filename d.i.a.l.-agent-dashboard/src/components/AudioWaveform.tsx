import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';

interface AudioWaveformProps {
  channel: 'caller' | 'ai';
  color?: string;
  height?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ 
  channel, 
  color = '#3b82f6',
  height = 60 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      const dataArray = audioEngine.getByteTimeDomainData(channel);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.beginPath();

      const sliceWidth = canvas.width / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [channel, color]);

  return (
    <div className="w-full bg-[#111113] rounded-lg overflow-hidden border border-[#1a1a1c] p-1">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={height} 
        className="w-full h-full opacity-80"
      />
    </div>
  );
};
