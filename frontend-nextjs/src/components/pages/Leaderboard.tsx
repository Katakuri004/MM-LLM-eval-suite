'use client'

/**
 * Leaderboard page for model performance comparison
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { 
  Trophy, 
  TrendingUp, 
  Award, 
  BarChart3,
  Star,
  Calendar,
  Target
} from 'lucide-react';

export function Leaderboard() {
  const [selectedBenchmark, setSelectedBenchmark] = useState('all');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'text' | 'image' | 'audio' | 'video' | 'multi-modal'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'model' | 'date'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: benchmarks } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => apiClient.getBenchmarks(),
  });

  // const { data: evaluations } = useQuery({
  //   queryKey: ['evaluations'],
  //   queryFn: () => apiClient.getEvaluations(),
  // });

  // const { data: models } = useQuery({
  //   queryKey: ['models'],
  //   queryFn: () => apiClient.getModels(),
  // });

  // Mock leaderboard data - in a real app, this would come from the API
  const leaderboardData = [
    {
      id: '1',
      model: 'LLaVA-1.5-7B',
      family: 'LLaVA',
      benchmark: 'VQA',
      score: 0.95,
      rank: 1,
      lastRun: '2025-01-15T10:00:00Z',
      runId: 'run-1',
      metrics: {
        accuracy: 0.95,
        f1_score: 0.92,
        bleu_score: 0.88
      }
    },
    {
      id: '2',
      model: 'Qwen2-VL-14B',
      family: 'Qwen2-VL',
      benchmark: 'VQA',
      score: 0.93,
      rank: 2,
      lastRun: '2025-01-15T09:30:00Z',
      runId: 'run-2',
      metrics: {
        accuracy: 0.93,
        f1_score: 0.90,
        bleu_score: 0.85
      }
    },
    {
      id: '3',
      model: 'Llama-3.1-8B',
      family: 'Llama',
      benchmark: 'VQA',
      score: 0.91,
      rank: 3,
      lastRun: '2025-01-15T09:00:00Z',
      runId: 'run-3',
      metrics: {
        accuracy: 0.91,
        f1_score: 0.88,
        bleu_score: 0.82
      }
    },
    {
      id: '4',
      model: 'LLaVA-1.5-7B',
      family: 'LLaVA',
      benchmark: 'MME',
      score: 0.89,
      rank: 1,
      lastRun: '2025-01-15T08:30:00Z',
      runId: 'run-4',
      metrics: {
        accuracy: 0.89,
        f1_score: 0.86,
        bleu_score: 0.80
      }
    },
    {
      id: '5',
      model: 'Qwen2-VL-14B',
      family: 'Qwen2-VL',
      benchmark: 'MME',
      score: 0.87,
      rank: 2,
      lastRun: '2025-01-15T08:00:00Z',
      runId: 'run-5',
      metrics: {
        accuracy: 0.87,
        f1_score: 0.84,
        bleu_score: 0.78
      }
    }
  ];

  const filteredData = leaderboardData.filter(item => {
    const benchOk = selectedBenchmark === 'all' || item.benchmark === selectedBenchmark
    const modality = (item.benchmark === 'VQA' || item.benchmark === 'MME') ? 'image' : 'text'
    const modOk = modalityFilter === 'all' || modalityFilter === modality
    return benchOk && modOk
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'score') return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
    if (sortBy === 'model') return sortOrder === 'desc' ? b.model.localeCompare(a.model) : a.model.localeCompare(b.model);
    if (sortBy === 'date') return sortOrder === 'desc'
      ? new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime()
      : new Date(a.lastRun).getTime() - new Date(b.lastRun).getTime();
    return 0;
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Award className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground">#{rank}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground">
            Compare model performance across benchmarks
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Benchmark:</label>
          <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Benchmarks</SelectItem>
              {benchmarks?.benchmarks?.map((benchmark) => (
                <SelectItem key={benchmark.id} value={benchmark.name}>
                  {benchmark.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Modality:</label>
          <Select value={modalityFilter} onValueChange={(v: any) => setModalityFilter(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="multi-modal">Multi-modal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Sort by:</label>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Score</SelectItem>
              <SelectItem value="model">Model</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Order:</label>
          <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Desc</SelectItem>
              <SelectItem value="asc">Asc</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Rankings</CardTitle>
          <CardDescription>
            {sortedData.length} model(s) ranked by performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Benchmark</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Accuracy</TableHead>
                <TableHead className="text-right">F1 Score</TableHead>
                <TableHead className="text-right">BLEU</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {getRankIcon(entry.rank)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <a className="font-medium hover:underline" href={`/models/${encodeURIComponent(entry.id)}`}>{entry.model}</a>
                      <Badge variant="outline" className="text-xs">
                        {entry.family}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{entry.benchmark}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <span className="font-bold text-lg">{entry.score.toFixed(3)}</span>
                      {entry.rank <= 3 && (
                        <Star className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-sm">
                      {entry.metrics.accuracy.toFixed(3)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-sm">
                      {entry.metrics.f1_score.toFixed(3)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-sm">
                      {entry.metrics.bleu_score.toFixed(3)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(entry.lastRun)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a href={`/models/${encodeURIComponent(entry.id)}`}>
                      <Button size="sm" variant="outline">
                        <Target className="h-4 w-4" />
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">LLaVA-1.5-7B</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Best overall performance across benchmarks
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Most Recent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Qwen2-VL-14B</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Latest evaluation results
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Best Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-green-500" />
                <span className="font-medium">Llama-3.1-8B</span>
              </div>
              <div className="text-sm text-muted-foreground">
                +12% improvement over baseline
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {sortedData.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground text-center">
              No model evaluations match your current filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
