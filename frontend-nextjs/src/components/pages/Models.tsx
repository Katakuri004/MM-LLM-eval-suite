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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EvaluationDialog } from '@/components/EvaluationDialog';
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
  Upload,
  Filter,
  SortAsc,
  SortDesc,
  X,
  Type,
  Image,
  Volume2,
  Video,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

export function Models() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
  const [selectedModelForEvaluation, setSelectedModelForEvaluation] = useState<any>(null);
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
  const [pageSize, setPageSize] = useState(10);

  const { data: models, isLoading, isFetching } = useQuery({
    queryKey: ['models', { page, pageSize, searchTerm, sortBy, sortOrder, modalityFilter, familyFilter }],
    queryFn: () => {
      const sortParam = `${sortBy}:${sortOrder}`;
      const familyParam = familyFilter !== 'all' ? familyFilter : undefined;
      return apiClient.getModels({ 
        skip: page * pageSize, 
        limit: pageSize, 
        q: searchTerm, 
        family: familyParam,
        lean: true, 
        sort: sortParam 
      });
    },
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

  // Client-side filtering for modality (since backend doesn't have modality field yet)
  const filteredModels = (models?.models || []).filter((model) => {
    if (modalityFilter === 'all') return true;
    
    // For now, we'll infer modality from model name and family
    const modelName = model.name.toLowerCase();
    const modelFamily = model.family.toLowerCase();
    
    switch (modalityFilter) {
      case 'text':
        return modelFamily.includes('gpt') || modelFamily.includes('claude') || 
               modelFamily.includes('palm') || modelName.includes('text');
      case 'image':
        return modelFamily.includes('llava') || modelFamily.includes('blip') || 
               modelFamily.includes('flamingo') || modelName.includes('vision') ||
               modelName.includes('image');
      case 'audio':
        return modelName.includes('whisper') || modelName.includes('audio') ||
               modelFamily.includes('whisper');
      case 'video':
        return modelName.includes('video') || modelName.includes('temporal');
      case 'multimodal':
        return modelFamily.includes('llava') || modelFamily.includes('blip') ||
               modelFamily.includes('flamingo') || modelName.includes('multimodal');
      default:
        return true;
    }
  });

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

  // Pagination logic
  const totalPages = Math.ceil((models?.total || 0) / pageSize);
  const currentPage = page + 1; // Convert from 0-based to 1-based for display

  const goToPage = (newPage: number) => {
    setPage(Math.max(0, Math.min(newPage - 1, totalPages - 1)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setPage(page + 1);
    }
  };

  const goToPreviousPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  // Reset to first page when filters change
  const handleFilterChange = (newFilter: string, setter: (value: string) => void) => {
    setter(newFilter);
    setPage(0); // Reset to first page when filters change
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

      {/* Filters and Search */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0); // Reset to first page when search changes
              }}
              className="pl-8"
            />
          </div>
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="sort-by" className="text-sm font-medium">Sort by:</Label>
            <Select value={sortBy} onValueChange={(value: 'created_at' | 'name') => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Recently Added</SelectItem>
                <SelectItem value="name">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2"
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>

          {/* Modality Filter */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="modality-filter" className="text-sm font-medium">Modality:</Label>
            <Select value={modalityFilter} onValueChange={(value) => handleFilterChange(value, setModalityFilter)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="multimodal">Multi-modal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Family Filter */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="family-filter" className="text-sm font-medium">Family:</Label>
            <Select value={familyFilter} onValueChange={(value) => handleFilterChange(value, setFamilyFilter)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="OpenAI">OpenAI</SelectItem>
                <SelectItem value="Qwen">Qwen</SelectItem>
                <SelectItem value="Gemini">Gemini</SelectItem>
                <SelectItem value="LLaVA">LLaVA</SelectItem>
                <SelectItem value="Claude">Claude</SelectItem>
                <SelectItem value="GPT">GPT</SelectItem>
                <SelectItem value="PaLM">PaLM</SelectItem>
                <SelectItem value="Flamingo">Flamingo</SelectItem>
                <SelectItem value="BLIP">BLIP</SelectItem>
                <SelectItem value="InstructBLIP">InstructBLIP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="page-size" className="text-sm font-medium">Per page:</Label>
            <Select value={pageSize.toString()} onValueChange={(value) => {
              setPageSize(parseInt(value));
              setPage(0); // Reset to first page when page size changes
            }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {(modalityFilter !== 'all' || familyFilter !== 'all' || searchTerm) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModalityFilter('all');
                setFamilyFilter('all');
                setSearchTerm('');
                setPage(0); // Reset to first page when clearing filters
              }}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {(modalityFilter !== 'all' || familyFilter !== 'all' || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                Search: "{searchTerm}"
              </Badge>
            )}
            {modalityFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Modality: {modalityFilter}
              </Badge>
            )}
            {familyFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Family: {familyFilter}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Sort: {sortBy === 'created_at' ? 'Recently Added' : 'Alphabetical'} ({sortOrder === 'desc' ? 'Desc' : 'Asc'})
            </Badge>
          </div>
        )}
      </div>

      {/* Results Count and Pagination Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, models?.total || 0)} of {models?.total || 0} models
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>
        {isFetching && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <Card key={model.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{model.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{model.family}</Badge>
                  {(() => {
                    // Determine modality based on model name and family
                    const modelName = model.name.toLowerCase();
                    const modelFamily = model.family.toLowerCase();
                    
                    let modality = 'text'; // default
                    let modalityColor = 'bg-blue-100 text-blue-800';
                    let modalityIcon = <Type className="h-3 w-3" />;
                    
                    if (modelFamily.includes('llava') || modelFamily.includes('blip') || 
                        modelFamily.includes('flamingo') || modelName.includes('vision') ||
                        modelName.includes('image')) {
                      modality = 'image';
                      modalityColor = 'bg-green-100 text-green-800';
                      modalityIcon = <Image className="h-3 w-3" />;
                    } else if (modelName.includes('whisper') || modelName.includes('audio') ||
                               modelFamily.includes('whisper')) {
                      modality = 'audio';
                      modalityColor = 'bg-purple-100 text-purple-800';
                      modalityIcon = <Volume2 className="h-3 w-3" />;
                    } else if (modelName.includes('video') || modelName.includes('temporal')) {
                      modality = 'video';
                      modalityColor = 'bg-orange-100 text-orange-800';
                      modalityIcon = <Video className="h-3 w-3" />;
                    } else if (modelFamily.includes('llava') || modelFamily.includes('blip') ||
                               modelFamily.includes('flamingo') || modelName.includes('multimodal')) {
                      modality = 'multi-modal';
                      modalityColor = 'bg-pink-100 text-pink-800';
                      modalityIcon = <Layers className="h-3 w-3" />;
                    }
                    
                    return (
                      <Badge className={`${modalityColor} border-0 flex items-center space-x-1`}>
                        {modalityIcon}
                        <span>{modality}</span>
                      </Badge>
                    );
                  })()}
                </div>
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
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => {
                      setSelectedModelForEvaluation(model);
                      setIsEvaluationDialogOpen(true);
                    }}
                  >
                    <Cpu className="h-4 w-4 mr-1" />
                    Evaluate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={page === 0}
            className="flex items-center space-x-1"
          >
            <span>←</span>
            <span>Previous</span>
          </Button>
          
          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            {(() => {
              const pages = [];
              const maxVisiblePages = 5;
              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              
              // Adjust start if we're near the end
              if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }
              
              // First page
              if (startPage > 1) {
                pages.push(
                  <Button
                    key={1}
                    variant={currentPage === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(1)}
                    className="w-8 h-8 p-0"
                  >
                    1
                  </Button>
                );
                if (startPage > 2) {
                  pages.push(<span key="ellipsis1" className="px-2 text-muted-foreground">...</span>);
                }
              }
              
              // Middle pages
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={currentPage === i ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(i)}
                    className="w-8 h-8 p-0"
                  >
                    {i}
                  </Button>
                );
              }
              
              // Last page
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(<span key="ellipsis2" className="px-2 text-muted-foreground">...</span>);
                }
                pages.push(
                  <Button
                    key={totalPages}
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {totalPages}
                  </Button>
                );
              }
              
              return pages;
            })()}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="flex items-center space-x-1"
          >
            <span>Next</span>
            <span>→</span>
          </Button>
        </div>
      )}

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

      {/* Evaluation Dialog */}
      {selectedModelForEvaluation && (
        <EvaluationDialog
          isOpen={isEvaluationDialogOpen}
          onClose={() => {
            setIsEvaluationDialogOpen(false);
            setSelectedModelForEvaluation(null);
          }}
          model={selectedModelForEvaluation}
        />
      )}
    </div>
  );
}
