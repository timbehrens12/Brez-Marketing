"use client"

import { create } from 'zustand'

interface NotificationCounts {
  todoCount: number
  brandHealthCount: number
  toolsCount: number
  totalCount: number
}

interface NotificationStore extends NotificationCounts {
  isLoading: boolean
  lastUpdated: Date | null
  
  // Actions
  updateCounts: (counts: Partial<NotificationCounts>) => void
  setLoading: (loading: boolean) => void
  incrementTodo: () => void
  decrementTodo: () => void
  markBrandHealthRead: () => void
  reset: () => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // Initial state
  todoCount: 0,
  brandHealthCount: 0,
  toolsCount: 0,
  totalCount: 0,
  isLoading: false,
  lastUpdated: null,
  
  // Actions
  updateCounts: (counts) => {
    const state = get()
    const newCounts = { ...state, ...counts }
    newCounts.totalCount = newCounts.todoCount + newCounts.brandHealthCount + newCounts.toolsCount
    
    set({
      ...newCounts,
      lastUpdated: new Date()
    })
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  incrementTodo: () => {
    const state = get()
    set({
      todoCount: state.todoCount + 1,
      totalCount: state.totalCount + 1,
      lastUpdated: new Date()
    })
  },
  
  decrementTodo: () => {
    const state = get()
    const newTodoCount = Math.max(0, state.todoCount - 1)
    set({
      todoCount: newTodoCount,
      totalCount: state.totalCount - (state.todoCount - newTodoCount),
      lastUpdated: new Date()
    })
  },
  
  markBrandHealthRead: () => {
    const state = get()
    set({
      brandHealthCount: Math.max(0, state.brandHealthCount - 1),
      totalCount: Math.max(0, state.totalCount - 1),
      lastUpdated: new Date()
    })
  },
  
  reset: () => set({
    todoCount: 0,
    brandHealthCount: 0,
    toolsCount: 0,
    totalCount: 0,
    isLoading: false,
    lastUpdated: null
  })
}))