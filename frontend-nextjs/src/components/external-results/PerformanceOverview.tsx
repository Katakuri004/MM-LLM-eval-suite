'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  prepareBenchmarkComparisonData,
  prepareMetricDistributionData,
  filterPerformanceMetrics,
  normalizeMetricValue
} from '@/lib/chart-data-utils'

interface Benchmark {
  benchmark_id: string
  metrics: Record<string, any>
  total_samples?: number
}

interface PerformanceOverviewProps {
  benchmarks: Benchmark[]
  summaryMetrics?: Record<string, number>
}

export function PerformanceOverview({
  benchmarks,
  summaryMetrics
}: PerformanceOverviewProps) {
  // Prepare summary metrics chart data
  const summaryChartData = useMemo(() => {
    if (!summaryMetrics) return []
    return Object.entries(summaryMetrics)
      .filter(([_, v]) => typeof v === 'number')
      .slice(0, 8)
      .map(([key, value]) => {
        const normalized = normalizeMetricValue(key, value as number)
        return {
          name: key.replace(/_/g, ' ').replace(/\bacc\b/gi, 'Acc').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1),
          value: normalized.displayValue
        }
      })
  }, [summaryMetrics])

  // Prepare sample distribution
  const sampleDistribution = useMemo(() => {
    return benchmarks.map(b => ({
      name: b.benchmark_id.length > 20 ? b.benchmark_id.substring(0, 20) + '...' : b.benchmark_id,
      value: b.total_samples || 0
    })).filter(d => d.value > 0)
  }, [benchmarks])

  // Get top 5 benchmarks by primary metric
  const topBenchmarks = useMemo(() => {
    const withScores = benchmarks.map(b => {
      const filteredMetrics = filterPerformanceMetrics(b.metrics || {})
      const accKey = Object.keys(filteredMetrics).find(k => 
        k.toLowerCase().includes('acc') && !k.toLowerCase().includes('stderr') && !k.toLowerCase().includes('norm')
      )
      let score = 0
      if (accKey) {
        const normalized = normalizeMetricValue(accKey, filteredMetrics[accKey])
        score = normalized.displayValue
      }
      return { ...b, score }
    })
    return withScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(b => ({
        name: b.benchmark_id.length > 25 ? b.benchmark_id.substring(0, 25) + '...' : b.benchmark_id,
        score: b.score
      }))
  }, [benchmarks])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Summary Metrics Pie Chart */}
      {summaryChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Summary Metrics Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summaryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {summaryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Distribution */}
      {sampleDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sample Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sampleDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => `${value} samples`} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Benchmarks */}
      {topBenchmarks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 5 Benchmarks by Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topBenchmarks}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Accuracy']} />
                  <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

