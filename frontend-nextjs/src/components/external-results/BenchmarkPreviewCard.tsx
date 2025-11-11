'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { MediaPreview } from '@/components/media/MediaPreview'

type Props = {
	modelId: string
	benchmarkId: string
}

export function BenchmarkPreviewCard({ modelId, benchmarkId }: Props) {
	const { data: preview, isLoading } = useQuery({
		queryKey: ['benchmark-preview', modelId, benchmarkId],
		queryFn: () => apiClient.getBenchmarkPreview(modelId, benchmarkId, 2),
		staleTime: 60_000,
	})
	const { data: stats } = useQuery({
		queryKey: ['benchmark-stats', modelId, benchmarkId],
		queryFn: () => apiClient.getBenchmarkStats(modelId, benchmarkId),
		staleTime: 60_000,
	})

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="truncate">{ benchmarkId }</CardTitle>
					{typeof stats?.total_samples === 'number' && (
						<Badge variant="secondary">{stats.total_samples} samples</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-3">
					{(preview?.samples || []).map((s, i) => (
						<div key={s.sample_key || i} className="border rounded p-2">
							<MediaPreview modality={s.modality} asset_refs={s.asset_refs} />
							<div className="mt-2 text-xs text-muted-foreground line-clamp-3">
								{s.input || s.question || s.prompt || s.text || '…'}
							</div>
						</div>
					))}
					{isLoading && (
						<>
							<div className="h-20 bg-muted rounded animate-pulse" />
							<div className="h-20 bg-muted rounded animate-pulse" />
						</>
					)}
				</div>
				<div className="flex justify-end mt-3">
					<Link href={`/external-results/${encodeURIComponent(modelId)}/responses/bench/${encodeURIComponent(benchmarkId)}`}>
						<Button variant="outline" size="sm">View more</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}


