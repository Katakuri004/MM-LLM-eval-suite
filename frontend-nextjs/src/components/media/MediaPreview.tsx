'use client'

import React from 'react'
import Image from 'next/image'
import { API_BASE_URL } from '@/lib/api'
import { useInView } from '@/components/media/useInView'
import { ImageLightbox } from '@/components/media/ImageLightbox'

type Props = {
	modality?: 'text' | 'image' | 'audio' | 'video' | 'multimodal'
	asset_refs?: {
		image_path?: string
		video_path?: string
		audio_path?: string
		text?: string
	}
	className?: string
}

export function MediaPreview({ modality, asset_refs, className }: Props) {
	if (!modality || !asset_refs) return null
	const cls = className || 'w-24 h-16 rounded border bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground'
	const { ref, inView } = useInView<HTMLDivElement>()
	const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null)

	const urlFor = (path: string) => `${API_BASE_URL}/external-results/media?p=${encodeURIComponent(path)}`

	if (modality === 'image' && asset_refs.image_path) {
		// Use next/image when possible; fall back to plain img for local static paths
		return (
			<div className={cls} ref={ref} onClick={() => setLightboxSrc(urlFor(asset_refs.image_path!))} title="Click to view">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				{inView ? <img src={urlFor(asset_refs.image_path)} alt="preview" className="object-cover w-full h-full cursor-zoom-in" /> : null}
				{lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
			</div>
		)
	}
	if (modality === 'audio' && asset_refs.audio_path) {
		return (
			<div className={cls} ref={ref}>
				{inView ? (
					<audio controls preload="none" className="w-full">
						<source src={urlFor(asset_refs.audio_path)} />
					</audio>
				) : (
					<div className="text-xs">Audio</div>
				)}
			</div>
		)
	}
	if (modality === 'video' && asset_refs.video_path) {
		return (
			<div className={cls} ref={ref}>
				{inView ? (
					<video controls preload="metadata" className="w-full h-full object-cover" poster={asset_refs.image_path ? urlFor(asset_refs.image_path) : undefined}>
						<source src={urlFor(asset_refs.video_path)} />
					</video>
				) : (
					<div className="text-xs">Video</div>
				)}
			</div>
		)
	}
	if (asset_refs.text) {
		const text = asset_refs.text.length > 60 ? asset_refs.text.slice(0, 57) + '...' : asset_refs.text
		return <div className={cls}>{text}</div>
	}
	return <div className={cls}>No preview</div>
}


