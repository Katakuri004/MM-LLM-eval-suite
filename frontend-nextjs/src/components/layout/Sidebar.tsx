'use client'

/**
 * Collapsible sidebar navigation component
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Brain,
  Play,
  Target,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  Database,
  Users,
  FileText,
  Zap,
  Globe,
  Eye,
  TrendingUp,
  Award,
  BookOpen,
  Cpu,
  Image,
  Mic,
  Video,
  FileImage,
  MessageSquare,
  Calculator,
  Shield,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  HelpCircle,
  Info,
  Clock,
  Key,
  Bell
} from 'lucide-react'

interface SidebarItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: SidebarItem[]
}

const navigationItems: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
  },
  {
    name: 'Models',
    href: '/models',
    icon: Brain,
    children: [
      { name: 'All Models', href: '/models', icon: Database },
      { name: 'Add Model', href: '/models/new', icon: Upload },
      { name: 'Model Families', href: '/models/families', icon: Cpu },
    ]
  },
  {
    name: 'Evaluations',
    href: '/evaluations',
    icon: Play,
    children: [
      { name: 'All Runs', href: '/evaluations', icon: Activity },
      { name: 'New Evaluation', href: '/evaluations/new', icon: Zap },
      { name: 'Active Runs', href: '/evaluations/active', icon: RefreshCw },
      { name: 'Run History', href: '/evaluations/history', icon: FileText },
      { name: 'Mock Results', href: '/mock-results', icon: BarChart3 },
    ]
  },
  {
    name: 'Benchmarks',
    href: '/benchmarks',
    icon: Target,
    children: [
      { name: 'All Benchmarks', href: '/benchmarks', icon: Award },
      { name: 'Text Benchmarks', href: '/benchmarks/text', icon: MessageSquare },
      { name: 'Vision Benchmarks', href: '/benchmarks/vision', icon: Image },
      { name: 'Audio Benchmarks', href: '/benchmarks/audio', icon: Mic },
      { name: 'Video Benchmarks', href: '/benchmarks/video', icon: Video },
      { name: 'Multimodal', href: '/benchmarks/multimodal', icon: FileImage },
    ]
  },
  {
    name: 'Leaderboard',
    href: '/leaderboard',
    icon: TrendingUp,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Clusters',
    href: '/clusters',
    icon: Cpu,
    children: [
      { name: 'Settings', href: '/clusters', icon: Settings },
      { name: 'Access', href: '/clusters/access', icon: RefreshCw }
    ]
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const pathname = usePathname()

  const toggleExpanded = (itemName: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName)
    } else {
      newExpanded.add(itemName)
    }
    setExpandedItems(newExpanded)
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.name)
    const active = isActive(item.href)

    return (
      <div key={item.name}>
        <div className="flex items-center">
          <Link
            href={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group",
              "hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent text-accent-foreground",
              level > 0 && "ml-4",
              isCollapsed && "justify-center px-2"
            )}
          >
            <item.icon className={cn("h-4 w-4 flex-shrink-0", active && "text-primary")} />
            {!isCollapsed && (
              <>
                <span className="truncate">{item.name}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Link>
          
          {hasChildren && !isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 w-6 p-0"
              onClick={() => toggleExpanded(item.name)}
            >
              {isExpanded ? (
                <ChevronLeft className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">LMMS-Eval</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => renderSidebarItem(item))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t">
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground text-center">
            <p>LMMS-Eval Dashboard</p>
            <p>v1.0.0</p>
          </div>
        )}
      </div>
    </div>
  )
}
