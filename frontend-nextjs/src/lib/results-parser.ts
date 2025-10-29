// Server-side utilities to scan and parse local evaluation results under ../results
import fs from 'fs/promises'
import path from 'path'

export interface MockEvaluationSummary {
  id: string // local:{folderName}
  name: string
  model_name: string
  modality: 'text' | 'image' | 'audio' | 'video' | string
  created_at: string
  status: 'completed'
  benchmark_ids: string[]
  summary_metrics: Record<string, number | string>
  source_folder: string
}

export interface BenchmarkDetail {
  benchmark_id: string
  metrics: Record<string, any>
  samples_preview: any[]
  total_samples?: number
  raw_files: Array<{ filename: string; absolute_path: string }>
}

export interface MockEvaluationDetail extends MockEvaluationSummary {
  benchmarks: BenchmarkDetail[]
}

function getResultsRoot(): string {
  // API routes run from frontend-nextjs working directory
  // results is sibling to frontend-nextjs => ../results
  return path.resolve(process.cwd(), '..', 'results')
}

async function safeStat(p: string) {
  try { return await fs.stat(p) } catch { return null }
}

export async function scanResults(): Promise<MockEvaluationSummary[]> {
  const root = getResultsRoot()
  const exists = await safeStat(root)
  if (!exists?.isDirectory()) return []

  const entries = await fs.readdir(root, { withFileTypes: true })
  const folders = entries.filter(e => e.isDirectory())

  const summaries: MockEvaluationSummary[] = []

  for (const dirent of folders) {
    const folderName = dirent.name
    // Expected pattern: {model}_{modality}_{date}_{time}
    const parts = folderName.split('_')
    if (parts.length < 4) continue
    const model_name = parts.slice(0, parts.length - 3).join('_')
    const modality = parts[parts.length - 3]
    const date = parts[parts.length - 2]
    const time = parts[parts.length - 1]
    const created_at = toIsoFromDateTime(date, time)

    const folderPath = path.join(root, folderName)
    const subdirs = await fs.readdir(folderPath, { withFileTypes: true })
    const benchmarkDirs = subdirs.filter(s => s.isDirectory() && s.name.endsWith('.jsonl'))

    const benchmark_ids: string[] = []
    const aggregateMetrics: Record<string, number> = {}
    let aggregateCount = 0

    for (const b of benchmarkDirs) {
      const benchId = b.name.replace(/\.jsonl$/i, '')
      benchmark_ids.push(benchId)
      const benchPath = path.join(folderPath, b.name)
      const resultJson = await findResultsJson(benchPath)
      if (resultJson) {
        const content = await readJson<any>(resultJson)
        // Pull numeric top-level keys as metrics
        Object.entries(content || {}).forEach(([k, v]) => {
          if (typeof v === 'number' && Number.isFinite(v)) {
            aggregateMetrics[k] = (aggregateMetrics[k] || 0) + v
          }
        })
        aggregateCount += 1
      }
    }

    const summary_metrics: Record<string, number> = {}
    Object.entries(aggregateMetrics).forEach(([k, v]) => {
      summary_metrics[k] = aggregateCount > 0 ? v / aggregateCount : v
    })

    const id = `local:${folderName}`
    const name = `${model_name} ${modality} ${date} ${time}`
    summaries.push({
      id,
      name,
      model_name,
      modality: modality as any,
      created_at,
      status: 'completed',
      benchmark_ids,
      summary_metrics,
      source_folder: folderPath,
    })
  }

  // Newest first by created_at
  summaries.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return summaries
}

export async function parseRunById(id: string): Promise<MockEvaluationDetail | null> {
  if (!id.startsWith('local:')) return null
  const folderName = id.slice('local:'.length)
  const root = getResultsRoot()
  const folderPath = path.join(root, folderName)
  const exists = await safeStat(folderPath)
  if (!exists?.isDirectory()) return null

  // Build summary first
  const summaries = await scanResults()
  const summary = summaries.find(s => s.id === id)
  if (!summary) return null

  // Parse benchmarks
  const subdirs = await fs.readdir(folderPath, { withFileTypes: true })
  const benchmarkDirs = subdirs.filter(s => s.isDirectory() && s.name.endsWith('.jsonl'))

  const benchmarks: BenchmarkDetail[] = []
  for (const b of benchmarkDirs) {
    const benchPath = path.join(folderPath, b.name)
    const benchId = b.name.replace(/\.jsonl$/i, '')
    const detail = await parseBenchmark(benchPath, benchId)
    benchmarks.push(detail)
  }

  return { ...summary, benchmarks }
}

async function parseBenchmark(benchPath: string, benchmarkId: string): Promise<BenchmarkDetail> {
  const entries = await fs.readdir(benchPath)
  const resultsPath = await findResultsJson(benchPath)
  const jsonlPath = await findSamplesJsonl(benchPath)

  const metrics = resultsPath ? await readJson<Record<string, any>>(resultsPath) : {}
  const { lines: samples, total } = jsonlPath ? await readJSONL(jsonlPath, 100) : { lines: [], total: 0 }

  const raw_files: Array<{ filename: string; absolute_path: string }> = []
  if (resultsPath) raw_files.push({ filename: path.basename(resultsPath), absolute_path: resultsPath })
  if (jsonlPath) raw_files.push({ filename: path.basename(jsonlPath), absolute_path: jsonlPath })

  // Include any submission files present
  if (entries.includes('submissions')) {
    const subDir = path.join(benchPath, 'submissions')
    const subFiles = await fs.readdir(subDir).catch(() => [])
    subFiles.forEach(f => raw_files.push({ filename: path.join('submissions', f), absolute_path: path.join(subDir, f) }))
  }

  return {
    benchmark_id: benchmarkId,
    metrics: metrics || {},
    samples_preview: samples,
    total_samples: total,
    raw_files,
  }
}

async function findResultsJson(dir: string): Promise<string | null> {
  const files = await fs.readdir(dir)
  const json = files.find(f => f.endsWith('_results.json'))
  return json ? path.join(dir, json) : null
}

async function findSamplesJsonl(dir: string): Promise<string | null> {
  const files = await fs.readdir(dir)
  const jsonl = files.find(f => f.includes('_samples_') && f.endsWith('.jsonl'))
  return jsonl ? path.join(dir, jsonl) : null
}

async function readJson<T>(p: string): Promise<T> {
  const data = await fs.readFile(p, 'utf8')
  return JSON.parse(data) as T
}

export async function readJSONL(p: string, previewLimit = 100): Promise<{ lines: any[]; total: number }> {
  const data = await fs.readFile(p, 'utf8')
  const rawLines = data.split(/\r?\n/).filter(l => l.trim().length > 0)
  const lines: any[] = []
  for (let i = 0; i < rawLines.length && i < previewLimit; i++) {
    try {
      lines.push(JSON.parse(rawLines[i]))
    } catch {
      // skip malformed line
    }
  }
  return { lines, total: rawLines.length }
}

function toIsoFromDateTime(date: string, time: string): string {
  // date: YYYYMMDD, time: HHMMSS or similar; fallback to folder mtime if parse fails
  try {
    const y = Number(date.slice(0, 4))
    const m = Number(date.slice(4, 6)) - 1
    const d = Number(date.slice(6, 8))
    const hh = Number(time.slice(0, 2))
    const mm = Number(time.slice(2, 4))
    const ss = Number(time.slice(4, 6))
    const dt = new Date(Date.UTC(y, m, d, hh, mm, ss))
    return dt.toISOString()
  } catch {
    return new Date().toISOString()
  }
}


