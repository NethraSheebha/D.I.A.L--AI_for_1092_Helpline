import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Terminal, ShieldCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton, Divider } from '../components/Shared';
import { cn } from '../lib/utils';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = React.useState<'agent' | 'supervisor'>('agent');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    // Simulate auth delay
    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/agent/home');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--color-brand-card)_0%,_transparent_80%)] font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        {/* LogoHeader */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ y: -20 }} animate={{ y: 0 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary mb-8 shadow-[0_0_40px_rgba(59,130,246,0.1)] ring-1 ring-brand-primary/30"
          >
            <ShieldCheck size={40} strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-6xl font-display font-black tracking-tighter text-white mb-2 italic">D.I.A.L</h1>
          <p className="text-[10px] text-brand-primary uppercase tracking-[0.4em] font-black mb-4">Dialect-aware Intent-verified Assist Line</p>
          <p className="text-xs text-gray-500 font-medium leading-relaxed px-10">
            Government of Karnataka: Integrated Helpline Emergency Management Console
          </p>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-2xl p-8 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden ring-1 ring-white/5">
          <div className="absolute top-0 inset-x-0 h-1 bg-brand-primary/20" />
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* RoleSelector */}
            <div className="space-y-3">
              <label className="text-[9px] uppercase font-black text-gray-500 tracking-[0.2em] ml-1">Establish Role Context</label>
              <div className="flex p-1.5 bg-brand-bg border border-brand-border rounded-xl">
                <button 
                  type="button"
                  onClick={() => setRole('agent')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    role === 'agent' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  Field Agent
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('supervisor')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    role === 'supervisor' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  Supervisor
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 tracking-[0.2em] ml-1">Access Credentials</label>
                <div className="relative group">
                  <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-primary transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Terminal ID (K-G-882)"
                    defaultValue="GOV-AGENT-7721"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-gray-700 outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-primary transition-colors" size={16} />
                  <input 
                    type="password" 
                    placeholder="Secure RSA PIN"
                    defaultValue="password123"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-gray-700 outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/10"
                  />
                </div>
              </div>
            </div>

            <PrimaryButton 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 flex items-center justify-center gap-3 shadow-2xl relative group overflow-hidden"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ChevronRight size={18} className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                  Request Access Tunnel
                </>
              )}
            </PrimaryButton>
          </form>
          
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-[10px] text-brand-danger font-bold uppercase tracking-widest text-center">
              Invalid credentials. Session denied.
            </motion.div>
          )}
        </div>

        <div className="mt-12 text-center text-[10px] text-gray-600 font-mono flex flex-col gap-2 items-center">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
             <span>ST-7721 SECURE TERMINAL ACTIVE</span>
          </div>
          <p className="opacity-50">ENCRYPTED END-TO-END // AES-256 GCM</p>
        </div>
      </motion.div>
    </div>
  );
}
