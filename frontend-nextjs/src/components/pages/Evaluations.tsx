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
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRun, setNewRun] = useState<CreateRunRequest>({
    name: '',
    model_id: '',
    benchmark_ids: [],
    checkpoint_variant: 'default',
    config: {
      shots: 0,
      temperature: 0.0,
      seed: 42,
    },
  });

  const queryClient = useQueryClient();

  const { data: runs, isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => apiClient.getRuns(),
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

  const createRunMutation = useMutation({
    mutationFn: (runData: CreateRunRequest) => apiClient.createRun(runData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      setIsCreateDialogOpen(false);
      setNewRun({
        name: '',
        model_id: '',
        benchmark_ids: [],
        checkpoint_variant: 'default',
        config: {
          shots: 0,
          temperature: 0.0,
          seed: 42,
        },
      });
      toast.success(`Run started: ${data.run_id}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to start run: ${error.message}`);
    },
  });

  const cancelRunMutation = useMutation({
    mutationFn: (runId: string) => apiClient.cancelRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      toast.success('Run cancelled');
    },
    onError: (error: any) => {
      toast.error(`Failed to cancel run: ${error.message}`);
    },
  });

  // Enhanced filtering and sorting
  const filteredAndSortedRuns = React.useMemo(() => {
    if (!runs?.runs) return [];
    
    let filtered = runs.runs.filter(run => {
      const matchesSearch = run.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           run.model_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
      return matchesSearch && matchesStatus;
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
  }, [runs?.runs, searchTerm, statusFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRuns.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRuns = filteredAndSortedRuns.slice(startIndex, endIndex);

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

  const handleCreateRun = () => {
    if (!newRun.model_id || newRun.benchmark_ids.length === 0) {
      toast.error('Please select a model and at least one benchmark');
      return;
    }
    createRunMutation.mutate(newRun);
  };

  const handleCancelRun = (runId: string) => {
    cancelRunMutation.mutate(runId);
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
              New Evaluation
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
                <label className="text-sm font-medium">Run Name</label>
                <Input
                  value={newRun.name}
                  onChange={(e) => setNewRun({ ...newRun, name: e.target.value })}
                  placeholder="e.g., LLaVA-7B-VQA-Test"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Model *</label>
                <Select
                  value={newRun.model_id}
                  onValueChange={(value) => setNewRun({ ...newRun, model_id: value })}
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
                <label className="text-sm font-medium">Checkpoint Variant</label>
                <Input
                  value={newRun.checkpoint_variant}
                  onChange={(e) => setNewRun({ ...newRun, checkpoint_variant: e.target.value })}
                  placeholder="default"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Benchmarks *</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {benchmarks?.benchmarks?.map((benchmark) => (
                    <div key={benchmark.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={benchmark.id}
                        checked={newRun.benchmark_ids.includes(benchmark.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewRun({
                              ...newRun,
                              benchmark_ids: [...newRun.benchmark_ids, benchmark.id]
                            });
                          } else {
                            setNewRun({
                              ...newRun,
                              benchmark_ids: newRun.benchmark_ids.filter(id => id !== benchmark.id)
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
                  <label className="text-sm font-medium">Shots</label>
                  <Input
                    type="number"
                    value={newRun.config.shots}
                    onChange={(e) => setNewRun({
                      ...newRun,
                      config: { ...newRun.config, shots: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Temperature</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newRun.config.temperature}
                    onChange={(e) => setNewRun({
                      ...newRun,
                      config: { ...newRun.config, temperature: parseFloat(e.target.value) || 0.0 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seed</label>
                  <Input
                    type="number"
                    value={newRun.config.seed}
                    onChange={(e) => setNewRun({
                      ...newRun,
                      config: { ...newRun.config, seed: parseInt(e.target.value) || 42 }
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
                onClick={handleCreateRun}
                disabled={createRunMutation.isPending}
              >
                {createRunMutation.isPending ? 'Starting...' : 'Start Run'}
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
              placeholder="Search evaluations..."
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
            Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedRuns.length)} of {filteredAndSortedRuns.length} runs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Checkpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRuns.map((run) => {
                const StatusIcon = statusIcons[run.status as keyof typeof statusIcons];
                const colorClass = statusColors[run.status as keyof typeof statusColors];
                const progress = run.total_tasks > 0 ? (run.completed_tasks / run.total_tasks) * 100 : 0;
                
                return (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.name}</TableCell>
                    <TableCell>{run.model_id}</TableCell>
                    <TableCell>{run.checkpoint_variant}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {StatusIcon && <StatusIcon className={`h-4 w-4 ${colorClass}`} />}
                        <Badge variant="outline" className={colorClass}>
                          {run.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {run.status === 'running' ? (
                        <div className="w-20">
                          <Progress value={progress} className="h-2" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {run.completed_at && run.started_at ? (
                        `${parseFloat(run.duration_seconds || '0').toFixed(1)}s`
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/runs/${run.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {run.status === 'running' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCancelRun(run.id)}
                            disabled={cancelRunMutation.isPending}
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
              {filteredAndSortedRuns.length} total runs
            </div>
          </div>
        )}
      </Card>

      {filteredAndSortedRuns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No evaluations found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'No evaluations match your search criteria.'
                : 'Get started by creating your first evaluation.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
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
