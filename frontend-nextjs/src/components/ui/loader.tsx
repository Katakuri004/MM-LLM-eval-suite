"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoaderFiveProps {
  text?: string;
  className?: string;
}

export function LoaderFive({ text = "Loading...", className }: LoaderFiveProps) {
  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      <div className="relative">
        <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin">
          <div className="absolute top-0 left-0 w-8 h-8 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {text}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Please wait...
        </div>
      </div>
    </div>
  );
}

interface ShimmerLoaderProps {
  text?: string;
  className?: string;
  progress?: number;
}

export function ShimmerLoader({ text = "Loading...", className, progress = 0 }: ShimmerLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center space-y-3", className)}>
      <div className="relative w-full max-w-xs">
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="absolute -top-1 left-0 w-full h-4 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 animate-pulse">
          {text}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {progress > 0 ? `${Math.round(progress)}% complete` : "Initializing..."}
        </div>
      </div>
    </div>
  );
}
