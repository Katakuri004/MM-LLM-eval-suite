'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import {
  filterPerformanceMetrics,
  sortMetricsByPriority,
  formatMetricName,
  normalizeMetricValue
} from '@/lib/chart-data-utils'

interface BenchmarkCompactCardProps {
  benchmark_id: string
  metrics: Record<string, any>
  total_samples?: number
}

export function BenchmarkCompactCard({
  benchmark_id,
  metrics,
  total_samples
}: BenchmarkCompactCardProps) {
  const importantMetrics = useMemo(() => {
    const filteredMetrics = filterPerformanceMetrics(metrics || {})
    const sortedMetrics = sortMetricsByPriority(filteredMetrics)
    return sortedMetrics.slice(0, 6) // Show top 6 metrics
  }, [metrics])

  const downloadFiles = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering parent card click
    const payload = {
      benchmark_id,
      metrics,
      total_samples
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${benchmark_id}-data.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [benchmark_id, metrics, total_samples])

  return (
    <Card className="h-full flex flex-col transition-all duration-200 hover:shadow-lg hover:border-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight line-clamp-2" title={benchmark_id}>
            {benchmark_id.length > 40 ? benchmark_id.substring(0, 40) + '...' : benchmark_id}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={downloadFiles}
            title="Download benchmark data"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
        {total_samples !== undefined && (
          <div className="text-xs text-muted-foreground mt-1">
            {total_samples} samples
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col">
        {importantMetrics.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 flex-1">
            {importantMetrics.map(([k, v]: any) => {
              const displayName = formatMetricName(k)
              const normalized = normalizeMetricValue(k, v)
              
              return (
                <div
                  key={k}
                  className="bg-muted/50 rounded-md px-2.5 py-2 text-center"
                >
                  <div className="text-xs text-muted-foreground mb-1 truncate" title={displayName}>
                    {displayName}
                  </div>
                  <div className="text-base font-semibold text-blue-600">
                    {normalized.isPercentage 
                      ? `${normalized.displayValue.toFixed(1)}%`
                      : normalized.displayValue > 1000
                        ? `${(normalized.displayValue / 100).toFixed(1)}%`
                        : normalized.displayValue.toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xs text-muted-foreground text-center">
              No metrics available
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

