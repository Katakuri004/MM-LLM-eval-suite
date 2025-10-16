'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
// ScrollArea not available, using div with overflow instead
import { Separator } from '@/components/ui/separator'
import { 
  BookOpen, 
  Code, 
  Rocket, 
  HelpCircle, 
  ExternalLink, 
  FileText, 
  Target, 
  Brain,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface DocumentationSection {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  content: React.ReactNode
}

export function Documentation() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    toast({
      title: "Copied to clipboard",
      description: "Code snippet has been copied to your clipboard.",
    })
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const CodeBlock = ({ code, language = "bash", id }: { code: string; language?: string; id: string }) => (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-8 w-8 p-0"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedCode === id ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )

  const documentationSections: DocumentationSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Quick start guide and basic setup',
      icon: HelpCircle,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Welcome to LMMS-Eval Dashboard</h3>
            <p className="text-muted-foreground mb-4">
              The LMMS-Eval Dashboard is a comprehensive web-based interface for the lmms-eval benchmarking framework. 
              It enables you to orchestrate multimodal model evaluations, monitor real-time progress, and visualize results.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Clone and Setup</h4>
                <CodeBlock 
                  code={`git clone <repository-url>
cd gui-test-suite
cd backend && pip install -r requirements.txt
cd ../frontend && npm install`}
                  id="setup-commands"
                />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Configure Environment</h4>
                <CodeBlock 
                  code={`# Backend .env
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SECRET_KEY=your_secret_key_here`}
                  id="env-config"
                />
              </div>

              <div>
                <h4 className="font-medium mb-2">3. Start Services</h4>
                <CodeBlock 
                  code={`# Terminal 1: Backend
cd backend && python main.py

# Terminal 2: Frontend  
cd frontend && npm run dev`}
                  id="start-services"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">🚀 Core Functionality</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Multimodal Evaluation (Text, Image, Video, Audio)</li>
                    <li>• Real-time Monitoring</li>
                    <li>• Model Management</li>
                    <li>• Benchmark Management</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">🔧 Advanced Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Distributed Evaluation</li>
                    <li>• Scheduled Evaluations</li>
                    <li>• Custom Benchmarks</li>
                    <li>• Performance Analytics</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      description: 'Complete API documentation and endpoints',
      icon: Code,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">API Overview</h3>
            <p className="text-muted-foreground mb-4">
              The LMMS-Eval Dashboard API provides comprehensive endpoints for managing evaluation runs, 
              models, benchmarks, and analytics.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Base URL</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code="http://localhost:8000/api/v1" id="base-url" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                All API endpoints require authentication using JWT tokens:
              </p>
              <CodeBlock 
                code={`Authorization: Bearer <your-jwt-token>`}
                id="auth-header"
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Run Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium">Create Run</h4>
                  <CodeBlock 
                    code={`POST /runs/create
Content-Type: application/json

{
  "name": "LLaVA-1.5-7B-VQA-Test",
  "model_id": "uuid",
  "benchmark_ids": ["uuid1", "uuid2"],
  "config": {
    "seed": 42,
    "shots": 0,
    "temperature": 0.0
  }
}`}
                    id="create-run"
                  />
                </div>
                <div>
                  <h4 className="font-medium">Get Run Status</h4>
                  <CodeBlock 
                    code={`GET /runs/{run_id}`}
                    id="get-run"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Model Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium">List Models</h4>
                  <CodeBlock 
                    code={`GET /models?family=LLaVA&limit=50`}
                    id="list-models"
                  />
                </div>
                <div>
                  <h4 className="font-medium">Get Model Details</h4>
                  <CodeBlock 
                    code={`GET /models/{model_id}`}
                    id="get-model"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>WebSocket Real-time Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock 
                code={`const ws = new WebSocket('ws://localhost:8000/ws/runs/{run_id}');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'progress':
      updateProgress(message.data);
      break;
    case 'metric_update':
      updateMetrics(message.data);
      break;
    case 'log_line':
      addLogLine(message.data);
      break;
  }
};`}
                id="websocket-example"
              />
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'deployment',
      title: 'Deployment Guide',
      description: 'Production deployment and configuration',
      icon: Rocket,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Deployment Options</h3>
            <p className="text-muted-foreground mb-4">
              Deploy the LMMS-Eval Dashboard in various environments from local development to production clusters.
            </p>
          </div>

          <Tabs defaultValue="docker" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="docker">Docker</TabsTrigger>
              <TabsTrigger value="kubernetes">Kubernetes</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
            </TabsList>
            
            <TabsContent value="docker" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Docker Deployment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">1. Environment Configuration</h4>
                    <CodeBlock 
                      code={`# .env file
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SECRET_KEY=your_secret_key_here
REDIS_URL=redis://redis:6379`}
                      id="docker-env"
                    />
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">2. Start Services</h4>
                    <CodeBlock 
                      code={`docker-compose up -d`}
                      id="docker-start"
                    />
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">3. Verify Deployment</h4>
                    <CodeBlock 
                      code={`# Check service status
docker-compose ps

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:3000`}
                      id="docker-verify"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="kubernetes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Kubernetes Deployment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">1. Create Namespace</h4>
                    <CodeBlock 
                      code={`kubectl create namespace lmms-eval`}
                      id="k8s-namespace"
                    />
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">2. Deploy ConfigMap</h4>
                    <CodeBlock 
                      code={`apiVersion: v1
kind: ConfigMap
metadata:
  name: lmms-eval-config
  namespace: lmms-eval
data:
  SUPABASE_URL: "your_supabase_url"
  SUPABASE_KEY: "your_supabase_key"
  REDIS_URL: "redis://redis:6379"`}
                      id="k8s-configmap"
                    />
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">3. Deploy Services</h4>
                    <CodeBlock 
                      code={`kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml`}
                      id="k8s-deploy"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="production" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Production Considerations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Security</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Use TLS/SSL for all communications</li>
                      <li>• Implement proper firewall rules</li>
                      <li>• Enable Supabase Auth with strong policies</li>
                      <li>• Use JWT tokens with appropriate expiration</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Monitoring</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Set up Prometheus metrics collection</li>
                      <li>• Configure Grafana dashboards</li>
                      <li>• Implement log aggregation</li>
                      <li>• Set up health checks and alerts</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Backup Strategy</h4>
                    <CodeBlock 
                      code={`# Database backup
pg_dump -h localhost -U postgres -d lmms_eval > backup.sql

# File storage backup
tar -czf artifacts-backup.tar.gz ./uploads ./artifacts`}
                      id="backup-commands"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )
    },
    {
      id: 'benchmarks',
      title: 'Benchmark Guide',
      description: 'Understanding and using benchmarks',
      icon: Target,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Benchmark Overview</h3>
            <p className="text-muted-foreground mb-4">
              The LMMS-Eval framework supports comprehensive evaluation across multiple modalities with standardized benchmarks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Text Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="secondary">Question Answering</Badge>
                  <Badge variant="secondary">Reading Comprehension</Badge>
                  <Badge variant="secondary">Text Generation</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Vision Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="secondary">VQA</Badge>
                  <Badge variant="secondary">OCR</Badge>
                  <Badge variant="secondary">Image Captioning</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Audio Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="secondary">Speech Recognition</Badge>
                  <Badge variant="secondary">Audio Classification</Badge>
                  <Badge variant="secondary">Music Analysis</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Video Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="secondary">Video QA</Badge>
                  <Badge variant="secondary">Action Recognition</Badge>
                  <Badge variant="secondary">Video Captioning</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Running Benchmarks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Select Model and Benchmarks</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose your model and the benchmarks you want to evaluate against.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Configure Evaluation</h4>
                <CodeBlock 
                  code={`{
  "seed": 42,
  "shots": 0,
  "temperature": 0.0,
  "compute_profile": "4070-8GB"
}`}
                  id="benchmark-config"
                />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">3. Monitor Progress</h4>
                <p className="text-sm text-muted-foreground">
                  Use the real-time dashboard to monitor evaluation progress, view logs, and track metrics.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Understanding Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Primary Metrics</h4>
                  <p className="text-sm text-muted-foreground">
                    The main evaluation metric for each benchmark (e.g., accuracy, F1-score).
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Secondary Metrics</h4>
                  <p className="text-sm text-muted-foreground">
                    Additional metrics that provide deeper insights into model performance.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Slice Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Performance breakdown by data slices (e.g., gender, age groups, difficulty levels).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'model-guide',
      title: 'Model Guide',
      description: 'Adding and managing models',
      icon: Brain,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Model Management</h3>
            <p className="text-muted-foreground mb-4">
              Learn how to add, configure, and manage multimodal models in the LMMS-Eval Dashboard.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Adding New Models</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Model Registration</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Register your model with the system by providing model details and source information.
                </p>
                <CodeBlock 
                  code={`{
  "name": "LLaVA-1.5-7B",
  "family": "LLaVA",
  "source": "huggingface://llava-hf/llava-1.5-7b-hf",
  "dtype": "float16",
  "num_parameters": 7000000000,
  "notes": "LLaVA 1.5 7B model"
}`}
                  id="model-registration"
                />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Model Families</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Organize models into families for easier management and comparison.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge>LLaVA</Badge>
                  <Badge>InstructBLIP</Badge>
                  <Badge>Qwen-VL</Badge>
                  <Badge>GPT-4V</Badge>
                  <Badge>Claude-3</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Supported Sources</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Hugging Face:</strong> huggingface://model-name</li>
                  <li>• <strong>Local Path:</strong> /path/to/model</li>
                  <li>• <strong>Custom URLs:</strong> https://example.com/model</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Model Parameters</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Data Type:</strong> float16, float32, bfloat16</li>
                  <li>• <strong>Parameter Count:</strong> For memory estimation</li>
                  <li>• <strong>Checkpoints:</strong> Multiple model versions</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Model Naming</h4>
                  <p className="text-sm text-muted-foreground">
                    Use consistent naming conventions: Family-Version-Size (e.g., LLaVA-1.5-7B).
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Documentation</h4>
                  <p className="text-sm text-muted-foreground">
                    Include detailed notes about model capabilities, training data, and known limitations.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Version Control</h4>
                  <p className="text-sm text-muted-foreground">
                    Track model checkpoints and maintain version history for reproducibility.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ]

  const [activeSection, setActiveSection] = useState('getting-started')

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r bg-muted/50 p-4">
        <div className="space-y-2">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Documentation
          </h2>
          <div className="h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="space-y-1">
              {documentationSections.map((section) => {
                const Icon = section.icon
                return (
                  <Button
                    key={section.id}
                    variant={activeSection === section.id ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto p-3"
                    onClick={() => setActiveSection(section.id)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{section.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {section.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="h-[calc(100vh-3rem)] overflow-y-auto">
          <div className="max-w-4xl">
            {documentationSections.find(section => section.id === activeSection)?.content}
          </div>
        </div>
      </div>
    </div>
  )
}
