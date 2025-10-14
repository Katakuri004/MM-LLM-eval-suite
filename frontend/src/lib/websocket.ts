/**
 * WebSocket service for real-time updates
 */

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface RunUpdateMessage extends WebSocketMessage {
  type: 'run_update';
  data: {
    run_id: string;
    status: string;
    progress: number;
    completed_tasks: number;
    total_tasks: number;
    error_message?: string;
  };
}

export interface RunCompletedMessage extends WebSocketMessage {
  type: 'run_completed';
  data: {
    run_id: string;
    status: string;
    results: Record<string, any>;
    duration_seconds: number;
  };
}

export interface RunFailedMessage extends WebSocketMessage {
  type: 'run_failed';
  data: {
    run_id: string;
    status: string;
    error_message: string;
  };
}

export type WebSocketEventType = 'run_update' | 'run_completed' | 'run_failed' | 'connection_status';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<WebSocketEventType, Set<(data: any) => void>> = new Map();
  private isConnecting = false;
  private heartbeatInterval: number | null = null;

  constructor(url?: string) {
    this.url = url || ((import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000/ws');
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connection_status', { connected: true });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('connection_status', { connected: false });
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.emit('connection_status', { connected: false, error });
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  subscribe(eventType: WebSocketEventType, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  private emit(eventType: WebSocketEventType, data: any): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'run_update':
        this.emit('run_update', message.data);
        break;
      case 'run_completed':
        this.emit('run_completed', message.data);
        break;
      case 'run_failed':
        this.emit('run_failed', message.data);
        break;
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();
