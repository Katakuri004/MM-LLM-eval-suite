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

interface Evaluation {
  id: string;
  name: string;
  model_id: string;
  model_name: string;
  status: string;
  performance_score: number;
  metrics: Record<string, number>;
}

interface MetricCorrelationProps {
  evaluations: Evaluation[];
  metrics: string[];
}

export const MetricCorrelation: React.FC<MetricCorrelationProps> = ({
  evaluations,
  metrics
}) => {
  // Calculate correlation matrix
  const correlationMatrix = useMemo(() => {
    const completedEvals = evaluations.filter(e => e.status === 'completed');
    
    if (completedEvals.length < 2) {
      return {};
    }

    // Extract metric values
    const metricData: Record<string, number[]> = {};
    metrics.forEach(metric => {
      metricData[metric] = completedEvals
        .map(eval => eval.metrics?.[metric] || 0)
        .filter(value => !isNaN(value));
    });

    // Calculate correlations
    const correlations: Record<string, Record<string, number>> = {};
    
    metrics.forEach(metric1 => {
      correlations[metric1] = {};
      metrics.forEach(metric2 => {
        if (metric1 === metric2) {
          correlations[metric1][metric2] = 1;
        } else {
          const data1 = metricData[metric1];
          const data2 = metricData[metric2];
          
          if (data1.length > 1 && data2.length > 1) {
            correlations[metric1][metric2] = calculateCorrelation(data1, data2);
          } else {
            correlations[metric1][metric2] = 0;
          }
        }
      });
    });

    return correlations;
  }, [evaluations, metrics]);

  // Calculate Pearson correlation coefficient
  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  };

  // Get correlation strength and color
  const getCorrelationInfo = (correlation: number) => {
    const abs = Math.abs(correlation);
    
    if (abs < 0.1) {
      return { strength: 'Very Weak', color: 'bg-gray-100', textColor: 'text-gray-600' };
    } else if (abs < 0.3) {
      return { strength: 'Weak', color: 'bg-red-100', textColor: 'text-red-700' };
    } else if (abs < 0.5) {
      return { strength: 'Moderate', color: 'bg-orange-100', textColor: 'text-orange-700' };
    } else if (abs < 0.7) {
      return { strength: 'Strong', color: 'bg-yellow-100', textColor: 'text-yellow-700' };
    } else {
      return { strength: 'Very Strong', color: 'bg-green-100', textColor: 'text-green-700' };
    }
  };

  // Get top correlations
  const topCorrelations = useMemo(() => {
    const pairs: Array<{
      metric1: string;
      metric2: string;
      correlation: number;
    }> = [];

    metrics.forEach(metric1 => {
      metrics.forEach(metric2 => {
        if (metric1 !== metric2) {
          const correlation = correlationMatrix[metric1]?.[metric2] || 0;
          pairs.push({ metric1, metric2, correlation });
        }
      });
    });

    return pairs
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, 10);
  }, [correlationMatrix, metrics]);

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            No metrics available for correlation analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metric Correlation Matrix</CardTitle>
        <div className="text-sm text-muted-foreground">
          Correlation between different evaluation metrics
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-6">
            {/* Correlation Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground">
                      Metric
                    </th>
                    {metrics.map(metric => (
                      <th 
                        key={metric}
                        className="text-center p-2 font-medium text-muted-foreground min-w-[80px]"
                      >
                        {metric}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map(metric1 => (
                    <tr key={metric1} className="border-t">
                      <td className="p-2 font-medium">
                        <span className="truncate max-w-[120px] block" title={metric1}>
                          {metric1}
                        </span>
                      </td>
                      {metrics.map(metric2 => {
                        const correlation = correlationMatrix[metric1]?.[metric2] || 0;
                        const info = getCorrelationInfo(correlation);
                        
                        return (
                          <td key={metric2} className="p-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "w-full h-10 rounded border flex items-center justify-center cursor-pointer transition-colors hover:opacity-80",
                                    info.color
                                  )}
                                >
                                  <span className={cn("text-xs font-mono", info.textColor)}>
                                    {correlation.toFixed(2)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-center">
                                  <div className="font-semibold">{metric1} ↔ {metric2}</div>
                                  <div className="text-sm">
                                    Correlation: {correlation.toFixed(3)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {info.strength}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Correlations */}
            <div>
              <h4 className="font-semibold mb-3">Strongest Correlations</h4>
              <div className="space-y-2">
                {topCorrelations.map(({ metric1, metric2, correlation }, index) => {
                  const info = getCorrelationInfo(correlation);
                  const isPositive = correlation > 0;
                  
                  return (
                    <div
                      key={`${metric1}-${metric2}`}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <div>
                          <div className="font-medium text-sm">
                            {metric1} ↔ {metric2}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {info.strength} {isPositive ? 'positive' : 'negative'} correlation
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          isPositive ? 'bg-green-500' : 'bg-red-500'
                        )}></div>
                        <span className="font-mono text-sm">
                          {correlation.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border rounded"></div>
                <span>Very Weak (&lt;0.1)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border rounded"></div>
                <span>Weak (0.1-0.3)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-100 border rounded"></div>
                <span>Moderate (0.3-0.5)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border rounded"></div>
                <span>Strong (0.5-0.7)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border rounded"></div>
                <span>Very Strong (&gt;0.7)</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
