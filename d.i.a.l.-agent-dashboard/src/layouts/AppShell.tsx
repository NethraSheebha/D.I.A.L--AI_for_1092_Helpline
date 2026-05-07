import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-blue-600/30">
      {/* Sidebar - Fixed/Persistent */}
      <Sidebar />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar - Fixed at top */}
        <Topbar />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 relative">
          {/* Subtle background glow for operational feel */}
          <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] pointer-events-none" />
          <div className="fixed bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-zinc-600/5 blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
