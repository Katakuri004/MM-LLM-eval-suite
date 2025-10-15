'use client'

/**
 * Multimodal Benchmarks page with comprehensive LMMS-Eval multimodal benchmarks
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  FileImage, 
  Search, 
  TrendingUp, 
  Award, 
  BarChart3,
  Layers,
  Eye,
  MessageSquare,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
  Play,
  Brain,
  Zap,
  Globe,
  BookOpen,
  Calculator,
  Camera,
  Mic,
  Video,
  Headphones
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
  modalities: string[]
  task_type: string
}

const multimodalBenchmarks: Benchmark[] = [
  {
    id: 'scienceqa',
    name: 'ScienceQA',
    description: 'Multimodal science question answering with images, diagrams, and text explanations.',
    category: 'Science QA',
    difficulty: 'Medium',
    samples: 21208,
    metrics: ['exact_match'],
    tags: ['science', 'multimodal', 'diagrams', 'text'],
    dataset_path: 'lmms-lab/ScienceQA',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 68.9,
    top_model: 'GPT-4o',
    last_updated: '2024-01-15',
    modalities: ['text', 'image'],
    task_type: 'Multimodal Science QA'
  },
  {
    id: 'ai2d',
    name: 'AI2D (AI2 Diagram Understanding)',
    description: 'Question answering about scientific diagrams with text and visual reasoning.',
    category: 'Diagram Understanding',
    difficulty: 'Hard',
    samples: 15017,
    metrics: ['exact_match'],
    tags: ['diagrams', 'science', 'visual_reasoning', 'text'],
    dataset_path: 'lmms-lab/ai2d',
    output_type: 'multiple_choice',
    few_shot: false,
    avg_score: 54.3,
    top_model: 'GPT-4o',
    last_updated: '2024-01-14',
    modalities: ['text', 'image'],
    task_type: 'Diagram Understanding'
  },
  {
    id: 'chartqa',
    name: 'ChartQA',
    description: 'Question answering about charts and graphs with text and visual analysis.',
    category: 'Chart Understanding',
    difficulty: 'Medium',
    samples: 22000,
    metrics: ['exact_match'],
    tags: ['charts', 'graphs', 'data_visualization', 'text'],
    dataset_path: 'lmms-lab/chartqa',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 69.7,
    top_model: 'GPT-4o',
    last_updated: '2024-01-13',
    modalities: ['text', 'image'],
    task_type: 'Chart Question Answering'
  },
  {
    id: 'docvqa',
    name: 'DocVQA',
    description: 'Document visual question answering combining OCR and visual understanding.',
    category: 'Document Understanding',
    difficulty: 'Medium',
    samples: 50000,
    metrics: ['exact_match'],
    tags: ['documents', 'layout', 'ocr', 'text'],
    dataset_path: 'lmms-lab/docvqa',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 71.8,
    top_model: 'GPT-4o',
    last_updated: '2024-01-12',
    modalities: ['text', 'image'],
    task_type: 'Document Visual QA'
  },
  {
    id: 'infovqa',
    name: 'InfoVQA',
    description: 'Information extraction from infographics with text and visual analysis.',
    category: 'Information Extraction',
    difficulty: 'Hard',
    samples: 25000,
    metrics: ['exact_match'],
    tags: ['infographics', 'data_visualization', 'information_extraction', 'text'],
    dataset_path: 'lmms-lab/infovqa',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 62.4,
    top_model: 'GPT-4o',
    last_updated: '2024-01-11',
    modalities: ['text', 'image'],
    task_type: 'Infographic Understanding'
  },
  {
    id: 'stvqa',
    name: 'STVQA (Scene Text VQA)',
    description: 'Scene text visual question answering combining OCR and visual understanding.',
    category: 'Scene Text',
    difficulty: 'Hard',
    samples: 31000,
    metrics: ['exact_match'],
    tags: ['scene_text', 'ocr', 'visual_qa', 'text'],
    dataset_path: 'lmms-lab/stvqa',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 58.2,
    top_model: 'GPT-4o',
    last_updated: '2024-01-10',
    modalities: ['text', 'image'],
    task_type: 'Scene Text Visual QA'
  },
  {
    id: 'textvqa',
    name: 'TextVQA',
    description: 'Visual question answering that requires reading and understanding text in images.',
    category: 'Text in Images',
    difficulty: 'Hard',
    samples: 45336,
    metrics: ['exact_match'],
    tags: ['visual_qa', 'ocr', 'text_reading', 'text'],
    dataset_path: 'lmms-lab/textvqa',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 65.2,
    top_model: 'GPT-4o',
    last_updated: '2024-01-09',
    modalities: ['text', 'image'],
    task_type: 'Text-based Visual QA'
  },
  {
    id: 'ok_vqa',
    name: 'OK-VQA (Outside Knowledge VQA)',
    description: 'Visual question answering requiring external world knowledge beyond visual content.',
    category: 'Knowledge-based QA',
    difficulty: 'Hard',
    samples: 14055,
    metrics: ['exact_match'],
    tags: ['visual_qa', 'external_knowledge', 'reasoning', 'text'],
    dataset_path: 'lmms-lab/ok_vqa',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 58.7,
    top_model: 'GPT-4o',
    last_updated: '2024-01-08',
    modalities: ['text', 'image'],
    task_type: 'Knowledge-based Visual QA'
  },
  {
    id: 'gqa',
    name: 'GQA (Compositional Visual Question Answering)',
    description: 'Compositional question answering about real-world images with complex reasoning.',
    category: 'Compositional QA',
    difficulty: 'Hard',
    samples: 943000,
    metrics: ['accuracy'],
    tags: ['visual_qa', 'compositional', 'reasoning', 'text'],
    dataset_path: 'lmms-lab/gqa',
    output_type: 'multiple_choice',
    few_shot: false,
    avg_score: 72.1,
    top_model: 'GPT-4o',
    last_updated: '2024-01-07',
    modalities: ['text', 'image'],
    task_type: 'Compositional Visual QA'
  },
  {
    id: 'vqav2',
    name: 'VQA-v2 (Visual Question Answering v2)',
    description: 'Open-ended visual question answering about images with balanced question types.',
    category: 'Visual QA',
    difficulty: 'Medium',
    samples: 265016,
    metrics: ['exact_match'],
    tags: ['visual_qa', 'open_ended', 'balanced', 'text'],
    dataset_path: 'lmms-lab/vqav2',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 78.5,
    top_model: 'GPT-4o',
    last_updated: '2024-01-06',
    modalities: ['text', 'image'],
    task_type: 'Visual Question Answering'
  },
  {
    id: 'activitynetqa',
    name: 'ActivityNet-QA',
    description: 'Video question answering about human activities with temporal understanding.',
    category: 'Video QA',
    difficulty: 'Hard',
    samples: 10000,
    metrics: ['gpt_eval_score', 'gpt_eval_accuracy'],
    tags: ['video_qa', 'activities', 'temporal', 'text'],
    dataset_path: 'lmms-lab/activitynetqa',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 68.5,
    top_model: 'GPT-4o',
    last_updated: '2024-01-05',
    modalities: ['text', 'video'],
    task_type: 'Activity Video QA'
  },
  {
    id: 'moviechat',
    name: 'MovieChat',
    description: 'Long-form video understanding and conversation about movie content.',
    category: 'Video Conversation',
    difficulty: 'Hard',
    samples: 8000,
    metrics: ['accuracy'],
    tags: ['long_video', 'movie', 'conversation', 'text'],
    dataset_path: 'lmms-lab/moviechat',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 62.3,
    top_model: 'GPT-4o',
    last_updated: '2024-01-04',
    modalities: ['text', 'video'],
    task_type: 'Long-form Video Understanding'
  },
  {
    id: 'wavcaps',
    name: 'WavCaps',
    description: 'Audio captioning and description generation from audio clips.',
    category: 'Audio Captioning',
    difficulty: 'Hard',
    samples: 400000,
    metrics: ['bleu', 'rouge'],
    tags: ['audio_captioning', 'description_generation', 'multimodal', 'text'],
    dataset_path: 'lmms-lab/wavcaps',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 65.8,
    top_model: 'GPT-4o',
    last_updated: '2024-01-03',
    modalities: ['text', 'audio'],
    task_type: 'Audio Captioning'
  },
  {
    id: 'alpaca_audio',
    name: 'Alpaca Audio',
    description: 'Audio instruction following with natural language commands.',
    category: 'Audio Understanding',
    difficulty: 'Hard',
    samples: 5000,
    metrics: ['accuracy'],
    tags: ['audio_understanding', 'instruction_following', 'natural_language', 'text'],
    dataset_path: 'lmms-lab/alpaca_audio',
    output_type: 'generate_until',
    few_shot: true,
    avg_score: 68.4,
    top_model: 'GPT-4o',
    last_updated: '2024-01-02',
    modalities: ['text', 'audio'],
    task_type: 'Audio Instruction Following'
  },
  {
    id: 'videomme',
    name: 'VideoMME',
    description: 'Multimodal evaluation of video understanding capabilities.',
    category: 'Video Evaluation',
    difficulty: 'Medium',
    samples: 6000,
    metrics: ['accuracy'],
    tags: ['multimodal', 'evaluation', 'video_understanding', 'text'],
    dataset_path: 'lmms-lab/videomme',
    output_type: 'multiple_choice',
    few_shot: false,
    avg_score: 58.9,
    top_model: 'GPT-4o',
    last_updated: '2024-01-01',
    modalities: ['text', 'video'],
    task_type: 'Multimodal Video Evaluation'
  }
]

const categories = Array.from(new Set(multimodalBenchmarks.map(b => b.category)))
const difficulties = ['Easy', 'Medium', 'Hard']

export function MultimodalBenchmarks() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'samples' | 'score'>('name')

  const filteredBenchmarks = multimodalBenchmarks
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
      case 'Science QA': return BookOpen
      case 'Diagram Understanding': return Eye
      case 'Chart Understanding': return BarChart3
      case 'Document Understanding': return FileImage
      case 'Information Extraction': return Target
      case 'Scene Text': return Camera
      case 'Text in Images': return MessageSquare
      case 'Knowledge-based QA': return Brain
      case 'Compositional QA': return Zap
      case 'Visual QA': return Eye
      case 'Video QA': return Video
      case 'Video Conversation': return MessageSquare
      case 'Audio Captioning': return Mic
      case 'Audio Understanding': return Headphones
      case 'Video Evaluation': return Award
      default: return Layers
    }
  }

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'text': return MessageSquare
      case 'image': return Camera
      case 'video': return Video
      case 'audio': return Mic
      default: return Layers
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Multimodal Benchmarks</h1>
          <p className="text-muted-foreground">
            Comprehensive evaluation benchmarks for multimodal understanding models
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <FileImage className="h-3 w-3" />
            <span>{multimodalBenchmarks.length} Benchmarks</span>
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
            <div className="text-2xl font-bold">{multimodalBenchmarks.length}</div>
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
              {multimodalBenchmarks.reduce((sum, b) => sum + b.samples, 0).toLocaleString()}
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
              {Math.round(multimodalBenchmarks.reduce((sum, b) => sum + (b.avg_score || 0), 0) / multimodalBenchmarks.length)}%
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
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Modalities</span>
                    <div className="flex space-x-1">
                      {benchmark.modalities.map(modality => {
                        const ModalityIcon = getModalityIcon(modality)
                        return (
                          <ModalityIcon key={modality} className="h-4 w-4 text-muted-foreground" />
                        )
                      })}
                    </div>
                  </div>
                  
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
            <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
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
