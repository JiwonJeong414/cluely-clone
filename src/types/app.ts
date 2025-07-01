/**
 * Application-level type definitions
 * Core types for the main application state, modes, and user interactions
 */

// Import types from electron preload
import type { User, GoogleConnection, CalendarEvent, SyncProgress, Place, CreateEventRequest, DriveFile } from '../../electron/preload'

/**
 * Available application modes for different functionality
 */
export type AppMode = 'chat' | 'drive' | 'cleanup' | 'organize' | 'calendar' | 'profile' | 'maps'

/**
 * Calendar view range options
 */
export type CalendarRange = 'today' | 'week' | 'next-week'

/**
 * Represents a chat message in the conversation interface
 *
 * NOTE: This is the application's internal message type for UI and chat history.
 * It includes metadata (id, timestamp, screenshot, drive/calendar context, etc.)
 * and is used for rendering and managing messages in the frontend.
 *
 * This is DIFFERENT from ChatMessage in src/types/api.ts, which is used for
 * communicating with the OpenAI API and supports multimodal content (text/images).
 * Do not confuse or interchange these types—they serve different purposes.
 */
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

/**
 * Represents a pending screen capture or audio recording
 */
export interface PendingCapture {
  type: 'screenshot' | 'audio'
  data: string
  timestamp: Date
}

/**
 * Props for the keyboard shortcuts hook
 */
export interface UseKeyboardShortcutsProps {
  currentMode: AppMode
  setCurrentMode: (mode: AppMode | ((prev: AppMode) => AppMode)) => void
  user: User | null
  googleConnection: GoogleConnection
  selectedCalendarRange: CalendarRange
  loadCalendarEvents: (range: CalendarRange) => void
}

/**
 * Data structure for creating a new calendar event
 */
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

/**
 * Options for Google Drive synchronization
 */
export interface SyncOptions {
  limit?: number
  force?: boolean
  strategy?: 'new_files_only' | 'force_reindex'
}

// Re-export types from electron preload for convenience
export type { User, GoogleConnection, CalendarEvent, SyncProgress, Place, CreateEventRequest, DriveFile }
