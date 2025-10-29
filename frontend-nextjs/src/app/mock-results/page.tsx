'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModalityTabs } from '@/components/evaluations/ModalityTabs'
import { CapabilitiesRadar } from '@/components/mock/CapabilitiesRadar'
import { CapabilityBadge } from '@/components/mock/CapabilityBadge'
import { ErrorAnalysis } from '@/components/mock/ErrorAnalysis'
import { ResponsesTable } from '@/components/mock/ResponsesTable'
import { aggregateCapabilities, mapBenchmarkToCapabilities } from '@/lib/capability-mapping'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function MockResultsPage() {
  // Build a combined qwen2vl mock using exact metrics from /results
  const detail = React.useMemo(() => {
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

    const benchmarks = [...textBenchmarks, ...imageBenchmarks]
    const summary_metrics = Object.fromEntries(
      benchmarks.flatMap((b: any) => Object.entries(b.metrics || {}))
        .filter(([_, v]) => typeof v === 'number')
        .slice(0, 4)
    )

    return {
      id: 'local:qwen2vl_combined',
      name: 'qwen2vl multimodal combined',
      model_name: 'qwen2vl',
      modality: 'multi-modal',
      created_at,
      status: 'completed',
      benchmark_ids: benchmarks.map(b => b.benchmark_id),
      summary_metrics,
      source_folder: 'results',
      benchmarks,
    }
  }, [])

  // Fabricate a small set of response rows for analysis/demo
  const responseRows = React.useMemo(() => {
    const rows: any[] = []
    detail.benchmarks.forEach((b: any) => {
      // add two rows per benchmark for demo
      rows.push({ benchmark_id: b.benchmark_id, modality: b.benchmark_id.includes('vqa') ? 'image' : 'text', input: 'Sample input 1', prediction: 'A', label: 'B', score: 0 })
      rows.push({ benchmark_id: b.benchmark_id, modality: b.benchmark_id.includes('vqa') ? 'image' : 'text', input: 'Sample input 2', prediction: 'C', label: 'C', score: 1 })
    })
    return rows
  }, [detail])

  const capabilityScores = React.useMemo(() => aggregateCapabilities(detail.benchmarks as any), [detail])
  const runCaps = React.useMemo(() => {
    const set = new Set<string>()
    detail.benchmarks.forEach((b: any) => mapBenchmarkToCapabilities(b.benchmark_id).forEach(c => set.add(c)))
    return Array.from(set)
  }, [detail])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{detail.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">Local</Badge>
            <Badge variant="outline" className="capitalize">{detail.modality}</Badge>
            <span className="text-sm text-muted-foreground">{new Date(detail.created_at).toLocaleString()}</span>
            <CapabilityBadge caps={runCaps} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            window.location.href = '/mock-results/responses'
          }}>View All Responses</Button>
          <Button size="sm" variant="outline" onClick={() => {
            const dataStr = JSON.stringify(detail, null, 2)
            const blob = new Blob([dataStr], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `mock-results-qwen2vl.json`
            a.click()
            URL.revokeObjectURL(url)
          }}>Download Raw JSON</Button>
        </div>
      </div>

      {detail.summary_metrics && Object.keys(detail.summary_metrics).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(detail.summary_metrics).map(([key, value]: any) => (
            <div key={key} className="bg-card border rounded-lg p-4 text-center hover:shadow-sm transition-shadow">
              <div className="text-2xl font-bold text-blue-600">
                {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : String(value)}
              </div>
              <div className="text-sm text-muted-foreground capitalize mt-1">{key.replace(/_/g,' ')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Benchmarks and Capabilities side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Benchmarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.benchmarks?.map((b: any) => (
              <details key={b.benchmark_id} className="border rounded-md">
                <summary className="cursor-pointer px-4 py-2 flex items-center justify-between">
                  <span className="font-medium">{b.benchmark_id}</span>
                  <span className="text-sm text-muted-foreground">{b.total_samples || b.samples_preview?.length || 0} samples</span>
                </summary>
                <div className="p-4 space-y-3">
                  {b.metrics && Object.keys(b.metrics).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(b.metrics).slice(0,8).map(([k,v]: any) => (
                        <div key={k} className="bg-muted/50 rounded px-3 py-2 text-sm">
                          <div className="text-muted-foreground capitalize">{k.replace(/_/g,' ')}</div>
                          <div className="font-semibold">{typeof v === 'number' ? (Number.isFinite(v) ? (v*100).toFixed(2)+'%' : String(v)) : String(v)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {b.raw_files?.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Files: {b.raw_files.map((f: any) => f.filename).join(', ')}</div>
                      <Button size="sm" variant="outline" onClick={() => {
                        const payload = { benchmark_id: b.benchmark_id, files: b.raw_files }
                        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${b.benchmark_id}-files.json`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}>Download Files</Button>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>

        <CapabilitiesRadar data={capabilityScores} />
      </div>

      {/* Error analysis and responses (tabbed) */}
      <Tabs defaultValue="errors">
        <TabsList>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="responses">Model Responses</TabsTrigger>
        </TabsList>
        <TabsContent value="errors">
          <ErrorAnalysis samples={responseRows} />
        </TabsContent>
        <TabsContent value="responses">
          <ResponsesTable rows={responseRows} />
        </TabsContent>
      </Tabs>

      <ModalityTabs detail={detail} />
    </div>
  )
}


