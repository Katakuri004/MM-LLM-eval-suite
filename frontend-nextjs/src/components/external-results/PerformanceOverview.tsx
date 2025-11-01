'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip as ShadcnTooltip,
  TooltipContent as ShadcnTooltipContent,
  TooltipProvider,
  TooltipTrigger as ShadcnTooltipTrigger
} from '@/components/ui/tooltip'
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
  onChartClick?: (chartType: 'summary' | 'samples' | 'top5', chartElement: React.ReactNode) => void
}

export function PerformanceOverview({
  benchmarks,
  summaryMetrics,
  onChartClick
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
  
  const totalSummaryValue = useMemo(() => {
    return summaryChartData.reduce((sum, entry) => sum + entry.value, 0)
  }, [summaryChartData])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Summary Metrics Pie Chart */}
      {summaryChartData.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (onChartClick) {
              const chartElement = (
                <Card>
                  <CardHeader>
                    <CardTitle>Summary Metrics Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 flex flex-col">
                      <ResponsiveContainer width="100%" height="calc(100% - 100px)">
                        <PieChart>
                          <Pie
                            data={summaryChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={false}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {summaryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number, payload: any) => {
                            const name = payload?.payload?.name || 'N/A'
                            const percent = totalSummaryValue > 0 ? ((value / totalSummaryValue) * 100).toFixed(1) : '0'
                            return [`${value.toFixed(2)}% (${percent}%)`, name]
                          }} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Custom Legend */}
                      <TooltipProvider>
                        <div className="mt-4 px-2">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                            {summaryChartData.map((entry, index) => {
                              const percent = totalSummaryValue > 0 ? ((entry.value / totalSummaryValue) * 100).toFixed(1) : '0'
                              return (
                                <div key={entry.name} className="flex items-center gap-1.5 min-w-0">
                                  <div
                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  <ShadcnTooltip>
                                    <ShadcnTooltipTrigger asChild>
                                      <span className="truncate cursor-help" title={entry.name}>
                                        {entry.name} ({percent}%)
                                      </span>
                                    </ShadcnTooltipTrigger>
                                    <ShadcnTooltipContent className="max-w-xs">
                                      <p className="text-xs leading-relaxed">{entry.name} ({percent}%)</p>
                                    </ShadcnTooltipContent>
                                  </ShadcnTooltip>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              )
              onChartClick('summary', chartElement)
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && onChartClick) {
              e.preventDefault()
              const chartElement = (
                <Card>
                  <CardHeader>
                    <CardTitle>Summary Metrics Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 flex flex-col">
                      <ResponsiveContainer width="100%" height="calc(100% - 100px)">
                        <PieChart>
                          <Pie
                            data={summaryChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={false}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {summaryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number, payload: any) => {
                            const name = payload?.payload?.name || 'N/A'
                            const percent = totalSummaryValue > 0 ? ((value / totalSummaryValue) * 100).toFixed(1) : '0'
                            return [`${value.toFixed(2)}% (${percent}%)`, name]
                          }} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Custom Legend */}
                      <TooltipProvider>
                        <div className="mt-4 px-2">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                            {summaryChartData.map((entry, index) => {
                              const percent = totalSummaryValue > 0 ? ((entry.value / totalSummaryValue) * 100).toFixed(1) : '0'
                              return (
                                <div key={entry.name} className="flex items-center gap-1.5 min-w-0">
                                  <div
                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  <ShadcnTooltip>
                                    <ShadcnTooltipTrigger asChild>
                                      <span className="truncate cursor-help" title={entry.name}>
                                        {entry.name} ({percent}%)
                                      </span>
                                    </ShadcnTooltipTrigger>
                                    <ShadcnTooltipContent className="max-w-xs">
                                      <p className="text-xs leading-relaxed">{entry.name} ({percent}%)</p>
                                    </ShadcnTooltipContent>
                                  </ShadcnTooltip>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              )
              onChartClick('summary', chartElement)
            }
          }}
          className={onChartClick ? "cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg h-full flex items-stretch" : "h-full flex items-stretch"}
        >
          <Card className="h-full flex flex-col w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Summary Metrics Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4 flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-0" style={{ minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summaryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={75}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {summaryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, payload: any) => {
                      const name = payload?.payload?.name || 'N/A'
                      const percent = totalSummaryValue > 0 ? ((value / totalSummaryValue) * 100).toFixed(1) : '0'
                      return [`${value.toFixed(2)}% (${percent}%)`, name]
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom Legend */}
              <TooltipProvider>
                <div className="mt-2 px-1">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs" style={{ maxHeight: '70px', overflowY: 'auto' }}>
                    {summaryChartData.map((entry, index) => {
                      const percent = totalSummaryValue > 0 ? ((entry.value / totalSummaryValue) * 100).toFixed(1) : '0'
                      return (
                        <div key={entry.name} className="flex items-center gap-1 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <ShadcnTooltip>
                            <ShadcnTooltipTrigger asChild>
                              <span className="truncate cursor-help text-[10px]" title={entry.name}>
                                {entry.name} ({percent}%)
                              </span>
                            </ShadcnTooltipTrigger>
                            <ShadcnTooltipContent className="max-w-xs">
                              <p className="text-xs leading-relaxed">{entry.name} ({percent}%)</p>
                            </ShadcnTooltipContent>
                          </ShadcnTooltip>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sample Distribution */}
      {sampleDistribution.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (onChartClick) {
              const chartElement = (
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sampleDistribution} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={150} />
                          <Tooltip formatter={(value: number) => `${value} samples`} />
                          <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )
              onChartClick('samples', chartElement)
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && onChartClick) {
              e.preventDefault()
              const chartElement = (
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sampleDistribution} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={150} />
                          <Tooltip formatter={(value: number) => `${value} samples`} />
                          <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )
              onChartClick('samples', chartElement)
            }
          }}
          className={onChartClick ? "cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg h-full flex items-stretch" : "h-full flex items-stretch"}
        >
          <Card className="h-full flex flex-col w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sample Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4 flex-1 min-h-0">
              <div className="h-full" style={{ minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sampleDistribution} layout="vertical" margin={{ top: 5, right: 10, left: 90, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={85} />
                    <Tooltip formatter={(value: number) => `${value} samples`} />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Benchmarks */}
      {topBenchmarks.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (onChartClick) {
              const chartElement = (
                <Card>
                  <CardHeader>
                    <CardTitle>Top 5 Benchmarks by Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topBenchmarks} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
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
                          <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Accuracy']} />
                          <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )
              onChartClick('top5', chartElement)
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && onChartClick) {
              e.preventDefault()
              const chartElement = (
                <Card>
                  <CardHeader>
                    <CardTitle>Top 5 Benchmarks by Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topBenchmarks} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
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
                          <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Accuracy']} />
                          <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )
              onChartClick('top5', chartElement)
            }
          }}
          className={onChartClick ? "cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg h-full flex items-stretch" : "h-full flex items-stretch"}
        >
          <Card className="h-full flex flex-col w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Top 5 Benchmarks by Accuracy</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4 flex-1 min-h-0">
              <div className="h-full" style={{ minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBenchmarks} margin={{ top: 5, right: 10, left: 20, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 9 }}
                      label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                    />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Accuracy']} />
                    <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

