'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ShimmerLoader } from '@/components/ui/shimmer-loader'
import { apiClient, encodeExternalModelIdSegment } from '@/lib/api'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { ResponseFilters } from '@/components/external-results/ResponseFilters'
import { BenchmarkPreviewCard } from '@/components/external-results/BenchmarkPreviewCard'

export default function ExternalModelResponsesPage() {
  const params = useParams()
  const modelId = (params?.modelId as string) || ''

  // Fetch model detail for metadata
  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['external-model', modelId],
    queryFn: () => apiClient.getExternalModel(modelId),
    enabled: !!modelId,
    refetchOnWindowFocus: false,
  })

  const [globalSearch, setGlobalSearch] = React.useState('')
  const [selectedBenchmarks, setSelectedBenchmarks] = React.useState<string[]>([])

  // Server pagination with filters + infinite scroll (load more button)
  // We no longer manage unified samples here; sections will fetch per benchmark
  const [loading, setLoading] = React.useState(false)
  const [summary, setSummary] = React.useState<{ benchmarks: string[]; modality_counts: Record<string, number> } | null>(null)

  // Fetch summary for filters
  React.useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const s = await apiClient.getExternalModelSamplesSummary(modelId)
        if (!cancelled) setSummary({ benchmarks: s.benchmarks || [], modality_counts: s.modality_counts || {} })
      } catch {}
    }
    if (modelId) run()
    return () => { cancelled = true }
  }, [modelId])

  // No unified loading here anymore

  const isLoading = isLoadingDetail

  // Unified list removed in sectioned layout

  const uniqueBenchmarks = React.useMemo(() => {
    return (summary?.benchmarks && summary.benchmarks.length > 0) ? summary.benchmarks : []
  }, [summary?.benchmarks])

  const uniqueModalities = React.useMemo(() => {
    const fromSummary = summary?.modality_counts ? Object.keys(summary.modality_counts) : []
    if (fromSummary.length > 0) return fromSummary.sort()
    return []
  }, [summary?.modality_counts])

  const sectionBenchmarks = React.useMemo(() => {
    // Use authoritative list from detail to ensure ALL tasks render
    const fromDetail = (detail?.benchmarks || []).map((b: any) => b?.benchmark_id).filter(Boolean)
    if (selectedBenchmarks.length > 0) return selectedBenchmarks
    if (fromDetail.length > 0) return fromDetail
    return summary?.benchmarks || []
  }, [selectedBenchmarks, detail?.benchmarks, summary?.benchmarks])

  // Filter + paginate (hooks at top level)
  const filteredBenchmarks = React.useMemo(
    () => sectionBenchmarks.filter((bid) => !globalSearch || bid.toLowerCase().includes(globalSearch.toLowerCase())),
    [sectionBenchmarks, globalSearch]
  )
  const {
    page: pageIdx,
    setPage: setPageIdx,
    totalPages,
    current: currentBenchmarks,
    total: totalCount,
  } = usePaginatedList(filteredBenchmarks, 10, [globalSearch, sectionBenchmarks.length])

  // Simple stats unavailable without unified dataset; hide cards

  // No unified list pagination/export; sections handle paging

  if (isLoading) {
    return <ShimmerLoader />
  }

  if (!detail && !isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Model Responses</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Model not found
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Model Responses</h1>
          <p className="text-muted-foreground">
            Detailed view of {detail?.name || detail?.model_name || 'Model'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/external-results/${encodeExternalModelIdSegment(modelId)}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Global search */}
      <div className="bg-card border rounded-lg p-4">
        <label className="text-sm font-medium">Global Search</label>
        <input
          className="mt-1 w-full border rounded h-9 px-3 bg-background"
          placeholder="Search across all tasks…"
          value={globalSearch}
          onChange={(e) => { setGlobalSearch(e.target.value) }}
        />
      </div>

  {/* Overview grid of task cards with pagination */}
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    {currentBenchmarks.map((bid) => (
      <BenchmarkPreviewCard key={bid} modelId={String(modelId)} benchmarkId={bid} />
    ))}
  </div>
  {totalPages > 1 && (
    <div className="flex items-center justify-between mt-6">
      <div className="text-sm text-muted-foreground">
        Page {pageIdx} of {totalPages} • {totalCount} tasks
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={pageIdx === 1} onClick={() => setPageIdx(1)}>First</Button>
        <Button variant="outline" size="sm" disabled={pageIdx === 1} onClick={() => setPageIdx((p: number) => Math.max(1, p - 1))}>Prev</Button>
        <Button variant="outline" size="sm" disabled={pageIdx === totalPages} onClick={() => setPageIdx((p: number) => Math.min(totalPages, p + 1))}>Next</Button>
        <Button variant="outline" size="sm" disabled={pageIdx === totalPages} onClick={() => setPageIdx(totalPages)}>Last</Button>
      </div>
    </div>
  )}
    </div>
  )
}

