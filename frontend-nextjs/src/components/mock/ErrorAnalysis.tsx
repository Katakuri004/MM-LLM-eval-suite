'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Sample = {
  benchmark_id: string
  input?: string
  prediction?: string
  label?: string
  score?: number
}

export function ErrorAnalysis({ samples, responsesLink }: { samples: Sample[]; responsesLink?: string }) {
  const rows = samples.map(s => ({
    ...s,
    correct: typeof s.score === 'number' ? s.score > 0 : (s.prediction ?? '').toString() === (s.label ?? '').toString()
  }))

  const total = rows.length
  const correct = rows.filter(r => r.correct).length
  const incorrect = total - correct

  // Simple buckets by benchmark
  const byBenchmark: Record<string, { correct: number; incorrect: number }> = {}
  for (const r of rows) {
    const b = r.benchmark_id
    if (!byBenchmark[b]) byBenchmark[b] = { correct: 0, incorrect: 0 }
    r.correct ? byBenchmark[b].correct++ : byBenchmark[b].incorrect++
  }

  const worst = Object.entries(byBenchmark)
    .map(([k, v]) => ({ benchmark: k, acc: totalFor(v) > 0 ? v.correct / totalFor(v) : 0, ...v }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded p-3">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-xl font-semibold">{total}</div>
          </div>
          <div className="bg-muted/50 rounded p-3">
            <div className="text-sm text-muted-foreground">Correct</div>
            <div className="text-xl font-semibold">{correct}</div>
          </div>
          <div className="bg-muted/50 rounded p-3">
            <div className="text-sm text-muted-foreground">Incorrect</div>
            <div className="text-xl font-semibold">{incorrect}</div>
          </div>
        </div>

        {worst.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Weakest Benchmarks</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {worst.map(w => (
                <div key={w.benchmark} className="border rounded p-3 text-sm">
                  <div className="font-medium">{w.benchmark}</div>
                  <div className="text-muted-foreground">Acc: {(w.acc * 100).toFixed(1)}% ({w.correct}/{totalFor(w)})</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Samples table preview */}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Benchmark</th>
                  <th className="py-2 pr-4">Input</th>
                  <th className="py-2 pr-4">Prediction</th>
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4">Correct</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2 pr-4">{r.benchmark_id}</td>
                    <td className="py-2 pr-4 max-w-[320px] truncate" title={String(r.input || '')}>{String(r.input || '')}</td>
                    <td className="py-2 pr-4 max-w-[320px] truncate" title={String(r.prediction || '')}>{String(r.prediction || '')}</td>
                    <td className="py-2 pr-4 max-w-[320px] truncate" title={String(r.label || '')}>{String(r.label || '')}</td>
                    <td className="py-2 pr-4">{r.correct ? '✔' : '✖'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {responsesLink && (
          <div className="flex items-center justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href={responsesLink}>View more</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function totalFor(v: { correct: number; incorrect: number }) {
  return v.correct + v.incorrect
}


