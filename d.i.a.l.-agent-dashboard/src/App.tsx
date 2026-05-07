import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WrapUp from './pages/WrapUp';
import Home from './pages/Home';
import { AppShell } from './layouts/AppShell';
import { CallAudit } from './pages/CallAudit';
import { SupervisorDashboard } from './pages/SupervisorDashboard';
import { CallHistory } from './pages/CallHistory';
import { IncidentReplay } from './pages/IncidentReplay';
import { Analytics } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';

import { useEffect } from 'react';
import { connectionManager } from './websocket/ConnectionManager';

export default function App() {
  useEffect(() => {
    connectionManager.connect();
    return () => connectionManager.disconnect();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Agent Routes */}
        <Route path="/agent/*" element={
          <AppShell>
            <Routes>
              <Route path="home" element={<Home />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="audit" element={<CallAudit />} />
              <Route path="history" element={<CallHistory />} />
              <Route path="replay" element={<IncidentReplay />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="supervisor" element={<SupervisorDashboard />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="wrap-up" element={<WrapUp />} />
              <Route path="*" element={<Navigate to="home" replace />} />
            </Routes>
          </AppShell>
        } />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
