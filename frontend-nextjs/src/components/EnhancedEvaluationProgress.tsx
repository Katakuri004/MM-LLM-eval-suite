'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  Cpu,
  Settings,
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  Zap,
  Activity,
  Loader2
} from 'lucide-react'
import { ShimmerProgressIndicator, ShimmerLoader } from '@/components/ui/shimmer-loader'

interface EnhancedEvaluationProgressProps {
  evaluationId: string
  onStatusChange?: (status: string) => void
}

export function EnhancedEvaluationProgress({ 
  evaluationId, 
  onStatusChange 
}: EnhancedEvaluationProgressProps) {
  const [currentStep, setCurrentStep] = useState<string>('initializing')
  const [processSteps, setProcessSteps] = useState<Array<{
    id: string
    name: string
    description: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    progress?: number
  }>>([])

  const { data: statusData } = useQuery({
    queryKey: ['evaluation-status', evaluationId],
    queryFn: () => apiClient.getEvaluationStatus(evaluationId),
    enabled: !!evaluationId,
    refetchInterval: (data) => {
      const status = (data as any)?.status
      return status === 'running' ? 1000 : 
             status === 'pending' ? 2000 : 
             ['completed', 'failed', 'cancelled'].includes(status) ? false : 5000
    },
    staleTime: 500,
  })

  const { data: resultsData } = useQuery({
    queryKey: ['evaluation-results', evaluationId],
    queryFn: () => apiClient.getEvaluationResults(evaluationId),
    enabled: !!evaluationId,
    refetchInterval: (q) => {
      const status = (statusData as any)?.status
      return status === 'running' ? 2000 : 
             status && ['completed', 'failed', 'cancelled'].includes(status) ? false : 5000
    },
  })

  const { data: evaluationData } = useQuery({
    queryKey: ['evaluation-details', evaluationId],
    queryFn: () => apiClient.getEvaluation(evaluationId),
    enabled: !!evaluationId,
  })

  const status = statusData as any
  const results = resultsData as any
  const evaluation = evaluationData as any

  // Update process steps based on status and progress
  useEffect(() => {
    if (!status) return

    const steps = [
      {
        id: 'initializing',
        name: 'Environment Setup',
        description: 'Loading model and preparing evaluation environment',
        status: status.status === 'pending' ? 'running' : 
                status.status === 'running' && (status.progress || 0) < 0.1 ? 'running' :
                ['completed', 'failed', 'cancelled'].includes(status.status) ? 'completed' : 'pending'
      },
      {
        id: 'loading_data',
        name: 'Data Loading',
        description: 'Downloading and preparing benchmark datasets',
        status: status.status === 'running' && (status.progress || 0) >= 0.1 && (status.progress || 0) < 0.3 ? 'running' :
                status.status === 'running' && (status.progress || 0) >= 0.3 ? 'completed' :
                ['completed', 'failed', 'cancelled'].includes(status.status) ? 'completed' : 'pending'
      },
      {
        id: 'model_inference',
        name: 'Model Inference',
        description: 'Running model predictions on benchmark tasks',
        status: status.status === 'running' && (status.progress || 0) >= 0.3 && (status.progress || 0) < 0.8 ? 'running' :
                status.status === 'running' && (status.progress || 0) >= 0.8 ? 'completed' :
                ['completed', 'failed', 'cancelled'].includes(status.status) ? 'completed' : 'pending',
        progress: status.status === 'running' && (status.progress || 0) >= 0.3 && (status.progress || 0) < 0.8 ? 
                  Math.round(((status.progress || 0) - 0.3) / 0.5 * 100) : undefined
      },
      {
        id: 'evaluation',
        name: 'Metrics Calculation',
        description: 'Computing accuracy, F1-score, and other performance metrics',
        status: status.status === 'running' && (status.progress || 0) >= 0.8 && (status.progress || 0) < 1.0 ? 'running' :
                status.status === 'completed' ? 'completed' :
                status.status === 'failed' ? 'failed' : 'pending',
        progress: status.status === 'running' && (status.progress || 0) >= 0.8 ? 
                  Math.round(((status.progress || 0) - 0.8) / 0.2 * 100) : undefined
      },
      {
        id: 'finalization',
        name: 'Results Processing',
        description: 'Saving results and generating reports',
        status: status.status === 'completed' ? 'completed' :
                status.status === 'failed' ? 'failed' :
                status.status === 'cancelled' ? 'failed' : 'pending'
      }
    ]

    setProcessSteps(steps)

    // Determine current step
    if (status.status === 'running') {
      if ((status.progress || 0) < 0.1) setCurrentStep('initializing')
      else if ((status.progress || 0) < 0.3) setCurrentStep('loading_data')
      else if ((status.progress || 0) < 0.8) setCurrentStep('model_inference')
      else if ((status.progress || 0) < 1.0) setCurrentStep('evaluation')
      else setCurrentStep('finalization')
    } else if (status.status === 'completed') {
      setCurrentStep('finalization')
    } else if (status.status === 'failed') {
      setCurrentStep('evaluation')
    }

    // Notify parent of status change
    if (onStatusChange) {
      onStatusChange(status.status)
    }
  }, [status, onStatusChange])

  // Get system metrics
  const systemMetrics = status?.system_metrics || {}
  const resourceUsage = {
    cpu: systemMetrics.cpu_usage || 0,
    memory: systemMetrics.memory_usage || 0,
    gpu: systemMetrics.gpu_usage || 0
  }

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Evaluation Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ShimmerProgressIndicator
            status={status?.status || 'pending'}
            progress={status?.progress || 0}
            currentStep={currentStep}
            steps={processSteps}
          />
        </CardContent>
      </Card>

      {/* Process Steps */}
      {status?.status === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processSteps.map((step, index) => {
                const isActive = currentStep === step.id
                const isCompleted = step.status === 'completed'
                const isFailed = step.status === 'failed'
                const isRunning = step.status === 'running'
                
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    {/* Step indicator */}
                    <div className="flex-shrink-0 mt-1">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      ) : isFailed ? (
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-white" />
                        </div>
                      ) : isRunning ? (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-gray-400"></div>
                      )}
                    </div>
                    
                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-medium ${
                          isActive || isRunning ? 'text-blue-600' : 
                          isCompleted ? 'text-green-600' : 
                          isFailed ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {step.name}
                        </h4>
                        {isRunning && (
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        )}
                        {isActive && (
                          <Badge variant="default" className="bg-blue-500">
                            <Zap className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                      {isRunning && step.progress !== undefined && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${step.progress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {step.progress}% complete
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Resources */}
      {status?.status === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              System Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CPU Usage</span>
                  <span className="font-medium">{resourceUsage.cpu}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${resourceUsage.cpu}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Memory Usage</span>
                  <span className="font-medium">{resourceUsage.memory}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${resourceUsage.memory}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">GPU Usage</span>
                  <span className="font-medium">{resourceUsage.gpu}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${resourceUsage.gpu}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Status Updates */}
      {status?.status === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Live Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground">Real-time monitoring active</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Started: {status?.started_at ? new Date(status.started_at).toLocaleTimeString() : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Processing: {evaluation?.metadata?.benchmark_ids?.length || 0} benchmarks
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Preview */}
      {results?.results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Results Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(results.results).slice(0, 4).map(([key, value]) => (
                <div key={key} className="bg-card border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold text-blue-600">
                    {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
