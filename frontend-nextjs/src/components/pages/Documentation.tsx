'use client'

/**
 * Comprehensive Documentation page for LMMS-Eval Dashboard
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BookOpen, 
  Code, 
  Target, 
  Brain, 
  Play, 
  BarChart3,
  Settings,
  HelpCircle,
  ExternalLink,
  Download,
  Copy,
  Check,
  ArrowRight,
  Users,
  Zap,
  Shield,
  Globe,
  Database,
  Cpu,
  Image,
  Mic,
  Video,
  FileImage,
  MessageSquare,
  Calculator,
  Search,
  Filter,
  TrendingUp,
  Award
} from 'lucide-react'

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
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const CodeBlock = ({ code, language = 'bash', id }: { code: string; language?: string; id: string }) => (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedCode === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )

  const documentationSections: DocumentationSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Quick start guide for the LMMS-Eval Dashboard',
      icon: HelpCircle,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Welcome to LMMS-Eval Dashboard</h3>
            <p className="text-muted-foreground mb-4">
              The LMMS-Eval Dashboard is a comprehensive platform for evaluating and benchmarking 
              Large Multimodal Models (LMMs) across various tasks and modalities.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Quick Start</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  <li>1. Navigate to the Dashboard for an overview</li>
                  <li>2. Browse available Models in the Models section</li>
                  <li>3. Explore Benchmarks by modality</li>
                  <li>4. Run Evaluations on your models</li>
                  <li>5. View Results in the Leaderboard</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Key Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Multi-modal benchmark support</li>
                  <li>• Real-time evaluation tracking</li>
                  <li>• Comprehensive leaderboards</li>
                  <li>• Model comparison tools</li>
                  <li>• Export capabilities</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">System Requirements</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Backend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>• Python 3.8+</li>
                    <li>• FastAPI</li>
                    <li>• Supabase</li>
                    <li>• LMMS-Eval</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Frontend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>• Node.js 18+</li>
                    <li>• Next.js 14</li>
                    <li>• React 18</li>
                    <li>• TypeScript</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Browser</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>• Chrome 90+</li>
                    <li>• Firefox 88+</li>
                    <li>• Safari 14+</li>
                    <li>• Edge 90+</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
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
              The LMMS-Eval Dashboard provides a RESTful API for programmatic access to 
              all functionality including model management, evaluation runs, and results.
            </p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Base URL</CardTitle>
                <CardDescription>All API endpoints are relative to this base URL</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock 
                  code="http://localhost:8000/api/v1" 
                  id="base-url"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>API authentication using API keys</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Include your API key in the Authorization header:
                  </p>
                  <CodeBlock 
                    code="Authorization: Bearer YOUR_API_KEY" 
                    id="auth-header"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>Models API</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><Badge variant="outline">GET</Badge> /models - List all models</div>
                    <div><Badge variant="outline">POST</Badge> /models - Create new model</div>
                    <div><Badge variant="outline">GET</Badge> /models/{"{id}"} - Get model details</div>
                    <div><Badge variant="outline">PUT</Badge> /models/{"{id}"} - Update model</div>
                    <div><Badge variant="outline">DELETE</Badge> /models/{"{id}"} - Delete model</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Play className="h-5 w-5" />
                    <span>Evaluations API</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><Badge variant="outline">GET</Badge> /runs - List evaluation runs</div>
                    <div><Badge variant="outline">POST</Badge> /runs - Start new evaluation</div>
                    <div><Badge variant="outline">GET</Badge> /runs/{"{id}"} - Get run details</div>
                    <div><Badge variant="outline">POST</Badge> /runs/{"{id}"}/cancel - Cancel run</div>
                    <div><Badge variant="outline">GET</Badge> /runs/{"{id}"}/results - Get results</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Benchmarks API</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><Badge variant="outline">GET</Badge> /benchmarks - List benchmarks</div>
                    <div><Badge variant="outline">GET</Badge> /benchmarks/{"{id}"} - Get benchmark details</div>
                    <div><Badge variant="outline">GET</Badge> /benchmarks/{"{id}"}/results - Get results</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Analytics API</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><Badge variant="outline">GET</Badge> /analytics/overview - Dashboard stats</div>
                    <div><Badge variant="outline">GET</Badge> /analytics/trends - Performance trends</div>
                    <div><Badge variant="outline">GET</Badge> /analytics/compare - Model comparison</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Example API Usage</CardTitle>
                <CardDescription>Creating a new evaluation run</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock 
                  code={`curl -X POST "http://localhost:8000/api/v1/runs" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Evaluation Run",
    "model_id": "gpt-4o",
    "benchmark_id": "mmlu",
    "checkpoint_variant": "latest",
    "config": {
      "batch_size": 32,
      "max_samples": 1000
    }
  }'`}
                  id="api-example"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'benchmark-guide',
      title: 'Benchmark Guide',
      description: 'Understanding and using benchmarks effectively',
      icon: Target,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Available Benchmarks</h3>
            <p className="text-muted-foreground mb-4">
              LMMS-Eval supports a comprehensive suite of benchmarks across multiple modalities 
              to evaluate model performance on various tasks.
            </p>
          </div>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Text Modality</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">MMLU</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Massive Multitask Language Understanding - 57 academic subjects
                    </p>
                    <Badge variant="secondary">15,908 samples</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">GSM8K</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Grade School Math 8K - Mathematical reasoning problems
                    </p>
                    <Badge variant="secondary">8,179 samples</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">HellaSwag</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Commonsense reasoning about physical situations
                    </p>
                    <Badge variant="secondary">10,042 samples</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">ARC-Challenge</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      AI2 Reasoning Challenge - Science questions
                    </p>
                    <Badge variant="secondary">2,592 samples</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Image className="h-5 w-5" />
                  <span>Vision Modality</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">VQA-v2</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Visual Question Answering v2 - Open-ended questions about images
                    </p>
                    <Badge variant="secondary">265,016 samples</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">TextVQA</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Text-based Visual Question Answering - Reading text in images
                    </p>
                    <Badge variant="secondary">45,336 samples</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">OK-VQA</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Outside Knowledge VQA - Questions requiring external knowledge
                    </p>
                    <Badge variant="secondary">14,055 samples</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">GQA</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Compositional question answering about real-world images
                    </p>
                    <Badge variant="secondary">943,000 samples</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mic className="h-5 w-5" />
                  <span>Audio Modality</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">LibriSpeech</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Large-scale English speech recognition corpus
                    </p>
                    <Badge variant="secondary">281,241 samples</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Common Voice</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Multilingual speech recognition across 100+ languages
                    </p>
                    <Badge variant="secondary">1,000,000 samples</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="h-5 w-5" />
                  <span>Video Modality</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">MSR-VTT</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Video Question Answering - Questions about video content
                    </p>
                    <Badge variant="secondary">10,000 samples</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">ActivityNet</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Temporal action localization in untrimmed videos
                    </p>
                    <Badge variant="secondary">20,000 samples</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileImage className="h-5 w-5" />
                  <span>Multimodal</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">ScienceQA</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Multimodal science question answering with images and text
                    </p>
                    <Badge variant="secondary">21,208 samples</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">AI2D</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      AI2 Diagram Understanding - Questions about scientific diagrams
                    </p>
                    <Badge variant="secondary">15,017 samples</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Running Benchmarks</h3>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Step 1: Select a Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose from available models or add your own custom model.
                  </p>
                  <CodeBlock 
                    code='curl -X GET "http://localhost:8000/api/v1/models"' 
                    id="select-model"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Step 2: Choose a Benchmark</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select the benchmark you want to evaluate your model on.
                  </p>
                  <CodeBlock 
                    code='curl -X GET "http://localhost:8000/api/v1/benchmarks"' 
                    id="select-benchmark"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Step 3: Start Evaluation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create a new evaluation run with your selected model and benchmark.
                  </p>
                  <CodeBlock 
                    code={`curl -X POST "http://localhost:8000/api/v1/runs" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Evaluation",
    "model_id": "gpt-4o",
    "benchmark_id": "mmlu"
  }'`}
                    id="start-evaluation"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'model-guide',
      title: 'Model Guide',
      description: 'Managing and configuring models for evaluation',
      icon: Brain,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Model Management</h3>
            <p className="text-muted-foreground mb-4">
              Learn how to add, configure, and manage models in the LMMS-Eval Dashboard.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Supported Model Types</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Text Models:</strong> GPT-4, Claude, Llama, Qwen</li>
                  <li>• <strong>Vision Models:</strong> GPT-4V, Claude-3.5-Sonnet</li>
                  <li>• <strong>Multimodal:</strong> GPT-4o, Gemini Pro Vision</li>
                  <li>• <strong>Custom Models:</strong> Your own fine-tuned models</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Model Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Model name and description</li>
                  <li>• API endpoints and credentials</li>
                  <li>• Model parameters and settings</li>
                  <li>• Checkpoint variants</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Adding a New Model</h3>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Step 1: Model Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock 
                    code={`{
  "name": "My Custom Model",
  "description": "A custom fine-tuned model",
  "model_type": "text",
  "provider": "custom",
  "api_endpoint": "https://api.example.com/v1/chat/completions",
  "api_key": "your-api-key-here"
}`}
                    id="model-info"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Step 2: Create Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock 
                    code={`curl -X POST "http://localhost:8000/api/v1/models" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Custom Model",
    "description": "A custom fine-tuned model",
    "model_type": "text",
    "provider": "custom",
    "api_endpoint": "https://api.example.com/v1/chat/completions",
    "api_key": "your-api-key-here"
  }'`}
                    id="create-model"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Step 3: Test Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Test your model with a simple evaluation to ensure it's working correctly.
                  </p>
                  <CodeBlock 
                    code={`curl -X POST "http://localhost:8000/api/v1/runs" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Model Test",
    "model_id": "your-model-id",
    "benchmark_id": "hellaswag",
    "max_samples": 10
  }'`}
                    id="test-model"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Model Performance</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Text Models</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>GPT-4o</span>
                      <Badge variant="outline">89%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Claude 3.5 Sonnet</span>
                      <Badge variant="outline">87%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Llama 3.1 405B</span>
                      <Badge variant="outline">82%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vision Models</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>GPT-4o</span>
                      <Badge variant="outline">87%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Claude 3.5 Sonnet</span>
                      <Badge variant="outline">84%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Gemini 2.0 Flash</span>
                      <Badge variant="outline">81%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Multimodal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>GPT-4o</span>
                      <Badge variant="outline">89%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Claude 3.5 Sonnet</span>
                      <Badge variant="outline">86%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Gemini 2.0 Flash</span>
                      <Badge variant="outline">83%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="text-muted-foreground">
            Comprehensive guide to using the LMMS-Eval Dashboard
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <BookOpen className="h-3 w-3" />
            <span>v1.0.0</span>
          </Badge>
        </div>
      </div>

      {/* Documentation Tabs */}
      <Tabs defaultValue="getting-started" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {documentationSections.map((section) => (
            <TabsTrigger key={section.id} value={section.id} className="flex items-center space-x-2">
              <section.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{section.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {documentationSections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <section.icon className="h-5 w-5" />
                  <span>{section.title}</span>
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {section.content}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Useful resources and external links</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium">External Resources</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  LMMS-Eval GitHub Repository
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Paper: LMMS-Eval
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Hugging Face Models
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Support</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  FAQ & Troubleshooting
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Community Forum
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download Examples
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
