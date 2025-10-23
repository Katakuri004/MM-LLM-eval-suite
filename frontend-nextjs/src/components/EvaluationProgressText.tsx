'use client'

import { ShimmerLoader } from '@/components/ui/loader'

interface EvaluationProgressTextProps {
  progress: number
  status: string
  className?: string
}

export default function EvaluationProgressText({ 
  progress, 
  status, 
  className 
}: EvaluationProgressTextProps) {
  // Define progress-based text messages
  const getProgressText = (progress: number, status: string): string => {
    if (status === 'completed') {
      return 'Evaluation completed successfully!'
    }
    
    if (status === 'failed') {
      return 'Evaluation failed - please check logs'
    }
    
    if (status === 'pending') {
      return 'Preparing evaluation environment...'
    }
    
    if (progress === 0) {
      return 'Initializing evaluation...'
    }
    
    if (progress < 10) {
      return 'Loading model and benchmarks...'
    }
    
    if (progress < 20) {
      return 'Setting up evaluation framework...'
    }
    
    if (progress < 30) {
      return 'Preparing test datasets...'
    }
    
    if (progress < 40) {
      return 'Running initial benchmarks...'
    }
    
    if (progress < 50) {
      return 'Processing vision tasks...'
    }
    
    if (progress < 60) {
      return 'Evaluating text understanding...'
    }
    
    if (progress < 70) {
      return 'Testing multimodal capabilities...'
    }
    
    if (progress < 80) {
      return 'Running advanced benchmarks...'
    }
    
    if (progress < 90) {
      return 'Computing final metrics...'
    }
    
    if (progress < 95) {
      return 'Generating detailed results...'
    }
    
    if (progress < 100) {
      return 'Finalizing evaluation report...'
    }
    
    return 'Evaluation in progress...'
  }

  const progressText = getProgressText(progress, status)
  const displayProgress = status === 'completed' ? 100 : progress

  return (
    <ShimmerLoader
      text={progressText}
      progress={displayProgress}
      className={className}
    />
  )
}
