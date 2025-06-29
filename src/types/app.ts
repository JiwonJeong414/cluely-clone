// Import types from electron preload
import type { User, GoogleConnection, CalendarEvent, SyncProgress, Place } from '../../electron/preload'

export type AppMode = 'chat' | 'drive' | 'cleanup' | 'organize' | 'calendar' | 'profile' | 'maps'
export type CalendarRange = 'today' | 'week' | 'next-week'

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

// Hook-specific types
export interface UseKeyboardShortcutsProps {
  currentMode: AppMode
  setCurrentMode: (mode: AppMode | ((prev: AppMode) => AppMode)) => void
  user: User | null
  googleConnection: GoogleConnection
  selectedCalendarRange: CalendarRange
  loadCalendarEvents: (range: CalendarRange) => void
}

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

export interface SyncOptions {
  limit?: number
  force?: boolean
  strategy?: 'new_files_only' | 'force_reindex'
}

// Re-export types from electron preload for convenience
export type { User, GoogleConnection, CalendarEvent, SyncProgress, Place }
