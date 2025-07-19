"use client"

import { useState } from "react"
import { Bell, X, Check, BrainCircuit, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useNotifications } from "@/contexts/NotificationContext"

export interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  type: 'ai' | 'system' | 'alert'
  link?: string
  icon?: React.ReactNode
}

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { 
    notifications, 
    unreadCount, 
    markAllAsRead, 
    markAsRead, 
    removeNotification, 
    clearAll 
  } = useNotifications()
  
  const getTypeStyles = (type: string) => {
    switch(type) {
      case 'ai':
        return "bg-indigo-500/20 text-indigo-400"
      case 'alert':
        return "bg-amber-500/20 text-amber-400"
      default:
        return "bg-gray-700/80 text-gray-300"
    }
  }
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`relative ${className}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-gray-700 text-[10px] font-medium flex items-center justify-center text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-[#1A1A1A] border-[#2A2A2A]" 
        align="end"
      >
        <div className="flex items-center justify-between p-3 border-b border-[#2A2A2A]">
          <h3 className="font-medium text-sm">Notifications</h3>
          <div className="flex gap-2">
            {notifications.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={markAllAsRead}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs"
                  onClick={clearAll}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2A2A2A]">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`p-3 hover:bg-[#222] transition-colors relative ${!notification.read ? 'bg-[#1E1E2A]' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className={`rounded-full p-2 ${getTypeStyles(notification.type)}`}>
                      {notification.icon || <Bell className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 -mt-1 -mr-1 text-gray-500 hover:text-white"
                          onClick={() => removeNotification(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-gray-500">
                          {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {notification.link && (
                          <Link 
                            href={notification.link}
                            onClick={() => {
                              markAsRead(notification.id)
                              setIsOpen(false)
                            }}
                          >
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs bg-gray-800/80 hover:bg-gray-700 text-gray-300"
                            >
                              View
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-600 rounded-r-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
} 