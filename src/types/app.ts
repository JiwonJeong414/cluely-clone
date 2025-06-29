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
