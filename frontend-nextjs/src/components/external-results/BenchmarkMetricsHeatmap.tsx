'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { prepareHeatmapData } from '@/lib/chart-data-utils'

interface Benchmark {
  benchmark_id: string
  metrics: Record<string, any>
}

interface BenchmarkMetricsHeatmapProps {
  benchmarks: Benchmark[]
}

export function BenchmarkMetricsHeatmap({
  benchmarks
}: BenchmarkMetricsHeatmapProps) {
  const heatmapData = useMemo(() => {
    return prepareHeatmapData(benchmarks)
  }, [benchmarks])

  // Calculate statistics for color scaling
  const stats = useMemo(() => {
    const allValues: number[] = []
    
    Object.values(heatmapData.data).forEach(benchmarkData => {
      Object.values(benchmarkData).forEach(value => {
        if (value > 0) {
          allValues.push(value)
        }
      })
    })

    if (allValues.length === 0) {
      return { min: 0, max: 100, avg: 0 }
    }

    return {
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      avg: allValues.reduce((sum, val) => sum + val, 0) / allValues.length
    }
  }, [heatmapData])

  // Get color intensity based on value
  const getColorIntensity = (value: number) => {
    if (value === 0 || !value) return 'bg-gray-100'
    
    const normalized = (value - stats.min) / (stats.max - stats.min || 1)
    
    if (normalized < 0.2) return 'bg-red-100'
    if (normalized < 0.4) return 'bg-orange-100'
    if (normalized < 0.6) return 'bg-yellow-100'
    if (normalized < 0.8) return 'bg-green-100'
    return 'bg-green-200'
  }

  // Get text color based on background
  const getTextColor = (value: number) => {
    if (value === 0 || !value) return 'text-gray-400'
    return 'text-gray-900'
  }

  if (benchmarks.length === 0 || heatmapData.metrics.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            No data available for heatmap visualization
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benchmark Metrics Heatmap</CardTitle>
        <div className="text-sm text-muted-foreground">
          Performance scores across benchmarks and metrics
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-muted-foreground">Performance:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-100 border rounded"></div>
                <span>No data</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-100 border rounded"></div>
                <span>Low (0-20%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-100 border rounded"></div>
                <span>Medium (20-60%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-100 border rounded"></div>
                <span>High (60-100%)</span>
              </div>
            </div>

            {/* Heatmap Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground sticky left-0 bg-background z-10">
                      Benchmark
                    </th>
                    {heatmapData.metrics.map(metric => (
                      <th
                        key={metric}
                        className="text-center p-2 font-medium text-muted-foreground min-w-[100px]"
                      >
                        {metric}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.benchmarks.map(benchmarkId => {
                    const benchmark = benchmarks.find(b => b.benchmark_id === benchmarkId)
                    const shortName = benchmarkId.length > 30
                      ? benchmarkId.substring(0, 30) + '...'
                      : benchmarkId

                    return (
                      <tr key={benchmarkId} className="border-t">
                        <td className="p-2 font-medium sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="truncate max-w-[200px]" title={benchmarkId}>
                              {shortName}
                            </span>
                          </div>
                        </td>
                        {heatmapData.metrics.map(metric => {
                          const value = heatmapData.data[benchmarkId]?.[metric] || 0

                          return (
                            <td key={metric} className="p-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      'w-full h-12 rounded border flex items-center justify-center cursor-pointer transition-colors hover:opacity-80',
                                      getColorIntensity(value)
                                    )}
                                  >
                                    <span className={cn('text-sm font-mono', getTextColor(value))}>
                                      {value > 0 ? value.toFixed(1) + '%' : '—'}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-center">
                                    <div className="font-semibold">{benchmarkId}</div>
                                    <div className="text-sm text-muted-foreground">{metric}</div>
                                    <div className="text-sm">
                                      Score: {value > 0 ? value.toFixed(2) + '%' : 'No data'}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-muted-foreground">Min</div>
                <div className="font-mono">{stats.min.toFixed(2)}%</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-muted-foreground">Average</div>
                <div className="font-mono">{stats.avg.toFixed(2)}%</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-muted-foreground">Max</div>
                <div className="font-mono">{stats.max.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}

