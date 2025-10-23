"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface CardHoverEffectProps {
  children: React.ReactNode
  className?: string
}

export function CardHoverEffect({ children, className }: CardHoverEffectProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/20",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300",
        "group-hover:before:opacity-100",
        className
      )}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}


