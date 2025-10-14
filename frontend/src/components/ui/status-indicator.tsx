/**
 * Real-time status indicator component
 */

import { useWebSocket } from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  WifiOff, 
  AlertCircle, 
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function StatusIndicator() {
  const { isConnected, connectionState, error, connect } = useWebSocket();

  const handleReconnect = async () => {
    try {
      await connect();
      toast.success('Connected to real-time updates');
    } catch (error) {
      toast.error('Failed to connect to real-time updates');
    }
  };

  const getStatusIcon = () => {
    if (isConnected) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    if (connectionState === 'connecting') {
      return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
    
    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    
    return <WifiOff className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = () => {
    if (isConnected) {
      return 'Connected';
    }
    
    if (connectionState === 'connecting') {
      return 'Connecting...';
    }
    
    if (error) {
      return 'Error';
    }
    
    return 'Disconnected';
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (isConnected) {
      return 'default';
    }
    
    if (error) {
      return 'destructive';
    }
    
    return 'secondary';
  };

  return (
    <div className="flex items-center space-x-2">
      <Badge variant={getStatusVariant()} className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>
      
      {!isConnected && connectionState !== 'connecting' && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleReconnect}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      )}
    </div>
  );
}
