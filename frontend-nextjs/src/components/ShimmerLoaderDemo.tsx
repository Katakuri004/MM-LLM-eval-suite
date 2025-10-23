'use client'

import { useState, useEffect } from 'react'
import EvaluationProgressText from './EvaluationProgressText'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw } from 'lucide-react'

export default function ShimmerLoaderDemo() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('pending')
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning && status !== 'completed' && status !== 'failed') {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setStatus('completed')
            setIsRunning(false)
            return 100
          }
          return prev + Math.random() * 5 + 1 // Random increment between 1-6
        })
      }, 200)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, status])

  const startDemo = () => {
    setProgress(0)
    setStatus('running')
    setIsRunning(true)
  }

  const pauseDemo = () => {
    setIsRunning(false)
  }

  const resetDemo = () => {
    setProgress(0)
    setStatus('pending')
    setIsRunning(false)
  }

  const simulateFailure = () => {
    setStatus('failed')
    setIsRunning(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shimmer Loader Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Shimmer Loader */}
          <EvaluationProgressText 
            progress={progress}
            status={status}
            className="mb-6"
          />
          
          {/* Controls */}
          <div className="flex gap-2">
            <Button 
              onClick={startDemo} 
              disabled={isRunning || status === 'completed'}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
            <Button 
              onClick={pauseDemo} 
              disabled={!isRunning}
              variant="outline"
              size="sm"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
            <Button 
              onClick={resetDemo} 
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={simulateFailure} 
              variant="destructive"
              size="sm"
              disabled={status === 'completed' || status === 'failed'}
            >
              Simulate Failure
            </Button>
          </div>
          
          {/* Status Info */}
          <div className="text-sm text-muted-foreground">
            <p>Progress: {progress.toFixed(1)}%</p>
            <p>Status: {status}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
