'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { X, Filter, Search } from 'lucide-react'

interface ResponseFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedBenchmarks: string[]
  onBenchmarksChange: (benchmarks: string[]) => void
  selectedModality: string
  onModalityChange: (modality: string) => void
  selectedCorrectness: string
  onCorrectnessChange: (correctness: string) => void
  availableBenchmarks: string[]
  availableModalities: string[]
}

export function ResponseFilters({
  searchQuery,
  onSearchChange,
  selectedBenchmarks,
  onBenchmarksChange,
  selectedModality,
  onModalityChange,
  selectedCorrectness,
  onCorrectnessChange,
  availableBenchmarks,
  availableModalities,
}: ResponseFiltersProps) {
  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (searchQuery) count++
    if (selectedBenchmarks.length > 0) count++
    if (selectedModality !== 'all') count++
    if (selectedCorrectness !== 'all') count++
    return count
  }, [searchQuery, selectedBenchmarks.length, selectedModality, selectedCorrectness])

  const clearAllFilters = () => {
    onSearchChange('')
    onBenchmarksChange([])
    onModalityChange('all')
    onCorrectnessChange('all')
  }

  const toggleBenchmark = (benchmark: string) => {
    if (selectedBenchmarks.includes(benchmark)) {
      onBenchmarksChange(selectedBenchmarks.filter(b => b !== benchmark))
    } else {
      onBenchmarksChange([...selectedBenchmarks, benchmark])
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts, responses, or benchmark names..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Benchmark/Task Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Task / Benchmark</Label>
            <Select
              value={selectedBenchmarks.length > 0 ? selectedBenchmarks[0] : 'all'}
              onValueChange={(value) => {
                if (value === 'all') {
                  onBenchmarksChange([])
                } else {
                  onBenchmarksChange([value])
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All benchmarks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Benchmarks</SelectItem>
                {availableBenchmarks.map((benchmark) => (
                  <SelectItem key={benchmark} value={benchmark}>
                    {benchmark}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBenchmarks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedBenchmarks.map((benchmark) => (
                  <Badge
                    key={benchmark}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => toggleBenchmark(benchmark)}
                  >
                    {benchmark}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Modality Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Modality</Label>
            <Select value={selectedModality} onValueChange={onModalityChange}>
              <SelectTrigger>
                <SelectValue placeholder="All modalities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modalities</SelectItem>
                {availableModalities.map((modality) => (
                  <SelectItem key={modality} value={modality} className="capitalize">
                    {modality === 'multi-modal' ? 'Multi-modal' : modality.charAt(0).toUpperCase() + modality.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Correctness Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Correctness</Label>
            <Select value={selectedCorrectness} onValueChange={onCorrectnessChange}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Responses</SelectItem>
                <SelectItem value="correct">Correct Only</SelectItem>
                <SelectItem value="incorrect">Incorrect Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

