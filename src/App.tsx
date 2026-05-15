/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { VideoCallProvider } from './context/VideoCallContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Pages (to be created)
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Roadmap from './pages/Roadmap';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import MentorDiscovery from './pages/MentorDiscovery';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );
  if (!user) return <Navigate to="/" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <VideoCallProvider>
            <Router>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/roadmaps" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/mentors" element={<ProtectedRoute><MentorDiscovery /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              </Routes>
            </Router>
          </VideoCallProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

