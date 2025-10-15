'use client'

/**
 * Simplified navbar with connection status, app name, and settings
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { 
  Settings,
  Menu,
  Brain
} from 'lucide-react'

interface NavbarProps {
  onMenuClick?: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Left side - Menu button and App name */}
        <div className="flex items-center space-x-4">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="md:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">LMMS-Eval</span>
            <Badge variant="secondary" className="text-xs">
              Dashboard
            </Badge>
          </div>
        </div>

        {/* Right side - Connection status and Settings */}
        <div className="flex items-center space-x-4">
          <StatusIndicator />
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
