'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'

export function CapabilitiesRadar({ data }: { data: Record<string, number> }) {
  const radarData = Object.entries(data).map(([k, v]) => ({ capability: k, score: Math.max(0, Math.min(1, v || 0)) }))
  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Capabilities</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer>
          <RadarChart data={radarData} outerRadius={110}>
            <PolarGrid />
            <PolarAngleAxis dataKey="capability" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
            <Tooltip formatter={(v: any) => `${(v * 100).toFixed(1)}%`} />
            <Legend />
            <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}


