import type { User, GoogleConnection, Place, CalendarEvent } from '../../electron/preload'
import type { Message, AppMode, PendingCapture } from './app'

export interface AppHeaderProps {
  user: User | null
  googleConnection: GoogleConnection
  currentMode: AppMode
  setCurrentMode: (mode: AppMode) => void
  calendarEvents: CalendarEvent[]
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent) => void
  appVersion: string
  pendingCapture: any
  onSignIn: () => Promise<void>
  onSignOut: () => Promise<void>
  isAuthenticating: boolean
}

export interface AudioButtonProps {
  onAudioProcessed?: (transcription: string) => void
  className?: string
}

export interface ChatInputProps {
  pendingCapture: any
  onSubmit?: (message: string) => void
  disabled?: boolean
}

export interface ChatInterfaceProps {
  user: User | null
  googleConnection: GoogleConnection
  places: Place[]
  setPlaces: (places: Place[]) => void
  userLocation: { lat: number; lng: number } | null
  setUserLocation: (location: { lat: number; lng: number } | null) => void
  pendingCapture: PendingCapture | null
  setPendingCapture: (capture: PendingCapture | null) => void
  isSearchingMaps: boolean
  setIsSearchingMaps: (searching: boolean) => void
  lastQueryWasLocation: boolean
  setLastQueryWasLocation: (was: boolean) => void
  searchResults: any[]
  handleCreateEventFromChat: (eventData: any, originalMessage: string) => Promise<void>
  showDocsNotification: (type: 'success' | 'error', message: string) => void
  requestLocationPermission: () => Promise<{ lat: number; lng: number } | null>
  updateDimensions: () => void
}

export interface MapVisualizationProps {
  places: Place[]
  isSearching: boolean
  userLocation?: { lat: number; lng: number }
  className?: string
  style?: React.CSSProperties
}

export interface NotificationManagerProps {
  docsNotification: { type: 'success' | 'error'; message: string } | null
  isCreatingNote: boolean
}

export interface PlacesListProps {
  places: Place[]
  onPlaceSelect?: (place: Place) => void
  className?: string
}

export interface WelcomeContentProps {
  user: User | null
  googleConnection: GoogleConnection
  onSuggestionClick: (suggestion: string) => void
} 