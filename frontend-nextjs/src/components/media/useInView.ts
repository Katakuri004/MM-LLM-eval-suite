'use client'

import { useEffect, useRef, useState } from 'react'

export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
	const ref = useRef<T | null>(null)
	const [inView, setInView] = useState(false)
	useEffect(() => {
		if (!ref.current) return
		const el = ref.current
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting) setInView(true)
				})
			},
			{ root: null, rootMargin: '200px', threshold: 0.01, ...options }
		)
		observer.observe(el)
		return () => observer.disconnect()
	}, [options])
	return { ref, inView }
}


