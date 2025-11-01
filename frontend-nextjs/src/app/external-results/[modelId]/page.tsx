'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalModelMetricsTabs } from '@/components/external/ExternalModelMetricsTabs'
import { CapabilitiesRadar } from '@/components/mock/CapabilitiesRadar'
import { CapabilityBadge } from '@/components/mock/CapabilityBadge'
import { ErrorAnalysis } from '@/components/mock/ErrorAnalysis'
import { ResponsesTable } from '@/components/mock/ResponsesTable'
import { aggregateCapabilities, mapBenchmarkToCapabilities } from '@/lib/capability-mapping'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Eye } from 'lucide-react'
import { ShimmerLoader } from '@/components/ui/shimmer-loader'
import { apiClient } from '@/lib/api'

export default function ExternalModelDetailPage() {
  const params = useParams()
  const modelId = (params?.modelId as string) || ''

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

      {detail.summary_metrics && Object.keys(detail.summary_metrics).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(detail.summary_metrics)
            .filter(([_, v]) => typeof v === 'number')
            .slice(0, 4)
            .map(([key, value]: any) => (
              <div
                key={key}
                className="bg-card border rounded-lg p-4 text-center hover:shadow-sm transition-shadow"
              >
                <div className="text-2xl font-bold text-blue-600">
                  {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : String(value)}
                </div>
                <div className="text-sm text-muted-foreground capitalize mt-1">
                  {key.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Benchmarks and Capabilities side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Benchmarks ({detail.benchmark_count || detail.benchmarks?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.benchmarks?.map((b: any) => {
              // Filter and prioritize important metrics (Acc, Acc Norm, Acc Stderr, etc.)
              // Explicitly exclude time-related fields
              const timeFields = [
                'start_time', 'end_time', 'starttime', 'endtime',
                'created_at', 'updated_at', 'createdat', 'updatedat',
                'timestamp', 'time', 'duration', 'elapsed',
                'date', 'datetime', 'when'
              ]
              
              const importantMetrics = Object.entries(b.metrics || {})
                .filter(([k, v]) => {
                  if (typeof v !== 'number' || !Number.isFinite(v)) return false
                  
                  const key = k.toLowerCase().replace(/_/g, '').replace(/-/g, '')
                  
                  // Explicitly exclude time-related fields
                  if (timeFields.some(tf => key.includes(tf.toLowerCase()))) return false
                  
                  // Exclude any field that looks like a timestamp (very large numbers)
                  // Timestamps are typically > 1000000000 (epoch in seconds) or > 1000000000000 (epoch in ms)
                  if (v > 1000000000) return false
                  
                  // Include only important performance metrics
                  // Acc, Acc Norm, Exact Match, F1, Score (with or without stderr)
                  return key.includes('acc') || 
                         key.includes('exact_match') || 
                         key.includes('f1') || 
                         key.includes('score') ||
                         key.includes('bleu') ||
                         key.includes('rouge') ||
                         key.includes('precision') ||
                         key.includes('recall')
                })
                .sort(([a], [b]) => {
                  const aKey = a.toLowerCase().replace(/_/g, '').replace(/-/g, '')
                  const bKey = b.toLowerCase().replace(/_/g, '').replace(/-/g, '')
                  
                  // Define priority order for specific metrics
                  const getPriority = (key: string): number => {
                    // Exact matches first (most important)
                    if (key === 'acc' || key === 'accuracy') return 1
                    if (key === 'accnorm' || key === 'acc_norm' || key === 'accuracynorm') return 2
                    if (key === 'accstderr' || key === 'acc_stderr' || key === 'accuracystderr') return 3
                    if (key === 'accnormstderr' || key === 'acc_norm_stderr' || key === 'accuracynormstderr') return 4
                    
                    // Then other accuracy variants
                    if (key.includes('acc') && !key.includes('norm') && !key.includes('stderr')) return 5
                    if (key.includes('acc') && key.includes('norm') && !key.includes('stderr')) return 6
                    if (key.includes('acc') && key.includes('stderr') && !key.includes('norm')) return 7
                    if (key.includes('acc') && key.includes('norm') && key.includes('stderr')) return 8
                    
                    // Exact match metrics
                    if (key.includes('exactmatch') && !key.includes('stderr')) return 9
                    if (key.includes('exactmatch') && key.includes('stderr')) return 10
                    
                    // F1, BLEU, ROUGE, etc.
                    if (key.includes('f1') && !key.includes('stderr')) return 11
                    if (key.includes('f1') && key.includes('stderr')) return 12
                    if (key.includes('bleu') && !key.includes('stderr')) return 13
                    if (key.includes('rouge') && !key.includes('stderr')) return 14
                    if (key.includes('precision') && !key.includes('stderr')) return 15
                    if (key.includes('recall') && !key.includes('stderr')) return 16
                    if (key.includes('score') && !key.includes('stderr')) return 17
                    
                    return 99 // Lowest priority
                  }
                  
                  return getPriority(aKey) - getPriority(bKey)
                })
                .slice(0, 6) // Show up to 6 metrics (2x3 or 3x2 grid)

              return (
                <div key={b.benchmark_id} className="border rounded-md p-3 space-y-2.5">
                  {/* Header with benchmark name and sample count */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="font-medium text-sm">{b.benchmark_id}</span>
                    <span className="text-xs text-muted-foreground">
                      {b.total_samples || b.samples_preview?.length || 0} samples
                    </span>
                  </div>

                  {/* Metrics grid */}
                  {importantMetrics.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {importantMetrics.map(([k, v]: any) => {
                        // Format metric name (Acc, Acc Norm, Acc Stderr, etc.)
                        const key = k.toLowerCase()
                        let displayName = k
                        
                        // Handle common metric name patterns
                        if (key === 'acc' || key === 'accuracy') {
                          displayName = 'Acc'
                        } else if (key === 'acc_norm' || key === 'accnorm' || key === 'accuracy_norm') {
                          displayName = 'Acc Norm'
                        } else if (key === 'acc_stderr' || key === 'accstderr' || key === 'accuracy_stderr') {
                          displayName = 'Acc Stderr'
                        } else if (key === 'acc_norm_stderr' || key === 'accnormstderr' || key === 'accuracy_norm_stderr') {
                          displayName = 'Acc Norm Stderr'
                        } else if (key === 'exact_match') {
                          displayName = 'Exact Match'
                        } else if (key === 'exact_match_stderr') {
                          displayName = 'Exact Match Stderr'
                        } else {
                          // Fallback: format generically
                          displayName = k
                            .replace(/_/g, ' ')
                            .replace(/\bacc\b/gi, 'Acc')
                            .replace(/\bexact match\b/gi, 'Exact Match')
                            .replace(/\bstderr\b/gi, 'Stderr')
                            .split(' ')
                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ')
                        }
                        
                        return (
                          <div key={k} className="bg-muted/50 rounded px-2.5 py-1.5 text-xs">
                            <div className="text-muted-foreground text-[10px] mb-0.5">{displayName}</div>
                            <div className="font-semibold">
                              {(v * 100).toFixed(2)}%
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Files section - more compact */}
                  {b.raw_files?.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-[10px] text-muted-foreground truncate flex-1 mr-2">
                        Files: {b.raw_files.map((f: any) => f.filename).join(', ')}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs flex-shrink-0"
                        onClick={() => {
                          const payload = { benchmark_id: b.benchmark_id, files: b.raw_files }
                          const blob = new Blob([JSON.stringify(payload, null, 2)], {
                            type: 'application/json',
                          })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${b.benchmark_id}-files.json`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            {capabilityScores.length > 0 ? (
              <CapabilitiesRadar data={capabilityScores} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No capability data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error analysis and responses (tabbed) */}
      <Tabs defaultValue="errors">
        <TabsList>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="responses">Model Responses</TabsTrigger>
        </TabsList>
        <TabsContent value="errors">
          <ErrorAnalysis 
            samples={responseRows} 
            responsesLink={`/external-results/${encodeURIComponent(modelId)}/responses`}
          />
        </TabsContent>
        <TabsContent value="responses">
          <ResponsesTable rows={responseRows} />
        </TabsContent>
      </Tabs>

      <ExternalModelMetricsTabs detail={detailForTabs} />
    </div>
  )
}

