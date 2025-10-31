import { NextResponse } from 'next/server'
import { scanExternalModels, ensureProcessedExternalModel } from '@/lib/results-parser'

export async function GET() {
  try {
    const discovered = await scanExternalModels()

    // Ensure processed artifacts exist and build summaries from them
    const models = [] as any[]
    for (const m of discovered) {
      const detail = await ensureProcessedExternalModel(m.id)
      if (!detail) continue

      const benchmark_count = detail.benchmarks?.length || 0
      const total_samples = (detail.benchmarks || []).reduce((sum: number, b: any) => sum + (b.total_samples || 0), 0)

      // Aggregate numeric metrics across benchmarks
      const sums: Record<string, { total: number; count: number }> = {}
      for (const b of detail.benchmarks || []) {
        Object.entries(b.metrics || {}).forEach(([k, v]) => {
          if (typeof v === 'number' && Number.isFinite(v)) {
            if (!sums[k]) sums[k] = { total: 0, count: 0 }
            sums[k].total += v
            sums[k].count += 1
          }
        })
      }
      const summary_metrics: Record<string, number> = {}
      Object.entries(sums).forEach(([k, { total, count }]) => {
        if (count > 0) summary_metrics[k] = total / count
      })

      models.push({
        id: m.id,
        name: m.name,
        model_name: m.model_name,
        created_at: detail.created_at,
        status: 'completed',
        modality: 'multi-modal',
        benchmark_ids: (detail.benchmarks || []).map((b: any) => b.benchmark_id),
        benchmark_count,
        total_samples,
        summary_metrics,
      })
    }

    return NextResponse.json({ models, total: models.length })
  } catch (error: any) {
    console.error('Error scanning external models:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to scan external models' },
      { status: 500 }
    )
  }
}

