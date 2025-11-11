'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ResponseCard } from '@/components/external-results/ResponseCard'
import { apiClient } from '@/lib/api'
import Link from 'next/link'

type Props = {
	modelId: string
	benchmarkId: string
	globalSearch: string
}

export function BenchmarkSection({ modelId, benchmarkId, globalSearch }: Props) {
	const [items, setItems] = React.useState<any[]>([])
	const [offset, setOffset] = React.useState(0)
	const [limit] = React.useState(12)
	const [hasMore, setHasMore] = React.useState(true)
	const [loading, setLoading] = React.useState(false)
	const [modality, setModality] = React.useState<string>('all')
	const [correctness, setCorrectness] = React.useState<string>('all')
	const [localSearch, setLocalSearch] = React.useState<string>('')
	const [error, setError] = React.useState<string | null>(null)

	const effectiveSearch = localSearch || globalSearch

	const load = React.useCallback(async (reset: boolean) => {
		if (loading) return
		setLoading(true)
		setError(null)
		try {
			const opts: any = {}
			if (modality !== 'all') opts.modality = modality
			if (correctness !== 'all') opts.correctness = correctness
			if (effectiveSearch) opts.search = effectiveSearch
			const res = await apiClient.getExternalModelSamples(
				modelId,
				benchmarkId,
				limit,
				reset ? 0 : offset,
				opts
			)
			const newItems = res.samples || []
			setItems(prev => (reset ? newItems : prev.concat(newItems)))
			const newOffset = (reset ? 0 : offset) + (res.limit ?? limit)
			setOffset(newOffset)
			setHasMore(newOffset < (res.total ?? newItems.length))
		} catch (e: any) {
			setError(typeof e?.message === 'string' ? e.message : 'Failed to load samples')
		} finally {
			setLoading(false)
		}
	}, [modelId, benchmarkId, modality, correctness, effectiveSearch, offset, limit, loading])

	React.useEffect(() => {
		setItems([])
		setOffset(0)
		setHasMore(true)
		load(true)
	}, [modelId, benchmarkId, modality, correctness, effectiveSearch]) // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						{benchmarkId}
						{items.length > 0 && <Badge variant="secondary">{items.length}{hasMore ? '+' : ''}</Badge>}
					</CardTitle>
					<div className="flex items-center gap-2">
						<Input
							placeholder="Search within this task…"
							value={localSearch}
							onChange={(e) => { setLocalSearch(e.target.value); }}
							className="h-8 w-56"
						/>
						<Select value={modality} onValueChange={(v) => { setModality(v); }}>
							<SelectTrigger className="h-8 w-[130px]">
								<SelectValue placeholder="All Modalities" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Modalities</SelectItem>
								<SelectItem value="text">Text</SelectItem>
								<SelectItem value="image">Image</SelectItem>
								<SelectItem value="audio">Audio</SelectItem>
								<SelectItem value="video">Video</SelectItem>
							</SelectContent>
						</Select>
						<Select value={correctness} onValueChange={(v) => { setCorrectness(v); }}>
							<SelectTrigger className="h-8 w-[150px]">
								<SelectValue placeholder="All" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="correct">Correct</SelectItem>
								<SelectItem value="incorrect">Incorrect</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="mb-3 flex justify-end">
					<Link href={`/external-results/${encodeURIComponent(modelId)}/responses/bench/${encodeURIComponent(benchmarkId)}`}>
						<Button variant="link" size="sm" className="px-0">View more</Button>
					</Link>
				</div>
				{error && (
					<div className="mb-3 text-sm text-red-600 dark:text-red-400">
						{error}{' '}
						<Button variant="link" size="sm" className="px-1" onClick={() => load(true)}>Retry</Button>
					</div>
				)}
				{!loading && items.length === 0 && (
					<div className="py-8 text-sm text-muted-foreground">
						No samples for current filters. Try switching modality or clearing the search.
					</div>
				)}
				<div className="space-y-4">
					{items.map((s: any) => (
						<ResponseCard
							key={s.sample_key || `${benchmarkId}-${s.id}`}
							benchmark_id={benchmarkId}
							modality={s.modality || 'text'}
							input={s.input || s.question || s.prompt || ''}
							prediction={s.output || s.prediction || s.answer || s.response || ''}
							label={s.label || s.target || s.reference || s.ground_truth || ''}
							is_correct={typeof s.is_correct === 'boolean'
								? s.is_correct
								: (s.per_sample_metrics && typeof s.per_sample_metrics.correct === 'boolean' ? s.per_sample_metrics.correct : false)}
							score={typeof s.score === 'number' ? s.score : undefined}
							error_type={s.error_type || null}
							sample_key={s.sample_key}
							asset_refs={s.asset_refs}
							model_id_encoded={modelId}
						/>
					))}
					{hasMore && (
						<div className="flex justify-center">
							<Button variant="outline" size="sm" disabled={loading} onClick={() => load(false)}>
								{loading ? 'Loading…' : 'Load more'}
							</Button>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}


