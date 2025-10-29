'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { mapBenchmarkToCapabilities } from '@/lib/capability-mapping'

export function TextResults({ detail }: { detail: any }) {
  // Show only text-capability benchmarks (exclude VQA/OCR image tasks)
  const benchmarks = (detail?.benchmarks || []).filter((b: any) => {
    const caps = mapBenchmarkToCapabilities(String(b.benchmark_id))
    return !caps.includes('vqa') && !caps.includes('ocr')
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
                      <Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Samples preview table */}
              {samples.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-4">#</th>
                        <th className="py-2 pr-4">Input</th>
                        <th className="py-2 pr-4">Prediction</th>
                        <th className="py-2 pr-4">Label</th>
                        <th className="py-2 pr-4">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {samples.slice(0, 10).map((s: any, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2 pr-4 max-w-[320px] truncate" title={String(s.input || s.question || s.prompt || '')}>
                            {String(s.input || s.question || s.prompt || '')}
                          </td>
                          <td className="py-2 pr-4 max-w-[320px] truncate" title={String(s.prediction || s.pred || s.output || '')}>
                            {String(s.prediction || s.pred || s.output || '')}
                          </td>
                          <td className="py-2 pr-4">{String(s.label || s.answer || s.target || '')}</td>
                          <td className="py-2 pr-4">{s.score ?? s.acc ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Raw files */}
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


