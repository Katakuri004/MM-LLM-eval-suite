'use client'

/**
 * Enhanced New Model Registration Page
 * Supports multiple model loading methods: HuggingFace, Local, API, vLLM, and Batch Upload
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Monitor,
  Github,
  Globe,
  Server,
  FileSpreadsheet,
  Eye,
  Key,
  Link,
  Download,
  Loader2
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

interface HuggingFaceConfig {
  model_path: string;
  auto_detect: boolean;
}

interface LocalConfig {
  model_dir: string;
  model_name?: string;
}

interface APIConfig {
  provider: string;
  model_name: string;
  api_key: string;
  endpoint?: string;
}

interface VLLMConfig {
  endpoint_url: string;
  model_name: string;
  auth_token?: string;
}

interface BatchConfig {
  csv_file: File | null;
  models_data: any[];
}

export function NewModelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // State for different loading methods
  const [activeTab, setActiveTab] = useState<'huggingface' | 'local' | 'api' | 'vllm' | 'batch'>('huggingface');
  
  // Configuration states for each method
  const [huggingfaceConfig, setHuggingfaceConfig] = useState<HuggingFaceConfig>({
    model_path: '',
    auto_detect: true
  });
  
  const [localConfig, setLocalConfig] = useState<LocalConfig>({
    model_dir: '',
    model_name: ''
  });
  
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    provider: 'openai',
    model_name: '',
    api_key: '',
    endpoint: ''
  });
  
  const [vllmConfig, setVllmConfig] = useState<VLLMConfig>({
    endpoint_url: '',
    model_name: '',
    auth_token: ''
  });
  
  const [batchConfig, setBatchConfig] = useState<BatchConfig>({
    csv_file: null,
    models_data: []
  });
  
  // Common state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    name: '',
    family: '',
    source: 'huggingface',
    dtype: 'float16',
    num_parameters: 0,
    notes: '',
    metadata: {},
  });
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);

  // Get available benchmarks for selection
  const { data: benchmarks } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => apiClient.getBenchmarks(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // HuggingFace model registration mutation
  const registerHuggingFaceMutation = useMutation({
    mutationFn: (config: HuggingFaceConfig) => apiClient.registerHuggingFaceModel(config),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success('HuggingFace model registered successfully!');
      router.push(`/models`);
    },
    onError: (error: any) => {
      toast.error(`Failed to register HuggingFace model: ${error.message}`);
    },
  });

  // Local model registration mutation
  const registerLocalMutation = useMutation({
    mutationFn: (config: LocalConfig) => apiClient.registerLocalModel(config),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success('Local model registered successfully!');
      router.push(`/models`);
    },
    onError: (error: any) => {
      toast.error(`Failed to register local model: ${error.message}`);
    },
  });

  // API model registration mutation
  const registerAPIMutation = useMutation({
    mutationFn: (config: APIConfig) => apiClient.registerAPIModel(config),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success('API model registered successfully!');
      router.push(`/models`);
    },
    onError: (error: any) => {
      toast.error(`Failed to register API model: ${error.message}`);
    },
  });

  // vLLM model registration mutation
  const registerVLLMMutation = useMutation({
    mutationFn: (config: VLLMConfig) => apiClient.registerVLLMModel(config),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success('vLLM model registered successfully!');
      router.push(`/models`);
    },
    onError: (error: any) => {
      toast.error(`Failed to register vLLM model: ${error.message}`);
    },
  });

  // Batch model registration mutation
  const registerBatchMutation = useMutation({
    mutationFn: (modelsData: any[]) => apiClient.registerBatchModels(modelsData),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success(`Batch registration completed: ${result.results.successful} successful, ${result.results.failed} failed`);
      router.push(`/models`);
    },
    onError: (error: any) => {
      toast.error(`Failed to register batch models: ${error.message}`);
    },
  });

  // Model validation mutation
  const validateModelMutation = useMutation({
    mutationFn: (modelSource: string) => apiClient.detectModelConfig(modelSource),
    onSuccess: (result) => {
      setValidationResults(result);
      toast.success('Model configuration detected successfully!');
    },
    onError: (error: any) => {
      toast.error(`Failed to detect model configuration: ${error.message}`);
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
      handleFileUpload(newUploads);
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

  // Handle model registration based on active tab
  const handleRegisterModel = () => {
    switch (activeTab) {
      case 'huggingface':
        if (!huggingfaceConfig.model_path) {
          toast.error('Please enter a HuggingFace model path');
          return;
        }
        registerHuggingFaceMutation.mutate(huggingfaceConfig);
        break;
        
      case 'local':
        if (!localConfig.model_dir) {
          toast.error('Please enter a local model directory path');
          return;
        }
        registerLocalMutation.mutate(localConfig);
        break;
        
      case 'api':
        if (!apiConfig.provider || !apiConfig.model_name || !apiConfig.api_key) {
          toast.error('Please fill in all required API fields');
          return;
        }
        registerAPIMutation.mutate(apiConfig);
        break;
        
      case 'vllm':
        if (!vllmConfig.endpoint_url || !vllmConfig.model_name) {
          toast.error('Please fill in all required vLLM fields');
          return;
        }
        registerVLLMMutation.mutate(vllmConfig);
        break;
        
      case 'batch':
        if (!batchConfig.csv_file) {
          toast.error('Please select a CSV file');
          return;
        }
        // Process CSV file and register models
        processBatchCSV();
        break;
    }
  };

  // Handle model validation
  const handleValidateModel = () => {
    let modelSource = '';
    switch (activeTab) {
      case 'huggingface':
        modelSource = huggingfaceConfig.model_path;
        break;
      case 'local':
        modelSource = localConfig.model_dir;
        break;
      case 'api':
        modelSource = apiConfig.endpoint || `api://${apiConfig.provider}`;
        break;
      case 'vllm':
        modelSource = vllmConfig.endpoint_url;
        break;
    }
    
    if (modelSource) {
      setIsValidating(true);
      validateModelMutation.mutate(modelSource);
    }
  };

  // Process batch CSV file
  const processBatchCSV = () => {
    if (!batchConfig.csv_file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const modelsData: any[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',');
            const modelData: any = {};
            headers.forEach((header, index) => {
              modelData[header.trim()] = values[index]?.trim() || '';
            });
            modelsData.push(modelData);
          }
        }
        
        setBatchConfig(prev => ({ ...prev, models_data: modelsData }));
        registerBatchMutation.mutate(modelsData);
      } catch (error) {
        toast.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(batchConfig.csv_file);
  };

  // Handle CSV file selection
  const handleCSVSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBatchConfig(prev => ({ ...prev, csv_file: file }));
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
            <h1 className="text-3xl font-bold tracking-tight">Register New Model</h1>
            <p className="text-muted-foreground">
              Register models from HuggingFace, local files, APIs, vLLM, or batch upload
            </p>
          </div>
        </div>
      </div>

      {/* Model Registration Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="huggingface" className="flex items-center space-x-2">
            <Github className="h-4 w-4" />
            <span>HuggingFace</span>
          </TabsTrigger>
          <TabsTrigger value="local" className="flex items-center space-x-2">
            <HardDrive className="h-4 w-4" />
            <span>Local</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>API</span>
          </TabsTrigger>
          <TabsTrigger value="vllm" className="flex items-center space-x-2">
            <Server className="h-4 w-4" />
            <span>vLLM</span>
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center space-x-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Batch</span>
          </TabsTrigger>
        </TabsList>

        {/* HuggingFace Tab */}
        <TabsContent value="huggingface" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Github className="h-5 w-5 mr-2" />
                HuggingFace Model Registration
              </CardTitle>
              <CardDescription>
                Register models from Hugging Face Hub with auto-detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hf-model-path">Model Path *</Label>
                    <Input
                      id="hf-model-path"
                      value={huggingfaceConfig.model_path}
                      onChange={(e) => setHuggingfaceConfig({ ...huggingfaceConfig, model_path: e.target.value })}
                      placeholder="Qwen/Qwen2-VL-7B-Instruct"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the HuggingFace model repository path
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto-detect"
                      checked={huggingfaceConfig.auto_detect}
                      onChange={(e) => setHuggingfaceConfig({ ...huggingfaceConfig, auto_detect: e.target.checked })}
                    />
                    <Label htmlFor="auto-detect">Auto-detect model properties</Label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Popular Models</h4>
                    <div className="space-y-2">
                      {[
                        'Qwen/Qwen2-VL-7B-Instruct',
                        'llava-hf/llava-1.5-7b-hf',
                        'microsoft/llava-v1.6-mistral-7b',
                        'THUDM/cogvlm-chinese-hf'
                      ].map((model) => (
                        <Button
                          key={model}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setHuggingfaceConfig({ ...huggingfaceConfig, model_path: model })}
                        >
                          {model}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleValidateModel}
                  disabled={!huggingfaceConfig.model_path || isValidating}
                  variant="outline"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Detect Configuration
                </Button>
                
                <Button
                  onClick={handleRegisterModel}
                  disabled={!huggingfaceConfig.model_path || registerHuggingFaceMutation.isPending}
                >
                  {registerHuggingFaceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Register Model
                </Button>
              </div>
              
              {validationResults && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Detection Results</h4>
                  <pre className="text-xs bg-background p-2 rounded border overflow-auto">
                    {JSON.stringify(validationResults, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Local Tab */}
        <TabsContent value="local" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardDrive className="h-5 w-5 mr-2" />
                Local Model Registration
              </CardTitle>
              <CardDescription>
                Register models from your local filesystem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="local-model-dir">Model Directory Path *</Label>
                  <Input
                    id="local-model-dir"
                    value={localConfig.model_dir}
                    onChange={(e) => setLocalConfig({ ...localConfig, model_dir: e.target.value })}
                    placeholder="/path/to/your/model"
                  />
                  <p className="text-xs text-muted-foreground">
                    Path to the directory containing your model files
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="local-model-name">Model Name (Optional)</Label>
                  <Input
                    id="local-model-name"
                    value={localConfig.model_name || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, model_name: e.target.value })}
                    placeholder="Custom Model Name"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleValidateModel}
                  disabled={!localConfig.model_dir || isValidating}
                  variant="outline"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Validate Path
                </Button>
                
                <Button
                  onClick={handleRegisterModel}
                  disabled={!localConfig.model_dir || registerLocalMutation.isPending}
                >
                  {registerLocalMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Register Model
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                API Model Registration
              </CardTitle>
              <CardDescription>
                Register API-based models (OpenAI, Anthropic, Google, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-provider">Provider *</Label>
                    <Select 
                      value={apiConfig.provider} 
                      onValueChange={(value) => setApiConfig({ ...apiConfig, provider: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="azure">Azure OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api-model-name">Model Name *</Label>
                    <Input
                      id="api-model-name"
                      value={apiConfig.model_name}
                      onChange={(e) => setApiConfig({ ...apiConfig, model_name: e.target.value })}
                      placeholder="gpt-4-vision-preview"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key *</Label>
                    <div className="relative">
                      <Input
                        id="api-key"
                        type="password"
                        value={apiConfig.api_key}
                        onChange={(e) => setApiConfig({ ...apiConfig, api_key: e.target.value })}
                        placeholder="sk-..."
                      />
                      <Key className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api-endpoint">Custom Endpoint (Optional)</Label>
                    <Input
                      id="api-endpoint"
                      value={apiConfig.endpoint || ''}
                      onChange={(e) => setApiConfig({ ...apiConfig, endpoint: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleValidateModel}
                  disabled={!apiConfig.provider || !apiConfig.model_name || !apiConfig.api_key || isValidating}
                  variant="outline"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                
                <Button
                  onClick={handleRegisterModel}
                  disabled={!apiConfig.provider || !apiConfig.model_name || !apiConfig.api_key || registerAPIMutation.isPending}
                >
                  {registerAPIMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Register Model
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* vLLM Tab */}
        <TabsContent value="vllm" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                vLLM Model Registration
              </CardTitle>
              <CardDescription>
                Register models served via vLLM distributed inference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vllm-endpoint">vLLM Endpoint URL *</Label>
                  <Input
                    id="vllm-endpoint"
                    value={vllmConfig.endpoint_url}
                    onChange={(e) => setVllmConfig({ ...vllmConfig, endpoint_url: e.target.value })}
                    placeholder="http://localhost:8000"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL of your vLLM server endpoint
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vllm-model-name">Model Name *</Label>
                  <Input
                    id="vllm-model-name"
                    value={vllmConfig.model_name}
                    onChange={(e) => setVllmConfig({ ...vllmConfig, model_name: e.target.value })}
                    placeholder="your-model-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vllm-auth-token">Authentication Token (Optional)</Label>
                  <div className="relative">
                    <Input
                      id="vllm-auth-token"
                      type="password"
                      value={vllmConfig.auth_token || ''}
                      onChange={(e) => setVllmConfig({ ...vllmConfig, auth_token: e.target.value })}
                      placeholder="Bearer token"
                    />
                    <Key className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleValidateModel}
                  disabled={!vllmConfig.endpoint_url || !vllmConfig.model_name || isValidating}
                  variant="outline"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Test Endpoint
                </Button>
                
                <Button
                  onClick={handleRegisterModel}
                  disabled={!vllmConfig.endpoint_url || !vllmConfig.model_name || registerVLLMMutation.isPending}
                >
                  {registerVLLMMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Register Model
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Tab */}
        <TabsContent value="batch" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileSpreadsheet className="h-5 w-5 mr-2" />
                Batch Model Registration
              </CardTitle>
              <CardDescription>
                Register multiple models from a CSV file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV File *</Label>
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => csvInputRef.current?.click()}
                  >
                    <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium mb-1">
                      {batchConfig.csv_file ? batchConfig.csv_file.name : 'Click to select CSV file'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CSV file with model data
                    </p>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCSVSelect}
                      className="hidden"
                    />
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">CSV Format</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Required columns: name, loading_method
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Optional columns: family, path, provider, model_name, api_key, endpoint, modality_support, memory_gb, recommended_gpus, notes
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => {
                    // Create sample CSV
                    const sampleData = [
                      'name,family,loading_method,path,modality_support,memory_gb,recommended_gpus,notes',
                      'Qwen2-VL-7B-Instruct,Qwen2-VL,huggingface,Qwen/Qwen2-VL-7B-Instruct,"text,image",16,1,Qwen2-VL 7B model',
                      'LLaVA-1.5-7B,LLaVA,huggingface,llava-hf/llava-1.5-7b-hf,"text,image",16,1,LLaVA 1.5 7B model'
                    ].join('\n');
                    
                    const blob = new Blob([sampleData], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'models_sample.csv';
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample CSV
                </Button>
                
                <Button
                  onClick={handleRegisterModel}
                  disabled={!batchConfig.csv_file || registerBatchMutation.isPending}
                >
                  {registerBatchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Register Models
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
