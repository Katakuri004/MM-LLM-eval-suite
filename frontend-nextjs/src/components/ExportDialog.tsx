'use client'

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Info
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface ExportDialogProps {
  evaluationId?: string;
  modelIds?: string[];
  benchmarkIds?: string[];
  trigger?: React.ReactNode;
  onExportComplete?: (reportInfo: any) => void;
}

interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeSamples: boolean;
  includeMetadata: boolean;
  includeTimeline: boolean;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  evaluationId,
  modelIds = [],
  benchmarkIds = [],
  trigger,
  onExportComplete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'json',
    includeSamples: false,
    includeMetadata: true,
    includeTimeline: true
  });
  const [exportResult, setExportResult] = useState<any>(null);

  // Single evaluation export mutation
  const singleExportMutation = useMutation({
    mutationFn: async (exportOptions: ExportOptions) => {
      if (!evaluationId) throw new Error('No evaluation ID provided');
      
      const params = new URLSearchParams({
        format: exportOptions.format,
        include_samples: exportOptions.includeSamples.toString(),
        include_metadata: exportOptions.includeMetadata.toString()
      });

      return apiClient.request(`/evaluations/${evaluationId}/export?${params}`, {
        method: 'GET'
      });
    },
    onSuccess: (data) => {
      setExportResult(data);
      onExportComplete?.(data);
    },
    onError: (error) => {
      console.error('Export failed:', error);
    }
  });

  // Comparison export mutation
  const comparisonExportMutation = useMutation({
    mutationFn: async (exportOptions: ExportOptions) => {
      if (modelIds.length === 0) throw new Error('No model IDs provided');
      
      return apiClient.request('/export/comparison', {
        method: 'POST',
        body: JSON.stringify({
          model_ids: modelIds,
          benchmark_ids: benchmarkIds.length > 0 ? benchmarkIds : undefined,
          format: exportOptions.format,
          include_timeline: exportOptions.includeTimeline
        })
      });
    },
    onSuccess: (data) => {
      setExportResult(data);
      onExportComplete?.(data);
    },
    onError: (error) => {
      console.error('Export failed:', error);
    }
  });

  const handleExport = async () => {
    try {
      if (evaluationId) {
        await singleExportMutation.mutateAsync(options);
      } else if (modelIds.length > 0) {
        await comparisonExportMutation.mutateAsync(options);
      } else {
        throw new Error('No evaluation or models to export');
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const isLoading = singleExportMutation.isPending || comparisonExportMutation.isPending;
  const isSuccess = singleExportMutation.isSuccess || comparisonExportMutation.isSuccess;
  const isError = singleExportMutation.isError || comparisonExportMutation.isError;

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json':
        return <FileJson className="h-4 w-4 text-blue-500" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'json':
        return 'Structured data format, includes all metrics and metadata';
      case 'csv':
        return 'Spreadsheet format, good for analysis in Excel or Google Sheets';
      case 'pdf':
        return 'Document format, human-readable report (text-based)';
      default:
        return '';
    }
  };

  const resetDialog = () => {
    setExportResult(null);
    setOptions({
      format: 'json',
      includeSamples: false,
      includeMetadata: true,
      includeTimeline: true
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetDialog();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {evaluationId ? 'Evaluation' : 'Comparison'} Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Export Type</span>
            </div>
            {evaluationId ? (
              <div className="text-sm text-muted-foreground">
                Exporting single evaluation: <Badge variant="outline">{evaluationId}</Badge>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Exporting comparison for {modelIds.length} model(s)
                {benchmarkIds.length > 0 && (
                  <span> across {benchmarkIds.length} benchmark(s)</span>
                )}
              </div>
            )}
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label htmlFor="format">Export Format</Label>
            <Select 
              value={options.format} 
              onValueChange={(value: 'json' | 'csv' | 'pdf') => 
                setOptions(prev => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    {getFormatIcon('json')}
                    <span>JSON</span>
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    {getFormatIcon('csv')}
                    <span>CSV</span>
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    {getFormatIcon('pdf')}
                    <span>PDF</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {getFormatDescription(options.format)}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="font-medium">Export Options</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSamples"
                  checked={options.includeSamples}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeSamples: !!checked }))
                  }
                />
                <Label htmlFor="includeSamples" className="text-sm">
                  Include per-sample results
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMetadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeMetadata: !!checked }))
                  }
                />
                <Label htmlFor="includeMetadata" className="text-sm">
                  Include metadata
                </Label>
              </div>

              {!evaluationId && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTimeline"
                    checked={options.includeTimeline}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, includeTimeline: !!checked }))
                    }
                  />
                  <Label htmlFor="includeTimeline" className="text-sm">
                    Include evaluation timeline
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Export Result */}
          {exportResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {isSuccess ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium">
                  {isSuccess ? 'Export Successful' : 'Export Failed'}
                </span>
              </div>
              
              {isSuccess && exportResult.report_info && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getFormatIcon(exportResult.report_info.format)}
                      <span className="font-medium">
                        {exportResult.report_info.filename}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Size: {(exportResult.report_info.size_bytes / 1024).toFixed(1)} KB
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Generated: {new Date(exportResult.report_info.generated_at).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Path: {exportResult.report_info.filepath}
                    </div>
                  </div>
                </div>
              )}

              {isError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Export failed. Please try again or contact support.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
