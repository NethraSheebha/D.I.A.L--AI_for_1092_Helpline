import { useStore } from '../stores/useStore';

class ConnectionManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: any = null;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    const store = useStore.getState();
    store.setConnectionStatus('RECONNECTING');

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('🌐 WebSocket Connected');
        store.setConnectionStatus('CONNECTED');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = async (event) => {
        try {
          let data;
          if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
            // Handle raw binary if the backend ever sends it directly
            return;
          } else {
            data = JSON.parse(event.data);
          }
          this.handleEvent(data);
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      this.ws.onclose = () => {
        console.log('🌐 WebSocket Disconnected');
        store.setConnectionStatus('OFFLINE');
        this.stopHeartbeat();
        this.attemptReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket Error', err);
        store.setConnectionStatus('DEGRADED');
      };

    } catch (e) {
      console.error('WebSocket connection failed', e);
      this.attemptReconnect();
    }
  }

  private async handleEvent(event: any) {
    const store = useStore.getState();
    const { type, call_id } = event;

    if (!call_id) return;

    // Auto-select if no call is currently selected
    if (!store.selectedCallId) {
      store.selectCall(call_id);
    }

    switch (type) {
      case 'partial':
      case 'partial_transcript':
        store.updateCall(call_id, { 
          vitals: event.vitals,
          current_transcript: event.partial_transcript || event.text 
        });
        break;
      
      case 'turn_processed':
      case 'final_transcript':
        store.addTurn(call_id, {
          turn_id: event.turn_id,
          turn_number: event.turn_number,
          transcript: event.transcript,
          intent: event.intent,
          sentiment: event.sentiment,
          confidence: event.confidence,
          ai_response: event.ai_response,
          timestamp: event.timestamp || new Date().toISOString()
        });
        
        // Also update dialect if present
        if (event.dialect) {
          store.updateCall(call_id, { dialect: event.dialect });
        }
        break;

      case 'caller_audio':
        if (event.audio) {
          const pcmData = this.base64ToUint16Array(event.audio);
          audioEngine.playChunk(new Int16Array(pcmData.buffer), 'caller');
        }
        break;

      case 'ai_audio':
        if (event.audio) {
          const pcmData = this.base64ToUint16Array(event.audio);
          audioEngine.playChunk(new Int16Array(pcmData.buffer), 'ai');
        }
        break;

      case 'analytics':
        store.updateCall(call_id, { vitals: event.vitals });
        break;

      case 'state':
        store.updateCall(call_id, { state: event.state });
        break;

      case 'escalation':
        store.updateCall(call_id, { state: 'handoff' });
        break;

      case 'call_summary':
        store.updateCall(call_id, { summary: event.summary, state: 'resolved' });
        break;
    }
  }

  private base64ToUint16Array(base64: string): Uint16Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Uint16Array(bytes.buffer);
  }

  private attemptReconnect() {
    const store = useStore.getState();
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      store.setConnectionStatus('RECONNECTING');
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`Retrying connection in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    } else {
      store.setConnectionStatus('OFFLINE');
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.ws?.close();
  }
}

export const connectionManager = new ConnectionManager(
  import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/agent/broadcast'
);
