'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Row = {
  benchmark_id: string
  modality: string
  input?: string
  prediction?: string
  label?: string
  score?: number
}

export function ResponsesTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = React.useState('')
  const [onlyIncorrect, setOnlyIncorrect] = React.useState(false)
  const filtered = React.useMemo(() => {
    return rows.filter(r => {
      const ok = !q || [r.benchmark_id, r.input, r.prediction, r.label].join(' ').toLowerCase().includes(q.toLowerCase())
      const incorrect = typeof r.score === 'number' ? r.score <= 0 : (r.prediction ?? '') !== (r.label ?? '')
      return ok && (!onlyIncorrect || incorrect)
    })
  }, [rows, q, onlyIncorrect])

  const downloadCSV = () => {
    const headers = ['benchmark_id','modality','input','prediction','label','score']
    const csv = [headers.join(',')].concat(filtered.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','))).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'responses.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Responses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={onlyIncorrect} onChange={e => setOnlyIncorrect(e.target.checked)} />
            Only incorrect
          </label>
          <Button variant="outline" size="sm" onClick={downloadCSV}>Export CSV</Button>
        </div>

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
              {filtered.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-4">{r.benchmark_id}</td>
                  <td className="py-2 pr-4 capitalize">{r.modality}</td>
                  <td className="py-2 pr-4 max-w-[280px] truncate" title={String(r.input || '')}>{String(r.input || '')}</td>
                  <td className="py-2 pr-4 max-w-[280px] truncate" title={String(r.prediction || '')}>{String(r.prediction || '')}</td>
                  <td className="py-2 pr-4 max-w-[200px] truncate" title={String(r.label || '')}>{String(r.label || '')}</td>
                  <td className="py-2 pr-4">{r.score ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}


