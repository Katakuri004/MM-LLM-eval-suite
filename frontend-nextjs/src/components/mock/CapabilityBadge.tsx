'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'

export function CapabilityBadge({ caps }: { caps: string[] }) {
  if (!caps || caps.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {caps.map((c) => (
        <Badge key={c} variant="outline" className="capitalize">
          {c}
        </Badge>
      ))}
    </div>
  )
}


