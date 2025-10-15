'use client'

/**
 * Video Benchmarks page with comprehensive LMMS-Eval video benchmarks
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  Video, 
  Search, 
  TrendingUp, 
  Award, 
  BarChart3,
  Play,
  Film,
  Camera,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
  Activity,
  Eye,
  MessageSquare,
  Zap,
  Calculator,
  Layers
} from 'lucide-react'

interface Benchmark {
  id: string
  name: string
  description: string
  category: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  samples: number
  metrics: string[]
  tags: string[]
  dataset_path: string
  output_type: string
  few_shot: boolean
  avg_score?: number
  top_model?: string
  last_updated: string
  video_duration?: string
  resolution?: string
  task_type: string
}

const videoBenchmarks: Benchmark[] = [
  {
    id: 'activitynetqa',
    name: 'ActivityNet-QA',
    description: 'Video question answering about human activities and temporal understanding.',
    category: 'Video QA',
    difficulty: 'Hard',
    samples: 10000,
    metrics: ['gpt_eval_score', 'gpt_eval_accuracy'],
    tags: ['video_qa', 'activities', 'temporal'],
    dataset_path: 'lmms-lab/activitynetqa',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 68.5,
    top_model: 'GPT-4o',
    last_updated: '2024-01-15',
    video_duration: '2-3 minutes',
    resolution: '224x224',
    task_type: 'Activity Video QA'
  },
  {
    id: 'nextqa',
    name: 'NExT-QA',
    description: 'Next event prediction and causal reasoning in video sequences.',
    category: 'Video Reasoning',
    difficulty: 'Hard',
    samples: 5000,
    metrics: ['accuracy'],
    tags: ['video_reasoning', 'causal', 'event_prediction'],
    dataset_path: 'lmms-lab/nextqa',
    output_type: 'multiple_choice',
    few_shot: false,
    avg_score: 54.2,
    top_model: 'GPT-4o',
    last_updated: '2024-01-14',
    video_duration: '1-2 minutes',
    resolution: '224x224',
    task_type: 'Causal Video Reasoning'
  },
  {
    id: 'charades_sta',
    name: 'Charades-STA',
    description: 'Spatio-temporal action localization in video sequences.',
    category: 'Action Localization',
    difficulty: 'Hard',
    samples: 15000,
    metrics: ['iou'],
    tags: ['action_localization', 'spatio_temporal', 'localization'],
    dataset_path: 'lmms-lab/charades_sta',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 45.8,
    top_model: 'GPT-4o',
    last_updated: '2024-01-13',
    video_duration: '30 seconds',
    resolution: '224x224',
    task_type: 'Spatio-temporal Action Localization'
  },
  {
    id: 'moviechat',
    name: 'MovieChat',
    description: 'Long-form video understanding and conversation about movie content.',
    category: 'Long Video',
    difficulty: 'Hard',
    samples: 8000,
    metrics: ['accuracy'],
    tags: ['long_video', 'movie', 'conversation'],
    dataset_path: 'lmms-lab/moviechat',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 62.3,
    top_model: 'GPT-4o',
    last_updated: '2024-01-12',
    video_duration: '90+ minutes',
    resolution: '224x224',
    task_type: 'Long-form Video Understanding'
  },
  {
    id: 'videochatgpt',
    name: 'VideoChatGPT',
    description: 'Conversational video understanding with natural language interactions.',
    category: 'Video Conversation',
    difficulty: 'Medium',
    samples: 12000,
    metrics: ['accuracy'],
    tags: ['conversation', 'video_understanding', 'natural_language'],
    dataset_path: 'lmms-lab/videochatgpt',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 71.7,
    top_model: 'GPT-4o',
    last_updated: '2024-01-11',
    video_duration: '1-5 minutes',
    resolution: '224x224',
    task_type: 'Conversational Video Understanding'
  },
  {
    id: 'videomme',
    name: 'VideoMME',
    description: 'Multimodal evaluation of video understanding capabilities.',
    category: 'Video Evaluation',
    difficulty: 'Medium',
    samples: 6000,
    metrics: ['accuracy'],
    tags: ['multimodal', 'evaluation', 'video_understanding'],
    dataset_path: 'lmms-lab/videomme',
    output_type: 'multiple_choice',
    few_shot: false,
    avg_score: 58.9,
    top_model: 'GPT-4o',
    last_updated: '2024-01-10',
    video_duration: '30-60 seconds',
    resolution: '224x224',
    task_type: 'Multimodal Video Evaluation'
  },
  {
    id: 'videomathqa',
    name: 'VideoMathQA',
    description: 'Mathematical reasoning in video contexts with visual problem solving.',
    category: 'Video Math',
    difficulty: 'Hard',
    samples: 3000,
    metrics: ['exact_match'],
    tags: ['math', 'video_reasoning', 'visual_problem_solving'],
    dataset_path: 'lmms-lab/videomathqa',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 42.6,
    top_model: 'GPT-4o',
    last_updated: '2024-01-09',
    video_duration: '1-3 minutes',
    resolution: '224x224',
    task_type: 'Video Mathematical Reasoning'
  },
  {
    id: 'videommmu',
    name: 'VideoMMMU',
    description: 'Multimodal understanding evaluation with video, text, and reasoning.',
    category: 'Multimodal Video',
    difficulty: 'Hard',
    samples: 4000,
    metrics: ['accuracy'],
    tags: ['multimodal', 'reasoning', 'video_understanding'],
    dataset_path: 'lmms-lab/videommmu',
    output_type: 'multiple_choice',
    few_shot: false,
    avg_score: 48.3,
    top_model: 'GPT-4o',
    last_updated: '2024-01-08',
    video_duration: '1-2 minutes',
    resolution: '224x224',
    task_type: 'Multimodal Video Understanding'
  },
  {
    id: 'longvideobench',
    name: 'LongVideoBench',
    description: 'Long-form video understanding with extended temporal reasoning.',
    category: 'Long Video',
    difficulty: 'Hard',
    samples: 2000,
    metrics: ['accuracy'],
    tags: ['long_video', 'temporal_reasoning', 'extended_context'],
    dataset_path: 'lmms-lab/longvideobench',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 39.7,
    top_model: 'GPT-4o',
    last_updated: '2024-01-07',
    video_duration: '10+ minutes',
    resolution: '224x224',
    task_type: 'Long-form Video Understanding'
  },
  {
    id: 'temporalbench',
    name: 'TemporalBench',
    description: 'Temporal understanding and reasoning in video sequences.',
    category: 'Temporal Reasoning',
    difficulty: 'Medium',
    samples: 5000,
    metrics: ['accuracy'],
    tags: ['temporal', 'reasoning', 'video_sequences'],
    dataset_path: 'lmms-lab/temporalbench',
    output_type: 'multiple_choice',
    few_shot: false,
    avg_score: 65.4,
    top_model: 'GPT-4o',
    last_updated: '2024-01-06',
    video_duration: '30-90 seconds',
    resolution: '224x224',
    task_type: 'Temporal Video Reasoning'
  },
  {
    id: 'timescope',
    name: 'TimeScope',
    description: 'Temporal scope understanding in video content analysis.',
    category: 'Temporal Reasoning',
    difficulty: 'Medium',
    samples: 3500,
    metrics: ['accuracy'],
    tags: ['temporal_scope', 'video_analysis', 'time_understanding'],
    dataset_path: 'lmms-lab/timescope',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 61.8,
    top_model: 'GPT-4o',
    last_updated: '2024-01-05',
    video_duration: '1-3 minutes',
    resolution: '224x224',
    task_type: 'Temporal Scope Understanding'
  },
  {
    id: 'videoevalpro',
    name: 'VideoEvalPro',
    description: 'Professional video evaluation with advanced reasoning tasks.',
    category: 'Video Evaluation',
    difficulty: 'Hard',
    samples: 2500,
    metrics: ['accuracy'],
    tags: ['professional', 'advanced_reasoning', 'video_evaluation'],
    dataset_path: 'lmms-lab/videoevalpro',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 52.1,
    top_model: 'GPT-4o',
    last_updated: '2024-01-04',
    video_duration: '2-5 minutes',
    resolution: '224x224',
    task_type: 'Professional Video Evaluation'
  }
]

const categories = Array.from(new Set(videoBenchmarks.map(b => b.category)))
const difficulties = ['Easy', 'Medium', 'Hard']

export function VideoBenchmarks() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'samples' | 'score'>('name')

  const filteredBenchmarks = videoBenchmarks
    .filter(benchmark => {
      const matchesSearch = benchmark.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           benchmark.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || benchmark.category === selectedCategory
      const matchesDifficulty = selectedDifficulty === 'all' || benchmark.difficulty === selectedDifficulty
      return matchesSearch && matchesCategory && matchesDifficulty
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'samples':
          return b.samples - a.samples
        case 'score':
          return (b.avg_score || 0) - (a.avg_score || 0)
        default:
          return a.name.localeCompare(b.name)
      }
    })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Video QA': return MessageSquare
      case 'Video Reasoning': return Zap
      case 'Action Localization': return Target
      case 'Long Video': return Clock
      case 'Video Conversation': return Eye
      case 'Video Evaluation': return Award
      case 'Video Math': return Calculator
      case 'Multimodal Video': return Layers
      case 'Temporal Reasoning': return Activity
      default: return Video
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Video Benchmarks</h1>
          <p className="text-muted-foreground">
            Comprehensive evaluation benchmarks for video understanding models
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Video className="h-3 w-3" />
            <span>{videoBenchmarks.length} Benchmarks</span>
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Benchmarks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videoBenchmarks.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {categories.length} categories
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
              {videoBenchmarks.reduce((sum, b) => sum + b.samples, 0).toLocaleString()}
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
            <div className="text-2xl font-bold">
              {Math.round(videoBenchmarks.reduce((sum, b) => sum + (b.avg_score || 0), 0) / videoBenchmarks.length)}%
            </div>
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

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search benchmarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Difficulties</option>
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>{difficulty}</option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'samples' | 'score')}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="samples">Sort by Samples</option>
                <option value="score">Sort by Score</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmarks Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredBenchmarks.map((benchmark) => {
          const CategoryIcon = getCategoryIcon(benchmark.category)
          return (
            <Card key={benchmark.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <CategoryIcon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{benchmark.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {benchmark.category}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getDifficultyColor(benchmark.difficulty)}>
                    {benchmark.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {benchmark.description}
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Samples</span>
                    <span className="font-medium">{benchmark.samples.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Task Type</span>
                    <Badge variant="outline">{benchmark.task_type}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Output Type</span>
                    <Badge variant="outline">{benchmark.output_type}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Few-shot</span>
                    <Badge variant={benchmark.few_shot ? "default" : "secondary"}>
                      {benchmark.few_shot ? "Yes" : "No"}
                    </Badge>
                  </div>
                  
                  {benchmark.video_duration && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{benchmark.video_duration}</span>
                    </div>
                  )}
                  
                  {benchmark.resolution && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Resolution</span>
                      <span className="font-medium">{benchmark.resolution}</span>
                    </div>
                  )}
                  
                  {benchmark.avg_score && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Avg Score</span>
                        <span className="font-medium">{benchmark.avg_score}%</span>
                      </div>
                      <Progress value={benchmark.avg_score} className="h-2" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Metrics: </span>
                    <span className="font-medium">{benchmark.metrics.join(', ')}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {benchmark.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Play className="h-4 w-4 mr-1" />
                    Run
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Results
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span>Last updated: {benchmark.last_updated}</span>
                    {benchmark.top_model && (
                      <span>Top: {benchmark.top_model}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredBenchmarks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No benchmarks found</h3>
            <p className="text-muted-foreground text-center">
              Try adjusting your search criteria or filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
