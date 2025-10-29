'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { mapBenchmarkToCapabilities } from '@/lib/capability-mapping'

export function ImageResults({ detail }: { detail: any }) {
  // Show only image-capability benchmarks (VQA/OCR)
  const benchmarks = (detail?.benchmarks || []).filter((b: any) => {
    const caps = mapBenchmarkToCapabilities(String(b.benchmark_id))
    return caps.includes('vqa') || caps.includes('ocr')
  })

  return (
    <div className="space-y-6">
      {benchmarks.map((b: any) => {
        const metricEntries = Object.entries(b.metrics || {}).filter(([_, v]) => typeof v === 'number')
        const chartData = metricEntries.map(([k, v]) => ({ metric: k.replace(/_/g, ' '), value: v as number }))
        const samples = b.samples_preview || []
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
          a.download = `${b.benchmark_id}-chart.svg`
          a.click()
          URL.revokeObjectURL(url)
        }

        return (
          <Card key={b.benchmark_id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{b.benchmark_id}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{b.total_samples || samples.length} samples</span>
                  {chartData.length > 0 && (
                    <Button size="sm" variant="outline" onClick={onDownloadChart}>Download Chart</Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {chartData.length > 0 && (
                <div className="h-64" ref={chartRef}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                      <Tooltip formatter={(v: any) => `${(v * 100).toFixed(2)}%`} />
                      <Bar dataKey="value" fill="#10b981" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {b.raw_files?.length > 0 && (
                <div className="text-xs text-muted-foreground">Raw files: {b.raw_files.map((f: any) => f.filename).join(', ')}</div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}


