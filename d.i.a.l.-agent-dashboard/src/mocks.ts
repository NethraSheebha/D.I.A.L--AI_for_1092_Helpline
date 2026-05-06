export interface QueueItemData {
  id: string;
  language: string;
  dialect: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  waitTime: number; // in seconds
  callerId: string;
}

export interface TranscriptLineData {
  id: string;
  speaker: 'citizen' | 'agent';
  text: string;
  ambiguities?: { start: number; length: number; suggestions: string[] }[];
}

export interface AcousticFeatures {
  zcr?: number;      // Zero-crossing rate (clarity)
  rms?: number;      // RMS volume
  centroid?: number; // Spectral centroid (pitch indicator)
}

export interface CallSignals {
  confidence: number;
  emotion: 'Calm' | 'Confused' | 'Anxious' | 'Distressed' | 'Panicked';
  speechRate: 'Normal' | 'Fast' | 'Slow';
  wpm: number;
  stressScore?: number;
  stressIntensity?: number;  // 1-5 scale
  intent?: string;
  intentConfidence?: number;
  acousticFeatures?: AcousticFeatures;
}

export const MOCK_QUEUE: QueueItemData[] = [
  { id: '1', language: 'Kannada', dialect: 'Dharwad', urgency: 'critical', waitTime: 45, callerId: 'ANON-8821' },
  { id: '2', language: 'Hindi', dialect: 'Bhojpuri', urgency: 'high', waitTime: 120, callerId: 'PROFS-9912' },
  { id: '3', language: 'Telugu', dialect: 'Coastal', urgency: 'medium', waitTime: 210, callerId: 'ANON-0034' },
  { id: '4', language: 'Marathi', dialect: 'Vidarbha', urgency: 'low', waitTime: 300, callerId: 'ANON-1156' },
];

export const MOCK_TRANSCRIPT_BASE: TranscriptLineData[] = [
  { id: 't1', speaker: 'citizen', text: "Hello? Is this the helpline? I'm calling from near Silk Board Junction." },
  { id: 't2', speaker: 'agent', text: "Yes, this is D.I.A.L. how can I assist you today?" },
  { id: 't3', speaker: 'citizen', text: "There's a massive pothole right in the middle of the road here. It's causing a lot of trouble for two-wheelers." },
];

export const MOCK_CLUSTERS = [
  { id: 'c1', location: 'Raichur', timeframe: '90 mins', count: 12, category: 'Water Supply', urgency: 'high' }
];
