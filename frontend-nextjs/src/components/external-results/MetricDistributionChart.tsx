'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BoxPlot,
  ReferenceLine
} from 'recharts'
import {
  prepareMetricDistributionData,
  calculateStatistics,
  filterPerformanceMetrics
} from '@/lib/chart-data-utils'

interface Benchmark {
  benchmark_id: string
  metrics: Record<string, any>
}

interface MetricDistributionChartProps {
  benchmarks: Benchmark[]
  selectedMetric?: string
}

export function MetricDistributionChart({
  benchmarks,
  selectedMetric: propSelectedMetric
}: MetricDistributionChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('')

  // Get all available metrics
  const availableMetrics = useMemo(() => {
    const metricSet = new Set<string>()
    benchmarks.forEach(benchmark => {
      const filteredMetrics = filterPerformanceMetrics(benchmark.metrics || {})
      Object.keys(filteredMetrics).forEach(key => {
        metricSet.add(key)
      })
    })
    return Array.from(metricSet).slice(0, 20) // Limit to top 20
  }, [benchmarks])

  // Set default metric if available, prioritizing prop value
  React.useEffect(() => {
    if (propSelectedMetric && availableMetrics.includes(propSelectedMetric)) {
      // If prop is provided and exists in available metrics, use it
      setSelectedMetric(propSelectedMetric)
    } else if (!propSelectedMetric && !selectedMetric && availableMetrics.length > 0) {
      // Only auto-select if no prop is provided and no metric is currently selected
      const preferred = availableMetrics.find(
        m => m.toLowerCase().includes('acc') && !m.toLowerCase().includes('stderr')
      ) || availableMetrics[0]
      setSelectedMetric(preferred)
    }
  }, [availableMetrics, propSelectedMetric])

  const distributionData = useMemo(() => {
    if (!selectedMetric) return []
    return prepareMetricDistributionData(benchmarks, selectedMetric)
  }, [benchmarks, selectedMetric])

  const statistics = useMemo(() => {
    if (distributionData.length === 0) return null
    const values = distributionData.map(d => d.value)
    return calculateStatistics(values)
  }, [distributionData])

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
    a.download = `metric-distribution-${selectedMetric}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (availableMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            No metric data available for distribution analysis
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle>Metric Distribution</CardTitle>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {availableMetrics.map(metric => (
                  <SelectItem key={metric} value={metric}>
                    {metric}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" onClick={onDownloadChart}>
            <Download className="h-4 w-4 mr-2" />
            Download Chart
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {statistics && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Min</div>
              <div className="font-semibold">{statistics.min.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Average</div>
              <div className="font-semibold">{statistics.avg.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Median</div>
              <div className="font-semibold">{statistics.median.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Max</div>
              <div className="font-semibold">{statistics.max.toFixed(2)}%</div>
            </div>
          </div>
        )}
        <div className="h-96" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={distributionData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="benchmark"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 10 }}
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
              {statistics && (
                <ReferenceLine
                  y={statistics.avg}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{ value: 'Average', position: 'topRight' }}
                />
              )}
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

