export type LeaderboardItem = {
  model_id?: string
  model: string
  family?: string
  modality: 'text' | 'image' | 'audio' | 'video' | 'multi-modal'
  benchmarks: Array<{ id: string; metric: number }>
  updated_at?: string
}

export type LeaderboardFilters = {
  benchmark?: string | 'all'
  modality?: string | 'all'
  metric?: 'metric' | 'avg'
  search?: string
}

export function filterAndSort(
  items: LeaderboardItem[],
  filters: LeaderboardFilters,
  sortBy: 'metric' | 'model' | 'date',
  sortOrder: 'asc' | 'desc'
) {
  const f = filters || {}
  let rows = items
  if (f.benchmark && f.benchmark !== 'all') {
    rows = rows.filter(r => r.benchmarks.some(b => b.id === f.benchmark))
  }
  if (f.modality && f.modality !== 'all') {
    rows = rows.filter(r => r.modality === f.modality)
  }
  if (f.search) {
    const q = f.search.toLowerCase()
    rows = rows.filter(r => r.model.toLowerCase().includes(q) || (r.family || '').toLowerCase().includes(q))
  }

  const value = (r: LeaderboardItem) => {
    if (sortBy === 'model') return r.model
    if (sortBy === 'date') return r.updated_at || ''
    // metric sort: use selected benchmark if present; else average
    if (f.benchmark && f.benchmark !== 'all') {
      const b = r.benchmarks.find(b => b.id === f.benchmark)
      return b ? b.metric : 0
    }
    const avg = r.benchmarks.length
      ? r.benchmarks.reduce((s, b) => s + (b.metric || 0), 0) / r.benchmarks.length
      : 0
    return avg
  }

  rows.sort((a, b) => {
    const va: any = value(a)
    const vb: any = value(b)
    if (sortBy === 'model' || sortBy === 'date') {
      return sortOrder === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    }
    return sortOrder === 'asc' ? Number(va) - Number(vb) : Number(vb) - Number(va)
  })

  return rows
}


