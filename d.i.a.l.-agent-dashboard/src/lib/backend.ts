import { QueueItemData, TranscriptLineData } from '../mocks';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim() || 'http://127.0.0.1:8000';

function mapOutcomeToUrgency(outcome?: string): QueueItemData['urgency'] {
  switch ((outcome || '').toLowerCase()) {
    case 'escalated':
      return 'critical';
    case 'active':
      return 'high';
    case 'failed':
      return 'medium';
    default:
      return 'low';
  }
}

  function getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

function computeWaitSeconds(startedAt?: string): number {
  if (!startedAt) {
    return 0;
  }

  const startedMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedMs)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
}

function callIdLabel(callId: string): string {
  return `CALL-${callId.slice(0, 8).toUpperCase()}`;
}

export interface RecentCallsResponse {
  calls: Array<{
    call_id: string;
    started_at?: string;
    total_turns?: number;
    outcome?: string;
    last_transcript?: string;
  }>;
}

export interface CallContextTurn {
  turn_id: string;
  turn_number: number;
  transcript: string;
  detected_lang?: string;
  intent_raw?: Record<string, unknown>;
  sentiment_raw?: {
    label?: string;
    ipl?: number;
  };
  confidence?: number;
}

export interface CallContextResponse {
  call_id: string;
  started_at?: string;
  ended_at?: string;
  total_turns?: number;
  outcome?: string;
  turns?: CallContextTurn[];
  escalation?: Record<string, unknown> | null;
}

export interface AgentStatsResponse {
  total_calls: number;
  resolved_calls: number;
  escalated_calls: number;
  failed_calls: number;
}

export interface AgentLiveEnvelope {
  type: 'initial_context' | 'call_update';
  data: Record<string, unknown>;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchRecentCalls(): Promise<QueueItemData[]> {
  const payload = await getJson<RecentCallsResponse>('/agent/calls/recent');

  return payload.calls.map((call) => ({
    id: call.call_id,
    callerId: callIdLabel(call.call_id),
    language: 'Detecting',
    dialect: 'Regional',
    urgency: mapOutcomeToUrgency(call.outcome),
    waitTime: computeWaitSeconds(call.started_at),
  }));
}

export async function fetchAgentStats(): Promise<AgentStatsResponse> {
  return getJson<AgentStatsResponse>('/agent/stats');
}

export async function fetchCallContext(callId: string): Promise<CallContextResponse> {
  return getJson<CallContextResponse>(`/agent/call/${encodeURIComponent(callId)}`);
}

export interface DashboardSummaryResponse {
  total_calls: number;
  resolved: number;
  escalated: number;
  avg_duration: number;
}

export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  return getJson<DashboardSummaryResponse>('/api/dashboard/summary');
}

export async function fetchCallHistory(callId: string): Promise<{ call_id: string; interactions: any[]; total: number }> {
  return getJson<{ call_id: string; interactions: any[]; total: number }>(`/api/call/${encodeURIComponent(callId)}/history`);
}

export function mapTurnsToTranscript(turns: CallContextTurn[]): TranscriptLineData[] {
  return turns
    .filter((turn) => Boolean(turn.transcript?.trim()))
    .map((turn) => ({
      id: turn.turn_id || `turn-${turn.turn_number}`,
      speaker: 'citizen',
      text: turn.transcript,
    }));
}

function toWsUrl(pathname: string): string {
  const parsed = new URL(API_BASE_URL);
  const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${parsed.host}${pathname}`;
}

export function subscribeAgentUpdates(
  callId: string,
  handlers: {
    onMessage: (message: AgentLiveEnvelope) => void;
    onError?: () => void;
  },
): () => void {
  const socket = new WebSocket(toWsUrl(`/ws/agent/${encodeURIComponent(callId)}`));

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as AgentLiveEnvelope;
      handlers.onMessage(parsed);
    } catch {
      handlers.onError?.();
    }
  };

  socket.onerror = () => {
    handlers.onError?.();
  };

  return () => {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  };
}

export async function escalateCall(callId: string, reason: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/agent/call/${encodeURIComponent(callId)}/escalate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error(`Escalation failed: ${response.status}`);
  }
}

export async function sendAgentResponse(callId: string, responseText: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/agent/call/${encodeURIComponent(callId)}/response`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ response: responseText }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send agent response: ${response.status}`);
  }
}

export async function correctIntent(callId: string, turnId: string, correctedIntent: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/agent/call/${encodeURIComponent(callId)}/intent`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ turn_id: turnId, corrected_intent: correctedIntent }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save corrected intent: ${response.status}`);
  }
}
