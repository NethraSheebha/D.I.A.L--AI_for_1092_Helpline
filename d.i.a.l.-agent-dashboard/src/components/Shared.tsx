import React from 'react';
import { cn } from '../lib/utils';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- BADGES & INDICATORS ---

export const LanguageBadge = ({ language, dialect, className }: { language: string; dialect: string; className?: string }) => (
  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest", className)}>
    {language} · {dialect}
  </span>
);

export const UrgencyBadge = ({ level, className }: { level: 'low' | 'medium' | 'high' | 'critical'; className?: string }) => {
  const styles = {
    low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    critical: "bg-red-500/10 text-red-500 border-red-500/30 animate-pulse-red"
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border", styles[level], className)}>
      {level}
    </span>
  );
};

export const ConfidenceDot = ({ level }: { level: 'high' | 'medium' | 'low' }) => {
  const colors = {
    high: "bg-brand-success",
    medium: "bg-brand-warning",
    low: "bg-brand-danger"
  };
  return <div className={cn("w-2 h-2 rounded-full ring-2 ring-black/20", colors[level])} />;
};

export const StatusDot = ({ status, className }: { status: 'connected' | 'disconnected', className?: string }) => (
  <div className={cn("w-2 h-2 rounded-full", status === 'connected' ? "bg-brand-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-brand-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]", className)} />
);

// --- BUTTONS ---

export const PrimaryButton = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button 
    className={cn("px-4 py-2 bg-brand-primary hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed", className)}
    {...props}
  >
    {children}
  </button>
);

export const GhostButton = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button 
    className={cn("px-4 py-2 border border-brand-border text-gray-300 hover:bg-brand-border hover:text-white font-bold text-xs uppercase tracking-widest rounded transition-all active:scale-[0.98]", className)}
    {...props}
  >
    {children}
  </button>
);

export const DangerButton = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button 
    className={cn("px-4 py-2 bg-brand-danger hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded transition-all active:scale-[0.98] shadow-lg shadow-brand-danger/10", className)}
    {...props}
  >
    {children}
  </button>
);

export const IconButton = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button 
    className={cn("p-2 text-gray-400 hover:text-white hover:bg-brand-border rounded transition-all active:scale-90", className)}
    {...props}
  >
    {children}
  </button>
);

// --- FORM ELEMENTS ---

export const EditableTextField = ({ 
  value, 
  onChange, 
  label, 
  className, 
  isEditing: externalIsEditing,
  multiline = false
}: { 
  value: string; 
  onChange?: (v: string) => void; 
  label?: string; 
  className?: string;
  isEditing?: boolean;
  multiline?: boolean;
}) => {
  const [isInternalEditing, setIsInternalEditing] = React.useState(false);
  const [val, setVal] = React.useState(value);

  const isEditing = externalIsEditing !== undefined ? externalIsEditing : isInternalEditing;

  React.useEffect(() => { setVal(value); }, [value]);

  const handleBlur = () => {
    setIsInternalEditing(false);
    if (val !== value) onChange?.(val);
  };

  return (
    <div className={cn("group cursor-pointer", className)} onClick={() => !isEditing && setIsInternalEditing(true)}>
      {label && <label className="block text-[10px] uppercase text-gray-500 mb-1 font-bold tracking-widest">{label}</label>}
      {isEditing ? (
        multiline ? (
          <textarea 
            autoFocus
            className={cn(
              "w-full bg-black/40 border border-brand-primary text-white p-3 rounded outline-none shadow-[0_0_15px_rgba(59,130,246,0.2)] min-h-[120px] resize-none font-inherit",
              className
            )}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
          />
        ) : (
          <input 
            autoFocus
            className={cn(
              "w-full bg-black/40 border border-brand-primary text-white p-2 rounded outline-none shadow-[0_0_10px_rgba(59,130,246,0.1)] font-inherit",
              className
            )}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          />
        )
      ) : (
        <div className="flex items-start gap-2 py-1">
          <span className={cn("flex-1 whitespace-pre-wrap border-b border-transparent group-hover:border-brand-primary/30 transition-colors", className)}>
            {val || "---"}
          </span>
          <span className="text-[9px] font-black text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mt-1">EDIT</span>
        </div>
      )}
    </div>
  );
};

export const DropdownSelect = ({ options, label, value, onChange, className }: { 
  options: { id: string; label: string }[]; 
  label?: string; 
  value: string; 
  onChange: (id: string) => void;
  className?: string;
}) => (
  <div className={cn("space-y-1.5", className)}>
    {label && <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest leading-none">{label}</label>}
    <div className="relative group">
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-xs font-bold text-gray-200 focus:border-brand-primary outline-none appearance-none group-hover:border-gray-500 transition-colors"
      >
        {options.map(opt => (
          <option key={opt.id} value={opt.id} className="bg-brand-card">{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-white transition-colors" size={14} />
    </div>
  </div>
);

export const SearchBar = ({ placeholder, onChange, className }: { placeholder?: string; onChange?: (v: string) => void; className?: string }) => (
  <div className={cn("relative group", className)}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-brand-primary transition-colors" size={16} />
    <input 
      type="text"
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full bg-brand-card border border-brand-border rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-brand-primary transition-colors"
    />
  </div>
);

// --- FEEDBACK & ALERTS ---

export const NotificationToast = ({ message, type = 'info', onClear }: { message: string; type?: 'info' | 'warning' | 'critical'; onClear: () => void }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClear, 4000);
    return () => clearTimeout(timer);
  }, [onClear]);

  const styles = {
    info: "bg-brand-primary text-white border-blue-400/50",
    warning: "bg-brand-warning text-black border-amber-400/50",
    critical: "bg-brand-danger text-white border-red-400/50"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn("fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-l-4 flex items-center gap-4 font-bold text-xs uppercase tracking-widest", styles[type])}
    >
      {message}
    </motion.div>
  );
};

export const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center opacity-30">
    <div className="w-16 h-1 w-16 mb-4 border-2 border-dashed border-gray-600 rounded-lg" />
    <p className="text-[10px] font-black uppercase tracking-[0.2em]">{message}</p>
  </div>
);

export const LoadingSpinner = ({ label }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center p-8 gap-3">
    <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
    {label && <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</p>}
  </div>
);

// --- LAYOUT PRIMITIVES ---

export const SectionCard = ({ children, title, className, headerAction }: { children: React.ReactNode; title?: string; className?: string; headerAction?: React.ReactNode }) => (
  <div className={cn("bg-brand-card border border-brand-border rounded-xl shadow-xl overflow-hidden", className)}>
    {title && (
      <div className="px-5 py-3 border-b border-brand-border bg-black/40 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 leading-none">{title}</h3>
        {headerAction}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

export const Divider = ({ className }: { className?: string }) => (
  <div className={cn("h-px bg-brand-border w-full", className)} />
);
