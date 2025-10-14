/**
 * React hook for WebSocket integration
 */

import { useEffect, useRef, useState } from 'react';
import { websocketService, WebSocketEventType } from '@/lib/websocket';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnMount?: boolean;
}

export interface WebSocketState {
  isConnected: boolean;
  connectionState: string;
  error: Error | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, reconnectOnMount = true } = options;
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    connectionState: 'disconnected',
    error: null,
  });

  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current && autoConnect) {
      isInitialized.current = true;
      
      const connect = async () => {
        try {
          await websocketService.connect();
        } catch (error) {
          setState(prev => ({
            ...prev,
            error: error as Error,
          }));
        }
      };

      connect();
    }

    // Subscribe to connection status updates
    const unsubscribe = websocketService.subscribe('connection_status', (data) => {
      setState(prev => ({
        ...prev,
        isConnected: data.connected,
        connectionState: data.connected ? 'connected' : 'disconnected',
        error: data.error || null,
      }));
    });

    return () => {
      unsubscribe();
      if (reconnectOnMount) {
        websocketService.disconnect();
      }
    };
  }, [autoConnect, reconnectOnMount]);

  const connect = async () => {
    try {
      await websocketService.connect();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
      }));
      throw error;
    }
  };

  const disconnect = () => {
    websocketService.disconnect();
  };

  const subscribe = (eventType: WebSocketEventType, callback: (data: any) => void) => {
    return websocketService.subscribe(eventType, callback);
  };

  return {
    ...state,
    connect,
    disconnect,
    subscribe,
  };
}

export function useRunUpdates() {
  const [runUpdates, setRunUpdates] = useState<Map<string, any>>(new Map());
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribeUpdate = subscribe('run_update', (data) => {
      setRunUpdates(prev => new Map(prev.set(data.run_id, data)));
    });

    const unsubscribeCompleted = subscribe('run_completed', (data) => {
      setRunUpdates(prev => new Map(prev.set(data.run_id, data)));
    });

    const unsubscribeFailed = subscribe('run_failed', (data) => {
      setRunUpdates(prev => new Map(prev.set(data.run_id, data)));
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeCompleted();
      unsubscribeFailed();
    };
  }, [subscribe]);

  const getRunUpdate = (runId: string) => {
    return runUpdates.get(runId);
  };

  const clearRunUpdate = (runId: string) => {
    setRunUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(runId);
      return newMap;
    });
  };

  return {
    runUpdates,
    getRunUpdate,
    clearRunUpdate,
  };
}
