import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Layout } from '@/components/layout'
import { Dashboard } from '@/pages/dashboard'
import { RunLauncher } from '@/pages/run-launcher'
import { RunDetail } from '@/pages/run-detail'
import { RunList } from '@/pages/run-list'
import { Leaderboard } from '@/pages/leaderboard'
import { ModelDetail } from '@/pages/model-detail'
import { ModelList } from '@/pages/model-list'
import { FailureExplorer } from '@/pages/failure-explorer'
import { Comparison } from '@/pages/comparison'
import { Slices } from '@/pages/slices'
import { NotFound } from '@/pages/not-found'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="lmms-eval-theme">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/launcher" element={<RunLauncher />} />
          <Route path="/runs" element={<RunList />} />
          <Route path="/runs/:runId" element={<RunDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/models" element={<ModelList />} />
          <Route path="/models/:modelId" element={<ModelDetail />} />
          <Route path="/failures" element={<FailureExplorer />} />
          <Route path="/compare" element={<Comparison />} />
          <Route path="/slices" element={<Slices />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App
