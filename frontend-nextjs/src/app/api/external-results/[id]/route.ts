import { NextResponse } from 'next/server'
import { ensureProcessedExternalModel } from '@/lib/results-parser'
import fs from 'fs/promises'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Robustly normalize the id: decode up to 3 times until it stabilizes
    // Handles cases like: external%253A... -> external%3A... -> external:...
    let id = params.id
    for (let i = 0; i < 3; i++) {
      try {
        const decoded = decodeURIComponent(id)
        if (decoded === id) break
        id = decoded
      } catch {
        break
      }
    }
    const detail = await ensureProcessedExternalModel(id)
    if (detail) {
      return NextResponse.json(detail)
    }

    // Fallback: try to read latest processed-json artifacts directly
    const folderName = id.startsWith('external:') ? id.slice('external:'.length) : id
    const resultsRoot = path.resolve(process.cwd(), '..', 'results')
    const processedRoot = path.join(resultsRoot, 'processed-json', folderName)
    const exists = await fs.stat(processedRoot).catch(() => null)
    if (exists?.isDirectory()) {
      const files = await fs.readdir(processedRoot).catch(() => [])
      const metricsFiles = files.filter(f => /^metrics_\d{8}\.json$/.test(f)).sort().reverse()
      if (metricsFiles.length > 0) {
        const metricsPath = path.join(processedRoot, metricsFiles[0])
        const metrics = JSON.parse(await fs.readFile(metricsPath, 'utf8'))

        // Build responses index from per-task files
        const responsesIndex = await Promise.all(
          files
            .filter(f => /_responses_\d{8}\.json$/.test(f))
            .map(async (f) => {
              const absolute = path.join(processedRoot, f)
              let total = 0
              try {
                const obj = JSON.parse(await fs.readFile(absolute, 'utf8'))
                total = obj?.total_samples ?? 0
              } catch {}
              return {
                benchmark_id: f.replace(/_responses_\d{8}\.json$/, ''),
                file: path.relative(resultsRoot, absolute),
                absolute_path: absolute,
                total_samples: total,
              }
            })
        )

        const resp = {
          id,
          name: folderName.replace(/_/g, ' '),
          model_name: folderName,
          created_at: metrics?.created_at || new Date().toISOString(),
          status: 'completed',
          benchmark_count: metrics?.benchmarks?.length || 0,
          total_samples: (metrics?.benchmarks || []).reduce((s: number, b: any) => s + (b.total_samples || 0), 0),
          summary_metrics: metrics?.summary || {},
          benchmarks: (metrics?.benchmarks || []).map((b: any) => ({
            benchmark_id: b.benchmark_id,
            metrics: b.metrics || {},
            samples_preview: [],
            total_samples: b.total_samples || 0,
            raw_files: [
              { filename: path.relative(resultsRoot, metricsPath), absolute_path: metricsPath },
              ...responsesIndex
                .filter((r: any) => r.benchmark_id === b.benchmark_id)
                .map((r: any) => ({ filename: r.file, absolute_path: r.absolute_path })),
            ],
          })),
          responses_index: responsesIndex,
          source_folder: processedRoot,
        }
        return NextResponse.json(resp)
      }
    }

    return NextResponse.json(
      { error: 'External model not found' },
      { status: 404 }
    )
  } catch (error: any) {
    console.error('Error parsing external model:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to parse external model' },
      { status: 500 }
    )
  }
}

