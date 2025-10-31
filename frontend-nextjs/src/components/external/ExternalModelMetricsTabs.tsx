"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { getBenchmarkModality, Modality } from '@/lib/benchmarks'

type Benchmark = {
  benchmark_id: string
  metrics?: Record<string, any>
  total_samples?: number
}

type Detail = {
  model_name: string
  summary_metrics?: Record<string, any>
  benchmarks?: Benchmark[]
}

function pickKeyMetrics(metrics: Record<string, any>): Array<[string, any]> {
  const entries = Object.entries(metrics || {})
  const numeric = entries.filter(([_, v]) => typeof v === 'number' && Number.isFinite(v))
  // Prefer common accuracy-like fields
  const preferredOrder = [
    'acc', 'accuracy', 'exact_match', 'f1', 'auc', 'bleu', 'wer', 'cer', 'rouge', 'score'
  ]
  const preferred = numeric
    .filter(([k]) => preferredOrder.includes(k))
    .sort((a, b) => preferredOrder.indexOf(a[0]) - preferredOrder.indexOf(b[0]))
  if (preferred.length > 0) return preferred.slice(0, 6)
  return numeric.slice(0, 6)
}

function formatMetricValue(v: any): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return String(v)
  // Heuristic: if in [0, 1.2], display as percent
  if (v >= 0 && v <= 1.2) return (v * 100).toFixed(2) + '%'
  return v.toFixed(2)
}

function groupByModality(benchmarks: Benchmark[]) {
  const map: Record<Modality, Benchmark[]> = { text: [], image: [], audio: [], video: [], unknown: [] }
  for (const b of benchmarks || []) {
    const m = getBenchmarkModality(b.benchmark_id)
    map[m].push(b)
  }
  return map
}

export function ExternalModelMetricsTabs({ detail }: { detail: Detail }) {
  const groups = React.useMemo(() => groupByModality(detail.benchmarks || []), [detail])
  const availableTabs = (['text', 'image', 'audio', 'video'] as Modality[]).filter(m => (groups[m] || []).length > 0)

  if (availableTabs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No benchmark metrics available.
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue={availableTabs[0]}>
      <TabsList>
        {availableTabs.includes('text') && <TabsTrigger value="text">Text</TabsTrigger>}
        {availableTabs.includes('image') && <TabsTrigger value="image">Image</TabsTrigger>}
        {availableTabs.includes('audio') && <TabsTrigger value="audio">Audio</TabsTrigger>}
        {availableTabs.includes('video') && <TabsTrigger value="video">Video</TabsTrigger>}
      </TabsList>

      {availableTabs.map((m) => (
        <TabsContent key={m} value={m} className="space-y-4">
          {(groups[m] || []).map((b) => (
            <Card key={b.benchmark_id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{b.benchmark_id}</div>
                  <div className="text-sm text-muted-foreground">{b.total_samples || 0} samples</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                  {pickKeyMetrics(b.metrics || {}).map(([k, v]) => (
                    <div key={k} className="bg-muted/50 rounded px-3 py-2 text-sm">
                      <div className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</div>
                      <div className="font-semibold">{formatMetricValue(v)}</div>
                    </div>
                  ))}
                  {pickKeyMetrics(b.metrics || {}).length === 0 && (
                    <div className="text-sm text-muted-foreground">No numeric metrics</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      ))}
    </Tabs>
  )
}


