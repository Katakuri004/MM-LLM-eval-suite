'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  filterPerformanceMetrics,
  sortMetricsByPriority,
  formatMetricName,
  normalizeMetricValue
} from '@/lib/chart-data-utils'

interface BenchmarkDetailChartProps {
  benchmark_id: string
  metrics: Record<string, any>
  total_samples?: number
}

export function BenchmarkDetailChart({
  benchmark_id,
  metrics,
  total_samples
}: BenchmarkDetailChartProps) {
  const chartData = useMemo(() => {
    const filteredMetrics = filterPerformanceMetrics(metrics || {})
    const sortedMetrics = sortMetricsByPriority(filteredMetrics)
    
    return sortedMetrics.slice(0, 15).map(([key, value]) => {
      const normalized = normalizeMetricValue(key, value)
      return {
        name: formatMetricName(key),
        value: normalized.displayValue,
        rawValue: value,
        isPercentage: normalized.isPercentage
      }
    })
  }, [metrics])

  const chartRef = React.useRef<HTMLDivElement>(null)

  const onDownloadChart = () => {
    const container = chartRef.current
    if (!container) return
    const svg = container.querySelector('svg') as SVGSVGElement | null
    if (!svg) return
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${benchmark_id}-metrics-chart.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            No metrics available for this benchmark
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {benchmark_id}
            {total_samples !== undefined && (
              <span className="text-sm text-muted-foreground ml-2">
                ({total_samples} samples)
              </span>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onDownloadChart}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                label={{ value: 'Score', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                width={140}
              />
              <Tooltip
                formatter={(value: number, payload: any) => {
                  const isPercentage = payload?.[0]?.payload?.isPercentage ?? true
                  return [
                    isPercentage ? `${value.toFixed(2)}%` : value.toFixed(2),
                    'Score'
                  ]
                }}
                labelFormatter={(label: string) => `Metric: ${label}`}
              />
              <Bar
                dataKey="value"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

