/**
 * Real-time run progress component
 */

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/lib/websocket-provider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Timer
} from 'lucide-react';

interface RunProgressProps {
  runId: string;
  runName: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  className?: string;
}

export function RunProgress({ 
  runId, 
  runName, 
  status, 
  totalTasks, 
  completedTasks,
  className 
}: RunProgressProps) {
  const { subscribe } = useWebSocket();
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentCompleted, setCurrentCompleted] = useState(completedTasks);
  const [currentTotal, setCurrentTotal] = useState(totalTasks);

  useEffect(() => {
    const unsubscribe = subscribe('run_update', (data) => {
      if (data.run_id === runId) {
        setCurrentStatus(data.status);
        setCurrentCompleted(data.completed_tasks || completedTasks);
        setCurrentTotal(data.total_tasks || totalTasks);
        
        if (data.total_tasks > 0) {
          setCurrentProgress((data.completed_tasks / data.total_tasks) * 100);
        }
      }
    });

    // Initialize with props
    setCurrentStatus(status);
    setCurrentCompleted(completedTasks);
    setCurrentTotal(totalTasks);
    if (totalTasks > 0) {
      setCurrentProgress((completedTasks / totalTasks) * 100);
    }

    return unsubscribe;
  }, [runId, subscribe, status, completedTasks, totalTasks]);

  const getStatusIcon = () => {
    switch (currentStatus) {
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (currentStatus) {
      case 'running':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'cancelled':
        return 'text-gray-600';
      default:
        return 'text-yellow-600';
    }
  };

  const formatProgress = () => {
    if (currentTotal === 0) return '0%';
    return `${Math.round(currentProgress)}%`;
  };

  const formatTasks = () => {
    return `${currentCompleted}/${currentTotal}`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="truncate">{runName}</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Badge variant="outline" className={getStatusColor()}>
              {currentStatus}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{formatProgress()}</span>
          </div>
          <Progress value={currentProgress} className="h-2" />
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Tasks</span>
          </div>
          <span className="font-medium">{formatTasks()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
