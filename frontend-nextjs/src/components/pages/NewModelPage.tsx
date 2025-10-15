'use client'

/**
 * New Model Upload Page
 * Allows users to upload local models and configure them for benchmarking
 */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { apiClient, CreateModelRequest } from '@/lib/api';
import { 
  Upload, 
  FileText, 
  Brain, 
  Cpu, 
  Database, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  Play,
  Settings,
  Info,
  Zap,
  HardDrive,
  MemoryStick,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface ModelConfig {
  name: string;
  family: string;
  source: string;
  dtype: string;
  num_parameters: number;
  notes: string;
  metadata: Record<string, any>;
  model_path?: string;
  config_path?: string;
  tokenizer_path?: string;
}

export function NewModelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    name: '',
    family: '',
    source: 'local',
    dtype: 'float16',
    num_parameters: 0,
    notes: '',
    metadata: {},
  });
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'configure' | 'benchmark'>('upload');

  // Get available benchmarks for selection
  const { data: benchmarks } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => apiClient.getBenchmarks(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Create model mutation (for simple model creation)
  const createModelMutation = useMutation({
    mutationFn: (modelData: CreateModelRequest) => apiClient.createModel(modelData),
    onSuccess: (model) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success('Model created successfully!');
      router.push(`/models`);
    },
    onError: (error: any) => {
      toast.error(`Failed to create model: ${error.message}`);
    },
  });

  // Upload model files mutation
  const uploadModelMutation = useMutation({
    mutationFn: async () => {
      const files = uploadProgress.map(upload => upload.file);
      return apiClient.uploadModelFiles(files, {
        model_name: modelConfig.name,
        model_family: modelConfig.family,
        model_dtype: modelConfig.dtype,
        num_parameters: modelConfig.num_parameters,
        notes: modelConfig.notes,
        selected_benchmarks: selectedBenchmarks,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success('Model uploaded and created successfully!');
      router.push(`/models`);
    },
    onError: (error: any) => {
      toast.error(`Failed to upload model: ${error.message}`);
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newUploads: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading',
    }));

    setUploadProgress(prev => [...prev, ...newUploads]);
    handleFileUpload(newUploads);
  }, []);

  // Handle file upload progress
  const handleFileUpload = (uploads: UploadProgress[]) => {
    setIsUploading(true);
    
    // Simulate progress for UI feedback
    uploads.forEach((upload, index) => {
      const interval = setInterval(() => {
        setUploadProgress(prev => 
          prev.map(u => {
            if (u.file === upload.file) {
              const newProgress = Math.min(u.progress + Math.random() * 20, 100);
              
              if (newProgress >= 100) {
                clearInterval(interval);
                return {
                  ...u,
                  progress: 100,
                  status: 'completed' as const,
                };
              }
              
              return { ...u, progress: newProgress };
            }
            return u;
          })
        );
      }, 200 + index * 100);
    });

    // Complete all uploads after a delay
    setTimeout(() => {
      setIsUploading(false);
      setCurrentStep('configure');
      toast.success('Files ready for upload!');
    }, 2000);
  };

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    
    if (files.length > 0) {
      const newUploads: UploadProgress[] = files.map(file => ({
        file,
        progress: 0,
        status: 'uploading',
      }));

      setUploadProgress(prev => [...prev, ...newUploads]);
      simulateUpload(newUploads);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // Handle benchmark selection
  const toggleBenchmark = (benchmarkId: string) => {
    setSelectedBenchmarks(prev => 
      prev.includes(benchmarkId) 
        ? prev.filter(id => id !== benchmarkId)
        : [...prev, benchmarkId]
    );
  };

  // Handle model creation
  const handleCreateModel = () => {
    if (!modelConfig.name || !modelConfig.family) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (uploadProgress.length > 0) {
      // Use file upload API if files are present
      uploadModelMutation.mutate();
    } else {
      // Use simple model creation API
      const modelData: CreateModelRequest = {
        ...modelConfig,
        metadata: {
          ...modelConfig.metadata,
          selected_benchmarks: selectedBenchmarks,
        },
      };
      createModelMutation.mutate(modelData);
    }
  };

  // Get file size in human readable format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get total upload progress
  const totalProgress = uploadProgress.length > 0 
    ? uploadProgress.reduce((sum, upload) => sum + upload.progress, 0) / uploadProgress.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Model</h1>
            <p className="text-muted-foreground">
              Upload and configure your local model for benchmarking
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        {[
          { key: 'upload', label: 'Upload Files', icon: Upload },
          { key: 'configure', label: 'Configure Model', icon: Settings },
          { key: 'benchmark', label: 'Select Benchmarks', icon: Play },
        ].map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted = ['upload', 'configure', 'benchmark'].indexOf(currentStep) > index;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2
                ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                ${!isActive && !isCompleted ? 'border-muted-foreground text-muted-foreground' : ''}
              `}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
              {index < 2 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-500' : 'bg-muted'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: File Upload */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload Model Files
            </CardTitle>
            <CardDescription>
              Upload your model files (model weights, config, tokenizer, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Area */}
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Drop files here or click to browse</h3>
              <p className="text-muted-foreground mb-4">
                Supported formats: .bin, .safetensors, .json, .txt, .model, .pth, .pt
              </p>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".bin,.safetensors,.json,.txt,.model,.pth,.pt,.h5,.onnx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Upload Progress</h4>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(totalProgress)}% complete
                  </span>
                </div>
                <Progress value={totalProgress} className="w-full" />
                
                <div className="space-y-2">
                  {uploadProgress.map((upload, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{upload.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(upload.file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={upload.progress} className="w-24" />
                        {upload.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {upload.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadProgress.length > 0 && !isUploading && (
              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep('configure')}>
                  Continue to Configuration
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Model Configuration */}
      {currentStep === 'configure' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Configure Model
            </CardTitle>
            <CardDescription>
              Provide details about your model for proper benchmarking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center">
                  <Brain className="h-4 w-4 mr-2" />
                  Basic Information
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Model Name *</Label>
                  <Input
                    id="name"
                    value={modelConfig.name}
                    onChange={(e) => setModelConfig({ ...modelConfig, name: e.target.value })}
                    placeholder="e.g., My Custom LLaMA Model"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="family">Model Family *</Label>
                  <Select 
                    value={modelConfig.family} 
                    onValueChange={(value) => setModelConfig({ ...modelConfig, family: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model family" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llama">LLaMA</SelectItem>
                      <SelectItem value="mistral">Mistral</SelectItem>
                      <SelectItem value="gpt">GPT</SelectItem>
                      <SelectItem value="bert">BERT</SelectItem>
                      <SelectItem value="t5">T5</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parameters">Number of Parameters</Label>
                  <Input
                    id="parameters"
                    type="number"
                    value={modelConfig.num_parameters}
                    onChange={(e) => setModelConfig({ ...modelConfig, num_parameters: parseInt(e.target.value) || 0 })}
                    placeholder="7000000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dtype">Data Type</Label>
                  <Select 
                    value={modelConfig.dtype} 
                    onValueChange={(value) => setModelConfig({ ...modelConfig, dtype: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="float16">float16</SelectItem>
                      <SelectItem value="float32">float32</SelectItem>
                      <SelectItem value="bfloat16">bfloat16</SelectItem>
                      <SelectItem value="int8">int8</SelectItem>
                      <SelectItem value="int4">int4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Technical Details */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center">
                  <Cpu className="h-4 w-4 mr-2" />
                  Technical Details
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="model_path">Model Path</Label>
                  <Input
                    id="model_path"
                    value={modelConfig.model_path || ''}
                    onChange={(e) => setModelConfig({ ...modelConfig, model_path: e.target.value })}
                    placeholder="/path/to/model.bin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="config_path">Config Path</Label>
                  <Input
                    id="config_path"
                    value={modelConfig.config_path || ''}
                    onChange={(e) => setModelConfig({ ...modelConfig, config_path: e.target.value })}
                    placeholder="/path/to/config.json"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tokenizer_path">Tokenizer Path</Label>
                  <Input
                    id="tokenizer_path"
                    value={modelConfig.tokenizer_path || ''}
                    onChange={(e) => setModelConfig({ ...modelConfig, tokenizer_path: e.target.value })}
                    placeholder="/path/to/tokenizer.json"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={modelConfig.notes}
                    onChange={(e) => setModelConfig({ ...modelConfig, notes: e.target.value })}
                    placeholder="Additional notes about this model..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* System Requirements */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <Monitor className="h-4 w-4 mr-2" />
                System Requirements
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <MemoryStick className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">RAM</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">16GB+ recommended</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Storage</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">20GB+ free space</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">GPU</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">CUDA compatible</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                Back to Upload
              </Button>
              <Button onClick={() => setCurrentStep('benchmark')}>
                Continue to Benchmarks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Benchmark Selection */}
      {currentStep === 'benchmark' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Play className="h-5 w-5 mr-2" />
              Select Benchmarks
            </CardTitle>
            <CardDescription>
              Choose which benchmarks to run on your model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {benchmarks?.benchmarks && benchmarks.benchmarks.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Select benchmarks to run on your model
                  </p>
                  <Badge variant="outline">
                    {selectedBenchmarks.length} selected
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {benchmarks.benchmarks.map((benchmark) => (
                    <Card 
                      key={benchmark.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedBenchmarks.includes(benchmark.id) 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : ''
                      }`}
                      onClick={() => toggleBenchmark(benchmark.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{benchmark.name}</h4>
                          {selectedBenchmarks.includes(benchmark.id) && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <Badge variant="secondary" className="text-xs">
                            {benchmark.modality}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {benchmark.num_samples} samples
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {benchmark.primary_metrics.join(', ')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No benchmarks available</h3>
                <p className="text-muted-foreground">
                  Benchmarks will be loaded from the backend when available.
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('configure')}>
                Back to Configuration
              </Button>
              <Button 
                onClick={handleCreateModel}
                disabled={createModelMutation.isPending || uploadModelMutation.isPending}
              >
                {(createModelMutation.isPending || uploadModelMutation.isPending) 
                  ? 'Creating Model...' 
                  : 'Create Model & Run Benchmarks'
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
