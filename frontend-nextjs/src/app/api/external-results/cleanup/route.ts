import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

function getResultsRoot() {
  return path.resolve(process.cwd(), '..', 'results')
}

function getProcessedRoot() {
  return path.join(getResultsRoot(), 'processed-json')
}

export async function GET(req: NextRequest) {
  try {
    const processedRoot = getProcessedRoot()
    const stats = await fs.stat(processedRoot).catch(() => null)
    if (!stats?.isDirectory()) {
      return NextResponse.json({ ok: true, deleted: [], note: 'processed-json not found' })
    }

    const entries = await fs.readdir(processedRoot, { withFileTypes: true })
    const modelDirs = entries.filter(e => e.isDirectory()).map(e => path.join(processedRoot, e.name))

    const deleted: string[] = []

    for (const dir of modelDirs) {
      const modelName = path.basename(dir)
      const files = await fs.readdir(dir)
      for (const f of files) {
        const full = path.join(dir, f)
        // Legacy files to remove:
        //   <model>_<n>_<YYYYMMDD>.json      (old per-benchmark metrics)
        //   <model>_<n>_responses_<YYYYMMDD>.json (old per-benchmark responses)
        const legacyMetrics = new RegExp(`^${escapeRegExp(modelName)}_\\d+_\\d{8}\\.json$`)
        const legacyResponses = new RegExp(`^${escapeRegExp(modelName)}_\\d+_responses_\\d{8}\\.json$`)
        // Keep new files:
        //   metrics_YYYYMMDD.json
        //   <benchmark_id>_responses_YYYYMMDD.json

        if (legacyMetrics.test(f) || legacyResponses.test(f)) {
          await fs.unlink(full).catch(() => {})
          deleted.push(full)
        }
      }
    }

    return NextResponse.json({ ok: true, deleted })
  } catch (error: any) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: error?.message || 'Cleanup failed' }, { status: 500 })
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}


