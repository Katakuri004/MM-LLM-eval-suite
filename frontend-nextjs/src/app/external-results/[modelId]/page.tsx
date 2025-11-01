'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalModelMetricsTabs } from '@/components/external/ExternalModelMetricsTabs'
import { CapabilitiesRadar } from '@/components/mock/CapabilitiesRadar'
import { CapabilityBadge } from '@/components/mock/CapabilityBadge'
import { ErrorAnalysisSummary } from '@/components/mock/ErrorAnalysisSummary'
import { aggregateCapabilities, mapBenchmarkToCapabilities } from '@/lib/capability-mapping'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Eye, HelpCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ShimmerLoader } from '@/components/ui/shimmer-loader'
import { apiClient } from '@/lib/api'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { BenchmarkComparisonChart } from '@/components/external-results/BenchmarkComparisonChart'
import { MetricDistributionChart } from '@/components/external-results/MetricDistributionChart'
import { PerformanceOverview } from '@/components/external-results/PerformanceOverview'
import { BenchmarkDetailChart } from '@/components/external-results/BenchmarkDetailChart'
import { BenchmarkCompactCard } from '@/components/external-results/BenchmarkCompactCard'
import { BenchmarkMetricsHeatmap } from '@/components/external-results/BenchmarkMetricsHeatmap'
import { SampleDistributionChart } from '@/components/external-results/SampleDistributionChart'
import { normalizeMetricValue } from '@/lib/chart-data-utils'

function getMetricDefinition(key: string): string {
  const normalizedKey = key.toLowerCase().replace(/_/g, '').replace(/-/g, '')
  
  if (normalizedKey === 'acc' || normalizedKey === 'accuracy') {
    return 'Accuracy: The proportion of correct predictions out of total predictions. Higher values indicate better performance.'
  } else if (normalizedKey === 'accnorm' || normalizedKey === 'acc_norm' || normalizedKey.includes('accnorm')) {
    return 'Normalized Accuracy: Accuracy score normalized to account for random guessing or baseline performance.'
  } else if (normalizedKey.includes('exactmatch') && !normalizedKey.includes('stderr')) {
    return 'Exact Match: The proportion of predictions that exactly match the reference answer. Measures precise correctness.'
  } else if (normalizedKey.includes('exactmatch') && normalizedKey.includes('stderr')) {
    return 'Exact Match Standard Error: The standard error of the exact match metric, indicating the uncertainty in the estimate.'
  } else if (normalizedKey.includes('stderr') && !normalizedKey.includes('exactmatch')) {
    return 'Standard Error: A measure of the statistical uncertainty in the metric. Lower values indicate more reliable estimates.'
  } else if (normalizedKey.includes('f1')) {
    return 'F1 Score: The harmonic mean of precision and recall, providing a balance between both metrics.'
  } else if (normalizedKey.includes('bleu')) {
    return 'BLEU Score: A metric for evaluating the quality of text generation by comparing n-grams with reference text.'
  } else if (normalizedKey.includes('rouge')) {
    return 'ROUGE Score: A metric for evaluating summarization by measuring overlap of n-grams with reference summaries.'
  } else if (normalizedKey.includes('wer')) {
    return 'Word Error Rate: The proportion of words that differ between predicted and reference text. Lower values are better.'
  } else if (normalizedKey.includes('cer')) {
    return 'Character Error Rate: The proportion of characters that differ between predicted and reference text. Lower values are better.'
  } else if (normalizedKey.includes('precision')) {
    return 'Precision: The proportion of positive predictions that are actually correct.'
  } else if (normalizedKey.includes('recall')) {
    return 'Recall: The proportion of actual positives that were correctly identified.'
  } else if (normalizedKey.includes('strictmatch')) {
    return 'Strict Match: A more stringent evaluation where predictions must match references exactly with no variations.'
  }
  
  return `Metric: ${key.replace(/_/g, ' ')}. This metric measures performance on the evaluated benchmark tasks.`
}

export default function ExternalModelDetailPage() {
  const params = useParams()
  const modelId = (params?.modelId as string) || ''
  
  // State management for selected metric and active tab
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')
  // State for selected benchmark detail view
  const [selectedBenchmark, setSelectedBenchmark] = useState<any | null>(null)
  // State for chart dialog
  const [chartDialogOpen, setChartDialogOpen] = useState<boolean>(false)
  const [selectedChart, setSelectedChart] = useState<React.ReactNode | null>(null)
  const [selectedChartTitle, setSelectedChartTitle] = useState<string>('')

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['external-model', modelId],
    queryFn: () => apiClient.getExternalModel(modelId),
    enabled: !!modelId,
    refetchOnWindowFocus: false,
  })

  // Generate response rows from benchmark samples
  // All hooks must be called before any conditional returns
  const responseRows = React.useMemo(() => {
    if (!detail) return []
    const rows: any[] = []
    detail.benchmarks?.forEach((b: any) => {
      // Use sample preview if available, otherwise generate demo rows
      if (b.samples_preview && b.samples_preview.length > 0) {
        b.samples_preview.slice(0, 2).forEach((sample: any) => {
          const modality = b.benchmark_id.includes('vqa') || b.benchmark_id.includes('image') ? 'image' : 'text'
          rows.push({
            id: `s-${b.benchmark_id}-${rows.length}`,
            benchmark_id: b.benchmark_id,
            modality,
            input: sample.input || sample.question || sample.prompt || 'Sample input',
            prediction: sample.output || sample.prediction || sample.answer || '',
            label: sample.label || sample.target || '',
            is_correct: sample.is_correct !== undefined ? sample.is_correct : (sample.score > 0),
            error_type: sample.error_type || null,
            score: sample.score || (sample.is_correct ? 1 : 0),
          })
        })
      } else {
        // Generate demo rows
        const modality = b.benchmark_id.includes('vqa') || b.benchmark_id.includes('image') ? 'image' : 'text'
        rows.push({
          id: `s-${b.benchmark_id}-1`,
          benchmark_id: b.benchmark_id,
          modality,
          input: 'Sample input 1',
          prediction: 'A',
          label: 'B',
          is_correct: false,
          error_type: null,
          score: 0,
        })
        rows.push({
          id: `s-${b.benchmark_id}-2`,
          benchmark_id: b.benchmark_id,
          modality,
          input: 'Sample input 2',
          prediction: 'C',
          label: 'C',
          is_correct: true,
          error_type: null,
          score: 1,
        })
      }
    })
    return rows
  }, [detail])

  const capabilityScores = React.useMemo(() => {
    if (!detail?.benchmarks) return []
    const aggregated = aggregateCapabilities(detail.benchmarks as any)
    return Object.entries(aggregated).map(([name, score]) => ({
      name: name as any,
      score: score * 100,
    }))
  }, [detail])

  const runCaps = React.useMemo(() => {
    if (!detail?.benchmarks) return []
    const set = new Set<string>()
    detail.benchmarks.forEach((b: any) =>
      mapBenchmarkToCapabilities(b.benchmark_id).forEach((c) => set.add(c))
    )
    return Array.from(set)
  }, [detail])

  const downloadJSON = React.useCallback(() => {
    if (!detail) return
    const dataStr = JSON.stringify(detail, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `external-results-${detail.model_name || 'model'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [detail])

  // Determine modality from benchmarks
  const hasText = React.useMemo(() => {
    return detail?.benchmarks?.some((b: any) => 
    !b.benchmark_id.includes('vqa') && !b.benchmark_id.includes('image') && !b.benchmark_id.includes('vision')
    ) || false
  }, [detail])

  const hasImage = React.useMemo(() => {
    return detail?.benchmarks?.some((b: any) => 
    b.benchmark_id.includes('vqa') || b.benchmark_id.includes('image') || b.benchmark_id.includes('vision')
    ) || false
  }, [detail])

  const modality = React.useMemo(() => {
    return hasText && hasImage ? 'multi-modal' : hasImage ? 'image' : 'text'
  }, [hasText, hasImage])

  // Prepare detail for ExternalModelMetricsTabs
  const detailForTabs = React.useMemo(() => ({
    model_name: detail?.model_name || '',
    summary_metrics: detail?.summary_metrics || {},
    benchmarks: detail?.benchmarks || [],
  }), [detail])

  // Now we can do early returns after all hooks are called
  if (isLoading) {
    return <ShimmerLoader />
  }

  if (error || !detail) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">External Model Details</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error ? `Error loading model: ${String(error)}` : 'Model not found'}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{detail.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">External</Badge>
            <Badge variant="outline" className="capitalize">{modality}</Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(detail.created_at).toLocaleString()}
            </span>
            {runCaps.length > 0 && <CapabilityBadge caps={runCaps} />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            window.location.href = `/external-results/${encodeURIComponent(modelId)}/responses`
          }}>
            <Eye className="h-4 w-4 mr-2" />
            View All Responses
          </Button>
          <Button size="sm" variant="outline" onClick={downloadJSON}>
            <Download className="h-4 w-4 mr-2" />
            Download Raw JSON
          </Button>
        </div>
      </div>

      {detail.summary_metrics && Object.keys(detail.summary_metrics).length > 0 && (() => {
        // Filter summary metrics to exclude time fields and show only relevant performance metrics
        const timeFields = [
          'start_time', 'end_time', 'starttime', 'endtime',
          'created_at', 'updated_at', 'createdat', 'updatedat',
          'timestamp', 'time', 'duration', 'elapsed',
          'date', 'datetime', 'when'
        ]
        
        const relevantSummaryMetrics = Object.entries(detail.summary_metrics)
          .filter(([k, v]) => {
            if (typeof v !== 'number' || !Number.isFinite(v)) return false
            
            const key = k.toLowerCase().replace(/_/g, '').replace(/-/g, '')
            
            // Exclude time-related fields
            if (timeFields.some(tf => key.includes(tf.toLowerCase()))) return false
            
            // Exclude timestamp-like values (very large numbers)
            if (v > 1000000000) return false
            
            // Exclude config-like fields (fewshot, config, settings, etc.)
            const configFields = ['fewshot', 'config', 'setting', 'param', 'multiturn']
            if (configFields.some(cf => key.includes(cf.toLowerCase()))) return false
            
            // Include performance metrics
            const isPerformanceMetric = (
              key.includes('acc') || 
              key.includes('exact_match') || 
              key.includes('exactmatch') ||
              key.includes('f1') || 
              key.includes('score') ||
              key.includes('bleu') ||
              key.includes('rouge') ||
              key.includes('precision') ||
              key.includes('recall') ||
              key.includes('meteor') ||
              key.includes('cider') ||
              key.includes('spice') ||
              key.includes('wer') ||
              key.includes('cer') ||
              key.includes('em') ||
              key.includes('error') ||
              key.includes('rate')
            )
            
            // Show performance metrics, or reasonable metric values that aren't config
            const isReasonableMetricValue = (v >= 0 && v <= 1) || (v >= 0 && v <= 100)
            return isPerformanceMetric || (isReasonableMetricValue && !key.includes('config'))
          })
          .sort(([a], [b]) => {
            // Prioritize accuracy metrics
            const aKey = a.toLowerCase().replace(/_/g, '').replace(/-/g, '')
            const bKey = b.toLowerCase().replace(/_/g, '').replace(/-/g, '')
            
            const getPriority = (key: string): number => {
              if (key === 'acc' || key === 'accuracy') return 1
              if (key === 'accnorm' || key === 'acc_norm') return 2
              if (key.includes('exactmatch')) return 3
              if (key.includes('f1')) return 4
              if (key.includes('score')) return 5
              if (key.includes('bleu')) return 6
              if (key.includes('rouge')) return 7
              return 8
            }
            
            return getPriority(aKey) - getPriority(bKey)
          })
          .slice(0, 8) // Show top 8 summary metrics
        
        if (relevantSummaryMetrics.length === 0) return null
        
        return (
          <TooltipProvider>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {relevantSummaryMetrics.map(([key, value]: any) => {
                // Format metric name
                const displayKey = key
                  .replace(/_/g, ' ')
                  .replace(/\bacc\b/gi, 'Acc')
                  .replace(/\bexact match\b/gi, 'Exact Match')
                  .replace(/\bstderr\b/gi, 'Stderr')
                  .split(' ')
                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ')
                
                const metricDefinition = getMetricDefinition(key)
                const isSelected = selectedMetric === key
                
                const handleCardClick = () => {
                  setSelectedMetric(key)
                  setActiveTab('analysis')
                }
                
                const handleKeyDown = (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleCardClick()
                  }
                }
                
                return (
              <div
                key={key}
                    role="button"
                    tabIndex={0}
                    onClick={handleCardClick}
                    onKeyDown={handleKeyDown}
                    className={`bg-card border rounded-lg p-4 text-center transition-all duration-200 cursor-pointer hover:shadow-lg hover:border-primary hover:scale-105 ${
                      isSelected ? 'border-primary shadow-lg scale-105' : ''
                    }`}
              >
                <div className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const normalized = normalizeMetricValue(key, value)
                        return normalized.isPercentage 
                          ? `${normalized.displayValue.toFixed(2)}%`
                          : normalized.displayValue.toFixed(2)
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize mt-1 flex items-center justify-center gap-1">
                      <span>{displayKey}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs leading-relaxed">{metricDefinition}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                </div>
                )
              })}
                </div>
          </TooltipProvider>
        )
      })()}

      {/* Main Visualizations with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Performance Overview Mini Charts */}
          <PerformanceOverview
            benchmarks={detail.benchmarks || []}
            summaryMetrics={detail.summary_metrics}
            onChartClick={(chartType, chartElement) => {
              const titles: Record<string, string> = {
                'summary': 'Summary Metrics Distribution',
                'samples': 'Sample Distribution',
                'top5': 'Top 5 Benchmarks by Accuracy'
              }
              setSelectedChart(chartElement)
              setSelectedChartTitle(titles[chartType] || 'Chart')
              setChartDialogOpen(true)
            }}
          />

          {/* Benchmark Comparison Chart */}
          {detail.benchmarks && detail.benchmarks.length > 0 && (
            <BenchmarkComparisonChart benchmarks={detail.benchmarks} />
          )}

          {/* Metric Distribution Chart */}
          {detail.benchmarks && detail.benchmarks.length > 0 && (
            <MetricDistributionChart benchmarks={detail.benchmarks} />
          )}

          {/* Sample Distribution and Model Capabilities - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sample Distribution */}
            {detail.benchmarks && detail.benchmarks.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedChart(
                    <SampleDistributionChart 
                      benchmarks={detail.benchmarks} 
                      height={600}
                    />
                  )
                  setSelectedChartTitle('Sample Distribution')
                  setChartDialogOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedChart(
                      <SampleDistributionChart 
                        benchmarks={detail.benchmarks} 
                        height={600}
                      />
                    )
                    setSelectedChartTitle('Sample Distribution')
                    setChartDialogOpen(true)
                  }
                }}
                className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg flex items-stretch"
              >
                <div className="w-full flex flex-col">
                  <SampleDistributionChart benchmarks={detail.benchmarks} height={400} />
                </div>
              </div>
            )}

            {/* Model Capabilities */}
            {capabilityScores.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedChart(
                    <CapabilitiesRadar
                      data={Object.fromEntries(
                        capabilityScores.map(c => [c.name, c.score / 100])
                      )}
                      height={600}
                      outerRadius={180}
                      showTitle={false}
                    />
                  )
                  setSelectedChartTitle('Model Capabilities')
                  setChartDialogOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedChart(
                      <CapabilitiesRadar
                        data={Object.fromEntries(
                          capabilityScores.map(c => [c.name, c.score / 100])
                        )}
                        height={600}
                        outerRadius={180}
                        showTitle={false}
                      />
                    )
                    setSelectedChartTitle('Model Capabilities')
                    setChartDialogOpen(true)
                  }
                }}
                className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg flex items-stretch"
              >
                <div className="w-full flex flex-col">
                  <CapabilitiesRadar
                    data={Object.fromEntries(
                      capabilityScores.map(c => [c.name, c.score / 100])
                    )}
                    height={400}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {detail.benchmarks?.map((b: any) => (
              <div
                key={b.benchmark_id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBenchmark(b)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedBenchmark(b)
                  }
                }}
                className="cursor-pointer transition-all duration-200 hover:scale-105"
              >
                <BenchmarkCompactCard
                  benchmark_id={b.benchmark_id}
                  metrics={b.metrics || {}}
                  total_samples={b.total_samples}
                />
              </div>
            ))}
        </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {/* Selected Metric Indicator */}
          {selectedMetric && (() => {
            // Calculate average evaluation time for benchmarks with the selected metric
            const benchmarksWithMetric = detail.benchmarks?.filter((b: any) => {
              const metrics = b.metrics || {}
              return selectedMetric in metrics || Object.keys(metrics).some(k => 
                k.toLowerCase().replace(/_/g, '').replace(/-/g, '') === 
                selectedMetric.toLowerCase().replace(/_/g, '').replace(/-/g, '')
              )
            }) || []
            
            const timeValues = benchmarksWithMetric
              .map((b: any) => b.evaluation_time_seconds)
              .filter((t: number | undefined) => t !== undefined && typeof t === 'number' && t > 0)
            
            const totalTimeSeconds = timeValues.length > 0 
              ? timeValues.reduce((sum: number, t: number) => sum + t, 0)
              : null
            const avgTimeSeconds = totalTimeSeconds !== null && timeValues.length > 0
              ? totalTimeSeconds / timeValues.length
              : null
            
            const formatTime = (seconds: number): string => {
              if (seconds < 60) {
                return `${seconds.toFixed(1)} seconds`
              } else if (seconds < 3600) {
                const mins = Math.floor(seconds / 60)
                const secs = seconds % 60
                return `${mins} minute${mins !== 1 ? 's' : ''} ${secs.toFixed(0)} second${secs !== 1 ? 's' : ''}`
              } else {
                const hours = Math.floor(seconds / 3600)
                const mins = Math.floor((seconds % 3600) / 60)
                const secs = seconds % 60
                return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''} ${secs.toFixed(0)} second${secs !== 1 ? 's' : ''}`
              }
            }
            
            return (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">Viewing:</span>
                      <span className="text-sm font-semibold">
                        {selectedMetric
                          .replace(/_/g, ' ')
                          .replace(/\bacc\b/gi, 'Acc')
                          .replace(/\bexact match\b/gi, 'Exact Match')
                          .replace(/\bstderr\b/gi, 'Stderr')
                          .split(' ')
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ')}
                      </span>
                      {avgTimeSeconds !== null && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Avg: {formatTime(avgTimeSeconds)})
                        </span>
                      )}
                      {totalTimeSeconds !== null && timeValues.length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          (Total: {formatTime(totalTimeSeconds)})
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMetric(null)
                      }}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Benchmark Comparison Chart - Filtered by selected metric */}
          {detail.benchmarks && detail.benchmarks.length > 0 && (
            <BenchmarkComparisonChart
              benchmarks={detail.benchmarks}
              selectedMetrics={selectedMetric ? [selectedMetric] : []}
            />
          )}

          {/* Metric Distribution Chart - Pre-selected metric */}
          {detail.benchmarks && detail.benchmarks.length > 0 && (
            <MetricDistributionChart
              benchmarks={detail.benchmarks}
              selectedMetric={selectedMetric || undefined}
            />
          )}

          {/* Performance Heatmap */}
          {detail.benchmarks && detail.benchmarks.length > 0 && (
            <BenchmarkMetricsHeatmap benchmarks={detail.benchmarks} />
          )}

          {/* Capabilities Radar */}
          {capabilityScores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Model Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <CapabilitiesRadar
                  data={Object.fromEntries(
                    capabilityScores.map(c => [c.name, c.score / 100])
                  )}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Error Analysis Summary */}
      <ErrorAnalysisSummary 
        samples={responseRows} 
        responsesLink={`/external-results/${encodeURIComponent(modelId)}/responses`}
      />

      <ExternalModelMetricsTabs detail={detailForTabs} />

      {/* Chart Dialog */}
      <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedChartTitle}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 w-full">
            {selectedChart}
          </div>
        </DialogContent>
      </Dialog>

      {/* Benchmark Detail Dialog */}
      <Dialog open={selectedBenchmark !== null} onOpenChange={(open) => !open && setSelectedBenchmark(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBenchmark?.benchmark_id}</DialogTitle>
            <DialogDescription>
              {selectedBenchmark?.total_samples !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {selectedBenchmark.total_samples} samples
                  {selectedBenchmark?.evaluation_time_seconds && (
                    <span className="ml-2">
                      • Evaluation time: {(() => {
                        const seconds = selectedBenchmark.evaluation_time_seconds
                        if (seconds < 60) {
                          return `${seconds.toFixed(1)} seconds`
                        } else if (seconds < 3600) {
                          const mins = Math.floor(seconds / 60)
                          const secs = seconds % 60
                          return `${mins}m ${secs.toFixed(0)}s`
                        } else {
                          const hours = Math.floor(seconds / 3600)
                          const mins = Math.floor((seconds % 3600) / 60)
                          return `${hours}h ${mins}m`
                        }
                      })()}
                    </span>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBenchmark && (
            <div className="space-y-6 mt-4">
              {/* Detailed Metrics Chart */}
              <BenchmarkDetailChart
                benchmark_id={selectedBenchmark.benchmark_id}
                metrics={selectedBenchmark.metrics || {}}
                total_samples={selectedBenchmark.total_samples}
              />

              {/* All Metrics Grid */}
              {selectedBenchmark.metrics && Object.keys(selectedBenchmark.metrics).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>All Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Object.entries(selectedBenchmark.metrics)
                        .filter(([_, v]) => typeof v === 'number' && Number.isFinite(v))
                        .map(([k, v]: any) => {
                          const normalized = normalizeMetricValue(k, v)
                          const displayName = k
                            .replace(/_/g, ' ')
                            .replace(/\bacc\b/gi, 'Acc')
                            .replace(/\bexact match\b/gi, 'Exact Match')
                            .replace(/\bstderr\b/gi, 'Stderr')
                            .split(' ')
                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ')
                          
                          return (
                            <div key={k} className="bg-muted/50 rounded-md px-3 py-2.5 text-center">
                              <div className="text-xs text-muted-foreground mb-1 truncate" title={k}>
                                {displayName}
                              </div>
                              <div className="text-lg font-semibold text-blue-600">
                                {normalized.isPercentage 
                                  ? `${normalized.displayValue.toFixed(2)}%`
                                  : normalized.displayValue.toFixed(3)}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Raw Files */}
              {selectedBenchmark.raw_files && selectedBenchmark.raw_files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Raw Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedBenchmark.raw_files.map((file: any, idx: number) => (
                        <div key={idx} className="text-sm text-muted-foreground">
                          {file.filename}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

