/**
 * Application configuration
 */

export const config = {
  // API Configuration
  apiUrl: (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1',
  
  // WebSocket Configuration
  wsUrl: (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000/ws',
  
  // Application Configuration
  appName: (import.meta as any).env?.VITE_APP_NAME || 'LMMS-Eval Dashboard',
  appVersion: (import.meta as any).env?.VITE_APP_VERSION || '1.0.0',
  
  // Feature Flags
  enableWebSocket: (import.meta as any).env?.VITE_ENABLE_WEBSOCKET !== 'false',
  enableAnalytics: (import.meta as any).env?.VITE_ENABLE_ANALYTICS === 'true',
  
  // Development Configuration
  debug: (import.meta as any).env?.VITE_DEBUG === 'true',
  logLevel: (import.meta as any).env?.VITE_LOG_LEVEL || 'info',
  
  // Query Configuration
  queryConfig: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  
  // WebSocket Configuration
  wsConfig: {
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
  },
} as const;

export type Config = typeof config;
