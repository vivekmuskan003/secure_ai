/**
 * App.jsx — Root app with routing using our local AuthContext
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import ThreeBackground from './components/ThreeBackground';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import ServiceSelection from './pages/ServiceSelection';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import OAuthSim from './pages/OAuthSim';
import GmailInbox from './pages/GmailInbox';
import GithubDashboard from './pages/GithubDashboard';
import CalendarView from './pages/CalendarView';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <ThemeProvider>
      <div className="relative min-h-screen">
        <ThreeBackground />
        {isAuthenticated && <Navbar />}

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home/admin" element={<Admin />} />

          <Route path="/services" element={
            <ProtectedRoute><ServiceSelection /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute><Chat /></ProtectedRoute>
          } />
          <Route path="/inbox" element={
            <ProtectedRoute><GmailInbox /></ProtectedRoute>
          } />
          <Route path="/repos" element={
            <ProtectedRoute><GithubDashboard /></ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute><CalendarView /></ProtectedRoute>
          } />
          <Route path="/mock-oauth" element={
            <ProtectedRoute><OAuthSim /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}
