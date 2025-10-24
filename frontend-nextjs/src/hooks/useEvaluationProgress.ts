import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

interface ProgressUpdate {
  status: string;
  progress: number;
  current_task?: string;
  message: string;
  timestamp: string;
}

export function useEvaluationProgress(evaluationId: string | null) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!evaluationId || !isConnected) return;

    const ws = new WebSocket(`ws://localhost:8000/api/v1/evaluations/ws/${evaluationId}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'evaluation_update') {
          setProgress(data.data);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [evaluationId, isConnected]);

  return { progress };
}
