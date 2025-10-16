'use client'

/**
 * Text Benchmarks page with comprehensive LMMS-Eval text benchmarks
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageSquare, 
  Search, 
  Filter, 
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
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
  Play
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
}

const textBenchmarks: Benchmark[] = [
  {
    id: 'mmlu',
    name: 'MMLU (Massive Multitask Language Understanding)',
    description: 'A comprehensive benchmark covering 57 academic subjects including STEM, humanities, social sciences, and more.',
    category: 'Knowledge',
    difficulty: 'Hard',
    samples: 15908,
    metrics: ['accuracy'],
    tags: ['multiple_choice', 'knowledge', 'academic'],
    dataset_path: 'lmms-lab/mmlu',
    output_type: 'multiple_choice',
    few_shot: true,
    avg_score: 68.5,
    top_model: 'GPT-4o',
    last_updated: '2024-01-15'
  },
  {
    id: 'gsm8k',
    name: 'GSM8K (Grade School Math 8K)',
    description: 'Mathematical reasoning problems requiring step-by-step solutions for grade school level math.',
    category: 'Reasoning',
    difficulty: 'Medium',
    samples: 8179,
    metrics: ['exact_match'],
    tags: ['math_word_problems', 'reasoning', 'step_by_step'],
    dataset_path: 'gsm8k',
    output_type: 'generate_until',
    few_shot: true,
    avg_score: 72.3,
    top_model: 'GPT-4o',
    last_updated: '2024-01-10'
  },
  {
    id: 'hellaswag',
    name: 'HellaSwag',
    description: 'Commonsense reasoning about physical situations and everyday activities.',
    category: 'Reasoning',
    difficulty: 'Medium',
    samples: 10042,
    metrics: ['acc', 'acc_norm'],
    tags: ['multiple_choice', 'commonsense', 'reasoning'],
    dataset_path: 'hellaswag',
    output_type: 'multiple_choice',
    few_shot: false,
    avg_score: 85.7,
    top_model: 'Claude-3.5-Sonnet',
    last_updated: '2024-01-12'
  },
  {
    id: 'arc_challenge',
    name: 'ARC-Challenge',
    description: 'AI2 Reasoning Challenge with science questions requiring complex reasoning.',
    category: 'Reasoning',
    difficulty: 'Hard',
    samples: 2592,
    metrics: ['accuracy'],
    tags: ['multiple_choice', 'science', 'reasoning'],
    dataset_path: 'allenai/ai2_arc',
    output_type: 'multiple_choice',
    few_shot: true,
    avg_score: 45.2,
    top_model: 'GPT-4o',
    last_updated: '2024-01-08'
  },
  {
    id: 'openai_math',
    name: 'OpenAI Math',
    description: 'Advanced mathematical problems including algebra, calculus, and number theory.',
    category: 'Math',
    difficulty: 'Hard',
    samples: 12000,
    metrics: ['exact_match'],
    tags: ['math', 'advanced', 'reasoning'],
    dataset_path: 'openai_math',
    output_type: 'generate_until',
    few_shot: true,
    avg_score: 38.9,
    top_model: 'GPT-4o',
    last_updated: '2024-01-14'
  },
  {
    id: 'medqa',
    name: 'MedQA',
    description: 'Medical question answering benchmark with clinical reasoning questions.',
    category: 'Domain Knowledge',
    difficulty: 'Hard',
    samples: 10178,
    metrics: ['accuracy'],
    tags: ['medical', 'domain_knowledge', 'clinical'],
    dataset_path: 'medqa',
    output_type: 'multiple_choice',
    few_shot: true,
    avg_score: 52.1,
    top_model: 'GPT-4o',
    last_updated: '2024-01-11'
  },
  {
    id: 'gpqa',
    name: 'GPQA (Graduate-Level Google-Proof Q&A)',
    description: 'Graduate-level questions in physics, chemistry, and biology that are difficult to find answers for online.',
    category: 'Domain Knowledge',
    difficulty: 'Hard',
    samples: 448,
    metrics: ['accuracy'],
    tags: ['graduate_level', 'science', 'domain_knowledge'],
    dataset_path: 'gpqa',
    output_type: 'multiple_choice',
    few_shot: true,
    avg_score: 28.7,
    top_model: 'GPT-4o',
    last_updated: '2024-01-09'
  },
  {
    id: 'ifeval',
    name: 'IFEval (Instruction Following Evaluation)',
    description: 'Evaluation of instruction following capabilities with complex, multi-step instructions.',
    category: 'Instruction Following',
    difficulty: 'Medium',
    samples: 500,
    metrics: ['pass_rate'],
    tags: ['instruction_following', 'evaluation', 'compliance'],
    dataset_path: 'ifeval',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 67.4,
    top_model: 'Claude-3.5-Sonnet',
    last_updated: '2024-01-13'
  },
  {
    id: 'mmlu_pro',
    name: 'MMLU-Pro',
    description: 'Enhanced version of MMLU with more challenging questions and better coverage.',
    category: 'Knowledge',
    difficulty: 'Hard',
    samples: 12000,
    metrics: ['accuracy'],
    tags: ['multiple_choice', 'knowledge', 'enhanced'],
    dataset_path: 'mmlu_pro',
    output_type: 'multiple_choice',
    few_shot: true,
    avg_score: 61.8,
    top_model: 'GPT-4o',
    last_updated: '2024-01-16'
  },
  {
    id: 'super_gpqa',
    name: 'Super GPQA',
    description: 'Extended version of GPQA with additional graduate-level questions.',
    category: 'Domain Knowledge',
    difficulty: 'Hard',
    samples: 1200,
    metrics: ['accuracy'],
    tags: ['graduate_level', 'science', 'extended'],
    dataset_path: 'super_gpqa',
    output_type: 'multiple_choice',
    few_shot: true,
    avg_score: 31.2,
    top_model: 'GPT-4o',
    last_updated: '2024-01-07'
  }
]

const categories = Array.from(new Set(textBenchmarks.map(b => b.category)))
const difficulties = ['Easy', 'Medium', 'Hard']

export function TextBenchmarks() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'samples' | 'score'>('name')

  const filteredBenchmarks = textBenchmarks
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
      case 'Knowledge': return Brain
      case 'Reasoning': return Zap
      case 'Math': return Calculator
      case 'Domain Knowledge': return BookOpen
      case 'Instruction Following': return Target
      default: return MessageSquare
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Text Benchmarks</h1>
          <p className="text-muted-foreground">
            Comprehensive evaluation benchmarks for text-based language models
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <MessageSquare className="h-3 w-3" />
            <span>{textBenchmarks.length} Benchmarks</span>
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
            <div className="text-2xl font-bold">{textBenchmarks.length}</div>
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
              {textBenchmarks.reduce((sum, b) => sum + b.samples, 0).toLocaleString()}
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
              {Math.round(textBenchmarks.reduce((sum, b) => sum + (b.avg_score || 0), 0) / textBenchmarks.length)}%
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
                    <span className="text-muted-foreground">Output Type</span>
                    <Badge variant="outline">{benchmark.output_type}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Few-shot</span>
                    <Badge variant={benchmark.few_shot ? "default" : "secondary"}>
                      {benchmark.few_shot ? "Yes" : "No"}
                    </Badge>
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
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
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



