/**
 * Main App component with routing and providers
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Models } from '@/pages/Models';
import { Evaluations } from '@/pages/Evaluations';
import { Leaderboard } from '@/pages/Leaderboard';
import { websocketService } from '@/lib/websocket';

function App() {
  // Initialize WebSocket connection
  React.useEffect(() => {
    const initWebSocket = async () => {
      try {
        await websocketService.connect();
      } catch (error) {
        console.warn('Failed to connect to WebSocket:', error);
      }
    };

    initWebSocket();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="models" element={<Models />} />
            <Route path="evaluations" element={<Evaluations />} />
            <Route path="leaderboard" element={<Leaderboard />} />
          </Route>
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;