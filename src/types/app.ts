// Extend CSS properties to include webkit-specific properties
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  hasScreenshot?: boolean
  screenshotUrl?: string
  driveContext?: any[]
  calendarContext?: string
}

export interface PendingCapture {
  type: 'screenshot' | 'audio'
  data: string
  timestamp: Date
}

export type AppMode = 'chat' | 'drive' | 'cleanup' | 'organize' | 'calendar' | 'profile' | 'maps'
export type CalendarRange = 'today' | 'week' | 'next-week'

export interface NewEvent {
  summary: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location: string
  attendees: string
}

export interface DocsNotification {
  type: 'success' | 'error'
  message: string
}

// Re-export types from electron preload for convenience
export type { 
  User, 
  GoogleConnection, 
  SyncProgress, 
  CleanupCandidate, 
  OrganizationCluster, 
  CalendarEvent, 
  Place 
} from '../../electron/preload' 