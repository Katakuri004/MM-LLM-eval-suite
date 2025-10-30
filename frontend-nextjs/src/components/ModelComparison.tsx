'use client'

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  Download,
  Eye,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ModelComparisonProps {
  evaluations: Evaluation[];
  metrics: string[];
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({ 
  evaluations, 
  metrics 
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>('performance_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Group evaluations by model
  const modelGroups = useMemo(() => {
    const groups: Record<string, Evaluation[]> = {};
    
    evaluations.forEach((evaluation) => {
      if (!groups[evaluation.model_id]) {
        groups[evaluation.model_id] = [];
      }
      groups[evaluation.model_id].push(evaluation);
    });

    // Sort evaluations within each group
    Object.keys(groups).forEach(modelId => {
      groups[modelId].sort((a, b) => {
        const aValue = a[sortColumn as keyof Evaluation] as number;
        const bValue = b[sortColumn as keyof Evaluation] as number;
        
        if (sortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    });

    return groups;
  }, [evaluations, sortColumn, sortDirection]);

  // Calculate model statistics
  const modelStats = useMemo(() => {
    const stats: Record<string, {
      avgPerformance: number;
      totalEvaluations: number;
      completedEvaluations: number;
      avgSamples: number;
      bestMetric: { name: string; value: number };
    }> = {};

    Object.keys(modelGroups).forEach(modelId => {
      const modelEvals = modelGroups[modelId];
      const completedEvals = modelEvals.filter(e => e.status === 'completed');
      
      const avgPerformance = completedEvals.length > 0 
        ? completedEvals.reduce((sum, e) => sum + e.performance_score, 0) / completedEvals.length
        : 0;

      const avgSamples = completedEvals.length > 0
        ? completedEvals.reduce((sum, e) => sum + e.total_samples, 0) / completedEvals.length
        : 0;

      // Find best metric across all evaluations
      let bestMetric = { name: 'performance_score', value: avgPerformance };
      if (completedEvals.length > 0) {
        const allMetrics = completedEvals.flatMap(e => Object.entries(e.metrics || {}));
        if (allMetrics.length > 0) {
          const metricAverages = allMetrics.reduce((acc, [name, value]) => {
            if (!acc[name]) acc[name] = { sum: 0, count: 0 };
            acc[name].sum += value;
            acc[name].count += 1;
            return acc;
          }, {} as Record<string, { sum: number; count: number }>);

          const avgMetrics = Object.entries(metricAverages).map(([name, data]) => ({
            name,
            value: data.sum / data.count
          }));

          if (avgMetrics.length > 0) {
            bestMetric = avgMetrics.reduce((best, current) => 
              current.value > best.value ? current : best
            );
          }
        }
      }

      stats[modelId] = {
        avgPerformance,
        totalEvaluations: modelEvals.length,
        completedEvaluations: completedEvals.length,
        avgSamples,
        bestMetric
      };
    });

    return stats;
  }, [modelGroups]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const toggleRowExpansion = (modelId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(modelId)) {
      newExpanded.delete(modelId);
    } else {
      newExpanded.add(modelId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      running: 'secondary',
      failed: 'destructive',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getTrendIcon = (value: number, baseline: number) => {
    if (value > baseline) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < baseline) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const exportData = () => {
    const csvData = evaluations.map((evaluation) => ({
      'Model': evaluation.model_name,
      'Evaluation': evaluation.name,
      'Status': evaluation.status,
      'Performance Score': evaluation.performance_score,
      'Total Samples': evaluation.total_samples,
      'Successful Samples': evaluation.successful_samples,
      'Created': evaluation.created_at,
      'Completed': evaluation.completed_at || '',
      ...evaluation.metrics
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (evaluations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Evaluations Found</h3>
          <p className="text-muted-foreground">
            No evaluations match your current filters. Try adjusting your search criteria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Model Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Model Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('avgPerformance')}
                >
                  Avg Performance
                  {sortColumn === 'avgPerformance' && (
                    sortDirection === 'desc' ? ' ↓' : ' ↑'
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('completedEvaluations')}
                >
                  Completed
                  {sortColumn === 'completedEvaluations' && (
                    sortDirection === 'desc' ? ' ↓' : ' ↑'
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('avgSamples')}
                >
                  Avg Samples
                  {sortColumn === 'avgSamples' && (
                    sortDirection === 'desc' ? ' ↓' : ' ↑'
                  )}
                </TableHead>
                <TableHead>Best Metric</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(modelStats).map(([modelId, stats]) => {
                const modelEvals = modelGroups[modelId];
                const firstEval = modelEvals[0];
                const isExpanded = expandedRows.has(modelId);

                return (
                  <React.Fragment key={modelId}>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(modelId)}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          {firstEval.model_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {stats.avgPerformance.toFixed(3)}
                          </span>
                          {getTrendIcon(stats.avgPerformance, 0.5)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{stats.completedEvaluations}</span>
                          <span className="text-muted-foreground">
                            / {stats.totalEvaluations}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {Math.round(stats.avgSamples).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {stats.bestMetric.name}
                          </span>
                          <Badge variant="outline">
                            {stats.bestMetric.value.toFixed(3)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(modelId)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {isExpanded ? 'Hide' : 'Show'} Details
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <div className="border-t bg-muted/20">
                            <div className="p-4">
                              <h4 className="font-semibold mb-3">Evaluation Details</h4>
                              <div className="space-y-2">
                                {modelEvals.map((evaluation) => (
                                  <div
                                    key={evaluation.id}
                                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <div className="font-medium">{evaluation.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {new Date(evaluation.created_at).toLocaleDateString()}
                                        </div>
                                      </div>
                                      {getStatusBadge(evaluation.status)}
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="text-right">
                                        <div className="font-mono text-sm">
                                          {evaluation.performance_score.toFixed(3)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Performance
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono text-sm">
                                          {evaluation.total_samples.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Samples
                                        </div>
                                      </div>
                                      {Object.entries(evaluation.metrics || {}).slice(0, 3).map(([metric, value]) => (
                                        <div key={metric} className="text-right">
                                          <div className="font-mono text-sm">
                                            {value.toFixed(3)}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {metric}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
