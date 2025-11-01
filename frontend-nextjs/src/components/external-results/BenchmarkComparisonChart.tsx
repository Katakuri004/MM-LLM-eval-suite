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
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  prepareBenchmarkComparisonData,
  ChartDataPoint
} from '@/lib/chart-data-utils'

interface Benchmark {
  benchmark_id: string
  metrics: Record<string, any>
  total_samples?: number
}

interface BenchmarkComparisonChartProps {
  benchmarks: Benchmark[]
  selectedMetrics?: string[]
}

export function BenchmarkComparisonChart({
  benchmarks,
  selectedMetrics = []
}: BenchmarkComparisonChartProps) {
  const chartData = useMemo(() => {
    return prepareBenchmarkComparisonData(benchmarks, selectedMetrics)
  }, [benchmarks, selectedMetrics])

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
    a.download = 'benchmark-comparison-chart.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            No benchmark data available for comparison
          </div>
        </CardContent>
      </Card>
    )
  }

  // Extract metric names (excluding 'name')
  const metricNames = useMemo(() => {
    if (chartData.length === 0) return []
    const keys = Object.keys(chartData[0])
    return keys.filter(key => key !== 'name')
  }, [chartData])

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Benchmark Comparison</CardTitle>
          <Button size="sm" variant="outline" onClick={onDownloadChart}>
            <Download className="h-4 w-4 mr-2" />
            Download Chart
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Score']}
                labelFormatter={(label: string) => `Benchmark: ${label}`}
              />
              <Legend />
              {metricNames.map((metric, index) => (
                <Bar
                  key={metric}
                  dataKey={metric}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

