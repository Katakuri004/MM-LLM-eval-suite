'use client'

/**
 * Evaluations management page
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient, CreateRunRequest } from '@/lib/api';
import { 
  Play, 
  Search, 
  Eye, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export function Evaluations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newEvaluation, setNewEvaluation] = useState({
    name: '',
    model_id: '',
    benchmark_ids: [],
    config: {
      batch_size: 1,
      num_fewshot: 0,
      limit: 50,
    },
  });

  const queryClient = useQueryClient();

  const { data: evaluations, isLoading } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => apiClient.getEvaluations(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: models } = useQuery({
    queryKey: ['models'],
    queryFn: () => apiClient.getModels(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: benchmarks } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => apiClient.getBenchmarks(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createEvaluationMutation = useMutation({
    mutationFn: (evaluationData: any) => apiClient.createEvaluation(evaluationData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      setIsCreateDialogOpen(false);
      setNewEvaluation({
        name: '',
        model_id: '',
        benchmark_ids: [],
        config: {
          batch_size: 1,
          num_fewshot: 0,
          limit: 50,
        },
      });
      toast.success(`Evaluation started: ${data.evaluation_id}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to start evaluation: ${error.message}`);
    },
  });

  const cancelEvaluationMutation = useMutation({
    mutationFn: (evaluationId: string) => apiClient.cancelEvaluation(evaluationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Evaluation cancelled');
    },
    onError: (error: any) => {
      toast.error(`Failed to cancel evaluation: ${error.message}`);
    },
  });

  // Enhanced filtering and sorting
  const filteredAndSortedEvaluations = React.useMemo(() => {
    if (!evaluations?.evaluations) return [];
    
    let filtered = evaluations.evaluations.filter(evaluation => {
      const matchesSearch = evaluation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           evaluation.model_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || evaluation.status === statusFilter;
      
      // Modality filtering - get model info to determine modality
      let matchesModality = true;
      if (modalityFilter !== 'all' && models?.models) {
        const model = models.models.find(m => m.id === evaluation.model_id);
        if (model) {
          const modelName = model.name.toLowerCase();
          const modelFamily = model.family.toLowerCase();
          let modelModality = 'text'; // default
          
          if (modelFamily.includes('llava') || modelFamily.includes('blip') || 
              modelFamily.includes('flamingo') || modelName.includes('vision') ||
              modelName.includes('image')) {
            modelModality = 'image';
          } else if (modelName.includes('whisper') || modelName.includes('audio') ||
                     modelFamily.includes('whisper')) {
            modelModality = 'audio';
          } else if (modelName.includes('video') || modelName.includes('temporal')) {
            modelModality = 'video';
          } else if (modelFamily.includes('llava') || modelFamily.includes('blip') ||
                     modelFamily.includes('flamingo') || modelName.includes('multimodal')) {
            modelModality = 'multi-modal';
          }
          
          matchesModality = modalityFilter === modelModality;
        }
      }
      
      return matchesSearch && matchesStatus && matchesModality;
    });

    // Sort the results
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof typeof a];
      let bValue = b[sortBy as keyof typeof b];
      
      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [evaluations?.evaluations, searchTerm, statusFilter, modalityFilter, sortBy, sortOrder, models?.models]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedEvaluations.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEvaluations = filteredAndSortedEvaluations.slice(startIndex, endIndex);

  const statusIcons = {
    completed: CheckCircle,
    running: Activity,
    failed: XCircle,
    pending: Clock,
    cancelled: AlertCircle,
  };

  const statusColors = {
    completed: 'text-green-600',
    running: 'text-blue-600',
    failed: 'text-red-600',
    pending: 'text-yellow-600',
    cancelled: 'text-gray-600',
  };

  const handleCreateEvaluation = () => {
    if (!newEvaluation.name.trim()) {
      toast.error('Please enter an evaluation name');
      return;
    }
    if (!newEvaluation.model_id || newEvaluation.benchmark_ids.length === 0) {
      toast.error('Please select a model and at least one benchmark');
      return;
    }
    createEvaluationMutation.mutate(newEvaluation);
  };

  const handleCancelEvaluation = (evaluationId: string) => {
    cancelEvaluationMutation.mutate(evaluationId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
            <p className="text-muted-foreground">Manage your evaluation runs</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
          <p className="text-muted-foreground">
            Monitor and manage your evaluation runs
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Start New Evaluation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Start New Evaluation</DialogTitle>
              <DialogDescription>
                Configure and start a new evaluation run.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Evaluation Name *</label>
                <Input
                  value={newEvaluation.name}
                  onChange={(e) => setNewEvaluation({ ...newEvaluation, name: e.target.value })}
                  placeholder="e.g., Test Run 1, LLaVA-7B-VQA-Test, My Evaluation"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Give your evaluation a descriptive name to easily identify it later
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Model *</label>
                <Select
                  value={newEvaluation.model_id}
                  onValueChange={(value) => setNewEvaluation({ ...newEvaluation, model_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.models?.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} ({model.family})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Benchmarks *</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {benchmarks?.benchmarks?.map((benchmark) => (
                    <div key={benchmark.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={benchmark.id}
                        checked={newEvaluation.benchmark_ids.includes(benchmark.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewEvaluation({
                              ...newEvaluation,
                              benchmark_ids: [...newEvaluation.benchmark_ids, benchmark.id]
                            });
                          } else {
                            setNewEvaluation({
                              ...newEvaluation,
                              benchmark_ids: newEvaluation.benchmark_ids.filter(id => id !== benchmark.id)
                            });
                          }
                        }}
                      />
                      <label htmlFor={benchmark.id} className="text-sm">
                        {benchmark.name} ({benchmark.modality})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Batch Size</label>
                  <Input
                    type="number"
                    value={newEvaluation.config.batch_size}
                    onChange={(e) => setNewEvaluation({
                      ...newEvaluation,
                      config: { ...newEvaluation.config, batch_size: parseInt(e.target.value) || 1 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Few-shot Examples</label>
                  <Input
                    type="number"
                    value={newEvaluation.config.num_fewshot}
                    onChange={(e) => setNewEvaluation({
                      ...newEvaluation,
                      config: { ...newEvaluation.config, num_fewshot: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sample Limit</label>
                  <Input
                    type="number"
                    value={newEvaluation.config.limit}
                    onChange={(e) => setNewEvaluation({
                      ...newEvaluation,
                      config: { ...newEvaluation.config, limit: parseInt(e.target.value) || 50 }
                    })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateEvaluation}
                disabled={createEvaluationMutation.isPending}
              >
                {createEvaluationMutation.isPending ? 'Starting...' : 'Start Evaluation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Filters */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={modalityFilter} onValueChange={setModalityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by modality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modalities</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="multi-modal">Multi-modal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Sort by:</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created</SelectItem>
                <SelectItem value="updated_at">Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Order:</label>
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Per page:</label>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Evaluations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Runs</CardTitle>
          <CardDescription>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedEvaluations.length)} of {filteredAndSortedEvaluations.length} evaluations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Benchmarks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEvaluations.map((evaluation) => {
                const StatusIcon = statusIcons[evaluation.status as keyof typeof statusIcons];
                const colorClass = statusColors[evaluation.status as keyof typeof statusColors];
                const progress = evaluation.progress_percentage || 0;
                
                return (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">{evaluation.name}</TableCell>
                    <TableCell>{evaluation.model_id}</TableCell>
                    <TableCell>
                      {evaluation.benchmark_ids?.length > 0 ? `${evaluation.benchmark_ids.length} benchmarks` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {StatusIcon && <StatusIcon className={`h-4 w-4 ${colorClass}`} />}
                        <Badge variant="outline" className={colorClass}>
                          {evaluation.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {evaluation.status === 'running' ? (
                        <div className="w-20">
                          <Progress value={progress} className="h-2" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {evaluation.completed_at && evaluation.started_at ? (
                        `${parseFloat(evaluation.duration_seconds || '0').toFixed(1)}s`
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/evaluations/${evaluation.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {evaluation.status === 'running' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCancelEvaluation(evaluation.id)}
                            disabled={cancelEvaluationMutation.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredAndSortedEvaluations.length} total evaluations
            </div>
          </div>
        )}
      </Card>

      {filteredAndSortedEvaluations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No evaluations found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || statusFilter !== 'all' || modalityFilter !== 'all'
                ? 'No evaluations match your search criteria.'
                : 'Get started by creating your first evaluation.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && modalityFilter === 'all' && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Start Evaluation
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
