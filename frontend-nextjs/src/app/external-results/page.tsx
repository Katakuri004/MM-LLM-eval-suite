'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Database, Eye, Calendar, BarChart3 } from 'lucide-react'
import { ShimmerLoader } from '@/components/ui/shimmer-loader'
import { apiClient } from '@/lib/api'

export default function ExternalResultsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['external-models'],
    queryFn: () => apiClient.getExternalResults(),
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return <ShimmerLoader />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">External Results</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Error loading external models: {String(error)}
          </CardContent>
        </Card>
      </div>
    )
  }

  const models = data?.models || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">External Results</h1>
          <p className="text-muted-foreground mt-2">
            Explore benchmark results from externally added models
          </p>
        </div>
      </div>

      {models.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No External Models Found</h3>
            <p className="text-muted-foreground">
              Add model result folders to the /results directory to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model: any) => (
            <Card key={model.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{model.name}</span>
                  <Badge variant="secondary">External</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Database className="h-4 w-4" />
                    <span>{model.benchmark_count} benchmarks</span>
                  </div>
                  {model.total_samples && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                      <span>{model.total_samples.toLocaleString()} samples</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(model.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {Object.keys(model.summary_metrics || {}).length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-xs font-medium mb-2 text-muted-foreground">
                      Summary Metrics
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(model.summary_metrics)
                        .filter(([_, v]) => typeof v === 'number')
                        .slice(0, 4)
                        .map(([key, value]: any) => (
                          <div key={key} className="text-xs">
                            <div className="text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ').slice(0, 20)}
                            </div>
                            <div className="font-semibold">
                              {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : String(value)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <Link href={`/external-results/${encodeURIComponent(model.id)}`}>
                  <Button variant="outline" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

