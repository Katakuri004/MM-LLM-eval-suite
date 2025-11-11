'use client'

import React from 'react'

type Props = {
	src: string
	alt?: string
	onClose: () => void
}

export function ImageLightbox({ src, alt, onClose }: Props) {
	React.useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [onClose])

	return (
		<div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={src} alt={alt || 'image'} className="max-w-[95vw] max-height-[95vh]" onClick={(e) => e.stopPropagation()} />
		</div>
	)
}


