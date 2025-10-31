import { NextRequest, NextResponse } from 'next/server'
import { scanExternalModels, ensureProcessedExternalModel } from '@/lib/results-parser'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')

    const processed: Array<{ id: string; benchmarks: number }> = []

    if (idParam) {
      const detail = await ensureProcessedExternalModel(idParam)
      if (!detail) {
        return NextResponse.json({ error: 'Model not found or no benchmarks' }, { status: 404 })
      }
      processed.push({ id: idParam, benchmarks: detail.benchmarks?.length || 0 })
    } else {
      const models = await scanExternalModels()
      for (const m of models) {
        const detail = await ensureProcessedExternalModel(m.id)
        if (detail) processed.push({ id: m.id, benchmarks: detail.benchmarks?.length || 0 })
      }
    }

    return NextResponse.json({ ok: true, processed })
  } catch (error: any) {
    console.error('Error processing external results:', error)
    return NextResponse.json({ error: error?.message || 'Processing failed' }, { status: 500 })
  }
}


