'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export default function MockResponsesPage() {
  // Build mock rows (larger set) derived from same benchmarks as /mock-results
  const benchmarks = ['arc_easy','arc_challenge','hellaswag','ok_vqa_val2014']
  const rows = React.useMemo(() => {
    const out: any[] = []
    for (let i = 0; i < 200; i++) {
      const b = benchmarks[i % benchmarks.length]
      const modality = b.includes('vqa') ? 'image' : 'text'
      const correct = i % 3 !== 0
      out.push({
        benchmark_id: b,
        modality,
        input: `Sample question ${i + 1}`,
        prediction: correct ? 'C' : 'A',
        label: 'C',
        score: correct ? 1 : 0,
      })
    }
    return out
  }, [])

  const [q, setQ] = React.useState('')
  const [onlyIncorrect, setOnlyIncorrect] = React.useState(false)
  const [benchFilter, setBenchFilter] = React.useState<string>('all')
  const [modalFilter, setModalFilter] = React.useState<string>('all')
  const [page, setPage] = React.useState(1)
  const pageSize = 25

  const filtered = React.useMemo(() => {
    return rows.filter(r => {
      const text = [r.benchmark_id, r.modality, r.input, r.prediction, r.label].join(' ').toLowerCase()
      const ok = !q || text.includes(q.toLowerCase())
      const incorrect = typeof r.score === 'number' ? r.score <= 0 : (r.prediction ?? '') !== (r.label ?? '')
      const benchOk = benchFilter === 'all' || r.benchmark_id === benchFilter
      const modalOk = modalFilter === 'all' || r.modality === modalFilter
      return ok && (!onlyIncorrect || incorrect) && benchOk && modalOk
    })
  }, [rows, q, onlyIncorrect, benchFilter, modalFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const start = (page - 1) * pageSize
  const current = filtered.slice(start, start + pageSize)

  const downloadCSV = () => {
    const headers = ['benchmark_id','modality','input','prediction','label','score']
    const csv = [headers.join(',')].concat(filtered.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','))).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'responses_full.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Mock Responses</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => history.back()}>Back</Button>
          <Button variant="outline" size="sm" onClick={downloadCSV}>Export CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={onlyIncorrect} onChange={e => setOnlyIncorrect(e.target.checked)} />
            Only incorrect
          </label>
          <Select value={benchFilter} onValueChange={setBenchFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Benchmark" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Benchmarks</SelectItem>
              {benchmarks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={modalFilter} onValueChange={setModalFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Modality" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modalities</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="image">Image</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responses</CardTitle>
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
                {current.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 pr-4">{r.benchmark_id}</td>
                    <td className="py-2 pr-4 capitalize">{r.modality}</td>
                    <td className="py-2 pr-4 max-w-[380px] truncate" title={String(r.input || '')}>{String(r.input || '')}</td>
                    <td className="py-2 pr-4 max-w-[280px] truncate" title={String(r.prediction || '')}>{String(r.prediction || '')}</td>
                    <td className="py-2 pr-4 max-w-[200px] truncate" title={String(r.label || '')}>{String(r.label || '')}</td>
                    <td className="py-2 pr-4">{r.score ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages} • {filtered.length} rows</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>First</Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>Last</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


