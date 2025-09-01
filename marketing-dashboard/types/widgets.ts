export interface Widget {
  id: string
  name: string
  platform: string
  isPinned: boolean
  isEnabled: boolean
  type: string // This helps us identify which metric to display
}

export interface WidgetState {
  widgets: Widget[]
  pinnedWidgets: string[] // Array of widget IDs
}

