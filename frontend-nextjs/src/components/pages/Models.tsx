'use client'

/**
 * Models management page
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient, CreateModelRequest } from '@/lib/api';
import { 
  Brain, 
  Plus, 
  Edit, 
  Search,
  Cpu,
  Database,
  FileText,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

export function Models() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newModel, setNewModel] = useState<CreateModelRequest>({
    name: '',
    family: '',
    source: '',
    dtype: 'float16',
    num_parameters: 0,
    notes: '',
    metadata: {},
  });

  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const { data: models, isLoading, isFetching } = useQuery({
    queryKey: ['models', { page, pageSize, searchTerm }],
    queryFn: () => apiClient.getModels({ skip: page * pageSize, limit: pageSize, q: searchTerm, lean: true, sort: 'created_at:desc' }),
    staleTime: 30_000, // 30s
    gcTime: 300_000,   // 5m
    refetchOnWindowFocus: false,
  });

  const createModelMutation = useMutation({
    mutationFn: (modelData: CreateModelRequest) => apiClient.createModel(modelData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setIsCreateDialogOpen(false);
      setNewModel({
        name: '',
        family: '',
        source: '',
        dtype: 'float16',
        num_parameters: 0,
        notes: '',
        metadata: {},
      });
      toast.success('Model created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create model: ${error.message}`);
    },
  });

  const filteredModels = models?.models || [];

  const startEvaluation = async (modelId: string) => {
    try {
      // Use a simple default for now: run on all available benchmarks
      const bench = await apiClient.getBenchmarks();
      const benchmarkIds = (bench?.benchmarks || []).map(b => b.id);
      if (benchmarkIds.length === 0) {
        toast.error('No benchmarks available to run.');
        return;
      }
      const resp = await apiClient.createEvaluation({
        model_id: modelId,
        benchmark_ids: benchmarkIds,
        config: { batch_size: 1, max_samples: 50 },
      });
      toast.success('Evaluation started');
    } catch (e: any) {
      toast.error(`Failed to start evaluation: ${e.message}`);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const handleCreateModel = () => {
    if (!newModel.name || !newModel.family || !newModel.source) {
      toast.error('Please fill in all required fields');
      return;
    }
    createModelMutation.mutate(newModel);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Models</h1>
            <p className="text-muted-foreground">Manage your ML models</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
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
          <h1 className="text-3xl font-bold tracking-tight">Models</h1>
          <p className="text-muted-foreground">
            Manage your ML models and their configurations
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/models/new">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Model
            </Button>
          </Link>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Model
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Model</DialogTitle>
              <DialogDescription>
                Add a new model to your registry for evaluation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  placeholder="e.g., LLaVA-1.5-7B"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="family">Family *</Label>
                <Input
                  id="family"
                  value={newModel.family}
                  onChange={(e) => setNewModel({ ...newModel, family: e.target.value })}
                  placeholder="e.g., LLaVA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source *</Label>
                <Input
                  id="source"
                  value={newModel.source}
                  onChange={(e) => setNewModel({ ...newModel, source: e.target.value })}
                  placeholder="e.g., huggingface://llava-hf/llava-1.5-7b-hf"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dtype">Data Type</Label>
                  <Input
                    id="dtype"
                    value={newModel.dtype}
                    onChange={(e) => setNewModel({ ...newModel, dtype: e.target.value })}
                    placeholder="float16"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parameters">Parameters</Label>
                  <Input
                    id="parameters"
                    type="number"
                    value={newModel.num_parameters}
                    onChange={(e) => setNewModel({ ...newModel, num_parameters: parseInt(e.target.value) || 0 })}
                    placeholder="7000000000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newModel.notes}
                  onChange={(e) => setNewModel({ ...newModel, notes: e.target.value })}
                  placeholder="Additional notes about this model..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateModel}
                disabled={createModelMutation.isPending}
              >
                {createModelMutation.isPending ? 'Creating...' : 'Create Model'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <Card key={model.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{model.name}</CardTitle>
                <Badge variant="outline">{model.family}</Badge>
              </div>
              <CardDescription className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span className="truncate">{model.source}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Parameters</span>
                  <span className="font-medium">{formatNumber(model.num_parameters)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Data Type</span>
                  <Badge variant="secondary">{model.dtype}</Badge>
                </div>
                {model.notes && (
                  <div className="text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 inline mr-1" />
                    {model.notes}
                  </div>
                )}
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => startEvaluation(model.id)}>
                    <Cpu className="h-4 w-4 mr-1" />
                    Evaluate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No models found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? 'No models match your search criteria.'
                : 'Get started by adding your first model.'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Model
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
