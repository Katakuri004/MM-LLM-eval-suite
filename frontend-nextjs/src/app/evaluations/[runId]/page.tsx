
'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CancelEvaluationDialog } from '@/components/CancelEvaluationDialog'
import React, { useState } from 'react'
import { 
  Brain, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Settings,
  Database,
  Cpu,
  RefreshCw,
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, Legend } from 'recharts'
import EvaluationProgressText from '@/components/EvaluationProgressText'
import EvaluationProgressIndicator from '@/components/EvaluationProgressIndicator'
import { EnhancedEvaluationProgress } from '@/components/EnhancedEvaluationProgress'
import { ShimmerLoader } from '@/components/ui/shimmer-loader'
import { ModalityTabs } from '@/components/evaluations/ModalityTabs'

// Safe renderer to prevent object rendering errors
const SafeRenderer = ({ children, fallback = 'N/A' }: { children: any, fallback?: string }) => {
  try {
    if (children === null || children === undefined) {
      return <span>{fallback}</span>
    }
    if (typeof children === 'object') {
      console.error('Attempted to render object as React child:', children)
      return <span>{fallback}</span>
    }
    return <span>{children}</span>
  } catch (error) {
    console.error('Error rendering content:', error)
    return <span>{fallback}</span>
  }
}

export default function EvaluationDetailPage() {
  const params = useParams()
  const runId = (params?.runId as string) || ''
  // Early local rendering path to avoid any backend hooks
  const isLocal = runId.startsWith('local:')
  if (isLocal) {
    const buildLocalDetail = () => {
      const base = (modality: string, name: string, created_at: string, benchmarks: any[]) => ({
        id: runId,
        name,
        model_name: 'qwen2vl',
        modality,
        created_at,
        status: 'completed',
        benchmark_ids: benchmarks.map(b => b.benchmark_id),
        summary_metrics: Object.fromEntries(
          benchmarks.flatMap((b: any) => Object.entries(b.metrics || {}))
            .filter(([_, v]) => typeof v === 'number')
            .slice(0, 4)
        ),
        source_folder: 'results',
        benchmarks,
      })

      if (runId.includes('qwen2vl') && runId.includes('combined')) {
        const created_at = '2025-10-26T03:00:00.000Z'
        const textBenchmarks = [
          {
            benchmark_id: 'arc_easy',
            metrics: {
              acc: 0.03324915824915825,
              acc_norm: 0.05092592592592592,
              acc_stderr: 0.003678881507648524,
              acc_norm_stderr: 0.0045111546424629854,
            },
            samples_preview: [],
            total_samples: 2376,
            raw_files: [
              { filename: '20251026_022408_results.json', absolute_path: '' },
              { filename: '20251026_022408_samples_arc_easy.jsonl', absolute_path: '' }
            ],
          },
          {
            benchmark_id: 'arc_challenge',
            metrics: {
              acc: 0.12713310580204779,
              acc_norm: 0.11177474402730375,
              acc_stderr: 0.00973475199596078,
              acc_norm_stderr: 0.009207780405950904,
            },
            samples_preview: [],
            total_samples: 1172,
            raw_files: [
              { filename: '20251026_022723_results.json', absolute_path: '' },
              { filename: '20251026_022723_samples_arc_challenge.jsonl', absolute_path: '' }
            ],
          },
          {
            benchmark_id: 'hellaswag',
            metrics: {
              acc: 0.06064528978291177,
              acc_norm: 0.036048595897231625,
              acc_stderr: 0.0023819073412748777,
              acc_norm_stderr: 0.0018603011877166289,
            },
            samples_preview: [],
            total_samples: 10042,
            raw_files: [
              { filename: '20251026_021022_results.json', absolute_path: '' },
              { filename: '20251026_021022_samples_hellaswag.jsonl', absolute_path: '' }
            ],
          }
        ]

        const imageBenchmarks = [
          {
            benchmark_id: 'ok_vqa_val2014',
            metrics: {
              exact_match: 0.45362663495837874,
              exact_match_stderr: 0.00663602507305181
            },
            samples_preview: [],
            total_samples: 5046,
            raw_files: [
              { filename: '20251026_025159_results.json', absolute_path: '' },
              { filename: '20251026_025159_samples_ok_vqa_val2014.jsonl', absolute_path: '' },
              { filename: 'submissions/ok_vqa-test-submission-2025-1026-0050-12.json', absolute_path: '' }
            ],
          }
        ]

        return base('multi-modal', 'qwen2vl multimodal combined', created_at, [...textBenchmarks, ...imageBenchmarks])
      }

      return base('text', 'local evaluation', new Date().toISOString(), [])
    }

    const d = buildLocalDetail()
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{d.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">Local</Badge>
              <Badge variant="outline" className="capitalize">{d.modality}</Badge>
              <span className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              const dataStr = JSON.stringify(d, null, 2)
              const blob = new Blob([dataStr], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${d.id.replace(':','_')}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}>Download Raw JSON</Button>
          </div>
        </div>

        {d.summary_metrics && Object.keys(d.summary_metrics).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(d.summary_metrics).map(([key, value]: any) => (
              <div key={key} className="bg-card border rounded-lg p-4 text-center hover:shadow-sm transition-shadow">
                <div className="text-2xl font-bold text-blue-600">
                  {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : String(value)}
                </div>
                <div className="text-sm text-muted-foreground capitalize mt-1">{key.replace(/_/g,' ')}</div>
              </div>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Benchmarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {d.benchmarks?.map((b: any) => (
              <details key={b.benchmark_id} className="border rounded-md">
                <summary className="cursor-pointer px-4 py-2 flex items-center justify-between">
                  <span className="font-medium">{b.benchmark_id}</span>
                  <span className="text-sm text-muted-foreground">{b.total_samples || b.samples_preview?.length || 0} samples</span>
                </summary>
                <div className="p-4 space-y-3">
                  {b.metrics && Object.keys(b.metrics).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Object.entries(b.metrics).slice(0,8).map(([k,v]: any) => (
                        <div key={k} className="bg-muted/50 rounded px-3 py-2 text-sm">
                          <div className="text-muted-foreground capitalize">{k.replace(/_/g,' ')}</div>
                          <div className="font-semibold">{typeof v === 'number' ? (Number.isFinite(v) ? (v*100).toFixed(2)+'%' : String(v)) : String(v)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {b.raw_files?.length > 0 && (
                    <div className="text-xs text-muted-foreground">Files: {b.raw_files.map((f: any) => f.filename).join(', ')}</div>
                  )}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>

        <ModalityTabs detail={d} />
      </div>
    )
  }

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Overall')

  const { data: statusData } = useQuery({
    queryKey: ['evaluation-status', runId],
    queryFn: () => apiClient.getEvaluationStatus(runId),
    enabled: !!runId && !isLocal,
    retry: false,
    refetchInterval: (data) => {
      const status = (data as any)?.status
      // Poll more frequently for running evaluations, stop for completed/cancelled/failed
      return status === 'running' ? 1000 : 
             status === 'pending' ? 2000 : 
             ['completed', 'failed', 'cancelled'].includes(status) ? false : 5000
    },
    staleTime: 500,
  })

  const { data: resultsData } = useQuery({
    queryKey: ['evaluation-results', runId],
    queryFn: () => apiClient.getEvaluationResults(runId),
    enabled: !!runId && !isLocal,
    retry: false,
    refetchInterval: (q) => {
      const status = (statusData as any)?.status
      // Poll more frequently for running evaluations, stop for final states
      return status === 'running' ? 2000 : 
             status && ['completed', 'failed', 'cancelled'].includes(status) ? false : 5000
    },
  })

  const { data: evaluationData } = useQuery({
    queryKey: ['evaluation-details', runId],
    queryFn: () => apiClient.getEvaluation(runId),
    enabled: !!runId && !isLocal,
    retry: false,
  })

  const { data: modelData } = useQuery({
    queryKey: ['model-details', evaluationData?.model_id],
    queryFn: () => apiClient.getModel(evaluationData?.model_id),
    enabled: !!evaluationData?.model_id && !isLocal,
    retry: false,
  })

  // Local (mock) evaluation detail - hardcoded demo data to avoid any fetches
  const localDetail = React.useMemo(() => {
    if (!isLocal) return null as any
    const base = (modality: string, name: string, created_at: string, benchmarks: any[]) => ({
      id: runId,
      name,
      model_name: name.split(' ')[0] || 'local-model',
      modality,
      created_at,
      status: 'completed',
      benchmark_ids: benchmarks.map(b => b.benchmark_id),
      summary_metrics: Object.fromEntries(
        benchmarks.flatMap((b: any) => Object.entries(b.metrics || {}))
          .filter(([_, v]) => typeof v === 'number')
          .slice(0, 4)
      ),
      source_folder: 'results',
      benchmarks,
    })

    // Combined qwen2vl multimodal page
    if (runId.includes('qwen2vl') && runId.includes('combined')) {
      // Use metrics directly from results files (hard-coded here based on /results)
      const created_at = '2025-10-26T03:00:00.000Z'
      const textBenchmarks = [
        {
          benchmark_id: 'arc_easy',
          metrics: {
            acc: 0.03324915824915825,
            acc_norm: 0.05092592592592592,
            acc_stderr: 0.003678881507648524,
            acc_norm_stderr: 0.0045111546424629854,
          },
          samples_preview: [],
          total_samples: 2376,
          raw_files: [
            { filename: '20251026_022408_results.json', absolute_path: '' },
            { filename: '20251026_022408_samples_arc_easy.jsonl', absolute_path: '' }
          ],
        },
        {
          benchmark_id: 'arc_challenge',
          metrics: {
            acc: 0.12713310580204779,
            acc_norm: 0.11177474402730375,
            acc_stderr: 0.00973475199596078,
            acc_norm_stderr: 0.009207780405950904,
          },
          samples_preview: [],
          total_samples: 1172,
          raw_files: [
            { filename: '20251026_022723_results.json', absolute_path: '' },
            { filename: '20251026_022723_samples_arc_challenge.jsonl', absolute_path: '' }
          ],
        },
        {
          benchmark_id: 'hellaswag',
          metrics: {
            acc: 0.06064528978291177,
            acc_norm: 0.036048595897231625,
            acc_stderr: 0.0023819073412748777,
            acc_norm_stderr: 0.0018603011877166289,
          },
          samples_preview: [],
          total_samples: 10042,
          raw_files: [
            { filename: '20251026_021022_results.json', absolute_path: '' },
            { filename: '20251026_021022_samples_hellaswag.jsonl', absolute_path: '' }
          ],
        }
      ]

      const imageBenchmarks = [
        {
          benchmark_id: 'ok_vqa_val2014',
          metrics: {
            exact_match: 0.45362663495837874,
            exact_match_stderr: 0.00663602507305181
          },
          samples_preview: [],
          total_samples: 5046,
          raw_files: [
            { filename: '20251026_025159_results.json', absolute_path: '' },
            { filename: '20251026_025159_samples_ok_vqa_val2014.jsonl', absolute_path: '' },
            { filename: 'submissions/ok_vqa-test-submission-2025-1026-0050-12.json', absolute_path: '' }
          ],
        }
      ]

      return base('multi-modal', 'qwen2vl multimodal combined', created_at, [...textBenchmarks, ...imageBenchmarks])
    }

    if (runId.includes('text')) {
      const created_at = '2025-10-26T02:27:00.000Z'
      const benchmarks = [
        {
          benchmark_id: 'arc_easy',
          metrics: { accuracy: 0.74, exact_match: 0.70 },
          samples_preview: [
            { input: 'Which animal is a mammal?', prediction: 'Dog', label: 'Dog', score: 1 },
            { input: '2 + 2 = ?', prediction: '4', label: '4', score: 1 }
          ],
          total_samples: 25,
          raw_files: [
            { filename: '20251026_022408_results.json', absolute_path: '' },
            { filename: '20251026_022408_samples_arc_easy.jsonl', absolute_path: '' }
          ],
        },
        {
          benchmark_id: 'arc_challenge',
          metrics: { accuracy: 0.42 },
          samples_preview: [
            { input: 'A complex reasoning question?', prediction: 'Answer A', label: 'Answer B', score: 0 }
          ],
          total_samples: 25,
          raw_files: [
            { filename: '20251026_022723_results.json', absolute_path: '' },
            { filename: '20251026_022723_samples_arc_challenge.jsonl', absolute_path: '' }
          ],
        },
        {
          benchmark_id: 'hellaswag',
          metrics: { accuracy: 0.61 },
          samples_preview: [
            { input: 'Complete the sentence: The man picked up the ...', prediction: 'ball', label: 'ball', score: 1 }
          ],
          total_samples: 25,
          raw_files: [
            { filename: '20251026_021022_results.json', absolute_path: '' },
            { filename: '20251026_021022_samples_hellaswag.jsonl', absolute_path: '' }
          ],
        }
      ]
      return base('text', 'qwen2vl text 20251025 234011', created_at, benchmarks)
    }

    if (runId.includes('image')) {
      const created_at = '2025-10-26T02:51:59.000Z'
      const benchmarks = [
        {
          benchmark_id: 'ok_vqa_val2014',
          metrics: { accuracy: 0.57 },
          samples_preview: [
            { input: 'What color is the car?', prediction: 'red', label: 'red', score: 1 },
            { input: 'How many people?', prediction: '2', label: '3', score: 0 }
          ],
          total_samples: 50,
          raw_files: [
            { filename: '20251026_025159_results.json', absolute_path: '' },
            { filename: '20251026_025159_samples_ok_vqa_val2014.jsonl', absolute_path: '' },
            { filename: 'submissions/ok_vqa-test-submission-2025-1026-0050-12.json', absolute_path: '' }
          ],
        }
      ]
      return base('image', 'qwen2vl image 20251026 002013', created_at, benchmarks)
    }

    // Fallback minimal
    return base('text', 'local evaluation', new Date().toISOString(), [])
  }, [isLocal, runId])

  const status = statusData as any
  const results = resultsData as any
  const evaluation = evaluationData as any
  const model = modelData as any

  // Download functions
  const downloadJSON = () => {
    if (!results?.results) return
    const dataStr = JSON.stringify(results.results, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `evaluation-results-${runId}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  if (isLocal) {
    // Render local evaluation detail with modality tabs
    const d: any = localDetail
    if (!d) {
      return (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Evaluation</h1>
          <ShimmerLoader />
        </div>
      )
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{d.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">Local</Badge>
              <Badge variant="outline" className="capitalize">{d.modality}</Badge>
              <span className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              const dataStr = JSON.stringify(d, null, 2)
              const blob = new Blob([dataStr], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${d.id.replace(':','_')}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}>Download Raw JSON</Button>
          </div>
        </div>

        {/* Summary metrics grid */}
        {d.summary_metrics && Object.keys(d.summary_metrics).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(d.summary_metrics).map(([key, value]: any) => (
              <div key={key} className="bg-card border rounded-lg p-4 text-center hover:shadow-sm transition-shadow">
                <div className="text-2xl font-bold text-blue-600">
                  {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : String(value)}
                </div>
                <div className="text-sm text-muted-foreground capitalize mt-1">{key.replace(/_/g,' ')}</div>
              </div>
            ))}
          </div>
        )}

        {/* Benchmarks section: collapsible */}
        <Card>
          <CardHeader>
            <CardTitle>Benchmarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {d.benchmarks?.map((b: any) => (
              <details key={b.benchmark_id} className="border rounded-md">
                <summary className="cursor-pointer px-4 py-2 flex items-center justify-between">
                  <span className="font-medium">{b.benchmark_id}</span>
                  <span className="text-sm text-muted-foreground">{b.total_samples || b.samples_preview?.length || 0} samples</span>
                </summary>
                <div className="p-4 space-y-3">
                  {/* Metrics quick view */}
                  {b.metrics && Object.keys(b.metrics).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Object.entries(b.metrics).slice(0,8).map(([k,v]: any) => (
                        <div key={k} className="bg-muted/50 rounded px-3 py-2 text-sm">
                          <div className="text-muted-foreground capitalize">{k.replace(/_/g,' ')}</div>
                          <div className="font-semibold">{typeof v === 'number' ? (Number.isFinite(v) ? (v*100).toFixed(2)+'%' : String(v)) : String(v)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Per-benchmark files */}
                  {b.raw_files?.length > 0 && (
                    <div className="text-xs text-muted-foreground">Files: {b.raw_files.map((f: any) => f.filename).join(', ')}</div>
                  )}

                  {/* Small preview table */}
                  {b.samples_preview?.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-2 pr-4">#</th>
                            <th className="py-2 pr-4">Input</th>
                            <th className="py-2 pr-4">Prediction</th>
                            <th className="py-2 pr-4">Label</th>
                            <th className="py-2 pr-4">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {b.samples_preview.slice(0, 10).map((s: any, idx: number) => (
                            <tr key={idx} className="border-t">
                              <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                              <td className="py-2 pr-4 max-w-[320px] truncate" title={String(s.input || s.question || s.prompt || '')}>
                                {String(s.input || s.question || s.prompt || '')}
                              </td>
                              <td className="py-2 pr-4 max-w-[320px] truncate" title={String(s.prediction || s.pred || s.output || '')}>
                                {String(s.prediction || s.pred || s.output || '')}
                              </td>
                              <td className="py-2 pr-4">{String(s.label || s.answer || s.target || '')}</td>
                              <td className="py-2 pr-4">{s.score ?? s.acc ?? ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>

        {/* Modality-specific detailed tabs */}
        <ModalityTabs detail={d} />
      </div>
    )
  }

  const downloadCSV = () => {
    if (!results?.results) return
    const headers = Object.keys(results.results)
    const values = Object.values(results.results)
    const csvContent = [headers.join(','), values.join(',')].join('\n')
    const dataBlob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `evaluation-results-${runId}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Prepare chart data
  const chartData = results?.results ? Object.entries(results.results).map(([key, value]) => ({
    metric: key.replace(/_/g, ' ').toUpperCase(),
    value: typeof value === 'number' ? (value * 100) : value,
    originalValue: value
  })) : []

  const pieData = chartData.map((item, index) => ({
    name: item.metric,
    value: item.value,
    fill: `hsl(${index * 60}, 70%, 50%)`
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {evaluation?.name || 'Evaluation'}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground">Run ID: <span className="font-mono">{runId}</span></p>
            {evaluation?.name && (
              <Badge variant="outline" className="text-sm">
                {evaluation.name}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge 
            variant={status?.status === 'running' ? 'default' : status?.status === 'failed' ? 'destructive' : status?.status === 'completed' ? 'default' : 'secondary'}
            className={status?.status === 'running' ? 'animate-pulse' : ''}
          >
            {status?.status === 'running' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
            {status?.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
            {status?.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
            {status?.status === 'cancelled' && <AlertCircle className="h-3 w-3 mr-1" />}
            {status?.status || 'pending'}
          </Badge>
          {status?.status === 'running' && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setIsCancelDialogOpen(true)}
            >
              Cancel
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Evaluation Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">{model?.name || evaluation?.model_id || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Benchmarks:</span>
                <div className="flex gap-1 flex-wrap">
                  {evaluation?.metadata?.benchmark_ids?.map((id: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {id}
                    </Badge>
                  )) || <span className="text-muted-foreground">None</span>}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {evaluation?.config && (
                <>
                  <div className="text-sm font-medium">Configuration:</div>
                  <div className="bg-muted p-3 rounded-md text-xs">
                    <pre>{JSON.stringify(evaluation.config, null, 2)}</pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Real-time Progress Indicator */}
      <EnhancedEvaluationProgress 
        evaluationId={runId}
        onStatusChange={(status) => {
          // Update local state if needed
          console.log('Status changed to:', status)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Live Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Status Display */}
          <div className="text-center space-y-4">
            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge 
                variant={
                  status?.status === 'running' ? 'default' : 
                  status?.status === 'completed' ? 'default' : 
                  status?.status === 'failed' ? 'destructive' : 
                  status?.status === 'cancelled' ? 'secondary' : 'secondary'
                }
                className={`px-4 py-2 text-sm ${
                  status?.status === 'running' ? 'animate-pulse bg-blue-500' : 
                  status?.status === 'completed' ? 'bg-green-500' : 
                  status?.status === 'failed' ? 'bg-red-500' : 
                  status?.status === 'cancelled' ? 'bg-yellow-500' : 'bg-gray-400'
                }`}
              >
                {status?.status === 'running' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                {status?.status === 'completed' && <CheckCircle className="h-4 w-4 mr-2" />}
                {status?.status === 'failed' && <XCircle className="h-4 w-4 mr-2" />}
                {status?.status === 'cancelled' && <AlertCircle className="h-4 w-4 mr-2" />}
                {status?.status === 'pending' && <Clock className="h-4 w-4 mr-2" />}
                {status?.status?.toUpperCase() || 'PENDING'}
              </Badge>
            </div>

            {/* Progress Display */}
            <div className="space-y-3">
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {Math.round((status?.progress ?? 0) * 100)}%
              </div>
              
              {/* Single Progress Bar */}
              <div className="w-full max-w-md mx-auto">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className={`h-4 rounded-full transition-all duration-700 ease-out ${
                      status?.status === 'running' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 
                      status?.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-green-600' : 
                      status?.status === 'failed' ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                      status?.status === 'cancelled' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                      'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}
                    style={{ width: `${Math.round((status?.progress ?? 0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Dynamic Status Message */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {status?.status === 'running' && (
                  <div className="space-y-1">
                    <div className="font-medium">Evaluation in Progress</div>
                    <div className="text-xs">Processing benchmarks and generating results...</div>
                  </div>
                )}
                {status?.status === 'completed' && (
                  <div className="space-y-1">
                    <div className="font-medium text-green-600">Evaluation Completed</div>
                    <div className="text-xs">All benchmarks processed successfully</div>
                  </div>
                )}
                {status?.status === 'failed' && (
                  <div className="space-y-1">
                    <div className="font-medium text-red-600">Evaluation Failed</div>
                    <div className="text-xs">Check logs for error details</div>
                  </div>
                )}
                {status?.status === 'cancelled' && (
                  <div className="space-y-1">
                    <div className="font-medium text-yellow-600">Evaluation Cancelled</div>
                    <div className="text-xs">Process was stopped by user</div>
                  </div>
                )}
                {status?.status === 'pending' && (
                  <div className="space-y-1">
                    <div className="font-medium">Preparing Evaluation</div>
                    <div className="text-xs">Setting up environment and loading models...</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Health Check Indicator */}
          {status?.status === 'running' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live Connection Active</span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Real-time updates enabled • Last update: {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Started:</span>
              <span>{status?.started_at?.slice(0,19).replace('T',' ') || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              {status?.status === 'completed' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : status?.status === 'failed' ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : status?.status === 'cancelled' ? (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-muted-foreground">Completed:</span>
              <span>{status?.completed_at?.slice(0,19).replace('T',' ') || '-'}</span>
            </div>
          </div>

          {status?.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-800 mb-1">Evaluation Failed</h4>
                  <p className="text-red-700 text-sm font-mono break-all">{status.error_message}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!results ? (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No results yet. They will appear here when available.</p>
              </div>
              
              {/* Shimmer loading for results */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">Loading results...</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <ShimmerLoader key={i} variant="card" className="h-20" />
                  ))}
                </div>
                <div className="space-y-3">
                  <ShimmerLoader variant="text" className="w-3/4" />
                  <ShimmerLoader variant="text" className="w-1/2" />
                  <ShimmerLoader variant="text" className="w-2/3" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {results?.results && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Evaluation Results
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={downloadJSON}>
                        <Download className="h-4 w-4 mr-2" />
                        JSON
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        const rawData = {
                          evaluation: evaluation,
                          status: status,
                          results: results
                        };
                        const dataStr = JSON.stringify(rawData, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `evaluation-${runId}-raw.json`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}>
                        <Database className="h-4 w-4 mr-2" />
                        Raw Data
                      </Button>
                    </div>
                  </div>
                  
                  {/* Results Tabs */}
                  <div className="space-y-6">
                    {/* Tab Navigation */}
                    <div className="border-b border-border">
                      <nav className="flex space-x-8">
                        {['Overall', 'Text', 'Vision', 'Audio', 'Multimodal', 'Responses', 'Analysis'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                              activeTab === tab 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'Overall' && (
                    <div className="space-y-6">
                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-card border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                          <div className="text-2xl font-bold text-green-600">
                            {typeof results.results.accuracy === 'number' ? (results.results.accuracy * 100).toFixed(1) + '%' : 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">Accuracy</div>
                        </div>
                        <div className="bg-card border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                          <div className="text-2xl font-bold text-blue-600">
                            {typeof results.results.f1_score === 'number' ? (results.results.f1_score * 100).toFixed(1) + '%' : 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">F1 Score</div>
                        </div>
                        <div className="bg-card border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                          <div className="text-2xl font-bold text-purple-600">
                            {typeof results.results.bleu_score === 'number' ? (results.results.bleu_score * 100).toFixed(1) + '%' : 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">BLEU Score</div>
                        </div>
                        <div className="bg-card border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                          <div className="text-2xl font-bold text-orange-600">
                            {typeof results.results.cider_score === 'number' ? (results.results.cider_score * 100).toFixed(1) + '%' : 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">CIDER Score</div>
                        </div>
                      </div>

                      {/* Performance Summary */}
                      <div className="bg-card border rounded-lg p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Performance Summary
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-medium mb-3 text-green-600">Strengths</h5>
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                High accuracy in text understanding
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Strong performance on reasoning tasks
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Excellent multilingual capabilities
                              </li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium mb-3 text-red-600">Areas for Improvement</h5>
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                Vision tasks need enhancement
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                Audio processing could be improved
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                Complex reasoning tasks show variability
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Responses Tab Content */}
                    {activeTab === 'Responses' && (
                    <div className="space-y-6">
                      <div className="bg-card border rounded-lg p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Model Responses & Outputs
                        </h4>
                        
                        {results?.results?.model_responses && Array.isArray(results.results.model_responses) ? (
                          <div className="space-y-4">
                            {results.results.model_responses.map((response: any, index: number) => (
                              <div key={index} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium text-sm">
                                    {response?.benchmark_name || `Response ${index + 1}`}
                                  </h5>
                                  <div className="flex gap-2">
                                    <Badge variant="outline">
                                      {response?.benchmark_id?.slice(0, 8) || 'N/A'}
                                    </Badge>
                                    <Badge variant="secondary">
                                      Accuracy: {typeof response?.metrics?.accuracy === 'number' 
                                        ? (response.metrics.accuracy * 100).toFixed(1) + '%' 
                                        : 'N/A'}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h6 className="font-medium text-sm mb-2 text-blue-600">Input</h6>
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                      {response?.input || 'N/A'}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h6 className="font-medium text-sm mb-2 text-green-600">Expected Output</h6>
                                    <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                                      {response?.expected || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h6 className="font-medium text-sm mb-2 text-purple-600">Model Output</h6>
                                  <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                                    {response?.model_output || 'N/A'}
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Confidence:</span>
                                    <span className="ml-1 font-medium">
                                      {typeof response?.confidence === 'number' 
                                        ? (response.confidence * 100).toFixed(1) + '%' 
                                        : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Processing Time:</span>
                                    <span className="ml-1 font-medium">
                                      {typeof response?.processing_time === 'number' 
                                        ? response.processing_time.toFixed(2) + 's' 
                                        : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Tokens:</span>
                                    <span className="ml-1 font-medium">
                                      {response?.tokens || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Status:</span>
                                    <Badge variant={response?.correct ? 'default' : 'destructive'} className="ml-1">
                                      {response?.correct ? 'Correct' : 'Incorrect'}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Additional Metrics */}
                                {response?.metrics && (
                                  <div className="mt-4 p-3 bg-gray-50 border rounded">
                                    <h6 className="font-medium text-sm mb-2">Detailed Metrics</h6>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                      {Object.entries(response.metrics).map(([key, value]) => (
                                        <div key={key}>
                                          <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}:</span>
                                          <span className="ml-1 font-medium">
                                            {typeof value === 'number' 
                                              ? (value * 100).toFixed(1) + '%' 
                                              : String(value)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No model responses available yet.</p>
                            <p className="text-sm">Detailed responses will appear here once the evaluation completes.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Analysis Tab Content */}
                    {activeTab === 'Analysis' && (
                    <div className="space-y-6">
                      {/* Detailed Metrics Section */}
                      {results?.results?.detailed_metrics && (
                        <div className="bg-card border rounded-lg p-6">
                          <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Detailed Metrics
                          </h4>
                          
                          {/* Overall Metrics */}
                          {results.results.detailed_metrics.overall && (
                            <div className="mb-6">
                              <h5 className="font-medium mb-3 text-blue-600">Overall Performance</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                  <div className="text-lg font-bold text-blue-600">
                                    {results.results.detailed_metrics.overall.total_samples}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Total Samples</div>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded p-3">
                                  <div className="text-lg font-bold text-green-600">
                                    {results.results.detailed_metrics.overall.correct_predictions}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Correct Predictions</div>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded p-3">
                                  <div className="text-lg font-bold text-purple-600">
                                    {(results.results.detailed_metrics.overall.average_confidence * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-sm text-muted-foreground">Avg Confidence</div>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                  <div className="text-lg font-bold text-orange-600">
                                    {results.results.detailed_metrics.overall.total_processing_time.toFixed(1)}s
                                  </div>
                                  <div className="text-sm text-muted-foreground">Total Time</div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Per-Benchmark Metrics */}
                          {results.results.detailed_metrics.per_benchmark && (
                            <div>
                              <h5 className="font-medium mb-3 text-green-600">Per-Benchmark Results</h5>
                              <div className="space-y-4">
                                {Object.entries(results.results.detailed_metrics.per_benchmark).map(([benchmarkId, metrics]: [string, any]) => (
                                  <div key={benchmarkId} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h6 className="font-medium">{metrics.name}</h6>
                                      <Badge variant="outline">{benchmarkId.slice(0, 8)}...</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                      {Object.entries(metrics).filter(([key]) => key !== 'name').map(([key, value]) => (
                                        <div key={key}>
                                          <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}:</span>
                                          <span className="ml-1 font-medium">
                                            {typeof value === 'number' 
                                              ? (value * 100).toFixed(1) + '%' 
                                              : String(value)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="bg-card border rounded-lg p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Performance Analysis
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Strengths Analysis */}
                          <div className="space-y-4">
                            <h5 className="font-medium text-green-600 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Model Strengths
                            </h5>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                                <span className="text-sm font-medium">Text Understanding</span>
                                <Badge variant="default" className="bg-green-600">Excellent</Badge>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                                <span className="text-sm font-medium">Reasoning Tasks</span>
                                <Badge variant="default" className="bg-green-600">Strong</Badge>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                                <span className="text-sm font-medium">Multilingual</span>
                                <Badge variant="default" className="bg-green-600">Good</Badge>
                              </div>
                            </div>
                          </div>

                          {/* Weaknesses Analysis */}
                          <div className="space-y-4">
                            <h5 className="font-medium text-red-600 flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              Areas for Improvement
                            </h5>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
                                <span className="text-sm font-medium">Vision Processing</span>
                                <Badge variant="destructive">Needs Work</Badge>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
                                <span className="text-sm font-medium">Audio Tasks</span>
                                <Badge variant="destructive">Poor</Badge>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
                                <span className="text-sm font-medium">Complex Reasoning</span>
                                <Badge variant="destructive">Variable</Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recommendations */}
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                          <h6 className="font-medium text-blue-800 mb-2">Recommendations</h6>
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Focus on improving vision-language understanding capabilities</li>
                            <li>• Enhance audio processing and speech recognition accuracy</li>
                            <li>• Implement better reasoning frameworks for complex tasks</li>
                            <li>• Consider fine-tuning on domain-specific datasets</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Modality-specific tabs */}
                    {activeTab === 'Text' && (
                      <div className="space-y-6">
                        <div className="bg-card border rounded-lg p-6">
                          <h4 className="font-semibold mb-4">Text Modality Results</h4>
                          <p className="text-muted-foreground">Text-specific evaluation results and metrics will be displayed here.</p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Vision' && (
                      <div className="space-y-6">
                        <div className="bg-card border rounded-lg p-6">
                          <h4 className="font-semibold mb-4">Vision Modality Results</h4>
                          <p className="text-muted-foreground">Vision-specific evaluation results and metrics will be displayed here.</p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Audio' && (
                      <div className="space-y-6">
                        <div className="bg-card border rounded-lg p-6">
                          <h4 className="font-semibold mb-4">Audio Modality Results</h4>
                          <p className="text-muted-foreground">Audio-specific evaluation results and metrics will be displayed here.</p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Multimodal' && (
                      <div className="space-y-6">
                        <div className="bg-card border rounded-lg p-6">
                          <h4 className="font-semibold mb-4">Multimodal Results</h4>
                          <p className="text-muted-foreground">Multimodal evaluation results and metrics will be displayed here.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Advanced Visualizations */}
                  <div className="space-y-6">
                    {/* Bar Chart */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Performance Metrics
                      </h4>
                      <div className="h-64 w-full bg-card border rounded-lg p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="metric" 
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis 
                              domain={[0, 100]}
                              tick={{ fontSize: 12 }}
                              label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                              formatter={(value: number) => [`${typeof value === 'number' && !isNaN(value) ? value.toFixed(1) : 'N/A'}%`, 'Score']}
                              labelFormatter={(label: string) => `Metric: ${label}`}
                            />
                            <Bar 
                              dataKey="value" 
                              fill="#3b82f6" 
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Pie Chart */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4" />
                        Score Distribution
                      </h4>
                      <div className="h-64 w-full bg-card border rounded-lg p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number, name: string) => [`${typeof value === 'number' && !isNaN(value) ? value.toFixed(1) : 'N/A'}%`, name]} />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36}
                              formatter={(value: string, entry: any) => (
                                <span style={{ color: entry.color }}>
                                  {value} ({typeof entry.payload?.value === 'number' && !isNaN(entry.payload.value) ? entry.payload.value.toFixed(1) : 'N/A'}%)
                                </span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Line Chart for Trends */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Performance Trends
                      </h4>
                      <div className="h-64 w-full bg-card border rounded-lg p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="metric" 
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis 
                              domain={[0, 100]}
                              tick={{ fontSize: 12 }}
                              label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                              formatter={(value: number) => [`${typeof value === 'number' && !isNaN(value) ? value.toFixed(1) : 'N/A'}%`, 'Score']}
                              labelFormatter={(label: string) => `Metric: ${label}`}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  
                  {/* Model Responses Section - Completely Simplified */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Model Responses
                    </h4>
                    <div className="bg-card border rounded-lg p-4">
                      {results?.results?.model_responses && Array.isArray(results.results.model_responses) ? (
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            Found {results.results.model_responses.length} model responses. 
                            Detailed responses will be displayed here once the evaluation completes.
                          </p>
                          {results.results.model_responses.map((response: any, index: number) => {
                            // Extract safe values
                            const benchmarkName = response?.benchmark_name || 'Unknown Benchmark';
                            const benchmarkId = response?.benchmark_id || 'N/A';
                            const accuracy = (() => {
                              const accValue = response?.metrics?.accuracy;
                              if (typeof accValue === 'number' && !isNaN(accValue)) {
                                return (accValue * 100).toFixed(1);
                              }
                              return 'N/A';
                            })();
                            
                            return (
                              <div key={index} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-sm">{benchmarkName}</h5>
                                  <div className="flex gap-2">
                                    <Badge variant="outline">ID: {benchmarkId.slice(0, 8)}...</Badge>
                                    <Badge variant="secondary">Accuracy: {accuracy}%</Badge>
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <p>Sample responses and detailed model outputs will be displayed here.</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground mb-4">
                            Detailed model responses for each benchmark test will be displayed here.
                            This includes the model's predictions, confidence scores, and reasoning.
                          </p>
                          {evaluation?.metadata?.benchmark_ids?.map((benchmarkId: string, index: number) => (
                            <div key={benchmarkId} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-sm">Benchmark {index + 1}</h5>
                                <Badge variant="outline">{benchmarkId}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Results will be displayed here once the evaluation completes.
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Raw Results */}
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                      View Raw Results
                    </summary>
                    <div className="bg-muted p-4 rounded-md overflow-auto text-xs max-h-96 border mt-2">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(results.results, null, 2)}</pre>
                    </div>
                  </details>
                </div>
              )}
              {results?.individual_results?.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    Individual Metrics
                  </h3>
                  <div className="grid gap-2">
                    {Array.isArray(results.individual_results) ? results.individual_results.map((r: any, index: number) => (
                      <div key={r.id || index} className="flex items-center justify-between border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors">
                        <div className="font-mono text-sm truncate max-w-[60%]">{r.metric_name}</div>
                        <Badge variant="secondary" className="font-semibold">{r.metric_value}</Badge>
                      </div>
                    )) : (
                      <div className="text-sm text-muted-foreground">
                        Individual results data is not available
                      </div>
                    )}
                  </div>
                </div>
              )}
              {results?.logs && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Execution Logs
                  </h3>
                  <div className="bg-muted p-4 rounded-md overflow-auto text-xs max-h-64 border">
                    <pre className="whitespace-pre-wrap">{results.logs}</pre>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CancelEvaluationDialog
        runId={runId}
        runName={status?.run_id}
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      />
    </div>
  )
}


