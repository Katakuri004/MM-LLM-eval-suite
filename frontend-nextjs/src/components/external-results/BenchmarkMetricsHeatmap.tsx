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
import { prepareHeatmapData, formatMetricName, isErrorRateMetric } from '@/lib/chart-data-utils'

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
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Benchmark Metrics Heatmap</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="space-y-2">
            {/* Compact Legend */}
            <div className="flex items-center gap-3 text-xs flex-wrap pb-2">
              <span className="text-muted-foreground">Performance:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-100 border rounded"></div>
                <span>No data</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 border rounded"></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-100 border rounded"></div>
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 border rounded"></div>
                <span>High</span>
              </div>
            </div>

            {/* Compact Heatmap Table */}
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-1.5 py-1 text-xs font-medium text-muted-foreground sticky left-0 bg-background z-10 min-w-[120px]">
                      Benchmark
                    </th>
                    {heatmapData.metrics.map(metric => (
                      <th
                        key={metric}
                        className="text-center px-1 py-1 text-xs font-medium text-muted-foreground min-w-[60px]"
                        title={metric}
                      >
                        <div className="truncate max-w-[60px]" title={metric}>
                          {metric.length > 8 ? metric.substring(0, 8) + '...' : metric}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.benchmarks.map(benchmarkId => {
                    const benchmark = benchmarks.find(b => b.benchmark_id === benchmarkId)
                    const shortName = benchmarkId.length > 20
                      ? benchmarkId.substring(0, 20) + '...'
                      : benchmarkId

                    return (
                      <tr key={benchmarkId} className="border-t border-border/50">
                        <td className="px-1.5 py-1 text-xs font-medium sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                            <span className="truncate max-w-[120px]" title={benchmarkId}>
                              {shortName}
                            </span>
                          </div>
                        </td>
                        {heatmapData.metrics.map(metric => {
                          let value = heatmapData.data[benchmarkId]?.[metric] || 0
                          
                          // Cap percentage values at 100% for non-error-rate metrics
                          // Find the original metric key to check if it's an error rate
                          const benchmark = benchmarks.find(b => b.benchmark_id === benchmarkId)
                          if (benchmark) {
                            const originalKey = Object.keys(benchmark.metrics || {}).find(
                              k => formatMetricName(k) === metric
                            )
                            
                            // Only cap if it's not an error rate metric
                            if (originalKey && !isErrorRateMetric(originalKey) && value > 100) {
                              value = 100
                            }
                          } else if (value > 100) {
                            // Fallback: cap all values > 100 if we can't determine the metric type
                            value = 100
                          }

                          return (
                            <td key={metric} className="px-0.5 py-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      'w-full h-8 rounded-sm border border-border/30 flex items-center justify-center cursor-pointer transition-colors hover:opacity-80',
                                      getColorIntensity(value)
                                    )}
                                  >
                                    <span className={cn('text-xs font-mono', getTextColor(value))}>
                                      {value > 0 ? value.toFixed(0) + '%' : '—'}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-center">
                                    <div className="font-semibold text-xs">{benchmarkId}</div>
                                    <div className="text-xs text-muted-foreground">{metric}</div>
                                    <div className="text-xs">
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

            {/* Compact Statistics */}
            <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t">
              <div className="text-center">
                <div className="text-muted-foreground">Min</div>
                <div className="font-mono font-semibold">{stats.min.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Avg</div>
                <div className="font-mono font-semibold">{stats.avg.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Max</div>
                <div className="font-mono font-semibold">{stats.max.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}

