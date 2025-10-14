/**
 * Main App component with routing and providers
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Models } from '@/pages/Models';
import { Evaluations } from '@/pages/Evaluations';
import { Leaderboard } from '@/pages/Leaderboard';
import { queryClient } from '@/lib/query-client';

function App() {
  return (
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
  );
}

export default App;