'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

interface Benchmark {
  benchmark_id: string
  total_samples?: number
}

interface SampleDistributionChartProps {
  benchmarks: Benchmark[]
  view?: 'pie' | 'bar'
  height?: number
}

export function SampleDistributionChart({
  benchmarks,
  view = 'pie',
  height = 384 // Default h-96 (384px)
}: SampleDistributionChartProps) {
  const chartData = useMemo(() => {
    return benchmarks
      .filter(b => (b.total_samples || 0) > 0)
      .map(b => ({
        name: b.benchmark_id.length > 25
          ? b.benchmark_id.substring(0, 25) + '...'
          : b.benchmark_id,
        fullName: b.benchmark_id,
        value: b.total_samples || 0
      }))
      .sort((a, b) => b.value - a.value)
  }, [benchmarks])

  const totalSamples = useMemo(() => {
    return benchmarks.reduce((sum, b) => sum + (b.total_samples || 0), 0)
  }, [benchmarks])

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#f97316',
    '#6366f1'
  ]

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            No sample data available for distribution
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>Sample Distribution</CardTitle>
        <div className="text-sm text-muted-foreground mt-1">
          {totalSamples.toLocaleString()} samples across {benchmarks.length} benchmarks
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4 flex-1">
        {view === 'pie' ? (
          <div className="flex flex-col" style={{ minHeight: `${height}px` }}>
            <div style={{ height: `${height - 80}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.slice(0, 10)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={height > 400 ? 160 : 120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.slice(0, 10).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, payload: any) => {
                      const data = payload?.payload
                      const fullName = data?.fullName || data?.name || ''
                      const percent = data ? ((data.value / totalSamples) * 100).toFixed(1) : '0'
                      return [`${value.toLocaleString()} samples (${percent}%)`, fullName]
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      padding: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 px-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                {chartData.slice(0, 10).map((entry, index) => {
                  const percent = ((entry.value / totalSamples) * 100).toFixed(1)
                  return (
                    <div key={index} className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate" title={entry.fullName}>
                        {entry.name} ({percent}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: `${height}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{
                    value: 'Number of Samples',
                    angle: -90,
                    position: 'insideLeft'
                  }}
                />
                <Tooltip
                  formatter={(value: number, payload: any) => [
                    `${value.toLocaleString()} samples`,
                    'Count'
                  ]}
                  labelFormatter={(label: string) => {
                    const fullData = chartData.find(d => d.name === label)
                    return fullData?.fullName || label
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

