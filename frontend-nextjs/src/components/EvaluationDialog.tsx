'use client'

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/api';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Play, 
  CheckCircle, 
  XCircle,
  Info,
  Clock,
  Target,
  Eye,
  Volume2,
  Video,
  Type,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface EvaluationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  model: {
    id: string;
    name: string;
    family: string;
    source: string;
    dtype: string;
    num_parameters: number;
  };
}

interface Benchmark {
  id: string;
  name: string;
  modality: string;
  category: string;
  task_type: string;
  primary_metrics: string[];
  secondary_metrics: string[];
  num_samples: number;
  description?: string;
  created_at: string;
}

export function EvaluationDialog({ isOpen, onClose, model }: EvaluationDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'modality' | 'task_type' | 'num_samples'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch benchmarks
  const { data: benchmarksData, isLoading } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => apiClient.getBenchmarks(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Task discovery for validation
  const { data: availableTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['available-tasks'],
    queryFn: () => apiClient.getAvailableTasks(),
    select: (data) => data.tasks,
    enabled: isOpen,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Dependency checking (all dependencies are pre-installed)
  const dependencyStatus = { all_installed: true, missing_dependencies: [] };

  const benchmarks = benchmarksData?.benchmarks || [];

  // Determine model capabilities
  const getModelCapabilities = () => {
    const modelName = model.name.toLowerCase();
    const modelFamily = model.family.toLowerCase();
    
    const capabilities = {
      text: true, // Most models support text
      image: false,
      audio: false,
      video: false,
      multimodal: false
    };

    // Check for image capabilities
    if (modelFamily.includes('llava') || modelFamily.includes('blip') || 
        modelFamily.includes('flamingo') || modelName.includes('vision') ||
        modelName.includes('image')) {
      capabilities.image = true;
      capabilities.multimodal = true;
    }

    // Check for audio capabilities
    if (modelName.includes('whisper') || modelName.includes('audio') ||
        modelFamily.includes('whisper')) {
      capabilities.audio = true;
    }

    // Check for video capabilities
    if (modelName.includes('video') || modelName.includes('temporal')) {
      capabilities.video = true;
    }

    return capabilities;
  };

  const modelCapabilities = getModelCapabilities();

  // Filter and sort benchmarks
  const filteredBenchmarks = benchmarks
    .filter(benchmark => {
      // Search filter
      if (searchTerm && !benchmark.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !benchmark.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Task filter
      if (taskFilter !== 'all' && benchmark.task_type !== taskFilter) {
        return false;
      }

      // Modality filter
      if (modalityFilter !== 'all' && benchmark.modality !== modalityFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'modality':
          aValue = a.modality;
          bValue = b.modality;
          break;
        case 'task_type':
          aValue = a.task_type;
          bValue = b.task_type;
          break;
        case 'num_samples':
          aValue = a.num_samples;
          bValue = b.num_samples;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Helper functions for task type compatibility
  const getTaskTypeForBenchmark = (benchmarkName: string): string => {
    const name = benchmarkName.toLowerCase()
    if (name.includes('mmlu') || name.includes('hellaswag') || 
        name.includes('arc') || name.includes('truthfulqa') ||
        name.includes('winogrande') || name.includes('piqa') ||
        name.includes('openbookqa') || name.includes('ai2_arc')) {
      return 'multiple_choice'
    }
    return 'generate_until'
  }

  const isVisionLanguageModel = (modelName: string): boolean => {
    const name = modelName.toLowerCase()
    // Omni models are general-purpose and support all task types
    if (name.includes('omni')) {
      return false
    }
    return name.includes('qwen') || name.includes('llava') || 
           name.includes('intern') || name.includes('cog') ||
           name.includes('blip') || name.includes('flamingo') ||
           name.includes('phi3v') || name.includes('phi4')
  }

  // Check if benchmark is compatible with model
  const isBenchmarkCompatible = (benchmark: Benchmark) => {
    const benchmarkModality = benchmark.modality.toLowerCase();
    
    // Check modality compatibility
    const modalityCompatible = (
      (benchmarkModality.includes('text') && modelCapabilities.text) ||
      (benchmarkModality.includes('image') && modelCapabilities.image) ||
      (benchmarkModality.includes('audio') && modelCapabilities.audio) ||
      (benchmarkModality.includes('video') && modelCapabilities.video) ||
      (benchmarkModality.includes('vision') && modelCapabilities.image) ||
      (benchmarkModality.includes('multimodal') && modelCapabilities.multimodal)
    );
    
    if (!modalityCompatible) return false;
    
    // NEW: Check task type compatibility for vision-language models
    if (isVisionLanguageModel(model.name)) {
      const taskType = getTaskTypeForBenchmark(benchmark.name)
      if (taskType === 'multiple_choice') {
        return false // Vision-language models don't support multiple-choice tasks
      }
    }
    
    // Check if task is available in lmms-eval
    if (availableTasks.length > 0) {
      const taskName = benchmark.task_name || benchmark.name.toLowerCase().replace(/\s+/g, '_');
      return availableTasks.includes(taskName);
    }
    
    return true; // If no task discovery available, assume compatible
  };

  // Get modality icon
  const getModalityIcon = (modality: string) => {
    const mod = modality.toLowerCase();
    if (mod.includes('image') || mod.includes('vision')) return <Eye className="h-4 w-4" />;
    if (mod.includes('audio')) return <Volume2 className="h-4 w-4" />;
    if (mod.includes('video')) return <Video className="h-4 w-4" />;
    if (mod.includes('text')) return <Type className="h-4 w-4" />;
    if (mod.includes('multimodal')) return <Layers className="h-4 w-4" />;
    return <Target className="h-4 w-4" />;
  };

  // Get task type color
  const getTaskTypeColor = (taskType: string) => {
    const task = taskType.toLowerCase();
    if (task.includes('vqa')) return 'bg-blue-100 text-blue-800';
    if (task.includes('caption')) return 'bg-green-100 text-green-800';
    if (task.includes('ocr')) return 'bg-purple-100 text-purple-800';
    if (task.includes('classification')) return 'bg-orange-100 text-orange-800';
    if (task.includes('detection')) return 'bg-pink-100 text-pink-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handleBenchmarkToggle = (benchmarkId: string) => {
    setSelectedBenchmarks(prev => 
      prev.includes(benchmarkId) 
        ? prev.filter(id => id !== benchmarkId)
        : [...prev, benchmarkId]
    );
  };

  const handleSelectAllCompatible = () => {
    const compatibleIds = filteredBenchmarks
      .filter(isBenchmarkCompatible)
      .map(b => b.id);
    setSelectedBenchmarks(compatibleIds);
  };

  const handleClearSelection = () => {
    setSelectedBenchmarks([]);
  };

  const handleSubmitEvaluation = async () => {
    if (selectedBenchmarks.length === 0) {
      toast.error('Please select at least one benchmark');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.createEvaluation({
      model_id: model.id,
      benchmark_ids: selectedBenchmarks,
        config: {
          batch_size: 1,
          num_fewshot: 0,
          limit: 50,
        },
        name: `Evaluation for ${model.name}`,
      });
      
      toast.success(`Evaluation started successfully! Evaluation ID: ${response.evaluation_id}`);
      onClose();
      setSelectedBenchmarks([]);
    } catch (error: any) {
      toast.error(`Failed to start evaluation: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const compatibleCount = filteredBenchmarks.filter(isBenchmarkCompatible).length;
  const selectedCompatibleCount = selectedBenchmarks.filter(id => 
    filteredBenchmarks.find(b => b.id === id && isBenchmarkCompatible(b))
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Evaluate Model: {model.name}</span>
          </DialogTitle>
          <DialogDescription>
            Select benchmarks to run evaluation on {model.name}. Compatible benchmarks are highlighted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Model Info */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{model.name}</h3>
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1">
                    <span>{model.family}</span>
                    <span>•</span>
                    <span>{model.num_parameters.toLocaleString()} params</span>
                    <span>•</span>
                    <span>{model.dtype}</span>
            </div>
          </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-medium text-muted-foreground">Capabilities:</span>
                  {Object.entries(modelCapabilities).map(([capability, supported]) => (
                  <Badge
                      key={capability}
                      variant={supported ? "default" : "outline"}
                      className={`text-xs ${supported ? "bg-green-100 text-green-800" : ""}`}
                    >
                      {capability}
                  </Badge>
                ))}
                </div>
              </div>
            </CardContent>
          </Card>

      {/* All dependencies are pre-installed - no warnings needed */}

          {/* Filters and Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search benchmarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 h-8"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Label className="text-xs font-medium">Task:</Label>
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="vqa">VQA</SelectItem>
                  <SelectItem value="caption">Captioning</SelectItem>
                  <SelectItem value="ocr">OCR</SelectItem>
                  <SelectItem value="classification">Classification</SelectItem>
                  <SelectItem value="detection">Detection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Label className="text-xs font-medium">Modality:</Label>
              <Select value={modalityFilter} onValueChange={setModalityFilter}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modalities</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="multimodal">Multimodal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Label className="text-xs font-medium">Sort:</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="modality">Modality</SelectItem>
                  <SelectItem value="task_type">Task Type</SelectItem>
                  <SelectItem value="num_samples">Samples</SelectItem>
                </SelectContent>
              </Select>
              
                  <Button
                variant="outline"
                    size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2 h-8"
                  >
                {sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                  </Button>
            </div>
          </div>

          {/* Selection Summary */}
            <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-muted-foreground">
                {compatibleCount} compatible • {selectedBenchmarks.length} selected
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" onClick={handleSelectAllCompatible} className="h-7 text-xs">
                Select All
                  </Button>
              <Button variant="outline" size="sm" onClick={handleClearSelection} className="h-7 text-xs">
                Clear
                  </Button>
              </div>
            </div>
            
          {/* Benchmarks List */}
          <ScrollArea className="h-80">
            <div className="space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
              ) : filteredBenchmarks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No benchmarks found matching your criteria.
                </div>
              ) : (
                filteredBenchmarks.map((benchmark) => {
                  const isCompatible = isBenchmarkCompatible(benchmark);
                  const isSelected = selectedBenchmarks.includes(benchmark.id);
                  
                  return (
                    <Card 
                          key={benchmark.id}
                      className={`cursor-pointer transition-all ${
                        isCompatible 
                          ? isSelected 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:shadow-md' 
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => isCompatible && handleBenchmarkToggle(benchmark.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <Checkbox 
                                checked={isSelected}
                                disabled={!isCompatible}
                                onChange={() => isCompatible && handleBenchmarkToggle(benchmark.id)}
                                className="shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm truncate">{benchmark.name}</h3>
                                {benchmark.task_name && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    Task: {benchmark.task_name}
                                  </p>
                                )}
                              </div>
                              {!isCompatible && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  Incompatible
                              </Badge>
                              )}
                              {isCompatible && isSelected && (
                                <Badge className="bg-green-100 text-green-800 text-xs shrink-0">
                                  Selected
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-3 text-xs text-muted-foreground mb-1">
                              <div className="flex items-center space-x-1">
                                {getModalityIcon(benchmark.modality)}
                                <span>{benchmark.modality}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{benchmark.num_samples} samples</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1 mb-1">
                              <Badge className={`${getTaskTypeColor(benchmark.task_type)} text-xs`}>
                                {benchmark.task_type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{benchmark.category}</Badge>
                            </div>
                            
                            {!isCompatible && isVisionLanguageModel(model.name) && getTaskTypeForBenchmark(benchmark.name) === 'multiple_choice' && (
                              <p className="text-xs text-muted-foreground mt-1">
                                This benchmark requires multiple-choice support, which is not available for vision-language generation models.
                              </p>
                            )}
                            
                            {benchmark.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                              {benchmark.description}
                            </p>
                            )}
                            </div>
                          
                          <div className="flex items-center ml-2 shrink-0">
                            {isCompatible ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
                  )}
                </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedBenchmarks.length > 0 && (
                <span>
                  {selectedBenchmarks.length} benchmark{selectedBenchmarks.length !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
        <Button 
          onClick={handleSubmitEvaluation}
          disabled={selectedBenchmarks.length === 0 || isSubmitting}
          className="min-w-32"
        >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Evaluation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}