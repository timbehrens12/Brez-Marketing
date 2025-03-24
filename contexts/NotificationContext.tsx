"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { BrainCircuit } from 'lucide-react'
import { Notification } from '@/components/NotificationBell'

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  unreadCount: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  // Initialize with empty notifications
  useEffect(() => {
    setNotifications([])
  }, [])
  
  const unreadCount = notifications.filter(n => !n.read).length
  
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const now = new Date()
    const newNotification: Notification = {
      ...notification,
      id: `notification-${now.getTime()}`,
      timestamp: now,
      read: false
    }
    setNotifications(prev => [newNotification, ...prev])
  }
  
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }
  
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }
  
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }
  
  const clearAll = () => {
    setNotifications([])
  }
  
  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        addNotification, 
        removeNotification, 
        markAsRead, 
        markAllAsRead, 
        clearAll,
        unreadCount
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
} 