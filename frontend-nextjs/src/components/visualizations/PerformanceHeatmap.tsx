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

interface Model {
  id: string;
  name: string;
  family: string;
  modality: string;
}

interface PerformanceHeatmapProps {
  evaluations: Evaluation[];
  models: Model[];
  benchmarks: string[];
}

export const PerformanceHeatmap: React.FC<PerformanceHeatmapProps> = ({
  evaluations,
  models,
  benchmarks
}) => {
  // Create heatmap data
  const heatmapData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    
    // Initialize with all models and benchmarks
    models.forEach(model => {
      data[model.id] = {};
      benchmarks.forEach(benchmark => {
        data[model.id][benchmark] = 0;
      });
    });

    // Fill with actual performance scores
    evaluations.forEach(eval => {
      if (eval.status === 'completed' && eval.model_id in data) {
        // For now, use performance_score for all benchmarks
        // In a real implementation, you'd have per-benchmark scores
        benchmarks.forEach(benchmark => {
          data[eval.model_id][benchmark] = eval.performance_score;
        });
      }
    });

    return data;
  }, [evaluations, models, benchmarks]);

  // Calculate statistics for color scaling
  const stats = useMemo(() => {
    const allValues = Object.values(heatmapData)
      .flatMap(modelData => Object.values(modelData))
      .filter(value => value > 0);

    if (allValues.length === 0) {
      return { min: 0, max: 1, avg: 0 };
    }

    return {
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      avg: allValues.reduce((sum, val) => sum + val, 0) / allValues.length
    };
  }, [heatmapData]);

  // Get color intensity based on value
  const getColorIntensity = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    
    const normalized = (value - stats.min) / (stats.max - stats.min);
    
    if (normalized < 0.2) return 'bg-red-100';
    if (normalized < 0.4) return 'bg-orange-100';
    if (normalized < 0.6) return 'bg-yellow-100';
    if (normalized < 0.8) return 'bg-green-100';
    return 'bg-green-200';
  };

  // Get text color based on background
  const getTextColor = (value: number) => {
    if (value === 0) return 'text-gray-400';
    return 'text-gray-900';
  };

  if (models.length === 0 || benchmarks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            No data available for heatmap visualization
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Heatmap</CardTitle>
        <div className="text-sm text-muted-foreground">
          Performance scores across models and benchmarks
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Performance:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-100 border rounded"></div>
                <span>No data</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-100 border rounded"></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-100 border rounded"></div>
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-100 border rounded"></div>
                <span>High</span>
              </div>
            </div>

            {/* Heatmap Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground">
                      Model
                    </th>
                    {benchmarks.map(benchmark => (
                      <th 
                        key={benchmark}
                        className="text-center p-2 font-medium text-muted-foreground min-w-[100px]"
                      >
                        {benchmark}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {models.map(model => (
                    <tr key={model.id} className="border-t">
                      <td className="p-2 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="truncate max-w-[150px]" title={model.name}>
                            {model.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {model.family} • {model.modality}
                        </div>
                      </td>
                      {benchmarks.map(benchmark => {
                        const value = heatmapData[model.id]?.[benchmark] || 0;
                        
                        return (
                          <td key={benchmark} className="p-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "w-full h-12 rounded border flex items-center justify-center cursor-pointer transition-colors hover:opacity-80",
                                    getColorIntensity(value)
                                  )}
                                >
                                  <span className={cn("text-sm font-mono", getTextColor(value))}>
                                    {value > 0 ? value.toFixed(3) : '—'}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-center">
                                  <div className="font-semibold">{model.name}</div>
                                  <div className="text-sm text-muted-foreground">{benchmark}</div>
                                  <div className="text-sm">
                                    Score: {value > 0 ? value.toFixed(3) : 'No data'}
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

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-muted-foreground">Min</div>
                <div className="font-mono">{stats.min.toFixed(3)}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-muted-foreground">Average</div>
                <div className="font-mono">{stats.avg.toFixed(3)}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-muted-foreground">Max</div>
                <div className="font-mono">{stats.max.toFixed(3)}</div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
