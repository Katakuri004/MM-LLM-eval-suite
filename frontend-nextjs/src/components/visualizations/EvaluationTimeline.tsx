'use client'

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play,
  Pause
} from 'lucide-react';

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
}

interface EvaluationTimelineProps {
  evaluations: Evaluation[];
}

export const EvaluationTimeline: React.FC<EvaluationTimelineProps> = ({
  evaluations
}) => {
  // Process timeline data
  const timelineData = useMemo(() => {
    const sortedEvals = [...evaluations].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Group by date
    const groupedByDate: Record<string, Evaluation[]> = {};
    sortedEvals.forEach((evaluation) => {
      const date = new Date(evaluation.created_at).toDateString();
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(evaluation);
    });

    // Calculate daily statistics
    const dailyStats = Object.entries(groupedByDate).map(([date, evals]) => {
      const completed = evals.filter(e => e.status === 'completed');
      const running = evals.filter(e => e.status === 'running');
      const failed = evals.filter(e => e.status === 'failed');
      
      const totalSamples = completed.reduce((sum, e) => sum + e.total_samples, 0);
      const avgPerformance = completed.length > 0 
        ? completed.reduce((sum, e) => sum + e.performance_score, 0) / completed.length
        : 0;

      return {
        date,
        evaluations: evals,
        stats: {
          total: evals.length,
          completed: completed.length,
          running: running.length,
          failed: failed.length,
          totalSamples,
          avgPerformance
        }
      };
    });

    return dailyStats;
  }, [evaluations]);

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get status badge
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

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const total = evaluations.length;
    const completed = evaluations.filter(e => e.status === 'completed').length;
    const running = evaluations.filter(e => e.status === 'running').length;
    const failed = evaluations.filter(e => e.status === 'failed').length;
    
    const totalSamples = evaluations
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + e.total_samples, 0);
    
    const avgPerformance = completed > 0 
      ? evaluations
          .filter(e => e.status === 'completed')
          .reduce((sum, e) => sum + e.performance_score, 0) / completed
      : 0;

    return {
      total,
      completed,
      running,
      failed,
      totalSamples,
      avgPerformance,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [evaluations]);

  if (evaluations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            No evaluations available for timeline
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Timeline</CardTitle>
        <div className="text-sm text-muted-foreground">
          Evaluation progress over time
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-6">
            {/* Overall Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {overallStats.total}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {overallStats.completed}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {overallStats.running}
                </div>
                <div className="text-sm text-muted-foreground">Running</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {overallStats.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              {timelineData.map(({ date, evaluations, stats }) => (
                <div key={date} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{date}</h4>
                      <div className="text-sm text-muted-foreground">
                        {stats.total} evaluations • {stats.totalSamples.toLocaleString()} samples
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {stats.completed}/{stats.total} completed
                      </Badge>
                      {stats.avgPerformance > 0 && (
                        <Badge variant="secondary">
                          Avg: {stats.avgPerformance.toFixed(3)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {evaluations.map((evaluation) => (
                      <Tooltip key={evaluation.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                            <div className="flex-shrink-0">
                              {getStatusIcon(evaluation.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate" title={evaluation.name}>
                                {evaluation.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {evaluation.model_name}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(evaluation.status)}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <div className="font-semibold">{evaluation.name}</div>
                            <div className="text-sm text-muted-foreground">{evaluation.model_name}</div>
                            <div className="text-sm">
                              Status: {evaluation.status}
                            </div>
                            <div className="text-sm">
                              Samples: {evaluation.total_samples.toLocaleString()}
                            </div>
                            {evaluation.performance_score > 0 && (
                              <div className="text-sm">
                                Performance: {evaluation.performance_score.toFixed(3)}
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground">
                              Created: {new Date(evaluation.created_at).toLocaleString()}
                            </div>
                            {evaluation.completed_at && (
                              <div className="text-sm text-muted-foreground">
                                Completed: {new Date(evaluation.completed_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Performance Summary */}
            {overallStats.avgPerformance > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Performance Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {overallStats.avgPerformance.toFixed(3)}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Performance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {overallStats.totalSamples.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Samples</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {overallStats.completionRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Completion Rate</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
