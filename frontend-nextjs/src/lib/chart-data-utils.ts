/**
 * Utility functions for processing benchmark data for chart visualizations
 */

// Filter out time-related and config fields
const TIME_FIELDS = [
  'start_time', 'end_time', 'starttime', 'endtime',
  'created_at', 'updated_at', 'createdat', 'updatedat',
  'timestamp', 'time', 'duration', 'elapsed',
  'date', 'datetime', 'when'
]

const CONFIG_FIELDS = ['fewshot', 'config', 'setting', 'param', 'multiturn']

export interface BenchmarkMetric {
  benchmark_id: string
  metric_name: string
  value: number
  display_name: string
}

export interface ChartDataPoint {
  name: string
  [key: string]: string | number
}

/**
 * Check if a metric key is a time-related field
 */
export function isTimeField(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/_/g, '').replace(/-/g, '')
  return TIME_FIELDS.some(tf => normalizedKey.includes(tf.toLowerCase()))
}

/**
 * Check if a metric key is a config field
 */
export function isConfigField(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/_/g, '').replace(/-/g, '')
  return CONFIG_FIELDS.some(cf => normalizedKey.includes(cf.toLowerCase()))
}

/**
 * Filter metrics to only include performance metrics
 */
export function filterPerformanceMetrics(
  metrics: Record<string, any>
): Record<string, number> {
  const filtered: Record<string, number> = {}
  
  for (const [k, v] of Object.entries(metrics)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    
    const key = k.toLowerCase().replace(/_/g, '').replace(/-/g, '')
    
    // Exclude time and config fields
    if (isTimeField(k) || isConfigField(k)) continue
    
    // Exclude timestamp-like values
    if (v > 1000000000) continue
    
    // Include performance metrics
    const isPerformanceMetric = (
      key.includes('acc') || 
      key.includes('exact_match') || 
      key.includes('exactmatch') ||
      key.includes('f1') || 
      key.includes('score') ||
      key.includes('bleu') ||
      key.includes('rouge') ||
      key.includes('precision') ||
      key.includes('recall') ||
      key.includes('meteor') ||
      key.includes('cider') ||
      key.includes('spice') ||
      key.includes('wer') ||
      key.includes('cer') ||
      key.includes('perplexity') ||
      key.includes('loss') ||
      key.includes('auc') ||
      key.includes('mse') ||
      key.includes('mae') ||
      key.includes('r2') ||
      key.includes('em') ||
      key.includes('metric') ||
      key.includes('error') ||
      key.includes('rate')
    )
    
    const isReasonableMetricValue = (v >= 0 && v <= 10) || (v >= 0 && v <= 1) || (v <= 100)
    
    if (isPerformanceMetric || (isReasonableMetricValue && !key.includes('fewshot'))) {
      filtered[k] = v
    }
  }
  
  return filtered
}

/**
 * Detect if a metric is an error rate (WER, CER, MER, etc.)
 * Error rates can be > 1.0 and should be handled differently
 */
export function isErrorRateMetric(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/_/g, '').replace(/-/g, '')
  return (
    normalizedKey.includes('wer') ||
    normalizedKey.includes('cer') ||
    normalizedKey.includes('mer') ||
    normalizedKey.includes('errorrate') ||
    normalizedKey.includes('err') && !normalizedKey.includes('stderr')
  )
}

/**
 * Normalize metric value for display
 * Handles different metric types and ranges appropriately
 */
export function normalizeMetricValue(key: string, value: number): {
  displayValue: number
  isPercentage: boolean
  unit: string
} {
  const isErrorRate = isErrorRateMetric(key)
  const normalizedKey = key.toLowerCase()
  
  // Handle error rates (WER, CER, MER)
  if (isErrorRate) {
    // Error rates can be stored in different formats:
    // 1. Ratio (0-1 range): 0.0593 means 5.93% - needs * 100
    // 2. Percentage (0-100+ range): 5.93 means 5.93% - already correct
    // 3. Some WER can legitimately be > 100% (very bad performance)
    if (value >= 0 && value <= 1) {
      // Ratio format (0-1), convert to percentage
      return {
        displayValue: value * 100,
        isPercentage: true,
        unit: '%'
      }
    } else if (value > 1 && value <= 1000) {
      // Already a percentage format (WER values often stored as percentages)
      // Values like 5.93, 17.15, 298.0 are already percentages
      return {
        displayValue: value,
        isPercentage: true,
        unit: '%'
      }
    } else if (value > 1000 && value <= 10000) {
      // Very high but might be data error - could be already multiplied incorrectly
      // Check if dividing by 100 makes sense
      const divided = value / 100
      if (divided >= 0 && divided <= 1000) {
        // Likely double-multiplied, divide back
        return {
          displayValue: divided,
          isPercentage: true,
          unit: '%'
        }
      }
      // Otherwise show as-is
      return {
        displayValue: value,
        isPercentage: false,
        unit: ''
      }
    } else {
      // Extremely large value, likely data error
      return {
        displayValue: value,
        isPercentage: false,
        unit: ''
      }
    }
  }
  
  // Handle accuracy and score metrics (should be 0-1 range)
  if (
    normalizedKey.includes('acc') ||
    normalizedKey.includes('exact_match') ||
    normalizedKey.includes('exactmatch') ||
    normalizedKey.includes('f1') ||
    normalizedKey.includes('precision') ||
    normalizedKey.includes('recall') ||
    normalizedKey.includes('bleu') ||
    normalizedKey.includes('rouge') ||
    normalizedKey.includes('meteor') ||
    normalizedKey.includes('cider') ||
    normalizedKey.includes('spice') ||
    (normalizedKey.includes('score') && !normalizedKey.includes('wer'))
  ) {
    if (value >= 0 && value <= 1) {
      // Standard 0-1 range, convert to percentage
      return {
        displayValue: value * 100,
        isPercentage: true,
        unit: '%'
      }
    } else if (value > 1 && value <= 100) {
      // Already a percentage (0-100), use as-is
      return {
        displayValue: value,
        isPercentage: true,
        unit: '%'
      }
    } else if (value > 100 && value <= 10000) {
      // Suspiciously high - might be double-multiplied
      // Check if dividing by 100 makes it reasonable
      const divided = value / 100
      if (divided >= 0 && divided <= 100) {
        // Likely double-multiplied, divide back
        return {
          displayValue: divided,
          isPercentage: true,
          unit: '%'
        }
      }
      // Otherwise might be a data error
      return {
        displayValue: value,
        isPercentage: false,
        unit: ''
      }
    } else {
      // Extremely large value, likely data error
      return {
        displayValue: value,
        isPercentage: false,
        unit: ''
      }
    }
  }
  
  // Handle stderr (standard error) - always small values 0-1, convert to percentage
  if (normalizedKey.includes('stderr')) {
    if (value >= 0 && value <= 1) {
      return {
        displayValue: value * 100,
        isPercentage: true,
        unit: '%'
      }
    } else if (value > 1 && value <= 100) {
      return {
        displayValue: value,
        isPercentage: true,
        unit: '%'
      }
    }
  }
  
  // Default: if value is 0-1, treat as fraction and convert to percentage
  // If value is > 1, assume it's already in the desired format
  if (value >= 0 && value <= 1) {
    return {
      displayValue: value * 100,
      isPercentage: true,
      unit: '%'
    }
  } else if (value > 1 && value <= 100) {
    return {
      displayValue: value,
      isPercentage: true,
      unit: '%'
    }
  } else {
    // Values > 100 might be errors or special metrics - display as-is
    return {
      displayValue: value,
      isPercentage: false,
      unit: ''
    }
  }
}

/**
 * Format metric name for display
 */
export function formatMetricName(key: string): string {
  const normalizedKey = key.toLowerCase()
  
  // Handle common metric name patterns
  if (normalizedKey === 'acc' || normalizedKey === 'accuracy') {
    return 'Acc'
  } else if (normalizedKey === 'acc_norm' || normalizedKey === 'accnorm' || normalizedKey === 'accuracy_norm') {
    return 'Acc Norm'
  } else if (normalizedKey === 'acc_stderr' || normalizedKey === 'accstderr' || normalizedKey === 'accuracy_stderr') {
    return 'Acc Stderr'
  } else if (normalizedKey === 'acc_norm_stderr' || normalizedKey === 'accnormstderr' || normalizedKey === 'accuracy_norm_stderr') {
    return 'Acc Norm Stderr'
  } else if (normalizedKey === 'exact_match') {
    return 'Exact Match'
  } else if (normalizedKey === 'exact_match_stderr') {
    return 'Exact Match Stderr'
  } else {
    // Fallback: format generically
    return key
      .replace(/_/g, ' ')
      .replace(/\bacc\b/gi, 'Acc')
      .replace(/\bexact match\b/gi, 'Exact Match')
      .replace(/\bstderr\b/gi, 'Stderr')
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
}

/**
 * Get priority for metric sorting
 */
export function getMetricPriority(key: string): number {
  const normalizedKey = key.toLowerCase().replace(/_/g, '').replace(/-/g, '')
  
  // Exact matches first (most important)
  if (normalizedKey === 'acc' || normalizedKey === 'accuracy') return 1
  if (normalizedKey === 'accnorm' || normalizedKey === 'acc_norm' || normalizedKey === 'accuracynorm') return 2
  if (normalizedKey === 'accstderr' || normalizedKey === 'acc_stderr' || normalizedKey === 'accuracystderr') return 3
  if (normalizedKey === 'accnormstderr' || normalizedKey === 'acc_norm_stderr' || normalizedKey === 'accuracynormstderr') return 4
  
  // Then other accuracy variants
  if (normalizedKey.includes('acc') && !normalizedKey.includes('norm') && !normalizedKey.includes('stderr')) return 5
  if (normalizedKey.includes('acc') && normalizedKey.includes('norm') && !normalizedKey.includes('stderr')) return 6
  if (normalizedKey.includes('acc') && normalizedKey.includes('stderr') && !normalizedKey.includes('norm')) return 7
  if (normalizedKey.includes('acc') && normalizedKey.includes('norm') && normalizedKey.includes('stderr')) return 8
  
  // Exact match metrics
  if (normalizedKey.includes('exactmatch') && !normalizedKey.includes('stderr')) return 9
  if (normalizedKey.includes('exactmatch') && normalizedKey.includes('stderr')) return 10
  
  // F1, BLEU, ROUGE, etc.
  if (normalizedKey.includes('f1') && !normalizedKey.includes('stderr')) return 11
  if (normalizedKey.includes('f1') && normalizedKey.includes('stderr')) return 12
  if (normalizedKey.includes('bleu') && !normalizedKey.includes('stderr')) return 13
  if (normalizedKey.includes('rouge') && !normalizedKey.includes('stderr')) return 14
  if (normalizedKey.includes('precision') && !normalizedKey.includes('stderr')) return 15
  if (normalizedKey.includes('recall') && !normalizedKey.includes('stderr')) return 16
  if (normalizedKey.includes('score') && !normalizedKey.includes('stderr')) return 17
  
  return 99 // Lowest priority
}

/**
 * Sort metrics by priority
 */
export function sortMetricsByPriority(
  metrics: Record<string, number>
): Array<[string, number]> {
  return Object.entries(metrics).sort(([a], [b]) => {
    return getMetricPriority(a) - getMetricPriority(b)
  })
}

/**
 * Prepare benchmark comparison chart data
 */
export function prepareBenchmarkComparisonData(
  benchmarks: Array<{ benchmark_id: string; metrics: Record<string, any> }>,
  selectedMetrics: string[] = []
): ChartDataPoint[] {
  const primaryMetrics = selectedMetrics.length > 0 
    ? selectedMetrics 
    : ['acc', 'acc_norm', 'exact_match']
  
  return benchmarks.map(benchmark => {
    const filteredMetrics = filterPerformanceMetrics(benchmark.metrics || {})
    const dataPoint: ChartDataPoint = {
      name: benchmark.benchmark_id.length > 30 
        ? benchmark.benchmark_id.substring(0, 30) + '...' 
        : benchmark.benchmark_id
    }
    
    // Get values for primary metrics
    primaryMetrics.forEach(metric => {
      const found = Object.keys(filteredMetrics).find(
        k => k.toLowerCase().replace(/_/g, '') === metric.toLowerCase().replace(/_/g, '')
      )
      if (found) {
        const normalized = normalizeMetricValue(found, filteredMetrics[found])
        dataPoint[formatMetricName(found)] = normalized.displayValue
      } else {
        dataPoint[formatMetricName(metric)] = 0
      }
    })
    
    return dataPoint
  })
}

/**
 * Prepare metric distribution data
 */
export function prepareMetricDistributionData(
  benchmarks: Array<{ benchmark_id: string; metrics: Record<string, any> }>,
  metricName: string
): Array<{ benchmark: string; value: number }> {
  const distribution: Array<{ benchmark: string; value: number }> = []
  
  benchmarks.forEach(benchmark => {
    const filteredMetrics = filterPerformanceMetrics(benchmark.metrics || {})
    const found = Object.keys(filteredMetrics).find(
      k => k.toLowerCase().replace(/_/g, '') === metricName.toLowerCase().replace(/_/g, '')
    )
    
    if (found) {
      const normalized = normalizeMetricValue(found, filteredMetrics[found])
      distribution.push({
        benchmark: benchmark.benchmark_id,
        value: normalized.displayValue
      })
    }
  })
  
  return distribution
}

/**
 * Calculate statistics for a distribution
 */
export function calculateStatistics(values: number[]): {
  min: number
  max: number
  avg: number
  median: number
  stdDev: number
} {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, stdDev: 0 }
  }
  
  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]
  
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  
  return { min, max, avg, median, stdDev }
}

/**
 * Prepare heatmap data for benchmark vs metrics
 */
export function prepareHeatmapData(
  benchmarks: Array<{ benchmark_id: string; metrics: Record<string, any> }>
): {
  benchmarks: string[]
  metrics: string[]
  data: Record<string, Record<string, number>>
} {
  const benchmarkIds: string[] = []
  const metricNames: Set<string> = new Set()
  const data: Record<string, Record<string, number>> = {}
  
  benchmarks.forEach(benchmark => {
    benchmarkIds.push(benchmark.benchmark_id)
    const filteredMetrics = filterPerformanceMetrics(benchmark.metrics || {})
    const sortedMetrics = sortMetricsByPriority(filteredMetrics)
    
    sortedMetrics.slice(0, 10).forEach(([key, value]) => {
      const displayName = formatMetricName(key)
      metricNames.add(displayName)
      
      if (!data[benchmark.benchmark_id]) {
        data[benchmark.benchmark_id] = {}
      }
      const normalized = normalizeMetricValue(key, value)
      data[benchmark.benchmark_id][displayName] = normalized.displayValue
    })
  })
  
  return {
    benchmarks: benchmarkIds,
    metrics: Array.from(metricNames),
    data
  }
}

/**
 * Calculate correlation between two metric arrays
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0
  
  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0)
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0)
  const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0)
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  
  if (denominator === 0) return 0
  return numerator / denominator
}

/**
 * Prepare correlation matrix data
 */
export function prepareCorrelationMatrix(
  benchmarks: Array<{ benchmark_id: string; metrics: Record<string, any> }>
): {
  metrics: string[]
  matrix: Record<string, Record<string, number>>
} {
  // Extract all unique metrics
  const allMetrics: Set<string> = new Set()
  
  benchmarks.forEach(benchmark => {
    const filteredMetrics = filterPerformanceMetrics(benchmark.metrics || {})
    Object.keys(filteredMetrics).forEach(key => {
      allMetrics.add(formatMetricName(key))
    })
  })
  
  const metricArray = Array.from(allMetrics)
  
  // Extract metric values for each benchmark
  const metricData: Record<string, number[]> = {}
  metricArray.forEach(metric => {
    metricData[metric] = benchmarks.map(benchmark => {
      const filteredMetrics = filterPerformanceMetrics(benchmark.metrics || {})
      const found = Object.keys(filteredMetrics).find(
        k => formatMetricName(k) === metric
      )
      return found ? filteredMetrics[found] : 0
    })
  })
  
  // Calculate correlations
  const matrix: Record<string, Record<string, number>> = {}
  
  metricArray.forEach(metric1 => {
    matrix[metric1] = {}
    metricArray.forEach(metric2 => {
      if (metric1 === metric2) {
        matrix[metric1][metric2] = 1
      } else {
        matrix[metric1][metric2] = calculateCorrelation(
          metricData[metric1],
          metricData[metric2]
        )
      }
    })
  })
  
  return { metrics: metricArray, matrix }
}

