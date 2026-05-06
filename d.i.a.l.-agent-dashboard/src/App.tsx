import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WrapUp from './pages/WrapUp';
import Home from './pages/Home';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/agent/home" element={<Home />} />
        <Route path="/agent/dashboard" element={<Dashboard />} />
        <Route path="/agent/wrap-up" element={<WrapUp />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
