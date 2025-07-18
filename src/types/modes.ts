/**
 * Application mode component prop definitions
 * TypeScript interfaces for props passed to different mode components
 */

import type { User, GoogleConnection, CalendarEvent, Place, SyncProgress, CleanupCandidate } from '../../electron/preload'
import type { AppMode, CalendarRange, NewEvent } from './app'
import type { FileCluster } from './services'

/**
 * Props for the calendar mode component
 */
export interface CalendarModeProps {
  user: User
  googleConnection: GoogleConnection
  calendarEvents: CalendarEvent[]
  selectedCalendarRange: CalendarRange
  isLoadingCalendar: boolean
  showCreateEventForm: boolean
  setShowCreateEventForm: (show: boolean) => void
  newEvent: NewEvent
  setNewEvent: (event: NewEvent) => void
  isCreatingEvent: boolean
  handleCalendarRangeChange: (range: CalendarRange) => void
  handleCreateEvent: () => void
  setCurrentMode: (mode: AppMode) => void
}

/**
 * Props for the cleanup mode component
 */
export interface CleanupModeProps {
  user: User
  googleConnection: GoogleConnection
  cleanupCandidates: CleanupCandidate[]
  loadCleanupCandidates: () => void
  handleDeleteFiles: (fileIds: string[]) => void
}

/**
 * Props for the drive mode component
 */
export interface DriveModeProps {
  user: User
  googleConnection: GoogleConnection
  syncProgress: SyncProgress | null
  syncStats: any
  isSyncing: boolean
  handleQuickSync: () => void
  handleDeepSync: () => void
  handleForceSync: () => void
  setCurrentMode: (mode: AppMode) => void
}

/**
 * Props for the maps mode component
 */
export interface MapsModeProps {
  user: User
  googleConnection: GoogleConnection
  places: Place[]
  userLocation: { lat: number; lng: number } | null
  selectedPlace: Place | null
  isSearchingMaps: boolean
  setSelectedPlace: (place: Place | null) => void
  requestLocationPermission: () => Promise<{ lat: number; lng: number } | null>
  setCurrentMode: (mode: AppMode) => void
}

/**
 * Props for the organize mode component
 */
export interface OrganizeModeProps {
  user: User
  googleConnection: GoogleConnection
  organizationClusters: FileCluster[]
  isAnalyzing: boolean
  analyzeForOrganization: () => void
}

/**
 * Props for the profile mode component
 */
export interface ProfileModeProps {
  user: User
  googleConnection: GoogleConnection
  calendarEvents: CalendarEvent[]
  handleSignOut: () => void
  requestLocationPermission: () => Promise<{ lat: number; lng: number } | null>
}

/**
 * Props for the mode renderer component that switches between different modes
 */
export interface ModeRendererProps {
  mode: AppMode
  user: User | null
  googleConnection: GoogleConnection
  
  // Auth props
  handleSignIn: () => Promise<void>
  handleSignOut: () => Promise<void>
  
  // Drive props
  syncProgress: SyncProgress | null
  syncStats: any
  isSyncing: boolean
  cleanupCandidates: CleanupCandidate[]
  organizationClusters: FileCluster[]
  isAnalyzing: boolean
  handleQuickSync: () => void
  handleDeepSync: () => void
  handleForceSync: () => void
  loadCleanupCandidates: () => void
  handleDeleteFiles: (fileIds: string[]) => void
  analyzeForOrganization: () => void
  
  // Calendar props
  calendarEvents: CalendarEvent[]
  selectedCalendarRange: CalendarRange
  isLoadingCalendar: boolean
  showCreateEventForm: boolean
  setShowCreateEventForm: (show: boolean) => void
  newEvent: NewEvent
  setNewEvent: (event: NewEvent) => void
  isCreatingEvent: boolean
  handleCalendarRangeChange: (range: CalendarRange) => void
  handleCreateEvent: () => void
  loadCalendarEvents: (range: CalendarRange) => void
  
  // Maps props
  places: Place[]
  userLocation: { lat: number; lng: number } | null
  selectedPlace: Place | null
  isSearchingMaps: boolean
  setSelectedPlace: (place: Place | null) => void
  requestLocationPermission: () => Promise<{ lat: number; lng: number } | null>
  
  // Shared props
  setCurrentMode: (mode: AppMode) => void
}

/**
 * Props for the authentication button component
 */
export interface AuthButtonProps {
  user: User | null
  googleConnection: GoogleConnection
  onSignIn: () => Promise<void>
  onSignOut: () => Promise<void>
  className?: string
} 