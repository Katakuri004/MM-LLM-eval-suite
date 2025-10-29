import { NextResponse } from 'next/server'
import { scanResults } from '@/lib/results-parser'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const summaries = await scanResults()
    return NextResponse.json({ evaluations: summaries, total: summaries.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to scan results' }, { status: 500 })
  }
}


