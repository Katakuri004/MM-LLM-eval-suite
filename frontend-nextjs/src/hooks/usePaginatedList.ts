'use client'

import React from 'react'

export function usePaginatedList<T>(items: T[], pageSize: number, deps: React.DependencyList = []) {
	const [page, setPage] = React.useState(1)
	const totalPages = React.useMemo(() => Math.max(1, Math.ceil(items.length / pageSize)), [items.length, pageSize])
	const start = (page - 1) * pageSize
	const current = React.useMemo(() => items.slice(start, start + pageSize), [items, start, pageSize])
	React.useEffect(() => { setPage(1) }, deps) // reset page when filters change
	return { page, setPage, totalPages, current, total: items.length }
}


