'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Download, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ShimmerLoader } from '@/components/ui/shimmer-loader'
import { apiClient } from '@/lib/api'

export default function ExternalModelResponsesPage() {
  const params = useParams()
  const modelId = (params?.modelId as string) || ''

  const { data: detail, isLoading } = useQuery({
    queryKey: ['external-model', modelId],
    queryFn: () => apiClient.getExternalModel(modelId),
    enabled: !!modelId,
    refetchOnWindowFocus: false,
  })

  const [q, setQ] = React.useState('')
  const [onlyIncorrect, setOnlyIncorrect] = React.useState(false)
  const [benchFilter, setBenchFilter] = React.useState<string>('all')
  const [modalFilter, setModalFilter] = React.useState<string>('all')
  const [page, setPage] = React.useState(1)
  const pageSize = 25

  // Generate response rows from benchmark samples
  const allRows = React.useMemo(() => {
    if (!detail?.benchmarks) return []
    const rows: any[] = []
    detail.benchmarks.forEach((b: any) => {
      if (b.samples_preview && b.samples_preview.length > 0) {
        b.samples_preview.forEach((sample: any, idx: number) => {
          const modality = b.benchmark_id.includes('vqa') || b.benchmark_id.includes('image') ? 'image' : 'text'
          rows.push({
            id: `s-${b.benchmark_id}-${idx}`,
            benchmark_id: b.benchmark_id,
            modality,
            input: sample.input || sample.question || sample.prompt || 'Sample input',
            prediction: sample.output || sample.prediction || sample.answer || '',
            label: sample.label || sample.target || '',
            is_correct: sample.is_correct !== undefined ? sample.is_correct : (sample.score > 0),
            error_type: sample.error_type || null,
            score: sample.score || (sample.is_correct ? 1 : 0),
          })
        })
      }
    })
    return rows
  }, [detail])

  const filtered = React.useMemo(() => {
    return allRows.filter((r) => {
      const text = [r.benchmark_id, r.modality, r.input, r.prediction, r.label].join(' ').toLowerCase()
      const ok = !q || text.includes(q.toLowerCase())
      const incorrect = !r.is_correct
      const benchOk = benchFilter === 'all' || r.benchmark_id === benchFilter
      const modalOk = modalFilter === 'all' || r.modality === modalFilter
      return ok && (!onlyIncorrect || incorrect) && benchOk && modalOk
    })
  }, [allRows, q, onlyIncorrect, benchFilter, modalFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const start = (page - 1) * pageSize
  const current = filtered.slice(start, start + pageSize)

  const uniqueBenchmarks = React.useMemo(() => {
    const benchmarks = new Set(allRows.map((r) => r.benchmark_id))
    return ['all', ...Array.from(benchmarks)]
  }, [allRows])

  const uniqueModalities = React.useMemo(() => {
    const modalities = new Set(allRows.map((r) => r.modality))
    return ['all', ...Array.from(modalities)]
  }, [allRows])

  const downloadCSV = () => {
    const headers = ['benchmark_id', 'modality', 'input', 'prediction', 'label', 'is_correct', 'score']
    const csv = [headers.join(',')]
      .concat(
        filtered.map((r) =>
          headers
            .map((h) => JSON.stringify((r as any)[h] ?? ''))
            .join(',')
        )
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'external_model_responses.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <ShimmerLoader />
  }

  if (!detail) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Model Responses</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Model not found
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Model Responses</h1>
          <p className="text-muted-foreground">Detailed view of {detail.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/external-results/${encodeURIComponent(modelId)}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex items-center space-x-2">
            <Checkbox
              id="only-incorrect"
              checked={onlyIncorrect}
              onCheckedChange={(checked) => setOnlyIncorrect(!!checked)}
            />
            <Label htmlFor="only-incorrect" className="text-sm">
              Only incorrect
            </Label>
          </div>
          <Select value={benchFilter} onValueChange={setBenchFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Benchmark" />
            </SelectTrigger>
            <SelectContent>
              {uniqueBenchmarks.map((b) => (
                <SelectItem key={b} value={b}>
                  {b === 'all' ? 'All Benchmarks' : b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={modalFilter} onValueChange={setModalFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Modality" />
            </SelectTrigger>
            <SelectContent>
              {uniqueModalities.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">
                  {m === 'all' ? 'All Modalities' : m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responses ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Benchmark</th>
                  <th className="py-2 pr-4">Modality</th>
                  <th className="py-2 pr-4">Input</th>
                  <th className="py-2 pr-4">Prediction</th>
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4">Score</th>
                </tr>
              </thead>
              <tbody>
                {current.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No responses found matching your filters.
                    </td>
                  </tr>
                ) : (
                  current.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4">{r.benchmark_id}</td>
                      <td className="py-2 pr-4 capitalize">{r.modality}</td>
                      <td className="py-2 pr-4 max-w-[380px] truncate" title={String(r.input || '')}>
                        {String(r.input || '')}
                      </td>
                      <td className="py-2 pr-4 max-w-[280px] truncate" title={String(r.prediction || '')}>
                        {String(r.prediction || '')}
                      </td>
                      <td className="py-2 pr-4 max-w-[200px] truncate" title={String(r.label || '')}>
                        {String(r.label || '')}
                      </td>
                      <td className="py-2 pr-4">{r.score ?? ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} • {filtered.length} rows
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

