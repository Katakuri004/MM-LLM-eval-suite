export type Capability = 'reasoning' | 'commonsense' | 'vqa' | 'ocr'

export function mapBenchmarkToCapabilities(benchmarkId: string): Capability[] {
  const id = benchmarkId.toLowerCase()
  if (id.includes('arc_easy') || id.includes('arc_challenge')) return ['reasoning']
  if (id.includes('hellaswag')) return ['commonsense']
  if (id.includes('ok_vqa')) return ['vqa']
  if (id.includes('ocr')) return ['ocr']
  return []
}

export function aggregateCapabilities(benchmarks: Array<{ benchmark_id: string; metrics: Record<string, any> }>) {
  const sums: Record<Capability, { total: number; count: number }> = {
    reasoning: { total: 0, count: 0 },
    commonsense: { total: 0, count: 0 },
    vqa: { total: 0, count: 0 },
    ocr: { total: 0, count: 0 },
  }

  for (const b of benchmarks) {
    const caps = mapBenchmarkToCapabilities(b.benchmark_id)
    if (caps.length === 0) continue
    // choose primary metric heuristic
    const m = pickPrimaryMetric(b.metrics)
    if (typeof m !== 'number' || !Number.isFinite(m)) continue
    for (const c of caps) {
      sums[c].total += m
      sums[c].count += 1
    }
  }

  const result: Record<Capability, number> = {
    reasoning: 0,
    commonsense: 0,
    vqa: 0,
    ocr: 0,
  }
  const keys = Object.keys(sums) as Array<keyof typeof sums>
  for (const k of keys) {
    const cap = k as Capability
    const bucket = sums[cap]
    result[cap] = bucket.count > 0 ? bucket.total / bucket.count : 0
  }
  return result
}

function pickPrimaryMetric(metrics: Record<string, any>): number | null {
  // prefer exact_match, acc, acc_norm (as percent-like numbers 0..1)
  if (typeof metrics.exact_match === 'number') return metrics.exact_match
  if (typeof metrics.acc === 'number') return metrics.acc
  if (typeof metrics.acc_norm === 'number') return metrics.acc_norm
  return null
}


