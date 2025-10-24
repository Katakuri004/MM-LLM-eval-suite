'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  Brain,
  Database,
  Cpu,
  Activity
} from 'lucide-react'

interface ProgressUpdate {
  evaluation_id: string
  status: string
  progress: number
  current_task?: string
  completed_tasks?: number
  total_tasks?: number
  current_benchmark?: string
  processing_time?: number
  memory_usage?: number
  cpu_usage?: number
  timestamp: string
}

interface EvaluationProgressIndicatorProps {
  evaluationId: string
  onStatusChange?: (status: string) => void
}

export default function EvaluationProgressIndicator({ 
  evaluationId, 
  onStatusChange 
}: EvaluationProgressIndicatorProps) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (!evaluationId) return

    // Connect to WebSocket for real-time updates
    const ws = new WebSocket(`ws://localhost:8000/api/v1/evaluations/ws/updates`)
    
    ws.onopen = () => {
      console.log('Connected to evaluation progress WebSocket')
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.evaluation_id === evaluationId) {
          setProgress(data)
          setLastUpdate(new Date())
          onStatusChange?.(data.status)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      console.log('Disconnected from evaluation progress WebSocket')
      setIsConnected(false)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [evaluationId, onStatusChange])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'cancelled':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Running'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      case 'cancelled':
        return 'Cancelled'
      case 'pending':
        return 'Pending'
      default:
        return 'Unknown'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Real-time Progress
          {isConnected && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(progress?.status || 'pending')}
            <div>
              <div className="font-medium">
                {getStatusText(progress?.status || 'pending')}
              </div>
              {progress?.current_task && (
                <div className="text-sm text-muted-foreground">
                  {progress.current_task}
                </div>
              )}
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={getStatusColor(progress?.status || 'pending')}
          >
            {Math.round((progress?.progress || 0) * 100)}%
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round((progress?.progress || 0) * 100)}%</span>
          </div>
          <Progress 
            value={(progress?.progress || 0) * 100} 
            className="h-2"
          />
        </div>

        {/* Task Progress */}
        {progress?.completed_tasks !== undefined && progress?.total_tasks !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tasks Completed</span>
              <span>{progress.completed_tasks} / {progress.total_tasks}</span>
            </div>
            <Progress 
              value={(progress.completed_tasks / progress.total_tasks) * 100} 
              className="h-2"
            />
          </div>
        )}

        {/* Current Benchmark */}
        {progress?.current_benchmark && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Current Benchmark:</span>
              <span className="text-muted-foreground">{progress.current_benchmark}</span>
            </div>
          </div>
        )}

        {/* System Resources */}
        <div className="grid grid-cols-2 gap-4">
          {progress?.memory_usage !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Memory Usage</span>
                <span>{progress.memory_usage.toFixed(1)}%</span>
              </div>
              <Progress value={progress.memory_usage} className="h-2" />
            </div>
          )}
          {progress?.cpu_usage !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>CPU Usage</span>
                <span>{progress.cpu_usage.toFixed(1)}%</span>
              </div>
              <Progress value={progress.cpu_usage} className="h-2" />
            </div>
          )}
        </div>

        {/* Processing Time */}
        {progress?.processing_time && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Processing Time: {progress.processing_time.toFixed(1)}s</span>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {lastUpdate && (
            <span className="text-muted-foreground">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}