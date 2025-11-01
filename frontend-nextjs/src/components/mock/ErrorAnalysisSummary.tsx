'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

type Sample = {
  benchmark_id: string
  input?: string
  prediction?: string
  label?: string
  score?: number
}

interface ErrorAnalysisSummaryProps {
  samples: Sample[]
  responsesLink: string
}

export function ErrorAnalysisSummary({ samples, responsesLink }: ErrorAnalysisSummaryProps) {
  const rows = samples.map(s => ({
    ...s,
    correct: typeof s.score === 'number' ? s.score > 0 : (s.prediction ?? '').toString() === (s.label ?? '').toString()
  }))

  const total = rows.length
  const correct = rows.filter(r => r.correct).length
  const incorrect = total - correct
  const accuracy = total > 0 ? (correct / total) * 100 : 0

  // Simple buckets by benchmark to find weakest
  const byBenchmark: Record<string, { correct: number; incorrect: number }> = {}
  for (const r of rows) {
    const b = r.benchmark_id
    if (!byBenchmark[b]) byBenchmark[b] = { correct: 0, incorrect: 0 }
    r.correct ? byBenchmark[b].correct++ : byBenchmark[b].incorrect++
  }

  const totalFor = (v: { correct: number; incorrect: number }) => v.correct + v.incorrect

  const worst = Object.entries(byBenchmark)
    .map(([k, v]) => ({ 
      benchmark: k, 
      acc: totalFor(v) > 0 ? v.correct / totalFor(v) : 0, 
      correct: v.correct,
      total: totalFor(v)
    }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 3)

  return (
    <Link href={responsesLink}>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Analysis
            </CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Total</div>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 text-center border border-green-200 dark:border-green-900">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                <div className="text-xs text-muted-foreground">Correct</div>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{correct}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 text-center border border-red-200 dark:border-red-900">
              <div className="flex items-center justify-center gap-1 mb-1">
                <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                <div className="text-xs text-muted-foreground">Incorrect</div>
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrect}</div>
            </div>
          </div>

          {/* Accuracy Badge */}
          <div className="flex items-center justify-center">
            <div className="bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-semibold">
              Overall Accuracy: {accuracy.toFixed(1)}%
            </div>
          </div>

          {/* Weakest Benchmarks Preview */}
          {worst.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Weakest Benchmarks</div>
              <div className="space-y-2">
                {worst.slice(0, 3).map((w, idx) => (
                  <div key={w.benchmark} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2 text-sm">
                    <span className="font-medium truncate flex-1">{w.benchmark}</span>
                    <span className="text-muted-foreground ml-2">
                      {(w.acc * 100).toFixed(1)}% ({w.correct}/{w.total})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call to Action */}
          <div className="pt-2 border-t">
            <Button variant="outline" className="w-full" asChild>
              <span className="flex items-center justify-center gap-2">
                View Complete Model Responses
                <ArrowRight className="h-4 w-4" />
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

