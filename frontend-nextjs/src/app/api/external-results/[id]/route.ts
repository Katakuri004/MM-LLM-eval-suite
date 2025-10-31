import { NextResponse } from 'next/server'
import { ensureProcessedExternalModel } from '@/lib/results-parser'

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
    if (!detail) {
      return NextResponse.json(
        { error: 'External model not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(detail)
  } catch (error: any) {
    console.error('Error parsing external model:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to parse external model' },
      { status: 500 }
    )
  }
}

