'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ShimmerLoader } from '@/components/ui/shimmer-loader'
import { apiClient } from '@/lib/api'
import { ResponseCard } from '@/components/external-results/ResponseCard'

export default function BenchmarkAllSamplesPage() {
	const params = useParams()
	const modelId = (params?.modelId as string) || ''
	const rawBenchmarkId = (params?.benchmarkId as string) || ''
	// Robustly normalize the benchmark id from the URL (strip accidental extra content)
	const benchmarkId = React.useMemo(() => {
		let s = rawBenchmarkId || ''
		for (let i = 0; i < 10; i++) {
			try {
				const d = decodeURIComponent(s)
				if (d === s) break
				s = d
			} catch {
				break
			}
		}
		// remove any accidental concatenation
		s = s.split('http')[0].split('?')[0].split('#')[0]
		return s
	}, [rawBenchmarkId])

	const [items, setItems] = React.useState<any[]>([])
	const [offset, setOffset] = React.useState(0)
	const [limit] = React.useState(20)
	const [loading, setLoading] = React.useState(false)
	const [hasMore, setHasMore] = React.useState(true)
	const [error, setError] = React.useState<string | null>(null)

	const load = React.useCallback(async () => {
		if (!modelId || !benchmarkId || loading || !hasMore) return
		setLoading(true)
		setError(null)
		try {
			const res = await apiClient.getExternalModelSamples(modelId, benchmarkId, limit, offset)
			const newItems = res.samples || []
			setItems(prev => prev.concat(newItems))
			const newOffset = offset + (res.limit ?? limit)
			setOffset(newOffset)
			setHasMore(newOffset < (res.total ?? newItems.length))
		} catch (e: any) {
			setError(typeof e?.message === 'string' ? e.message : 'Failed to load samples')
		} finally {
			setLoading(false)
		}
	}, [modelId, benchmarkId, limit, offset, hasMore, loading])

	React.useEffect(() => {
		setItems([]); setOffset(0); setHasMore(true); setError(null);
	}, [modelId, benchmarkId])
	React.useEffect(() => { if (!loading && items.length === 0) load() }, [items.length, load, loading])

	if (!modelId || !benchmarkId) return <ShimmerLoader />

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Samples for {benchmarkId}</h1>
					<p className="text-muted-foreground">Model: {decodeURIComponent(String(modelId))}</p>
				</div>
				<Link href={`/external-results/${encodeURIComponent(modelId)}/responses`}>
					<Button variant="outline" size="sm">Back</Button>
				</Link>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All Samples</CardTitle>
				</CardHeader>
				<CardContent>
					{error && (
						<div className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</div>
					)}
					<div className="space-y-4">
						{items.map((s, i) => (
							<ResponseCard
								key={s.sample_key || i}
								benchmark_id={benchmarkId}
								modality={s.modality || 'text'}
								input={s.input || s.question || s.prompt || ''}
								prediction={s.output || s.prediction || s.answer || s.response || ''}
								label={s.label || s.target || s.reference || s.ground_truth || ''}
								is_correct={typeof s.is_correct === 'boolean' ? s.is_correct : (s.per_sample_metrics?.correct ?? false)}
								score={typeof s.score === 'number' ? s.score : undefined}
								error_type={s.error_type || null}
								sample_key={s.sample_key}
								asset_refs={s.asset_refs}
								model_id_encoded={String(modelId)}
							/>
						))}
						{hasMore && (
							<div className="flex justify-center">
								<Button variant="outline" size="sm" disabled={loading} onClick={load}>
									{loading ? 'Loading…' : 'Load more'}
								</Button>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}


