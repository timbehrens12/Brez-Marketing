"use client"

import React from 'react'
import { cn } from "@/lib/utils"

interface AlertBoxProps {
  title?: string
  type?: 'info' | 'warning' | 'success' | 'error'
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function AlertBox({ 
  title, 
  type = 'info',
  icon,
  children,
  className
}: AlertBoxProps) {
  
  const getTypeStyles = () => {
    switch (type) {
      case 'info':
        return 'bg-blue-900/20 border-blue-800/30'
      case 'warning':
        return 'bg-amber-900/20 border-amber-800/30'
      case 'success':
        return 'bg-green-900/20 border-green-800/30'
      case 'error':
        return 'bg-red-900/20 border-red-800/30'
      default:
        return 'bg-gray-800/50 border-gray-700/50'
    }
  }
  
  return (
    <div className={cn(
      "rounded-lg p-3 border", 
      getTypeStyles(),
      className
    )}>
      <div className="flex">
        {icon && (
          <div className="mr-3 mt-0.5">
            {icon}
          </div>
        )}
        <div>
          {title && (
            <div className="font-medium text-sm mb-1">{title}</div>
          )}
          <div>{children}</div>
        </div>
      </div>
    </div>
  )
} 