'use client'

import { cn } from '@/lib/utils'

interface ShimmerLoaderProps {
  className?: string
  children?: React.ReactNode
  isLoading?: boolean
  variant?: 'default' | 'card' | 'text' | 'button'
}

export function ShimmerLoader({ 
  className, 
  children, 
  isLoading = true, 
  variant = 'default' 
}: ShimmerLoaderProps) {
  if (!isLoading) {
    return <>{children}</>
  }

  const baseClasses = "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]"
  
  const variantClasses = {
    default: "rounded-md",
    card: "rounded-lg h-32",
    text: "rounded h-4",
    button: "rounded-md h-10 w-24"
  }

  return (
    <div 
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={{
        animation: 'shimmer 2s infinite linear',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%'
      }}
    >
      {children}
    </div>
  )
}

// Shimmer animation keyframes (add to global CSS)
export const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`

// Process indicator component
interface ProcessIndicatorProps {
  steps: Array<{
    id: string
    name: string
    description: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    progress?: number
  }>
  currentStep?: string
}

export function ProcessIndicator({ steps, currentStep }: ProcessIndicatorProps) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        Evaluation Progress
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = step.status === 'completed'
          const isFailed = step.status === 'failed'
          const isRunning = step.status === 'running'
          
          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Step indicator */}
              <div className="flex-shrink-0 mt-1">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : isFailed ? (
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : isRunning ? (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-gray-400"></div>
                )}
              </div>
              
              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-medium ${
                    isActive || isRunning ? 'text-blue-600' : 
                    isCompleted ? 'text-green-600' : 
                    isFailed ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </h4>
                  {isRunning && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
                {isRunning && step.progress !== undefined && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${step.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {step.progress}% complete
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Enhanced progress indicator with shimmer
export function ShimmerProgressIndicator({ 
  status, 
  progress, 
  currentStep,
  steps 
}: {
  status: string
  progress: number
  currentStep?: string
  steps?: Array<{
    id: string
    name: string
    description: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    progress?: number
  }>
}) {
  const isRunning = status === 'running'
  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'
  
  return (
    <div className="space-y-6">
      {/* Main progress display */}
      <div className="text-center space-y-4">
        <div className="text-3xl font-bold text-gray-700 dark:text-gray-300">
          {Math.round(progress * 100)}%
        </div>
        
        {/* Progress bar with shimmer effect */}
        <div className="w-full max-w-md mx-auto">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            {isRunning ? (
              <div 
                className="h-4 rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 bg-[length:200%_100%] animate-pulse"
                style={{ 
                  width: `${Math.round(progress * 100)}%`,
                  animation: 'shimmer 2s infinite linear'
                }}
              />
            ) : (
              <div 
                className={`h-4 rounded-full transition-all duration-700 ease-out ${
                  isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' : 
                  isFailed ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                  'bg-gradient-to-r from-gray-400 to-gray-500'
                }`}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            )}
          </div>
        </div>

        {/* Status message with shimmer */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {isRunning ? (
            <div className="space-y-1">
              <div className="font-medium flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Evaluation in Progress
              </div>
              <div className="text-xs flex items-center justify-center gap-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span className="ml-2">Processing benchmarks and generating results...</span>
              </div>
            </div>
          ) : isCompleted ? (
            <div className="space-y-1">
              <div className="font-medium text-green-600 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Evaluation Completed
              </div>
              <div className="text-xs">All benchmarks processed successfully</div>
            </div>
          ) : isFailed ? (
            <div className="space-y-1">
              <div className="font-medium text-red-600 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Evaluation Failed
              </div>
              <div className="text-xs">Check logs for error details</div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="font-medium">Preparing Evaluation</div>
              <div className="text-xs">Setting up environment and loading models...</div>
            </div>
          )}
        </div>
      </div>

      {/* Process steps if provided */}
      {steps && (
        <div className="bg-card border rounded-lg p-6">
          <ProcessIndicator steps={steps} currentStep={currentStep} />
        </div>
      )}
    </div>
  )
}
