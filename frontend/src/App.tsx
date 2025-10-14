/**
 * Main App component with routing and providers
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Models } from '@/pages/Models';
import { Evaluations } from '@/pages/Evaluations';
import { Leaderboard } from '@/pages/Leaderboard';
import { queryClient } from '@/lib/query-client';
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
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="models" element={<Models />} />
                <Route path="evaluations" element={<Evaluations />} />
                <Route path="leaderboard" element={<Leaderboard />} />
              </Route>
            </Routes>
            <Toaster />
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;