'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ShimmerLoader } from '@/components/ui/shimmer-loader'
import { apiClient } from '@/lib/api'
import { ResponseFilters } from '@/components/external-results/ResponseFilters'
import { ResponseCard } from '@/components/external-results/ResponseCard'

export default function ExternalModelResponsesPage() {
  const params = useParams()
  const modelId = (params?.modelId as string) || ''

  // Fetch model detail for metadata
  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['external-model', modelId],
    queryFn: () => apiClient.getExternalModel(modelId),
    enabled: !!modelId,
    refetchOnWindowFocus: false,
  })

  // Fetch all samples using the samples API endpoint
  const { data: samplesData, isLoading: isLoadingSamples } = useQuery({
    queryKey: ['external-model-samples', modelId],
    queryFn: () => apiClient.getExternalModelSamples(modelId, undefined, 10000, 0), // Fetch a large number to get all
    enabled: !!modelId,
    refetchOnWindowFocus: false,
  })

  const isLoading = isLoadingDetail || isLoadingSamples

  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedBenchmarks, setSelectedBenchmarks] = React.useState<string[]>([])
  const [selectedModality, setSelectedModality] = React.useState<string>('all')
  const [selectedCorrectness, setSelectedCorrectness] = React.useState<string>('all')
  const [page, setPage] = React.useState(1)
  const pageSize = 25

  // Generate response rows from samples API data
  const allRows = React.useMemo(() => {
    // Debug: Log sample data structure
    if (samplesData) {
      console.log('Samples Data:', samplesData)
      if (samplesData.samples && samplesData.samples.length > 0) {
        console.log('Total samples:', samplesData.samples.length)
        console.log('First Sample Structure:', JSON.stringify(samplesData.samples[0], null, 2))
        console.log('Sample Keys:', Object.keys(samplesData.samples[0]))
      } else {
        console.log('No samples in samplesData')
      }
    }
    if (detail?.benchmarks) {
      console.log('Detail benchmarks:', detail.benchmarks.length)
      detail.benchmarks.forEach((b: any, idx: number) => {
        if (b.samples_preview && b.samples_preview.length > 0) {
          console.log(`Benchmark ${idx} (${b.benchmark_id}) has ${b.samples_preview.length} preview samples`)
          console.log('First preview sample:', JSON.stringify(b.samples_preview[0], null, 2))
        }
      })
    }
    
    if (!samplesData?.samples || samplesData.samples.length === 0) {
      // If no samples from API, try to fall back to detail.benchmarks samples_preview
      if (detail?.benchmarks) {
        const fallbackRows: any[] = []
        detail.benchmarks.forEach((b: any) => {
          if (b.samples_preview && b.samples_preview.length > 0) {
            b.samples_preview.forEach((sample: any, idx: number) => {
              const benchmarkId = b.benchmark_id || ''
              const modality = benchmarkId.includes('vqa') || benchmarkId.includes('image') || benchmarkId.includes('vision') 
                ? 'image' 
                : 'text'
              
              fallbackRows.push({
                id: `s-${benchmarkId}-${idx}`,
                benchmark_id: benchmarkId,
                modality,
                input: sample.input || sample.question || sample.prompt || sample.query || '',
                prediction: sample.output || sample.prediction || sample.answer || sample.response || '',
                label: sample.label || sample.target || sample.reference || sample.ground_truth || '',
                is_correct: sample.is_correct !== undefined 
                  ? sample.is_correct 
                  : (sample.score !== undefined && sample.score !== null 
                    ? (typeof sample.score === 'number' ? sample.score > 0 : Boolean(sample.score))
                    : false),
                error_type: sample.error_type || sample.error || null,
                score: sample.score !== undefined && sample.score !== null 
                  ? (typeof sample.score === 'number' ? sample.score : (sample.is_correct ? 1 : 0))
                  : (sample.is_correct ? 1 : 0),
              })
            })
          }
        })
        return fallbackRows
      }
      return []
    }
    
    const rows: any[] = []
    samplesData.samples.forEach((sample: any, idx: number) => {
      const benchmarkId = sample.benchmark_id || ''
      const modality = benchmarkId.includes('vqa') || benchmarkId.includes('image') || benchmarkId.includes('vision') 
        ? 'image' 
        : 'text'
      
      // Try all possible field name variations
      const getInput = () => {
        // Check nested structures too
        if (sample.messages && Array.isArray(sample.messages)) {
          const userMessage = sample.messages.find((m: any) => m.role === 'user')
          if (userMessage?.content) return String(userMessage.content)
        }
        return sample.input || sample.question || sample.prompt || sample.query || 
               sample.user_input || sample.user_message || sample.text || 
               (sample.conversation && Array.isArray(sample.conversation) 
                 ? sample.conversation.find((m: any) => m.role === 'user')?.content || ''
                 : '') || ''
      }
      
      const getPrediction = () => {
        if (sample.messages && Array.isArray(sample.messages)) {
          const assistantMessage = sample.messages.find((m: any) => m.role === 'assistant' || m.role === 'model')
          if (assistantMessage?.content) return String(assistantMessage.content)
        }
        return sample.output || sample.prediction || sample.answer || sample.response || 
               sample.model_output || sample.model_response || sample.generated || 
               (sample.conversation && Array.isArray(sample.conversation) 
                 ? sample.conversation.find((m: any) => m.role === 'assistant')?.content || ''
                 : '') || ''
      }
      
      const getLabel = () => {
        return sample.label || sample.target || sample.reference || sample.ground_truth || 
               sample.expected || sample.correct_answer || sample.gold_answer || 
               sample.reference_answer || ''
      }
      
      rows.push({
        id: `s-${benchmarkId}-${idx}`,
        benchmark_id: benchmarkId,
        modality,
        input: getInput(),
        prediction: getPrediction(),
        label: getLabel(),
        is_correct: sample.is_correct !== undefined 
          ? sample.is_correct 
          : (sample.score !== undefined && sample.score !== null 
            ? (typeof sample.score === 'number' ? sample.score > 0 : Boolean(sample.score))
            : false),
        error_type: sample.error_type || sample.error || null,
        score: sample.score !== undefined && sample.score !== null 
          ? (typeof sample.score === 'number' ? sample.score : (sample.is_correct ? 1 : 0))
          : (sample.is_correct ? 1 : 0),
      })
    })
    return rows
  }, [samplesData, detail])

  const filtered = React.useMemo(() => {
    return allRows.filter((r) => {
      // Search filter
      const text = [r.benchmark_id, r.modality, r.input, r.prediction, r.label].join(' ').toLowerCase()
      const searchOk = !searchQuery || text.includes(searchQuery.toLowerCase())
      
      // Benchmark filter
      const benchOk = selectedBenchmarks.length === 0 || selectedBenchmarks.includes(r.benchmark_id)
      
      // Modality filter
      const modalOk = selectedModality === 'all' || r.modality === selectedModality
      
      // Correctness filter
      let correctnessOk = true
      if (selectedCorrectness === 'correct') {
        correctnessOk = r.is_correct
      } else if (selectedCorrectness === 'incorrect') {
        correctnessOk = !r.is_correct
      }
      
      return searchOk && benchOk && modalOk && correctnessOk
    })
  }, [allRows, searchQuery, selectedBenchmarks, selectedModality, selectedCorrectness])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const start = (page - 1) * pageSize
  const current = filtered.slice(start, start + pageSize)

  const uniqueBenchmarks = React.useMemo(() => {
    const benchmarks = new Set(allRows.map((r) => r.benchmark_id))
    return Array.from(benchmarks).sort()
  }, [allRows])

  const uniqueModalities = React.useMemo(() => {
    const modalities = new Set(allRows.map((r) => r.modality))
    return Array.from(modalities).sort()
  }, [allRows])

  // Statistics
  const statistics = React.useMemo(() => {
    const total = filtered.length
    const correct = filtered.filter(r => r.is_correct).length
    const incorrect = total - correct
    const accuracy = total > 0 ? (correct / total) * 100 : 0
    return { total, correct, incorrect, accuracy }
  }, [filtered])

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedBenchmarks.length, selectedModality, selectedCorrectness])

  const downloadCSV = () => {
    const headers = ['benchmark_id', 'modality', 'input', 'prediction', 'label', 'is_correct', 'score', 'error_type']
    const csvRows = [
      headers.join(','),
      ...filtered.map((r) =>
        headers
          .map((h) => {
            const value = (r as any)[h]
            if (value === null || value === undefined) return ''
            if (typeof value === 'boolean') return value ? 'true' : 'false'
            // Escape quotes and wrap in quotes if contains comma, newline, or quote
            const stringValue = String(value)
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`
            }
            return stringValue
          })
          .join(',')
      ),
    ]
    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `external_model_responses_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <ShimmerLoader />
  }

  if (!detail && !isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Model Responses</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Model not found
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Model Responses</h1>
          <p className="text-muted-foreground">
            Detailed view of {detail?.name || detail?.model_name || 'Model'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/external-results/${encodeURIComponent(modelId)}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 pb-4 text-center">
            <div className="text-2xl font-bold">{statistics.total}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Responses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.correct}</div>
            <div className="text-sm text-muted-foreground mt-1">Correct</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{statistics.incorrect}</div>
            <div className="text-sm text-muted-foreground mt-1">Incorrect</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-4 text-center">
            <div className="text-2xl font-bold">{statistics.accuracy.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground mt-1">Accuracy</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <ResponseFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedBenchmarks={selectedBenchmarks}
        onBenchmarksChange={setSelectedBenchmarks}
        selectedModality={selectedModality}
        onModalityChange={setSelectedModality}
        selectedCorrectness={selectedCorrectness}
        onCorrectnessChange={setSelectedCorrectness}
        availableBenchmarks={uniqueBenchmarks}
        availableModalities={uniqueModalities}
      />

      {/* Responses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Responses ({filtered.length})</CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing {current.length} of {filtered.length} results
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {current.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">No responses found</p>
              <p className="text-sm">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {current.map((r) => (
                <ResponseCard
                  key={r.id}
                  benchmark_id={r.benchmark_id}
                  modality={r.modality}
                  input={r.input}
                  prediction={r.prediction}
                  label={r.label}
                  is_correct={r.is_correct}
                  score={r.score}
                  error_type={r.error_type}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} • {filtered.length} rows
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

