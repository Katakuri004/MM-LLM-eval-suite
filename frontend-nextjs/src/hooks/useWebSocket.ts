'use client'

import { useEffect, useState, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket('ws://localhost:8000/ws');
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setError(null);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('WebSocket connection failed');
        };

      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        setError('Failed to create WebSocket connection');
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    error,
    sendMessage,
  };
}

export function useRunUpdates() {
  const [runUpdates, setRunUpdates] = useState<Map<string, any>>(new Map());
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    const ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'run_update' || message.type === 'run_completed' || message.type === 'run_failed') {
          setRunUpdates(prev => new Map(prev.set(message.data.run_id, message.data)));
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [isConnected]);

  return { runUpdates };
}
