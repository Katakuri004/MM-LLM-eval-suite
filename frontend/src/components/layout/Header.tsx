/**
 * Header component with navigation and branding
 */

import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { 
  Brain, 
  BarChart3, 
  Play, 
  Settings, 
  Menu,
  Activity
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Models', href: '/models', icon: Brain },
  { name: 'Evaluations', href: '/evaluations', icon: Play },
  { name: 'Leaderboard', href: '/leaderboard', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">LMMS-Eval</span>
            <Badge variant="secondary" className="text-xs">
              Dashboard
            </Badge>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-4">
          <StatusIndicator />
          <Button variant="outline" size="sm">
            <Menu className="h-4 w-4 mr-2" />
            Menu
          </Button>
        </div>
      </div>
    </header>
  );
}
