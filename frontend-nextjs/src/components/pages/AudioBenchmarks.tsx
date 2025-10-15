'use client'

/**
 * Audio Benchmarks page with comprehensive LMMS-Eval audio benchmarks
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  Mic, 
  Search, 
  TrendingUp, 
  Award, 
  BarChart3,
  Volume2,
  Headphones,
  Music,
  MessageSquare,
  Globe,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
  Play,
  Zap
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
  audio_duration?: string
  sample_rate?: string
  task_type: string
}

const audioBenchmarks: Benchmark[] = [
  {
    id: 'librispeech',
    name: 'LibriSpeech',
    description: 'Large-scale English speech recognition corpus with clean and noisy audio.',
    category: 'Speech Recognition',
    difficulty: 'Medium',
    samples: 281241,
    metrics: ['wer'],
    tags: ['speech_recognition', 'english', 'clean_noisy'],
    dataset_path: 'lmms-lab/librispeech',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 85.2,
    top_model: 'Whisper-Large-v3',
    last_updated: '2024-01-15',
    audio_duration: '1000+ hours',
    sample_rate: '16kHz',
    task_type: 'Automatic Speech Recognition'
  },
  {
    id: 'common_voice_15',
    name: 'Common Voice 15',
    description: 'Multilingual speech recognition across 100+ languages with diverse accents.',
    category: 'Multilingual ASR',
    difficulty: 'Hard',
    samples: 1000000,
    metrics: ['wer'],
    tags: ['multilingual', 'speech_recognition', 'diverse_accents'],
    dataset_path: 'lmms-lab/common_voice_15',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 78.9,
    top_model: 'Whisper-Large-v3',
    last_updated: '2024-01-14',
    audio_duration: '2000+ hours',
    sample_rate: '16kHz',
    task_type: 'Multilingual Speech Recognition'
  },
  {
    id: 'fleurs',
    name: 'FLEURS (Few-shot Learning Evaluation of Universal Representations of Speech)',
    description: 'Multilingual speech recognition and translation across 102 languages.',
    category: 'Multilingual ASR',
    difficulty: 'Hard',
    samples: 12000,
    metrics: ['wer'],
    tags: ['multilingual', 'few_shot', 'speech_recognition'],
    dataset_path: 'lmms-lab/fleurs',
    output_type: 'generate_until',
    few_shot: true,
    avg_score: 72.4,
    top_model: 'Whisper-Large-v3',
    last_updated: '2024-01-13',
    audio_duration: '12 hours',
    sample_rate: '16kHz',
    task_type: 'Few-shot Multilingual ASR'
  },
  {
    id: 'gigaspeech',
    name: 'GigaSpeech',
    description: 'Large-scale English speech recognition with diverse domains and speakers.',
    category: 'Speech Recognition',
    difficulty: 'Medium',
    samples: 100000,
    metrics: ['wer'],
    tags: ['speech_recognition', 'large_scale', 'diverse_domains'],
    dataset_path: 'lmms-lab/gigaspeech',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 82.7,
    top_model: 'Whisper-Large-v3',
    last_updated: '2024-01-12',
    audio_duration: '10000+ hours',
    sample_rate: '16kHz',
    task_type: 'Large-scale Speech Recognition'
  },
  {
    id: 'tedlium',
    name: 'TED-LIUM',
    description: 'English speech recognition from TED talks with academic and technical content.',
    category: 'Speech Recognition',
    difficulty: 'Medium',
    samples: 50000,
    metrics: ['wer'],
    tags: ['speech_recognition', 'ted_talks', 'academic'],
    dataset_path: 'lmms-lab/tedlium',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 79.3,
    top_model: 'Whisper-Large-v3',
    last_updated: '2024-01-11',
    audio_duration: '450+ hours',
    sample_rate: '16kHz',
    task_type: 'Academic Speech Recognition'
  },
  {
    id: 'people_speech',
    name: 'People\'s Speech',
    description: 'Large-scale English speech recognition with diverse demographics.',
    category: 'Speech Recognition',
    difficulty: 'Medium',
    samples: 30000,
    metrics: ['wer'],
    tags: ['speech_recognition', 'diverse_demographics', 'large_scale'],
    dataset_path: 'lmms-lab/people_speech',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 81.5,
    top_model: 'Whisper-Large-v3',
    last_updated: '2024-01-10',
    audio_duration: '3000+ hours',
    sample_rate: '16kHz',
    task_type: 'Diverse Demographics ASR'
  },
  {
    id: 'wenet_speech',
    name: 'WeNet Speech',
    description: 'Chinese speech recognition with various dialects and accents.',
    category: 'Multilingual ASR',
    difficulty: 'Hard',
    samples: 25000,
    metrics: ['wer'],
    tags: ['chinese', 'dialects', 'speech_recognition'],
    dataset_path: 'lmms-lab/wenet_speech',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 76.8,
    top_model: 'Whisper-Large-v3',
    last_updated: '2024-01-09',
    audio_duration: '1000+ hours',
    sample_rate: '16kHz',
    task_type: 'Chinese Speech Recognition'
  },
  {
    id: 'open_asr',
    name: 'Open ASR',
    description: 'Open-domain automatic speech recognition with various speaking styles.',
    category: 'Speech Recognition',
    difficulty: 'Medium',
    samples: 20000,
    metrics: ['wer'],
    tags: ['open_domain', 'speaking_styles', 'speech_recognition'],
    dataset_path: 'lmms-lab/open_asr',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 77.9,
    top_model: 'Whisper-Large-v3',
    last_updated: '2024-01-08',
    audio_duration: '500+ hours',
    sample_rate: '16kHz',
    task_type: 'Open-domain Speech Recognition'
  },
  {
    id: 'alpaca_audio',
    name: 'Alpaca Audio',
    description: 'Audio instruction following with natural language commands.',
    category: 'Audio Understanding',
    difficulty: 'Hard',
    samples: 5000,
    metrics: ['accuracy'],
    tags: ['audio_understanding', 'instruction_following', 'natural_language'],
    dataset_path: 'lmms-lab/alpaca_audio',
    output_type: 'generate_until',
    few_shot: true,
    avg_score: 68.4,
    top_model: 'GPT-4o',
    last_updated: '2024-01-07',
    audio_duration: '50+ hours',
    sample_rate: '16kHz',
    task_type: 'Audio Instruction Following'
  },
  {
    id: 'vocal_sound',
    name: 'VocalSound',
    description: 'Vocal sound classification and recognition across different vocal styles.',
    category: 'Audio Classification',
    difficulty: 'Medium',
    samples: 15000,
    metrics: ['accuracy'],
    tags: ['vocal_classification', 'sound_recognition', 'audio_classification'],
    dataset_path: 'lmms-lab/vocal_sound',
    output_type: 'multiple_choice',
    few_shot: false,
    avg_score: 73.2,
    top_model: 'CLAP',
    last_updated: '2024-01-06',
    audio_duration: '200+ hours',
    sample_rate: '16kHz',
    task_type: 'Vocal Sound Classification'
  },
  {
    id: 'muchomusic',
    name: 'MuchoMusic',
    description: 'Music understanding and analysis across different genres and styles.',
    category: 'Music Understanding',
    difficulty: 'Medium',
    samples: 10000,
    metrics: ['accuracy'],
    tags: ['music', 'genre_classification', 'audio_analysis'],
    dataset_path: 'lmms-lab/muchomusic',
    output_type: 'multiple_choice',
    few_shot: false,
    avg_score: 71.6,
    top_model: 'CLAP',
    last_updated: '2024-01-05',
    audio_duration: '500+ hours',
    sample_rate: '44.1kHz',
    task_type: 'Music Genre Classification'
  },
  {
    id: 'wavcaps',
    name: 'WavCaps',
    description: 'Audio captioning and description generation from audio clips.',
    category: 'Audio Captioning',
    difficulty: 'Hard',
    samples: 400000,
    metrics: ['bleu', 'rouge'],
    tags: ['audio_captioning', 'description_generation', 'multimodal'],
    dataset_path: 'lmms-lab/wavcaps',
    output_type: 'generate_until',
    few_shot: false,
    avg_score: 65.8,
    top_model: 'GPT-4o',
    last_updated: '2024-01-04',
    audio_duration: '10000+ hours',
    sample_rate: '16kHz',
    task_type: 'Audio Captioning'
  }
]

const categories = Array.from(new Set(audioBenchmarks.map(b => b.category)))
const difficulties = ['Easy', 'Medium', 'Hard']

export function AudioBenchmarks() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'samples' | 'score'>('name')

  const filteredBenchmarks = audioBenchmarks
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
      case 'Speech Recognition': return Mic
      case 'Multilingual ASR': return Globe
      case 'Audio Understanding': return Headphones
      case 'Audio Classification': return Target
      case 'Music Understanding': return Music
      case 'Audio Captioning': return MessageSquare
      default: return Volume2
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audio Benchmarks</h1>
          <p className="text-muted-foreground">
            Comprehensive evaluation benchmarks for audio and speech models
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Mic className="h-3 w-3" />
            <span>{audioBenchmarks.length} Benchmarks</span>
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
            <div className="text-2xl font-bold">{audioBenchmarks.length}</div>
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
              {audioBenchmarks.reduce((sum, b) => sum + b.samples, 0).toLocaleString()}
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
              {Math.round(audioBenchmarks.reduce((sum, b) => sum + (b.avg_score || 0), 0) / audioBenchmarks.length)}%
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
            <div className="text-2xl font-bold">Whisper-Large-v3</div>
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
                  
                  {benchmark.audio_duration && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{benchmark.audio_duration}</span>
                    </div>
                  )}
                  
                  {benchmark.sample_rate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sample Rate</span>
                      <span className="font-medium">{benchmark.sample_rate}</span>
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
            <Mic className="h-12 w-12 text-muted-foreground mb-4" />
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
