import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MasterAssessment from './components/MasterAssessment';
import Leaderboard from './components/Leaderboard';
import Results from './components/Results';
import Login from './components/Login';

function Shell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="loader" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assessment" element={<MasterAssessment />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/results" element={<Results />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Shell />
      </Router>
    </AuthProvider>
  );
}
