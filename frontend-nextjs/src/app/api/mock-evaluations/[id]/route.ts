import { NextRequest, NextResponse } from 'next/server'
import { parseRunById } from '@/lib/results-parser'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id)
    const detail = await parseRunById(id)
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(detail)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to read evaluation' }, { status: 500 })
  }
}


