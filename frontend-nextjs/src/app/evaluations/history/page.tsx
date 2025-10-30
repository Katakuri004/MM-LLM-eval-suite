'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function EvaluationsHistoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluations History</h1>
          <p className="text-muted-foreground">History view is temporarily simplified for deployment.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed Evaluations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Detailed history UI will be restored after deployment. Use the main Evaluations page for now.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
