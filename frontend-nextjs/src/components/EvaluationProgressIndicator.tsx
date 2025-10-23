'use client'

import { useState, useEffect } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface ActiveRun {
  run_id: string
  model_id: string
  status: string
  progress: number
  started_at: string
}

export default function EvaluationProgressIndicator() {
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const fetchActiveRuns = async () => {
      try {
        setIsLoading(true)
        const response = await apiClient.getActiveEvaluations()
        const runs = response.active_runs || []
        setActiveRuns(runs)
        setIsVisible(runs.length > 0)
      } catch (error) {
        console.error('Failed to fetch active runs:', error)
        setActiveRuns([])
        setIsVisible(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch immediately
    fetchActiveRuns()

    // Poll every 5 seconds
    const interval = setInterval(fetchActiveRuns, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!isVisible || activeRuns.length === 0) {
    return null
  }

  const totalProgress = activeRuns.length > 0 
    ? Math.round(activeRuns.reduce((sum, run) => sum + (run.progress || 0), 0) / activeRuns.length)
    : 0

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">
                {activeRuns.length} evaluation{activeRuns.length !== 1 ? 's' : ''} running
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${totalProgress}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{totalProgress}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {activeRuns.map((run, index) => (
              <div key={run.run_id} className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs">
                  {run.status === 'running' ? 'Running' : run.status}
                </span>
                {index < activeRuns.length - 1 && <span className="text-xs">•</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

