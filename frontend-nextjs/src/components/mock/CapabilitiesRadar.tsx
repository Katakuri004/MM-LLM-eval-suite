'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface CapabilitiesRadarProps {
  data: Record<string, number>
  height?: number
  showTitle?: boolean
  outerRadius?: number
}

export function CapabilitiesRadar({ 
  data, 
  height = 320, 
  showTitle = true,
  outerRadius = 110 
}: CapabilitiesRadarProps) {
  // Transform data to array format for RadarChart
  // RadarChart expects an array with a single object containing all capability scores
  // Each capability becomes a key in the object, and the array has one row
  const normalizedData: Record<string, number> = {}
  Object.entries(data).forEach(([k, v]) => {
    if (v != null) {
      let normalizedScore = v
      if (v > 1) {
        // If value is > 1, assume it's a percentage (0-100), convert to 0-1
        normalizedScore = v / 100
      }
      normalizedData[k] = Math.max(0, Math.min(1, normalizedScore || 0))
    }
  })
  
  // RadarChart expects: [{ capability: 'reasoning', score: 0.5 }, { capability: 'commonsense', score: 0.3 }, ...]
  // Each capability becomes a separate data point
  const radarData = Object.entries(normalizedData).map(([capability, score]) => ({
    capability,
    score
  }))
  
  if (radarData.length === 0 || Object.keys(data).length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle>Model Capabilities</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">No capability data available</div>
        </CardContent>
      </Card>
    )
  }
  
  const chart = (
    <div style={{ height: `${height}px`, width: '100%', minHeight: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} outerRadius={outerRadius}>
          <PolarGrid />
          <PolarAngleAxis 
            tick={{ fontSize: 12 }} 
            dataKey="capability"
          />
          <PolarRadiusAxis 
            tickFormatter={(v) => `${Math.round(v * 100)}%`} 
            domain={[0, 1]}
            angle={90}
          />
          <Tooltip 
            formatter={(v: any, name: string) => [`${(v * 100).toFixed(1)}%`, name]}
          />
          <Legend />
          <Radar 
            name="Score" 
            dataKey="score"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
            dot={{ fill: '#3b82f6', r: 4 }}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )

  if (!showTitle) {
    return (
      <div className="w-full" style={{ height: `${height}px` }}>
        {chart}
      </div>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>Model Capabilities</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 flex-1 flex items-center justify-center">
        {chart}
      </CardContent>
    </Card>
  )
}


