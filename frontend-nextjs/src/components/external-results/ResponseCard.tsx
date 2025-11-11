'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Copy, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { MediaPreview } from '@/components/media/MediaPreview'
import { cn } from '@/lib/utils'

interface ResponseCardProps {
  benchmark_id: string
  modality: string
  input?: string
  prediction?: string
  label?: string
  is_correct: boolean
  score?: number
  error_type?: string | null
  sample_key?: string
  asset_refs?: {
    image_path?: string
    video_path?: string
    audio_path?: string
    text?: string
  }
  model_id_encoded?: string
}

const TRUNCATE_LENGTH = 200

export function ResponseCard({
  benchmark_id,
  modality,
  input,
  prediction,
  label,
  is_correct,
  score,
  error_type,
  sample_key,
  asset_refs,
  model_id_encoded,
}: ResponseCardProps) {
  const [expandedSections, setExpandedSections] = useState<{
    input: boolean
    prediction: boolean
    label: boolean
  }>({
    input: false,
    prediction: false,
    label: false,
  })

  const toggleSection = (section: 'input' | 'prediction' | 'label') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const truncateText = (text: string, length: number = TRUNCATE_LENGTH) => {
    if (!text) return ''
    if (text.length <= length) return text
    return text.substring(0, length) + '...'
  }

  const formatModality = (mod: string) => {
    if (mod === 'multi-modal') return 'Multi-modal'
    return mod.charAt(0).toUpperCase() + mod.slice(1)
  }

  const displayInput = input || ''
  const displayPrediction = prediction || ''
  const displayLabel = label || ''

  const shouldTruncateInput = displayInput.length > TRUNCATE_LENGTH
  const shouldTruncatePrediction = displayPrediction.length > TRUNCATE_LENGTH
  const shouldTruncateLabel = displayLabel.length > TRUNCATE_LENGTH

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      is_correct ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate" title={benchmark_id}>
              {benchmark_id}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="capitalize">
                {formatModality(modality)}
              </Badge>
              <Badge
                variant={is_correct ? "default" : "destructive"}
                className={cn(
                  "flex items-center gap-1",
                  is_correct 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                )}
              >
                {is_correct ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Correct
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    Incorrect
                  </>
                )}
              </Badge>
              {score !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  Score: {score}
                </Badge>
              )}
              {error_type && (
                <Badge variant="outline" className="text-xs">
                  {error_type}
                </Badge>
              )}
              {sample_key && model_id_encoded && (
                <Link href={`/external-results/${encodeURIComponent(model_id_encoded)}/responses/${encodeURIComponent(sample_key)}`} className="ml-2 text-xs underline text-muted-foreground">
                  View details
                </Link>
              )}
            </div>
          </div>
          <MediaPreview modality={modality as any} asset_refs={asset_refs} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Media Section */}
        {asset_refs && (asset_refs.audio_path || asset_refs.image_path || asset_refs.video_path) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Sample Media</Label>
              </div>
            </div>
            <div className="rounded-md p-3 border bg-muted/30">
              <MediaPreview modality={modality as any} asset_refs={asset_refs} className="w-full h-40 rounded-md" />
            </div>
          </div>
        )}

        {/* Prompt Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Prompt</Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => copyToClipboard(displayInput)}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <pre className="whitespace-pre-wrap break-words font-sans">
              {expandedSections.input || !shouldTruncateInput
                ? displayInput
                : truncateText(displayInput)}
            </pre>
            {shouldTruncateInput && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => toggleSection('input')}
              >
                {expandedSections.input ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show more
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Response Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Response</Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => copyToClipboard(displayPrediction)}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
          <div className={cn(
            "rounded-md p-3 text-sm",
            is_correct 
              ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900" 
              : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
          )}>
            <pre className="whitespace-pre-wrap break-words font-sans">
              {expandedSections.prediction || !shouldTruncatePrediction
                ? displayPrediction
                : truncateText(displayPrediction)}
            </pre>
            {shouldTruncatePrediction && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => toggleSection('prediction')}
              >
                {expandedSections.prediction ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show more
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Label Section */}
        {displayLabel && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Ground Truth</Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => copyToClipboard(displayLabel)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-3 text-sm border border-blue-200 dark:border-blue-900">
              <pre className="whitespace-pre-wrap break-words font-sans">
                {expandedSections.label || !shouldTruncateLabel
                  ? displayLabel
                  : truncateText(displayLabel)}
              </pre>
              {shouldTruncateLabel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => toggleSection('label')}
                >
                  {expandedSections.label ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

