import { useState, useEffect, useCallback } from 'react'
import type { User, GoogleConnection, SyncProgress, CleanupCandidate, OrganizationCluster, CalendarEvent, Place } from '../../electron/preload'

// Add new state for pending captures
interface PendingCapture {
  type: 'screenshot' | 'audio'
  data: string
  timestamp: Date
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  hasScreenshot?: boolean
  screenshotUrl?: string
  driveContext?: any[]
  calendarContext?: string
}

export type AppMode = 'chat' | 'drive' | 'cleanup' | 'organize' | 'calendar' | 'profile' | 'maps'
type CalendarRange = 'today' | 'week' | 'next-week'

export const useAppState = () => {
  // Existing state
  const [appVersion, setAppVersion] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [currentResponse, setCurrentResponse] = useState<Message | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // New Drive state
  const [currentMode, setCurrentMode] = useState<AppMode>('chat')
  const [user, setUser] = useState<User | null>(null)
  const [googleConnection, setGoogleConnection] = useState<GoogleConnection>({ isConnected: false })
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [cleanupCandidates, setCleanupCandidates] = useState<CleanupCandidate[]>([])
  const [organizationClusters, setOrganizationClusters] = useState<OrganizationCluster[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  
  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [calendarContext, setCalendarContext] = useState<string>('')
  const [selectedCalendarRange, setSelectedCalendarRange] = useState<CalendarRange>('today')
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false)
  
  // Maps state
  const [places, setPlaces] = useState<Place[]>([])
  const [isSearchingMaps, setIsSearchingMaps] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [lastQueryWasLocation, setLastQueryWasLocation] = useState(false)
  
  // Add state for sync stats
  const [syncStats, setSyncStats] = useState<any>(null)
  
  // Add new state for pending captures
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null)
  const [contextedMessages, setContextedMessages] = useState<string>('')
  
  // Google Docs state
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [docsNotification, setDocsNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  // Add state for creating events
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [showCreateEventForm, setShowCreateEventForm] = useState(false)
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    attendees: ''
  })

  return {
    // State
    appVersion,
    setAppVersion,
    isDragging,
    setIsDragging,
    currentResponse,
    setCurrentResponse,
    streamingText,
    setStreamingText,
    isStreaming,
    setIsStreaming,
    inputValue,
    setInputValue,
    isLoading,
    setIsLoading,
    isInitialized,
    setIsInitialized,
    currentMode,
    setCurrentMode,
    user,
    setUser,
    googleConnection,
    setGoogleConnection,
    syncProgress,
    setSyncProgress,
    cleanupCandidates,
    setCleanupCandidates,
    organizationClusters,
    setOrganizationClusters,
    isSyncing,
    setIsSyncing,
    isAnalyzing,
    setIsAnalyzing,
    isAuthenticating,
    setIsAuthenticating,
    searchResults,
    setSearchResults,
    calendarEvents,
    setCalendarEvents,
    calendarContext,
    setCalendarContext,
    selectedCalendarRange,
    setSelectedCalendarRange,
    isLoadingCalendar,
    setIsLoadingCalendar,
    places,
    setPlaces,
    isSearchingMaps,
    setIsSearchingMaps,
    userLocation,
    setUserLocation,
    selectedPlace,
    setSelectedPlace,
    lastQueryWasLocation,
    setLastQueryWasLocation,
    syncStats,
    setSyncStats,
    pendingCapture,
    setPendingCapture,
    contextedMessages,
    setContextedMessages,
    isCreatingNote,
    setIsCreatingNote,
    docsNotification,
    setDocsNotification,
    isCreatingEvent,
    setIsCreatingEvent,
    showCreateEventForm,
    setShowCreateEventForm,
    newEvent,
    setNewEvent
  }
} 