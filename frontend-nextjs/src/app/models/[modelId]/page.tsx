'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CapabilitiesRadar } from '@/components/mock/CapabilitiesRadar'
import { aggregateCapabilities, mapBenchmarkToCapabilities } from '@/lib/capability-mapping'

export default function ModelDetailsPage() {
  const params = useParams()
  const modelId = decodeURIComponent((params?.modelId as string) || '')

  // Mock model info and results; replace with real API lookups later
  const detail = React.useMemo(() => {
    const benchmarks = [
      { benchmark_id: 'arc_easy', metrics: { acc: 0.21 } },
      { benchmark_id: 'arc_challenge', metrics: { acc: 0.12 } },
      { benchmark_id: 'hellaswag', metrics: { acc: 0.33 } },
      { benchmark_id: 'ok_vqa_val2014', metrics: { exact_match: 0.49 } },
    ]
    return {
      id: modelId,
      name: modelId,
      family: 'MockFamily',
      modality: 'multi-modal',
      created_at: new Date().toISOString(),
      benchmarks,
    }
  }, [modelId])

  const capabilityScores = React.useMemo(() => aggregateCapabilities(detail.benchmarks as any), [detail])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{detail.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">Model</Badge>
            <Badge variant="outline" className="capitalize">{detail.modality}</Badge>
          </div>
        </div>
      </div>

      {/* Radar and summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CapabilitiesRadar data={capabilityScores} />
        <Card>
          <CardHeader>
            <CardTitle>Per-Benchmark Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4">Benchmark</th>
                    <th className="py-2 pr-4">Capability</th>
                    <th className="py-2 pr-4">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.benchmarks.map((b: any) => (
                    <tr key={b.benchmark_id} className="border-t">
                      <td className="py-2 pr-4">{b.benchmark_id}</td>
                      <td className="py-2 pr-4 capitalize">{mapBenchmarkToCapabilities(b.benchmark_id).join(', ') || '-'}</td>
                      <td className="py-2 pr-4">{(Object.values(b.metrics)[0] as number * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


