'use client'

/**
 * Enhanced Benchmarks page with comprehensive LMMS-Eval benchmark overview
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { 
  Target, 
  Search, 
  TrendingUp, 
  Award, 
  Clock, 
  Users, 
  BarChart3,
  BookOpen,
  Calculator,
  Brain,
  Globe,
  Zap,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
  Play,
  MessageSquare,
  Image,
  Mic,
  Video,
  FileImage,
  ArrowRight,
  Activity,
  PieChart,
  Layers,
  Eye,
  Headphones,
  Camera,
  Film
} from 'lucide-react'

interface ModalityStats {
  name: string
  icon: React.ComponentType<{ className?: string }>
  count: number
  totalSamples: number
  avgScore: number
  topModel: string
  color: string
  description: string
}

const modalityStats: ModalityStats[] = [
  {
    name: 'Text',
    icon: MessageSquare,
    count: 10,
    totalSamples: 1500000,
    avgScore: 68.5,
    topModel: 'GPT-4o',
    color: 'bg-blue-500',
    description: 'Language understanding, reasoning, and knowledge tasks'
  },
  {
    name: 'Vision',
    icon: Image,
    count: 12,
    totalSamples: 600000,
    avgScore: 71.2,
    topModel: 'GPT-4o',
    color: 'bg-green-500',
    description: 'Visual question answering and image understanding'
  },
  {
    name: 'Audio',
    icon: Mic,
    count: 12,
    totalSamples: 2000000,
    avgScore: 75.8,
    topModel: 'Whisper-Large-v3',
    color: 'bg-purple-500',
    description: 'Speech recognition and audio understanding'
  },
  {
    name: 'Video',
    icon: Video,
    count: 12,
    totalSamples: 200000,
    avgScore: 58.3,
    topModel: 'GPT-4o',
    color: 'bg-orange-500',
    description: 'Video understanding and temporal reasoning'
  },
  {
    name: 'Multimodal',
    icon: FileImage,
    count: 15,
    totalSamples: 800000,
    avgScore: 66.7,
    topModel: 'GPT-4o',
    color: 'bg-pink-500',
    description: 'Cross-modal understanding and reasoning'
  }
]

const recentBenchmarks = [
  {
    id: 'mmlu_pro',
    name: 'MMLU-Pro',
    modality: 'Text',
    samples: 12000,
    difficulty: 'Hard',
    avgScore: 61.8,
    topModel: 'GPT-4o',
    updated: '2024-01-16'
  },
  {
    id: 'videomme',
    name: 'VideoMME',
    modality: 'Video',
    samples: 6000,
    difficulty: 'Medium',
    avgScore: 58.9,
    topModel: 'GPT-4o',
    updated: '2024-01-15'
  },
  {
    id: 'wavcaps',
    name: 'WavCaps',
    modality: 'Audio',
    samples: 400000,
    difficulty: 'Hard',
    avgScore: 65.8,
    topModel: 'GPT-4o',
    updated: '2024-01-14'
  },
  {
    id: 'scienceqa',
    name: 'ScienceQA',
    modality: 'Multimodal',
    samples: 21208,
    difficulty: 'Medium',
    avgScore: 68.9,
    topModel: 'GPT-4o',
    updated: '2024-01-13'
  }
]

const topModels = [
  { name: 'GPT-4o', score: 89.2, benchmarks: 45, color: 'bg-blue-500' },
  { name: 'Claude-3.5-Sonnet', score: 87.1, benchmarks: 42, color: 'bg-green-500' },
  { name: 'Whisper-Large-v3', score: 85.8, benchmarks: 12, color: 'bg-purple-500' },
  { name: 'Gemini-2.0-Flash', score: 83.4, benchmarks: 38, color: 'bg-orange-500' },
  { name: 'Llama-3.1-405B', score: 81.7, benchmarks: 35, color: 'bg-pink-500' }
]

export function Benchmarks() {
  const [searchTerm, setSearchTerm] = useState('')

  const totalBenchmarks = modalityStats.reduce((sum, m) => sum + m.count, 0)
  const totalSamples = modalityStats.reduce((sum, m) => sum + m.totalSamples, 0)
  const overallAvgScore = Math.round(modalityStats.reduce((sum, m) => sum + m.avgScore, 0) / modalityStats.length)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Benchmarks Overview</h1>
          <p className="text-muted-foreground">
            Comprehensive evaluation benchmarks for Large Multimodal Models
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Target className="h-3 w-3" />
            <span>{totalBenchmarks} Benchmarks</span>
          </Badge>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Benchmarks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBenchmarks}</div>
            <p className="text-xs text-muted-foreground">
              Across 5 modalities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Samples</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalSamples / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              Evaluation samples
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallAvgScore}%</div>
            <p className="text-xs text-muted-foreground">
              Across all benchmarks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GPT-4o</div>
            <p className="text-xs text-muted-foreground">
              Leading model
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modality Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Benchmarks by Modality</CardTitle>
          <CardDescription>
            Explore benchmarks organized by input modality and task type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modalityStats.map((modality) => {
              const Icon = modality.icon
              return (
                <Link key={modality.name} href={`/benchmarks/${modality.name.toLowerCase()}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${modality.color} text-white`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{modality.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {modality.count} benchmarks
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {modality.description}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Samples</span>
                          <span className="font-medium">
                            {(modality.totalSamples / 1000).toFixed(0)}K
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Avg Score</span>
                          <span className="font-medium">{modality.avgScore}%</span>
                        </div>
                        
                        <div className="space-y-1">
                          <Progress value={modality.avgScore} className="h-2" />
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Top Model</span>
                          <span className="font-medium">{modality.topModel}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-muted-foreground">View Details</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="models">Top Models</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Access to Modality Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
              <CardDescription>
                Navigate to specific modality benchmark pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-5">
                <Link href="/benchmarks/text">
                  <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                    <MessageSquare className="h-6 w-6" />
                    <span>Text</span>
                  </Button>
                </Link>
                <Link href="/benchmarks/vision">
                  <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                    <Image className="h-6 w-6" />
                    <span>Vision</span>
                  </Button>
                </Link>
                <Link href="/benchmarks/audio">
                  <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                    <Mic className="h-6 w-6" />
                    <span>Audio</span>
                  </Button>
                </Link>
                <Link href="/benchmarks/video">
                  <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                    <Video className="h-6 w-6" />
                    <span>Video</span>
                  </Button>
                </Link>
                <Link href="/benchmarks/multimodal">
                  <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                    <FileImage className="h-6 w-6" />
                    <span>Multimodal</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recently Updated Benchmarks</CardTitle>
              <CardDescription>
                Latest benchmark additions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBenchmarks.map((benchmark) => (
                  <div key={benchmark.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {benchmark.modality === 'Text' && <MessageSquare className="h-5 w-5 text-primary" />}
                        {benchmark.modality === 'Vision' && <Image className="h-5 w-5 text-primary" />}
                        {benchmark.modality === 'Audio' && <Mic className="h-5 w-5 text-primary" />}
                        {benchmark.modality === 'Video' && <Video className="h-5 w-5 text-primary" />}
                        {benchmark.modality === 'Multimodal' && <FileImage className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <h3 className="font-medium">{benchmark.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {benchmark.modality} • {benchmark.samples.toLocaleString()} samples
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">{benchmark.avgScore}%</div>
                        <div className="text-sm text-muted-foreground">{benchmark.topModel}</div>
                      </div>
                      <Badge variant={benchmark.difficulty === 'Hard' ? 'destructive' : benchmark.difficulty === 'Medium' ? 'default' : 'secondary'}>
                        {benchmark.difficulty}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Models</CardTitle>
              <CardDescription>
                Models with the highest average scores across benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topModels.map((model, index) => (
                  <div key={model.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{model.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {model.benchmarks} benchmarks evaluated
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">{model.score}%</div>
                        <div className="text-sm text-muted-foreground">Avg Score</div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${model.color}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Benchmark Distribution</CardTitle>
                <CardDescription>
                  Number of benchmarks by modality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modalityStats.map((modality) => (
                    <div key={modality.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${modality.color}`}></div>
                        <span className="text-sm font-medium">{modality.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${modality.color}`}
                            style={{ width: `${(modality.count / totalBenchmarks) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{modality.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sample Distribution</CardTitle>
                <CardDescription>
                  Total samples by modality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modalityStats.map((modality) => (
                    <div key={modality.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${modality.color}`}></div>
                        <span className="text-sm font-medium">{modality.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${modality.color}`}
                            style={{ width: `${(modality.totalSamples / totalSamples) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-12">
                          {(modality.totalSamples / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}