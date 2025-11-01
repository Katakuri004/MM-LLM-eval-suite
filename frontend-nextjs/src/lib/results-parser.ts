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

export interface ExternalModelSummary {
  id: string // external:{folderName}
  name: string
  model_name: string
  folder_path: string
  created_at: string
  benchmark_count: number
  total_samples?: number
  summary_metrics: Record<string, number | string>
}

export interface ExternalModelDetail extends ExternalModelSummary {
  benchmarks: BenchmarkDetail[]
  // Optional index to responses artifacts (per-task files)
  responses_index?: Array<{ benchmark_id: string; file: string; absolute_path: string; total_samples: number }>
}

function getResultsRoot(): string {
  // API routes run from frontend-nextjs working directory
  // results is sibling to frontend-nextjs => ../results
  return path.resolve(process.cwd(), '..', 'results')
}

function getProcessedRoot(): string {
  return path.join(getResultsRoot(), 'processed-json')
}

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {}
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

// Scan for external model folders (e.g., Qwen__Qwen3-Omni-30B-A3B-Instruct, Qwewn_Qwen2VL)
// These are folders that don't match the standard pattern {model}_{modality}_{date}_{time}
export async function scanExternalModels(): Promise<ExternalModelSummary[]> {
  const root = getResultsRoot()
  const exists = await safeStat(root)
  if (!exists?.isDirectory()) return []

  const entries = await fs.readdir(root, { withFileTypes: true })
  const folders = entries.filter(e => e.isDirectory())

  const models: ExternalModelSummary[] = []

  for (const dirent of folders) {
    const folderName = dirent.name
    const folderPath = path.join(root, folderName)
    
    // Skip if it matches the standard pattern (handled by scanResults)
    const parts = folderName.split('_')
    if (parts.length >= 4) {
      // Check if last 3 parts look like date/time pattern (8 digits, 6+ digits)
      const maybeDate = parts[parts.length - 2]
      const maybeTime = parts[parts.length - 1]
      if (/^\d{8}$/.test(maybeDate) && /^\d{6,}$/.test(maybeTime)) {
        continue // Skip standard pattern folders
      }
    }

    // Try to find benchmark folders inside
    const subdirs = await fs.readdir(folderPath, { withFileTypes: true }).catch(() => [])
    const allBenchmarks: BenchmarkDetail[] = []
    let totalSamples = 0
    const aggregateMetrics: Record<string, number> = {}
    let metricCount = 0

    // Recursively search for benchmark folders
    for (const subdir of subdirs) {
      if (subdir.isDirectory()) {
        const subPath = path.join(folderPath, subdir.name)
        // Check if this directory contains benchmark results
        const nested = await fs.readdir(subPath, { withFileTypes: true }).catch(() => [])
        const benchmarkDirs = nested.filter(s => s.isDirectory() && s.name.endsWith('.jsonl'))
        
        if (benchmarkDirs.length > 0) {
          // This is a subfolder with benchmarks (e.g., qwen2vl_text_20251025_234011)
          for (const benchDir of benchmarkDirs) {
            const benchPath = path.join(subPath, benchDir.name)
            const benchId = benchDir.name.replace(/\.jsonl$/i, '')
            const detail = await parseBenchmark(benchPath, benchId)
            allBenchmarks.push(detail)
            totalSamples += detail.total_samples || 0
            Object.entries(detail.metrics || {}).forEach(([k, v]) => {
              if (typeof v === 'number' && Number.isFinite(v)) {
                aggregateMetrics[k] = (aggregateMetrics[k] || 0) + v
                metricCount += 1
              }
            })
          }
        } else {
          // Check if subdir itself contains .jsonl folders (e.g., Qwen__Qwen3-Omni-30B-A3B-Instruct/Qwen__Qwen3-Omni-30B-A3B-Instruct)
          const deeper = await fs.readdir(subPath, { withFileTypes: true }).catch(() => [])
          const deeperBenchmarks = deeper.filter(s => s.isDirectory() && s.name.endsWith('.jsonl'))
          
          if (deeperBenchmarks.length > 0) {
            for (const benchDir of deeperBenchmarks) {
              const benchPath = path.join(subPath, benchDir.name)
              const benchId = benchDir.name.replace(/\.jsonl$/i, '')
              const detail = await parseBenchmark(benchPath, benchId)
              allBenchmarks.push(detail)
              totalSamples += detail.total_samples || 0
              Object.entries(detail.metrics || {}).forEach(([k, v]) => {
                if (typeof v === 'number' && Number.isFinite(v)) {
                  aggregateMetrics[k] = (aggregateMetrics[k] || 0) + v
                  metricCount += 1
                }
              })
            }
          } else {
            // Handle case where files are directly in the nested folder (e.g., Qwen3-Omni structure)
            const files = deeper.filter(s => s.isFile())
            const resultFiles = files.filter(f => f.name.includes('_results.json'))
            const sampleFiles = files.filter(f => f.name.includes('_samples_') && f.name.endsWith('.jsonl'))
            
            // Group by timestamp prefix
            const groups: Record<string, { resultFile?: string; sampleFiles: Array<{ name: string; path: string }> }> = {}
            
            for (const rf of resultFiles) {
              const match = rf.name.match(/^(\d{8}_\d{6})_results\.json$/)
              if (match) {
                const prefix = match[1]
                if (!groups[prefix]) groups[prefix] = { sampleFiles: [] }
                groups[prefix].resultFile = path.join(subPath, rf.name)
              }
            }
            
            for (const sf of sampleFiles) {
              const match = sf.name.match(/^(\d{8}_\d{6})_samples_(.+)\.jsonl$/)
              if (match) {
                const prefix = match[1]
                const benchId = match[2]
                if (!groups[prefix]) groups[prefix] = { sampleFiles: [] }
                groups[prefix].sampleFiles.push({ name: benchId, path: path.join(subPath, sf.name) })
              }
            }
            
            // Process each group
            for (const [prefix, group] of Object.entries(groups)) {
              if (group.sampleFiles.length > 0) {
                for (const sample of group.sampleFiles) {
                  const resultPath = group.resultFile || null
                  const samplePath = sample.path
                  const benchId = sample.name
                  
                  const metrics = resultPath ? await readJson<Record<string, any>>(resultPath).catch(() => ({})) : {}
                  const { lines, total } = await readJSONL(samplePath, 100)
                  
                  allBenchmarks.push({
                    benchmark_id: benchId,
                    metrics: metrics || {},
                    samples_preview: lines,
                    total_samples: total,
                    raw_files: [
                      ...(resultPath ? [{ filename: path.basename(resultPath), absolute_path: resultPath }] : []),
                      { filename: path.basename(samplePath), absolute_path: samplePath }
                    ],
                  })
                  
                  totalSamples += total
                  Object.entries(metrics || {}).forEach(([k, v]) => {
                    if (typeof v === 'number' && Number.isFinite(v)) {
                      aggregateMetrics[k] = (aggregateMetrics[k] || 0) + v
                      metricCount += 1
                    }
                  })
                }
              } else if (group.resultFile) {
                const metrics = await readJson<Record<string, any>>(group.resultFile).catch(() => ({}))
                const benchId = prefix
                allBenchmarks.push({
                  benchmark_id: benchId,
                  metrics: metrics || {},
                  samples_preview: [],
                  total_samples: 0,
                  raw_files: [{ filename: path.basename(group.resultFile), absolute_path: group.resultFile }],
                })
                
                Object.entries(metrics || {}).forEach(([k, v]) => {
                  if (typeof v === 'number' && Number.isFinite(v)) {
                    aggregateMetrics[k] = (aggregateMetrics[k] || 0) + v
                    metricCount += 1
                  }
                })
              }
            }
          }
        }
      }
    }

    // Also check for .jsonl folders directly in the root
    const directBenchmarks = subdirs.filter(s => s.isDirectory() && s.name.endsWith('.jsonl'))
    for (const benchDir of directBenchmarks) {
      const benchPath = path.join(folderPath, benchDir.name)
      const benchId = benchDir.name.replace(/\.jsonl$/i, '')
      const detail = await parseBenchmark(benchPath, benchId)
      allBenchmarks.push(detail)
      totalSamples += detail.total_samples || 0
      Object.entries(detail.metrics || {}).forEach(([k, v]) => {
        if (typeof v === 'number' && Number.isFinite(v)) {
          aggregateMetrics[k] = (aggregateMetrics[k] || 0) + v
          metricCount += 1
        }
      })
    }

    if (allBenchmarks.length === 0) continue // Skip if no benchmarks found

    // Calculate summary metrics
    const summary_metrics: Record<string, number> = {}
    Object.entries(aggregateMetrics).forEach(([k, v]) => {
      summary_metrics[k] = metricCount > 0 ? v / metricCount : v
    })

    // Get folder mtime for created_at
    const stats = await safeStat(folderPath)
    const created_at = stats?.mtime ? stats.mtime.toISOString() : new Date().toISOString()

    // Extract model name from folder name
    const modelName = folderName.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()

    models.push({
      id: `external:${folderName}`,
      name: modelName,
      model_name: folderName,
      folder_path: folderPath,
      created_at,
      benchmark_count: allBenchmarks.length,
      total_samples: totalSamples,
      summary_metrics,
    })
  }

  // Sort by created_at (newest first)
  models.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return models
}

export async function parseExternalModelById(id: string): Promise<ExternalModelDetail | null> {
  if (!id.startsWith('external:')) return null
  const requestedFolderName = id.slice('external:'.length)
  const root = getResultsRoot()

  // Resolve folder with compatibility for single vs double underscores
  const candidateNames = Array.from(new Set([
    requestedFolderName,
    requestedFolderName.replace(/__+/g, '_'),
    requestedFolderName.replace(/_/g, '__'),
  ]))
  let folderName = requestedFolderName
  let folderPath = path.join(root, folderName)
  let exists = await safeStat(folderPath)
  if (!exists?.isDirectory()) {
    for (const candidate of candidateNames) {
      const p = path.join(root, candidate)
      const st = await safeStat(p)
      if (st?.isDirectory()) {
        folderName = candidate
        folderPath = p
        exists = st
        break
      }
    }
    if (!exists?.isDirectory()) return null
  }

  // Get summary
  const summaries = await scanExternalModels()
  let summary = summaries.find(s => s.id === `external:${folderName}`)
  if (!summary) {
    // Build a minimal synthetic summary when scanning did not return this folder (e.g., old id variant)
    const stats = await safeStat(folderPath)
    const created_at = stats?.mtime ? stats.mtime.toISOString() : new Date().toISOString()
    summary = {
      id: `external:${folderName}`,
      name: folderName.replace(/_/g, ' ').replace(/\s+/g, ' ').trim(),
      model_name: folderName,
      folder_path: folderPath,
      created_at,
      benchmark_count: 0,
      total_samples: 0,
      summary_metrics: {},
    }
  }

  // Parse all benchmarks recursively
  const allBenchmarks: BenchmarkDetail[] = []
  const subdirs = await fs.readdir(folderPath, { withFileTypes: true }).catch(() => [])

  // Recursively find all benchmark folders
  for (const subdir of subdirs) {
    if (subdir.isDirectory()) {
      const subPath = path.join(folderPath, subdir.name)
      const nested = await fs.readdir(subPath, { withFileTypes: true }).catch(() => [])
      const benchmarkDirs = nested.filter(s => s.isDirectory() && s.name.endsWith('.jsonl'))
      
      if (benchmarkDirs.length > 0) {
        // This is a subfolder with benchmarks
        for (const benchDir of benchmarkDirs) {
          const benchPath = path.join(subPath, benchDir.name)
          const benchId = benchDir.name.replace(/\.jsonl$/i, '')
          const detail = await parseBenchmark(benchPath, benchId)
          allBenchmarks.push(detail)
        }
      } else {
        // Check deeper (e.g., Qwen__Qwen3-Omni-30B-A3B-Instruct/Qwen__Qwen3-Omni-30B-A3B-Instruct)
        const deeper = await fs.readdir(subPath, { withFileTypes: true }).catch(() => [])
        const deeperBenchmarks = deeper.filter(s => s.isDirectory() && s.name.endsWith('.jsonl'))
        
        if (deeperBenchmarks.length > 0) {
          for (const benchDir of deeperBenchmarks) {
            const benchPath = path.join(subPath, benchDir.name)
            const benchId = benchDir.name.replace(/\.jsonl$/i, '')
            const detail = await parseBenchmark(benchPath, benchId)
            allBenchmarks.push(detail)
          }
        } else {
          // Handle case where files are directly in the nested folder (e.g., Qwen3-Omni structure)
          const files = deeper.filter(s => s.isFile())
          const resultFiles = files.filter(f => f.name.includes('_results.json'))
          const sampleFiles = files.filter(f => f.name.includes('_samples_') && f.name.endsWith('.jsonl'))
          
          // Group by timestamp prefix (e.g., 20251029_143156)
          const groups: Record<string, { resultFile?: string; sampleFiles: Array<{ name: string; path: string }> }> = {}
          
          for (const rf of resultFiles) {
            const match = rf.name.match(/^(\d{8}_\d{6})_results\.json$/)
            if (match) {
              const prefix = match[1]
              if (!groups[prefix]) groups[prefix] = { sampleFiles: [] }
              groups[prefix].resultFile = path.join(subPath, rf.name)
            }
          }
          
          for (const sf of sampleFiles) {
            const match = sf.name.match(/^(\d{8}_\d{6})_samples_(.+)\.jsonl$/)
            if (match) {
              const prefix = match[1]
              const benchId = match[2]
              if (!groups[prefix]) groups[prefix] = { sampleFiles: [] }
              groups[prefix].sampleFiles.push({ name: benchId, path: path.join(subPath, sf.name) })
            }
          }
          
          // Create benchmark details for each group
          for (const [prefix, group] of Object.entries(groups)) {
            // If multiple sample files, create one benchmark per sample file
            if (group.sampleFiles.length > 0) {
              for (const sample of group.sampleFiles) {
                const resultPath = group.resultFile || null
                const samplePath = sample.path
                const benchId = sample.name
                
                // Parse metrics from result file if available
                const metrics = resultPath ? await readJson<Record<string, any>>(resultPath).catch(() => ({})) : {}
                const { lines: samples, total } = await readJSONL(samplePath, 100)
                
                const raw_files: Array<{ filename: string; absolute_path: string }> = []
                if (resultPath) raw_files.push({ filename: path.basename(resultPath), absolute_path: resultPath })
                raw_files.push({ filename: path.basename(samplePath), absolute_path: samplePath })
                
                allBenchmarks.push({
                  benchmark_id: benchId,
                  metrics: metrics || {},
                  samples_preview: samples,
                  total_samples: total,
                  raw_files,
                })
              }
            } else if (group.resultFile) {
              // Only result file, no samples - create benchmark from result file name
              const metrics = await readJson<Record<string, any>>(group.resultFile).catch(() => ({}))
              const benchId = prefix // Use timestamp as benchmark ID
              allBenchmarks.push({
                benchmark_id: benchId,
                metrics: metrics || {},
                samples_preview: [],
                total_samples: 0,
                raw_files: [{ filename: path.basename(group.resultFile), absolute_path: group.resultFile }],
              })
            }
          }
        }
      }
    }
  }

  // Also check for direct .jsonl folders
  const directBenchmarks = subdirs.filter(s => s.isDirectory() && s.name.endsWith('.jsonl'))
  for (const benchDir of directBenchmarks) {
    const benchPath = path.join(folderPath, benchDir.name)
    const benchId = benchDir.name.replace(/\.jsonl$/i, '')
    const detail = await parseBenchmark(benchPath, benchId)
    allBenchmarks.push(detail)
  }

  return { ...summary, benchmarks: allBenchmarks }
}

function formatDateYYYYMMDD(d = new Date()): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

// Create processed-json artifacts for an external model and return detail built from them
export async function ensureProcessedExternalModel(id: string): Promise<ExternalModelDetail | null> {
  const detail = await parseExternalModelById(id)
  if (!detail) return null

  const processedRoot = getProcessedRoot()
  await ensureDir(processedRoot)

  // Create model directory under processed-json to avoid clutter
  const modelDirName = detail.model_name
  const modelDir = path.join(processedRoot, modelDirName)
  await ensureDir(modelDir)

  const today = formatDateYYYYMMDD()

  // 1) Consolidated metrics file for all benchmarks
  const metricsOut = path.join(modelDir, `metrics_${today}.json`)
  const metricsExists = await safeStat(metricsOut)
  
  if (!metricsExists) {
    // Only write if file doesn't exist
    const metricsSummary: Record<string, { total: number; count: number }> = {}
    const consolidated = (detail.benchmarks || []).map(b => {
      Object.entries(b.metrics || {}).forEach(([k, v]) => {
        if (typeof v === 'number' && Number.isFinite(v)) {
          if (!metricsSummary[k]) metricsSummary[k] = { total: 0, count: 0 }
          metricsSummary[k].total += v
          metricsSummary[k].count += 1
        }
      })
      return {
        benchmark_id: b.benchmark_id,
        metrics: b.metrics || {},
        total_samples: b.total_samples || 0,
        files: (b.raw_files || []).map(f => ({ filename: f.filename, absolute_path: f.absolute_path })),
        submissions: (b.raw_files || [])
          .map(f => f.filename)
          .filter(name => name && name.toString().includes('submissions/')),
      }
    })
    const summary: Record<string, number> = {}
    Object.entries(metricsSummary).forEach(([k, v]) => {
      if (v.count > 0) summary[k] = v.total / v.count
    })
    const metricsFilePayload = {
      model: detail.model_name,
      created_at: detail.created_at,
      benchmarks: consolidated,
      summary,
    }
    await fs.writeFile(metricsOut, JSON.stringify(metricsFilePayload, null, 2), 'utf8')
  }

  // 2) Full responses per task
  const responsesIndex: Array<{ benchmark_id: string; file: string; absolute_path: string; total_samples: number }> = []
  const processedBenchmarks: BenchmarkDetail[] = []
  for (const b of detail.benchmarks || []) {
    const safeId = b.benchmark_id.replace(/[^A-Za-z0-9_\-\.]/g, '_')
    const respOut = path.join(modelDir, `${safeId}_responses_${today}.json`)
    const responsesExists = await safeStat(respOut)
    
    if (!responsesExists) {
      // Only write if file doesn't exist
      const responsesPayload = {
        model: detail.model_name,
        created_at: detail.created_at,
        benchmark_id: b.benchmark_id,
        total_samples: b.total_samples || (b.samples_preview?.length || 0),
        samples: b.samples_preview || [],
      }
      await fs.writeFile(respOut, JSON.stringify(responsesPayload, null, 2), 'utf8')
    }
    
    // Build index entry (read total_samples from file if it exists, otherwise use from detail)
    let totalSamples = b.total_samples || (b.samples_preview?.length || 0)
    if (responsesExists) {
      try {
        const existingContent = await readJson<{ total_samples?: number }>(respOut)
        totalSamples = existingContent?.total_samples ?? totalSamples
      } catch {
        // If reading fails, use the value from detail
      }
    }
    
    responsesIndex.push({
      benchmark_id: b.benchmark_id,
      file: path.relative(getResultsRoot(), respOut),
      absolute_path: respOut,
      total_samples: totalSamples,
    })

    // Prepare UI-friendly benchmark list (no heavy samples)
    processedBenchmarks.push({
      benchmark_id: b.benchmark_id,
      metrics: b.metrics || {},
      samples_preview: [],
      total_samples: totalSamples,
      raw_files: [
        { filename: path.relative(getResultsRoot(), metricsOut), absolute_path: metricsOut },
        { filename: path.relative(getResultsRoot(), respOut), absolute_path: respOut },
      ],
    })
  }

  return {
    ...detail,
    benchmarks: processedBenchmarks,
    source_folder: modelDir,
    responses_index: responsesIndex,
  }
}


