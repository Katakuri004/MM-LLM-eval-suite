'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function EvaluationsHistoryPage() {
  const { data: mock } = useQuery({
    queryKey: ['mock-evaluations'],
    queryFn: () => apiClient.getMockEvaluations(),
    refetchOnWindowFocus: false,
  })
  const { data: real } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => apiClient.getEvaluations(),
    refetchOnWindowFocus: false,
  })

  const rows = React.useMemo(() => {
    const mockRaw = mock?.evaluations || []
    const m = mockRaw.map((e: any) => ({
      id: e.id,
      name: e.name,
      model: e.model_name,
      modality: e.modality,
      created_at: e.created_at,
      status: e.status,
      is_local: true,
      benchmarks: e.benchmark_ids?.length || 0,
    }))
    // Add combined qwen2vl entry when both exist
    const hasText = mockRaw.some((e: any) => String(e.id).includes('qwen2vl_text'))
    const hasImage = mockRaw.some((e: any) => String(e.id).includes('qwen2vl_image'))
    if (hasText && hasImage) {
      m.unshift({
        id: 'local:qwen2vl_combined',
        name: 'qwen2vl multimodal combined',
        model: 'qwen2vl',
        modality: 'multi-modal',
        created_at: new Date().toISOString(),
        status: 'completed',
        is_local: true,
        benchmarks: 4,
      } as any)
    }
    const r = (real?.evaluations || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      model: e.model_id,
      modality: e.modality || '-',
      created_at: e.created_at,
      status: e.status,
      is_local: false,
      benchmarks: e.benchmark_ids?.length || 0,
    }))
    return [...m, ...r].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }, [mock?.evaluations, real?.evaluations])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluations History</h1>
          <p className="text-muted-foreground">Completed runs from local results and backend</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed Evaluations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Modality</TableHead>
                <TableHead>Benchmarks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/evaluations/${row.id}`} className="font-medium hover:underline" prefetch={false}>
                        {row.name}
                      </Link>
                      {row.is_local && <Badge variant="secondary">Local</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{row.model}</TableCell>
                  <TableCell className="capitalize">{row.modality}</TableCell>
                  <TableCell>{row.benchmarks}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600">{row.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/lib/api'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Activity,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

export default function EvaluationsHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<string>('desc')

  const { data: evaluationsData, isLoading, refetch } = useQuery({
    queryKey: ['evaluations-history', { statusFilter, searchTerm, sortBy, sortOrder }],
    queryFn: () => apiClient.getEvaluations(0, 100),
    staleTime: 30 * 1000,
  })

  const evaluations = evaluationsData?.evaluations || []

  // Filter evaluations based on status and search
  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesStatus = statusFilter === 'all' || evaluation.status === statusFilter
    const matchesSearch = searchTerm === '' || 
      evaluation.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.model_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Sort evaluations
  const sortedEvaluations = [...filteredEvaluations].sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a]
    const bValue = b[sortBy as keyof typeof b]
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const statusIcons = {
    completed: CheckCircle,
    running: Activity,
    failed: XCircle,
    pending: Clock,
    cancelled: AlertCircle,
  }

  const statusColors = {
    completed: 'text-green-600 bg-green-50 border-green-200',
    running: 'text-blue-600 bg-blue-50 border-blue-200',
    failed: 'text-red-600 bg-red-50 border-red-200',
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    cancelled: 'text-gray-600 bg-gray-50 border-gray-200',
  }

  const getStatusCounts = () => {
    const counts: Record<string, number> = { all: evaluations.length }
    evaluations.forEach(evaluation => {
      counts[evaluation.status] = (counts[evaluation.status] || 0) + 1
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluation History</h1>
          <p className="text-muted-foreground">
            View and filter all past evaluation runs
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => {
          const isActive = statusFilter === status
          const StatusIcon = statusIcons[status as keyof typeof statusIcons]
          const colorClass = statusColors[status as keyof typeof statusColors]
          
          return (
            <Card 
              key={status}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                isActive ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setStatusFilter(status)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">{status}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  {StatusIcon && (
                    <StatusIcon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search evaluations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="model_id">Model</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Order</label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Results</label>
              <div className="text-sm text-muted-foreground pt-2">
                {sortedEvaluations.length} of {evaluations.length} evaluations
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-6 bg-muted rounded w-1/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedEvaluations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No evaluations found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms.'
                  : 'Start your first evaluation to see results here.'
                }
              </p>
              <Button asChild>
                <Link href="/evaluations/new">
                  Start New Evaluation
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedEvaluations.map((evaluation) => {
              const StatusIcon = statusIcons[evaluation.status as keyof typeof statusIcons]
              const colorClass = statusColors[evaluation.status as keyof typeof statusColors]
              
              return (
                <Link key={evaluation.id} href={`/evaluations/${evaluation.id}`}>
                  <Card className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-primary/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg truncate">
                          {evaluation.name || `Evaluation ${evaluation.id.slice(0, 8)}`}
                        </CardTitle>
                        {StatusIcon && (
                          <StatusIcon className={`h-5 w-5 ${colorClass.split(' ')[0]}`} />
                        )}
                      </div>
                      <CardDescription className="truncate">
                        Model: {evaluation.model_id}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={colorClass}>
                            {evaluation.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {evaluation.created_at ? 
                              new Date(evaluation.created_at).toLocaleDateString() : 
                              'Unknown date'
                            }
                          </span>
                        </div>
                        
                        {evaluation.status === 'running' && evaluation.progress !== undefined && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{Math.round(evaluation.progress * 100)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${evaluation.progress * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {evaluation.completed_at && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Completed {new Date(evaluation.completed_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
