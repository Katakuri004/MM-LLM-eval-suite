/**
 * Dashboard page with overview statistics and recent activity
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api';
import { 
  Brain, 
  BarChart3, 
  Play, 
  Activity, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['overview-stats'],
    queryFn: () => apiClient.getOverviewStats(),
  });

  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ['runs', { limit: 5 }],
    queryFn: () => apiClient.getRuns(0, 5),
  });

  const { data: activeRuns } = useQuery({
    queryKey: ['active-runs'],
    queryFn: () => apiClient.getActiveRuns(),
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  if (statsLoading || runsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statusIcons = {
    completed: CheckCircle,
    running: Activity,
    failed: XCircle,
    pending: Clock,
    cancelled: AlertCircle,
  };

  const statusColors = {
    completed: 'text-green-600',
    running: 'text-blue-600',
    failed: 'text-red-600',
    pending: 'text-yellow-600',
    cancelled: 'text-gray-600',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your LMM evaluations and track performance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link to="/evaluations/new">
              <Play className="h-4 w-4 mr-2" />
              New Evaluation
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_models || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available for evaluation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Benchmarks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_benchmarks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Evaluation benchmarks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_runs || 0}</div>
            <p className="text-xs text-muted-foreground">
              All-time evaluations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRuns?.active_runs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      {stats?.status_counts && (
        <Card>
          <CardHeader>
            <CardTitle>Run Status Breakdown</CardTitle>
            <CardDescription>
              Distribution of evaluation runs by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.status_counts).map(([status, count]) => {
                const Icon = statusIcons[status as keyof typeof statusIcons];
                const colorClass = statusColors[status as keyof typeof statusColors];
                return (
                  <div key={status} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {Icon && <Icon className={`h-6 w-6 ${colorClass}`} />}
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {status}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Evaluations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Evaluations</CardTitle>
            <CardDescription>
              Latest evaluation runs and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {runs?.runs?.map((run) => {
                const StatusIcon = statusIcons[run.status as keyof typeof statusIcons];
                const colorClass = statusColors[run.status as keyof typeof statusColors];
                const progress = run.total_tasks > 0 ? (run.completed_tasks / run.total_tasks) * 100 : 0;
                
                return (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {StatusIcon && <StatusIcon className={`h-5 w-5 ${colorClass}`} />}
                      <div>
                        <div className="font-medium">{run.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {run.model_id} • {run.checkpoint_variant}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={colorClass}>
                        {run.status}
                      </Badge>
                      {run.status === 'running' && (
                        <div className="w-16">
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Button variant="outline" asChild className="w-full">
                <Link to="/evaluations">View All Evaluations</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link to="/evaluations/new">
                  <Play className="h-4 w-4 mr-2" />
                  Start New Evaluation
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/models">
                  <Brain className="h-4 w-4 mr-2" />
                  Manage Models
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/leaderboard">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Leaderboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/models">
                  <Brain className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
