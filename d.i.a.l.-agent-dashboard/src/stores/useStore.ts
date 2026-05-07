import { create } from 'zustand';

interface CallTurn {
  turn_id: string;
  turn_number: number;
  transcript: string;
  intent: any;
  sentiment: any;
  confidence: number;
  ai_response?: string;
  timestamp: string;
}

interface CallSession {
  call_id: string;
  state: 'active' | 'verifying' | 'handoff' | 'resolved';
  dialect?: string;
  urgency?: 'low' | 'medium' | 'high';
  turns: CallTurn[];
  vitals: {
    rms: number;
    pitch: number;
    stress: number;
    wpm: number;
  };
}

interface DailState {
  // Auth & Session
  agent: {
    name: string;
    id: string;
    role: string;
  } | null;
  
  // Real-time Calls
  activeCalls: Record<string, CallSession>;
  selectedCallId: string | null;
  showReport: boolean;
  
  // Connection State
  connectionStatus: 'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'DEGRADED';
  
  // Actions
  setAgent: (agent: any) => void;
  updateCall: (call_id: string, update: Partial<CallSession>) => void;
  addTurn: (call_id: string, turn: CallTurn) => void;
  updateVitals: (call_id: string, vitals: any) => void;
  setConnectionStatus: (status: any) => void;
  selectCall: (call_id: string | null) => void;
  setShowReport: (show: boolean) => void;
}

export const useStore = create<DailState>((set) => ({
  agent: null,
  activeCalls: {},
  selectedCallId: null,
  showReport: false,
  connectionStatus: 'OFFLINE',

  setAgent: (agent) => set({ agent }),
  setShowReport: (show) => set({ showReport: show }),
  
  updateCall: (call_id, update) => set((state) => {
    const existing = state.activeCalls[call_id] || {
      call_id,
      state: 'active',
      turns: [],
      vitals: { rms: 0, pitch: 0, stress: 0, wpm: 0 }
    };
    return {
      activeCalls: {
        ...state.activeCalls,
        [call_id]: { ...existing, ...update }
      }
    };
  }),

  addTurn: (call_id, turn) => set((state) => {
    const call = state.activeCalls[call_id];
    if (!call) return state;
    return {
      activeCalls: {
        ...state.activeCalls,
        [call_id]: {
          ...call,
          turns: [...call.turns, turn]
        }
      }
    };
  }),

  updateVitals: (call_id, vitals) => set((state) => {
    const call = state.activeCalls[call_id];
    if (!call) return state;
    return {
      activeCalls: {
        ...state.activeCalls,
        [call_id]: {
          ...call,
          vitals: { ...call.vitals, ...vitals }
        }
      }
    };
  }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  selectCall: (call_id) => set({ selectedCallId: call_id }),
}));
