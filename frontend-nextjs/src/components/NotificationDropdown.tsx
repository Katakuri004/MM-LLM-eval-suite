'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  timestamp: string
  evaluationId?: string
  read: boolean
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Evaluation Completed',
    message: 'Qwen2.5-1.5B evaluation has completed successfully',
    timestamp: '2 minutes ago',
    evaluationId: '6fd1680d-fcaf-4c77-9ed8-7b693868783d',
    read: false
  },
  {
    id: '2',
    type: 'error',
    title: 'Evaluation Failed',
    message: 'GPT-4 evaluation failed due to timeout',
    timestamp: '15 minutes ago',
    evaluationId: 'abc123-def456-ghi789',
    read: false
  },
  {
    id: '3',
    type: 'info',
    title: 'Evaluation Started',
    message: 'Claude-3 evaluation has started running',
    timestamp: '1 hour ago',
    evaluationId: 'xyz789-uvw456-rst123',
    read: true
  },
  {
    id: '4',
    type: 'warning',
    title: 'Low GPU Memory',
    message: 'GPU memory usage is at 85%',
    timestamp: '2 hours ago',
    read: true
  }
]

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const unreadCount = notifications.filter(n => !n.read).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500'
      case 'error':
        return 'border-l-red-500'
      case 'warning':
        return 'border-l-yellow-500'
      default:
        return 'border-l-blue-500'
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      )
    )

    // Navigate to evaluation if available
    if (notification.evaluationId) {
      router.push(`/evaluations/${notification.evaluationId}`)
    }

    setIsOpen(false)
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-background border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all read
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear all
                </Button>
              </div>
            </div>
          </div>
          
          <ScrollArea className="max-h-96">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <Card 
                      className={`cursor-pointer hover:bg-muted/50 transition-colors border-l-4 ${getNotificationColor(notification.type)} ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.timestamp}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {index < notifications.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
