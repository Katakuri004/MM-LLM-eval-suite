'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface CancelEvaluationDialogProps {
  runId: string
  runName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CancelEvaluationDialog({ runId, runName, open, onOpenChange }: CancelEvaluationDialogProps) {
  const [isCancelling, setIsCancelling] = useState(false)
  const queryClient = useQueryClient()

  const cancelMutation = useMutation({
    mutationFn: () => apiClient.cancelEvaluation(runId),
    onSuccess: () => {
      toast.success('Evaluation cancelled successfully')
      // Invalidate and refetch evaluation data
      queryClient.invalidateQueries({ queryKey: ['evaluation-status', runId] })
      queryClient.invalidateQueries({ queryKey: ['evaluations'] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(`Failed to cancel evaluation: ${error.message || 'Unknown error'}`)
    },
    onSettled: () => {
      setIsCancelling(false)
    }
  })

  const handleCancel = async () => {
    setIsCancelling(true)
    cancelMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Cancel Evaluation
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this evaluation? This action cannot be undone.
            {runName && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <span className="font-medium">Run:</span> {runName}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCancelling}
          >
            Keep Running
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isCancelling}
            className="flex items-center gap-2"
          >
            {isCancelling ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Cancelling...
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                Cancel Evaluation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


