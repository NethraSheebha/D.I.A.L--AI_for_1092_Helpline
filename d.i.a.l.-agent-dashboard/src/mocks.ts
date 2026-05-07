export interface QueueItemData {
  id: string;
  callerId: string;
  language: string;
  dialect: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  waitTime: number;
  location: string;
  transcript?: string;
  ai_status?: string;
  duration?: string;
  sentiment?: string;
}

export interface TranscriptLineData {
  id: string;
  speaker: 'citizen' | 'agent' | 'system';
  text: string;
  timestamp: string;
  language?: string;
}

export const MOCK_QUEUE: QueueItemData[] = [
  {
    id: 'c1',
    callerId: 'TOKEN-8821',
    language: 'Kannada',
    dialect: 'Mysuru Urban',
    urgency: 'critical',
    waitTime: 42,
    location: 'Hebbal Flyover, Bangalore',
    transcript: 'The main road near the station has completely collapsed. Multiple vehicles are stuck.',
    ai_status: 'Emergency Dispatched',
    duration: '01:45',
    sentiment: 'Panicked',
    intent: 'Road Collapse'
  },
  {
    id: 'c2',
    callerId: 'TOKEN-4492',
    language: 'Kannada',
    dialect: 'Mysuru Urban',
    urgency: 'high',
    waitTime: 125,
    location: 'KR Market, Bangalore',
    transcript: 'ಕೆ.ಆರ್ ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಬೆಂಕಿ ಅಪಘಾತ ಸಂಭವಿಸಿದೆ. ಜನರು ಗಾಬರಿಯಾಗಿದ್ದಾರೆ.',
    ai_status: 'Fire Unit Notified',
    duration: '00:52',
    sentiment: 'Distressed',
    intent: 'Fire Hazard'
  },
  {
    id: 'c3',
    callerId: 'TOKEN-7710',
    language: 'Hindi',
    dialect: 'North Delhi',
    urgency: 'medium',
    waitTime: 310,
    location: 'Silk Board Junction, Bangalore',
    transcript: 'सिल्क बोर्ड के पास सर्विस रोड पर बहुत बड़ा गड्ढा है, जिससे काफी ट्रैफिक हो रहा है।',
    ai_status: 'Logistics Alert',
    duration: '03:15',
    sentiment: 'Frustrated',
    intent: 'Infrastructure'
  },
  {
    id: 'c4',
    callerId: 'TOKEN-1102',
    language: 'Tamil',
    dialect: 'Chennai Central',
    urgency: 'low',
    waitTime: 450,
    location: 'Whitefield, Bangalore',
    transcript: 'Minor water leakage observed from the main pipeline near the market.',
    ai_status: 'Maintenance Notified',
    duration: '01:20',
    sentiment: 'Patient',
    intent: 'Maintenance'
  }
];

export const MOCK_HISTORY = [
  { id: 'H1', callerId: 'T-9901', language: 'Kannada', district: 'Mysuru City', duration: '05:12', urgency: 'high', status: 'Resolved', date: '2026-05-07' },
  { id: 'H2', callerId: 'T-9902', language: 'Kannada', district: 'Hubballi-Dharwad', duration: '12:45', urgency: 'critical', status: 'Escalated', date: '2026-05-07' },
  { id: 'H3', callerId: 'T-9903', language: 'Tulu/Kannada', district: 'Mangaluru Port', duration: '03:20', urgency: 'low', status: 'Resolved', date: '2026-05-06' },
  { id: 'H4', callerId: 'T-9904', language: 'Kannada', district: 'Belagavi North', duration: '08:55', urgency: 'medium', status: 'Validated', date: '2026-05-06' },
];

export const MOCK_AUDIT = [
  { 
    id: 'A1', 
    callerId: 'TOKEN-8821', 
    transcript: 'The main road near the station has completely collapsed. Multiple vehicles are stuck. Hebbal Flyover area.', 
    ai_interpretation: 'Severe Infrastructure Failure - Road Collapse', 
    urgency_score: 0.95, 
    status: 'PENDING' 
  },
  { 
    id: 'A2', 
    callerId: 'TOKEN-4492', 
    transcript: 'ಕೆ.ಆರ್ ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಬೆಂಕಿ ಅಪಘಾತ ಸಂಭವಿಸಿದೆ. ಜನರು ಗಾಬರಿಯಾಗಿದ್ದಾರೆ. (Fire at KR Market)', 
    ai_interpretation: 'High-Level Fire Hazard - Commercial Area', 
    urgency_score: 0.88, 
    status: 'REVIEWING' 
  },
  { 
    id: 'A3', 
    callerId: 'TOKEN-7710', 
    transcript: 'सिल्क बोर्ड के पास सर्विस रोड पर बहुत बड़ा गड्ढा है। (Large pothole at Silk Board)', 
    ai_interpretation: 'Maintenance Hazard - Pothole/Traffic Impact', 
    urgency_score: 0.65, 
    status: 'VALIDATED' 
  },
];

export const MOCK_ANALYTICS = {
  totalIncidents: 14205,
  escalations: 892,
  avgConfidence: 0.89,
  successRate: 0.94,
  languageDistribution: [
    { name: 'Kannada', value: 45 },
    { name: 'Hindi', value: 30 },
    { name: 'English', value: 15 },
    { name: 'Tamil', value: 10 },
  ],
  urgencyHeatmap: [
    { day: 'Mon', value: 120 },
    { day: 'Tue', value: 150 },
    { day: 'Wed', value: 110 },
    { day: 'Thu', value: 180 },
    { day: 'Fri', value: 240 },
    { day: 'Sat', value: 300 },
    { day: 'Sun', value: 280 },
  ]
};

export const MOCK_AGENTS = [
  { id: 'AG1', name: 'Agent Balarathi', status: 'ACTIVE', workload: 'High', callId: 'TOKEN-8821' },
  { id: 'AG2', name: 'Agent Rahul', status: 'IDLE', workload: 'Low', callId: null },
  { id: 'AG3', name: 'Agent Priya', status: 'WRAP-UP', workload: 'Medium', callId: 'TOKEN-7710' },
  { id: 'AG4', name: 'Agent Suresh', status: 'ACTIVE', workload: 'Critical', callId: 'TOKEN-4492' },
];
