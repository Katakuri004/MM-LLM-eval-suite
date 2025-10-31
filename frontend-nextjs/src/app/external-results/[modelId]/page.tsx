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

async function getExternalModel(id: string) {
  // Avoid double-encoding: if it already contains a percent escape, reuse as-is
  const encoded = id.includes('%') ? id : encodeURIComponent(id)
  const res = await fetch(`/api/external-results/${encoded}`, { cache: 'no-store' })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || 'Failed to fetch external model')
  }
  return res.json()
}

export default function ExternalModelDetailPage() {
  const params = useParams()
  const modelId = (params?.modelId as string) || ''

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['external-model', modelId],
    queryFn: () => getExternalModel(modelId),
    enabled: !!modelId,
    refetchOnWindowFocus: false,
  })

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

  // Generate response rows from benchmark samples
  const responseRows = React.useMemo(() => {
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
    if (!detail.benchmarks) return []
    const aggregated = aggregateCapabilities(detail.benchmarks as any)
    return Object.entries(aggregated).map(([name, score]) => ({
      name: name as any,
      score: score * 100,
    }))
  }, [detail])

  const runCaps = React.useMemo(() => {
    const set = new Set<string>()
    detail.benchmarks?.forEach((b: any) =>
      mapBenchmarkToCapabilities(b.benchmark_id).forEach((c) => set.add(c))
    )
    return Array.from(set)
  }, [detail])

  const downloadJSON = () => {
    const dataStr = JSON.stringify(detail, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `external-results-${detail.model_name || 'model'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Determine modality from benchmarks
  const hasText = detail.benchmarks?.some((b: any) => 
    !b.benchmark_id.includes('vqa') && !b.benchmark_id.includes('image') && !b.benchmark_id.includes('vision')
  )
  const hasImage = detail.benchmarks?.some((b: any) => 
    b.benchmark_id.includes('vqa') || b.benchmark_id.includes('image') || b.benchmark_id.includes('vision')
  )
  const modality = hasText && hasImage ? 'multi-modal' : hasImage ? 'image' : 'text'

  // Prepare detail for ExternalModelMetricsTabs
  const detailForTabs = {
    model_name: detail.model_name,
    summary_metrics: detail.summary_metrics || {},
    benchmarks: detail.benchmarks || [],
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
          <CardContent className="space-y-4">
            {detail.benchmarks?.map((b: any) => (
              <details key={b.benchmark_id} className="border rounded-md">
                <summary className="cursor-pointer px-4 py-2 flex items-center justify-between">
                  <span className="font-medium">{b.benchmark_id}</span>
                  <span className="text-sm text-muted-foreground">
                    {b.total_samples || b.samples_preview?.length || 0} samples
                  </span>
                </summary>
                <div className="p-4 space-y-3">
                  {b.metrics && Object.keys(b.metrics).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(b.metrics)
                        .filter(([_, v]) => typeof v === 'number' && !String(v).includes('stderr'))
                        .slice(0, 8)
                        .map(([k, v]: any) => (
                          <div key={k} className="bg-muted/50 rounded px-3 py-2 text-sm">
                            <div className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</div>
                            <div className="font-semibold">
                              {typeof v === 'number'
                                ? Number.isFinite(v)
                                  ? (v * 100).toFixed(2) + '%'
                                  : String(v)
                                : String(v)}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  {b.raw_files?.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Files: {b.raw_files.map((f: any) => f.filename).join(', ')}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
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
                        Download Files
                      </Button>
                    </div>
                  )}
                </div>
              </details>
            ))}
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

