'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AnalyticsPage() {
  const { data: modelsData } = useQuery({
    queryKey: ['models', { page: 0, pageSize: 200, q: '' }],
    queryFn: () => apiClient.getModels({ skip: 0, limit: 200, lean: true, sort: 'created_at:desc' }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const { data: benchesData } = useQuery({
    queryKey: ['benchmarks-all'],
    queryFn: () => apiClient.getBenchmarks(0, 200),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const models = modelsData?.models || []
  const benchmarks = benchesData?.benchmarks || []

  const [modelA, setModelA] = useState<string>('')
  const [modelB, setModelB] = useState<string>('')
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('')

  useEffect(() => {
    if (!modelA && models.length > 0) setModelA(models[0].id)
    if (!modelB && models.length > 1) setModelB(models[1].id)
    if (!selectedBenchmark && benchmarks.length > 0) setSelectedBenchmark(benchmarks[0].id)
  }, [models, benchmarks])

  const modelAObj = useMemo(() => models.find(m => m.id === modelA), [models, modelA])
  const modelBObj = useMemo(() => models.find(m => m.id === modelB), [models, modelB])
  const benchObj = useMemo(() => benchmarks.find(b => b.id === selectedBenchmark), [benchmarks, selectedBenchmark])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Insights across models, benchmarks, and evaluations</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1 v 1 Model Comparison</CardTitle>
          <CardDescription>Select two models and a benchmark to compare key attributes and results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm mb-1">Model A</div>
              <Select value={modelA} onValueChange={setModelA}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm mb-1">Model B</div>
              <Select value={modelB} onValueChange={setModelB}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm mb-1">Benchmark</div>
              <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {benchmarks.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{modelAObj?.name || '—'}</span>
                  {modelAObj && <Badge variant="outline">{modelAObj.family}</Badge>}
                </CardTitle>
                <CardDescription>{modelAObj?.source}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Parameters</span><span>{modelAObj?.num_parameters ?? '—'}</span></div>
                <div className="flex justify-between"><span>Dtype</span><span>{modelAObj?.dtype ?? '—'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{modelBObj?.name || '—'}</span>
                  {modelBObj && <Badge variant="outline">{modelBObj.family}</Badge>}
                </CardTitle>
                <CardDescription>{modelBObj?.source}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Parameters</span><span>{modelBObj?.num_parameters ?? '—'}</span></div>
                <div className="flex justify-between"><span>Dtype</span><span>{modelBObj?.dtype ?? '—'}</span></div>
              </CardContent>
            </Card>
          </div>

          <div className="text-sm text-muted-foreground">
            {benchObj ? (
              <span>Benchmark: {benchObj.name} • {benchObj.modality} • {benchObj.task_type}</span>
            ) : (
              <span>Select a benchmark to compare results</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future charts and aggregate analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Aggregate Insights</CardTitle>
          <CardDescription>Coming soon: trend lines, leaderboard deltas, and per-category breakdowns.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">This section will visualize evaluation results when available.</div>
        </CardContent>
      </Card>
    </div>
  )
}


