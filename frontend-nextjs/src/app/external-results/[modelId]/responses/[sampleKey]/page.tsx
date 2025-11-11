'use client'

import React from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { ShimmerLoader } from '@/components/ui/shimmer-loader'
import { MediaPreview } from '@/components/media/MediaPreview'
import { GoldVsPrediction } from '@/components/media/GoldVsPrediction'

export default function SampleDetailPage() {
	const params = useParams()
	const router = useRouter()
	const search = useSearchParams()
	const modelId = (params?.modelId as string) || ''
	const sampleKey = (params?.sampleKey as string) || ''

	const { data, isLoading, error } = useQuery({
		queryKey: ['external-model-sample', modelId, sampleKey],
		queryFn: () => apiClient.getExternalModelSampleDetail(modelId, sampleKey),
		enabled: !!modelId && !!sampleKey,
		refetchOnWindowFocus: false,
	})

	if (isLoading) return <ShimmerLoader />
	if (error || !data?.sample) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold tracking-tight">Sample Detail</h1>
					<Link href={`/external-results/${encodeURIComponent(modelId)}/responses`}>
						<Button variant="outline" size="sm">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to responses
						</Button>
					</Link>
				</div>
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						Sample not found
					</CardContent>
				</Card>
			</div>
		)
	}

	const s = data.sample
	const correctness =
		typeof s?.per_sample_metrics?.correct === 'boolean'
			? s.per_sample_metrics.correct
			: (s as any).is_correct

	// Prev/Next navigation using localStorage order saved by responses page
	let prevKey: string | null = null
	let nextKey: string | null = null
	try {
		const raw = typeof window !== 'undefined' ? localStorage.getItem(`extResponses:${modelId}`) : null
		if (raw) {
			const arr: string[] = JSON.parse(raw)
			const idx = arr.indexOf(sampleKey)
			if (idx >= 0) {
				prevKey = idx > 0 ? arr[idx - 1] : null
				nextKey = idx < arr.length - 1 ? arr[idx + 1] : null
			}
		}
	} catch {}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Sample Detail</h1>
					<div className="flex items-center gap-2 mt-2">
						<Badge variant="secondary">{s.dataset_name || 'dataset'}</Badge>
						{s.subset_or_config && <Badge variant="outline">{s.subset_or_config}</Badge>}
						{s.split && <Badge variant="outline">{s.split}</Badge>}
						{s.benchmark_id && <Badge variant="outline">Bench: {s.benchmark_id.slice(0, 8)}</Badge>}
						{s.sample_key && <Badge variant="outline">Key: {s.sample_key}</Badge>}
						{s.modality && <Badge className="capitalize">{s.modality}</Badge>}
						{typeof correctness === 'boolean' && (
							<Badge variant={correctness ? 'default' : 'destructive'}>
								{correctness ? 'Correct' : 'Incorrect'}
							</Badge>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Link href={`/external-results/${encodeURIComponent(modelId)}/responses`}>
						<Button variant="outline" size="sm">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back
						</Button>
					</Link>
					<Button
						variant="outline"
						size="sm"
						disabled={!prevKey}
						onClick={() => {
							if (prevKey) router.push(`/external-results/${encodeURIComponent(modelId)}/responses/${encodeURIComponent(prevKey)}`)
						}}
					>
						<ChevronLeft className="h-4 w-4 mr-1" /> Prev
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={!nextKey}
						onClick={() => {
							if (nextKey) router.push(`/external-results/${encodeURIComponent(modelId)}/responses/${encodeURIComponent(nextKey)}`)
						}}
					>
						Next <ChevronRight className="h-4 w-4 ml-1" />
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="md:col-span-1">
					<CardHeader>
						<CardTitle>Media</CardTitle>
					</CardHeader>
					<CardContent>
						<MediaPreview modality={s.modality} asset_refs={s.asset_refs} className="w-full h-64" />
					</CardContent>
				</Card>
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>Gold vs Prediction</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<GoldVsPrediction gold={s.gold} prediction={s.prediction} normalized={s.normalized_prediction} />
						{s.per_sample_metrics && (
							<div>
								<div className="text-sm text-muted-foreground mb-1">Metrics</div>
								<pre className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap break-words">
									{JSON.stringify(s.per_sample_metrics, null, 2)}
								</pre>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>Prompt & Inputs</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{s.prompt_artifacts && (
							<div>
								<div className="text-sm text-muted-foreground mb-1">Prompt Artifacts</div>
								<pre className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap break-words">
									{JSON.stringify(s.prompt_artifacts, null, 2)}
								</pre>
							</div>
						)}
						{s.input_fields && (
							<div>
								<div className="text-sm text-muted-foreground mb-1">Input Fields</div>
								<pre className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap break-words">
									{JSON.stringify(s.input_fields, null, 2)}
								</pre>
							</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Config & Lineage</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{s.model && (
							<div>
								<div className="text-sm text-muted-foreground mb-1">Model</div>
								<pre className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap break-words">
									{JSON.stringify(s.model, null, 2)}
								</pre>
							</div>
						)}
						{s.decoding && (
							<div>
								<div className="text-sm text-muted-foreground mb-1">Decoding</div>
								<pre className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap break-words">
									{JSON.stringify(s.decoding, null, 2)}
								</pre>
							</div>
						)}
						<div>
							<div className="text-sm text-muted-foreground mb-1">Dataset</div>
							<pre className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap break-words">
								{JSON.stringify(
									{
										dataset_name: s.dataset_name,
										subset_or_config: s.subset_or_config,
										split: s.split,
										hf_repo: s.hf_repo,
										hf_revision: s.hf_revision,
										sample_uid: s.sample_uid,
										sample_idx: s.sample_idx,
									},
									null,
									2
								)}
							</pre>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}


