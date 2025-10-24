'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Target, 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Minus
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ModelComparison } from '@/components/ModelComparison';
import { PerformanceHeatmap } from '@/components/visualizations/PerformanceHeatmap';
import { MetricCorrelation } from '@/components/visualizations/MetricCorrelation';
import { EvaluationTimeline } from '@/components/visualizations/EvaluationTimeline';

interface Model {
  id: string;
  name: string;
  family: string;
  modality: string;
  source: string;
}

interface Evaluation {
  id: string;
  name: string;
  model_id: string;
  model_name: string;
  status: string;
  created_at: string;
  completed_at?: string;
  total_samples: number;
  successful_samples: number;
  performance_score: number;
  metrics: Record<string, number>;
}

interface ComparisonData {
  models: Model[];
  evaluations: Evaluation[];
  metrics: string[];
  benchmarks: string[];
}

export default function ComparePage() {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('performance_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'charts' | 'heatmap'>('table');

  // Fetch comparison data
  const { data: comparisonData, isLoading, error, refetch } = useQuery({
    queryKey: ['comparison-data', selectedModels, selectedBenchmarks],
    queryFn: async () => {
      const [modelsResponse, evaluationsResponse] = await Promise.all([
        apiClient.getModels({ limit: 1000 }),
        apiClient.getEvaluations({ limit: 1000 })
      ]);

      const models = modelsResponse.items || [];
      const evaluations = evaluationsResponse.items || [];

      // Extract unique metrics and benchmarks
      const metrics = new Set<string>();
      const benchmarks = new Set<string>();

      evaluations.forEach(eval => {
        if (eval.metrics) {
          Object.keys(eval.metrics).forEach(metric => metrics.add(metric));
        }
        if (eval.benchmark_ids) {
          eval.benchmark_ids.forEach(bid => benchmarks.add(bid));
        }
      });

      return {
        models,
        evaluations,
        metrics: Array.from(metrics),
        benchmarks: Array.from(benchmarks)
      } as ComparisonData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter and sort evaluations
  const filteredEvaluations = React.useMemo(() => {
    if (!comparisonData) return [];

    let filtered = comparisonData.evaluations;

    // Filter by selected models
    if (selectedModels.length > 0) {
      filtered = filtered.filter(eval => selectedModels.includes(eval.model_id));
    }

    // Filter by selected benchmarks
    if (selectedBenchmarks.length > 0) {
      filtered = filtered.filter(eval => 
        eval.benchmark_ids?.some(bid => selectedBenchmarks.includes(bid))
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(eval => 
        eval.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eval.model_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof Evaluation] as number;
      const bValue = b[sortBy as keyof Evaluation] as number;
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered;
  }, [comparisonData, selectedModels, selectedBenchmarks, searchTerm, sortBy, sortOrder]);

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleBenchmarkToggle = (benchmarkId: string) => {
    setSelectedBenchmarks(prev => 
      prev.includes(benchmarkId) 
        ? prev.filter(id => id !== benchmarkId)
        : [...prev, benchmarkId]
    );
  };

  const handleMetricToggle = (metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const clearFilters = () => {
    setSelectedModels([]);
    setSelectedBenchmarks([]);
    setSelectedMetrics([]);
    setSearchTerm('');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Model Comparison</h1>
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>Failed to load comparison data</span>
            </div>
            <Button onClick={() => refetch()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Comparison</h1>
          <p className="text-muted-foreground mt-2">
            Compare model performance across benchmarks and metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={clearFilters} variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Evaluations</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by evaluation name or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Models ({selectedModels.length} selected)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
              {comparisonData?.models.map(model => (
                <div key={model.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`model-${model.id}`}
                    checked={selectedModels.includes(model.id)}
                    onCheckedChange={() => handleModelToggle(model.id)}
                  />
                  <Label htmlFor={`model-${model.id}`} className="text-sm">
                    {model.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Benchmark Selection */}
          <div className="space-y-2">
            <Label>Benchmarks ({selectedBenchmarks.length} selected)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
              {comparisonData?.benchmarks.map(benchmarkId => (
                <div key={benchmarkId} className="flex items-center space-x-2">
                  <Checkbox
                    id={`benchmark-${benchmarkId}`}
                    checked={selectedBenchmarks.includes(benchmarkId)}
                    onCheckedChange={() => handleBenchmarkToggle(benchmarkId)}
                  />
                  <Label htmlFor={`benchmark-${benchmarkId}`} className="text-sm">
                    {benchmarkId}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sort-by">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance_score">Performance Score</SelectItem>
                  <SelectItem value="total_samples">Total Samples</SelectItem>
                  <SelectItem value="successful_samples">Successful Samples</SelectItem>
                  <SelectItem value="created_at">Created Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort-order">Sort Order</Label>
              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Tabs value={viewMode} onValueChange={(value: 'table' | 'charts' | 'heatmap') => setViewMode(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <ModelComparison 
            evaluations={filteredEvaluations}
            metrics={selectedMetrics.length > 0 ? selectedMetrics : comparisonData?.metrics || []}
          />
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricCorrelation 
              evaluations={filteredEvaluations}
              metrics={selectedMetrics.length > 0 ? selectedMetrics : comparisonData?.metrics || []}
            />
            <EvaluationTimeline 
              evaluations={filteredEvaluations}
            />
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <PerformanceHeatmap 
            evaluations={filteredEvaluations}
            models={comparisonData?.models || []}
            benchmarks={selectedBenchmarks.length > 0 ? selectedBenchmarks : comparisonData?.benchmarks || []}
          />
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredEvaluations.length}
              </div>
              <div className="text-sm text-muted-foreground">Evaluations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredEvaluations.filter(e => e.status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredEvaluations.filter(e => e.status === 'running').length}
              </div>
              <div className="text-sm text-muted-foreground">Running</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredEvaluations.filter(e => e.status === 'failed').length}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
