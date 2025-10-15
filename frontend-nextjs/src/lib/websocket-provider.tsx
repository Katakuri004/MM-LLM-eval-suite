'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { websocketService, WebSocketEventType } from './websocket'

interface WebSocketContextType {
  isConnected: boolean
  connectionState: string
  error: Error | null
  connect: () => Promise<void>
  disconnect: () => void
  subscribe: (eventType: WebSocketEventType, callback: (data: any) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState('disconnected')
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const connect = async () => {
      try {
        await websocketService.connect()
      } catch (err) {
        console.warn('Failed to connect to WebSocket:', err)
      }
    }

    connect()

    // Subscribe to connection status updates
    const unsubscribe = websocketService.subscribe('connection_status', (data) => {
      setIsConnected(data.connected)
      setConnectionState(data.connected ? 'connected' : 'disconnected')
      setError(data.error || null)
    })

    return () => {
      unsubscribe()
      websocketService.disconnect()
    }
  }, [])

  const connect = async () => {
    try {
      await websocketService.connect()
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const disconnect = () => {
    websocketService.disconnect()
  }

  const subscribe = (eventType: WebSocketEventType, callback: (data: any) => void) => {
    return websocketService.subscribe(eventType, callback)
  }

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        connectionState,
        error,
        connect,
        disconnect,
        subscribe,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
