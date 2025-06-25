import React, { useEffect, useState, useRef, useCallback } from 'react'
import { initializeOpenAI, getOpenAI, type ChatMessage } from './api/openai'
import type { User, GoogleConnection, SyncProgress, CleanupCandidate, DriveFile, OrganizationCluster, CalendarEvent, Place } from '../electron/preload'
import { AuthButton } from './components/AuthButton'
import { MapVisualization } from './components/MapVisualization'
import { PlacesList } from './components/PlacesList'

// Debug component for API key troubleshooting
const DebugAPIKey = () => {
  const frontendKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  
  return (
    <div className="fixed top-0 right-0 bg-black/90 text-white p-3 text-xs z-50 max-w-xs">
      <div className="font-bold mb-2">🔍 API Key Debug</div>
      <div>Frontend Key: {frontendKey ? '✅ Found' : '❌ Missing'}</div>
      {frontendKey && (
        <div>Preview: {frontendKey.substring(0, 12)}...</div>
      )}
      <div>Env Mode: {import.meta.env.MODE}</div>
      <div>Base URL: {import.meta.env.BASE_URL}</div>
    </div>
  )
}

// Extend CSS properties to include webkit-specific properties
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
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

type AppMode = 'chat' | 'drive' | 'cleanup' | 'organize' | 'calendar' | 'profile' | 'maps'
type CalendarRange = 'today' | 'week' | 'next-week'

function App() {
  // Existing state
  const [appVersion, setAppVersion] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
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
  
  const contentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Set up sync progress listener ONCE on mount
  useEffect(() => {
    if (window.electronAPI?.onDriveSyncProgress) {
      console.log('Setting up drive sync progress listener')
      window.electronAPI.onDriveSyncProgress((progress: SyncProgress) => {
        console.log('📊 Sync progress update:', progress)
        setSyncProgress(progress)
        
        // Clear progress when sync is complete
        if (progress.isComplete) {
          setTimeout(() => setSyncProgress(null), 3000)
        }
      })
    }
  }, [])

  // Load user data on startup
  useEffect(() => {
    const loadUserData = async () => {
      if (window.electronAPI?.auth) {
        try {
          const userData = await window.electronAPI.auth.getUser()
          if (userData) {
            setUser(userData)
            
            // Use the consistent API name
            const connection = await window.electronAPI.auth.getGoogleConnection()
            setGoogleConnection(connection)
            
            // Load today's calendar events automatically ONLY if not already loading
            if (connection.isConnected && !isLoadingCalendar) {
              loadCalendarEvents('today')
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      }
    }

    loadUserData()
  }, []) // Remove isLoadingCalendar dependency to avoid loops

  // Load sync stats when user connects
  useEffect(() => {
    if (user && googleConnection.isConnected) {
      refreshSyncStats()
    }
  }, [user, googleConnection.isConnected])

  // Load calendar events function
  const loadCalendarEvents = async (range: CalendarRange) => {
    if (!window.electronAPI?.calendar || !user || !googleConnection.isConnected || isLoadingCalendar) {
      return
    }

    setIsLoadingCalendar(true)
    try {
      let result
      switch (range) {
        case 'today':
          result = await window.electronAPI.calendar.getToday()
          break
        case 'week':
          result = await window.electronAPI.calendar.getWeek()
          break
        case 'next-week':
          result = await window.electronAPI.calendar.getNextWeek()
          break
        default:
          result = await window.electronAPI.calendar.getToday()
      }

      if (result.success) {
        setCalendarEvents(result.events || [])
        console.log(`📅 Loaded ${result.events?.length || 0} events for ${range}`)
      } else {
        console.error('Failed to load calendar events:', result.error)
        setCalendarEvents([])
      }
    } catch (error) {
      console.error('Error loading calendar events:', error)
      setCalendarEvents([])
    } finally {
      setIsLoadingCalendar(false)
    }
  }

  // Update calendar range and load events
  const handleCalendarRangeChange = (range: CalendarRange) => {
    setSelectedCalendarRange(range)
    loadCalendarEvents(range)
  }

  // Listen for global screenshot capture
  useEffect(() => {
    if (window.electronAPI?.onScreenshotCaptured) {
      console.log('Setting up screenshot listener')
      window.electronAPI.onScreenshotCaptured((screenshot: string) => {
        console.log('📸 Screenshot received in React!', screenshot.substring(0, 50) + '...')
        sendMessage("What do you see on my screen?", screenshot)
        if (currentMode !== 'chat') setCurrentMode('chat')
      })
    }
  }, [currentMode])

  // Debug API key function
  const testAPIKey = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.debug.apiKey()
        console.log('🔍 Main Process Debug:', result)
      } catch (error) {
        console.error('Debug failed:', error)
      }
    }
  }

  // Test API key on component mount
  useEffect(() => {
    testAPIKey()
  }, [])

  // Update dimensions when content changes
  const updateDimensions = useCallback(() => {
    if (contentRef.current && window.electronAPI?.updateContentDimensions) {
      requestAnimationFrame(() => {
        if (contentRef.current) {
          const rect = contentRef.current.getBoundingClientRect()
          const width = Math.ceil(rect.width)
          const height = Math.ceil(rect.height)
          
          if (width > 0 && height > 0) {
            window.electronAPI.updateContentDimensions({ width, height })
          }
        }
      })
    }
  }, [])

  // Authentication functions
  const handleSignIn = async () => {
    if (!window.electronAPI?.auth) return
    
    setIsAuthenticating(true)
    try {
      const result = await window.electronAPI.auth.signIn()
      if (result.success && result.user) {
        setUser(result.user)
        
        // Use consistent API
        const connection = await window.electronAPI.auth.getGoogleConnection()
        setGoogleConnection(connection)
        
        // Load calendar events after sign in
        if (connection.isConnected) {
          setTimeout(() => loadCalendarEvents('today'), 1000) // Slight delay to avoid conflicts
        }
      } else {
        console.error('Sign in failed:', result.error)
      }
    } catch (error) {
      console.error('Error signing in:', error)
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleSignOut = async () => {
    if (!window.electronAPI?.auth) return
    
    try {
      await window.electronAPI.auth.signOut()
      setUser(null)
      setGoogleConnection({ isConnected: false })
      setCalendarEvents([])
      setSyncProgress(null) // Clear any ongoing sync progress
      setSearchResults([]) // Clear drive search results
      setCurrentMode('chat')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Enhanced sync function with options
  const handleSync = async (options: { 
    limit?: number
    force?: boolean
    strategy?: 'new_files_only' | 'force_reindex'
  } = {}) => {
    if (!window.electronAPI?.drive || !user || !googleConnection.isConnected) {
      console.error('Cannot sync: missing requirements', { 
        hasAPI: !!window.electronAPI?.drive, 
        hasUser: !!user, 
        isConnected: googleConnection.isConnected 
      })
      return
    }
    
    const { limit = 10, force = false, strategy = 'new_files_only' } = options
    
    console.log(`🚀 Starting ${strategy} sync with limit ${limit}...`)
    setIsSyncing(true)
    setSyncProgress(null)
    
    try {
      const result = await window.electronAPI.drive.sync({ limit, force, strategy })
      if (result.success) {
        console.log('✅ Sync completed:', result.result)
        
        // Refresh sync stats
        await refreshSyncStats()
        
        // Show success message
        if (result.result?.message) {
          console.log('📊 Sync message:', result.result.message)
        }
      } else {
        console.error('❌ Sync failed:', result.error)
        alert(`Drive sync failed: ${result.error}`)
      }
    } catch (error) {
      console.error('💥 Error syncing:', error)
      alert(`Drive sync error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  // Quick sync methods
  const handleQuickSync = () => handleSync({ limit: 5, force: false })
  const handleDeepSync = () => handleSync({ limit: 20, force: false })
  const handleForceSync = () => handleSync({ limit: 10, force: true })

  // Load sync stats
  const refreshSyncStats = async () => {
    if (!window.electronAPI?.drive || !user) return
    
    try {
      const result = await window.electronAPI.drive.getSyncStats()
      if (result.success) {
        setSyncStats(result.stats)
      }
    } catch (error) {
      console.error('Error loading sync stats:', error)
    }
  }

  // Search Drive documents - FIXED
  const handleDriveSearch = async (query: string) => {
    const isCalendar = isCalendarQuery(query)
    const isLocation = isLocationQuery(query)

    // Only clear map state if this is NOT a location query
    if (!isLocation) {
      setLastQueryWasLocation(false)
      setPlaces([])
    }

    if (!user || !googleConnection.isConnected) {
      await sendMessage(query)
      return
    }

    try {
      console.log('🔍 Starting integrated search for:', query)
      setLastQueryWasLocation(isLocation)
      let calendarCtx = ''
      let driveResults = null
      let locationResults = null
      
      // Get calendar context if needed
      if (isCalendar && window.electronAPI?.calendar) {
        try {
          calendarCtx = await getCalendarContextForAI(query)
          setCalendarContext(calendarCtx)
        } catch (error) {
          console.warn('Calendar context failed:', error)
        }
      }
      
      // Search maps if location query
      if (isLocation && window.electronAPI?.maps) {
        try {
          setIsSearchingMaps(true)
          
          // Get user location first if we don't have it
          if (!userLocation) {
            const location = await requestLocationPermission()
            if (location) {
              setUserLocation(location)
            }
          }
          
          const mapsResult = await window.electronAPI.maps.search(query)
          if (mapsResult.success && mapsResult.places) {
            locationResults = mapsResult.places
            setPlaces(locationResults)
            console.log(`🗺️ Found ${locationResults.length} places`)
            // Do NOT switch to maps mode; just show map inline in chat
            // If this is PURELY a location query (no calendar context), don't search Drive
            if (!isCalendar) {
              // Build location-only context message
              let contextualMessage = query
              
              if (locationResults && locationResults.length > 0) {
                const locationContext = locationResults
                  .map(place => `${place.name} - ${place.address} (${place.distance}, ${place.duration}) Rating: ${place.rating}/5`)
                  .join('\n')
                
                contextualMessage += `\n\nNearby places:\n${locationContext}`
              }
              
              // Send to AI with location context only
              await sendMessage(contextualMessage, undefined, undefined, '')
              return // EARLY RETURN - don't search Drive for pure location queries
            }
          }
        } catch (error) {
          console.error('Maps search failed:', error)
        } finally {
          setIsSearchingMaps(false)
        }
      }
      
      // Continue with existing Drive and Calendar search logic...
      // Only search Drive if it's NOT a pure location query OR if we also need calendar context
      if (!isLocation || isCalendar) {
        try {
          const driveResult = await window.electronAPI.drive.search(query, 5)
          if (driveResult.success && driveResult.results) {
            driveResults = driveResult.results
            setSearchResults(driveResults)
          }
        } catch (error) {
          console.error('Drive search failed:', error)
          setSearchResults([])
        }
      }
      
      // Build comprehensive context message for calendar + drive queries
      let contextualMessage = query
      
      if (calendarCtx) {
        contextualMessage = `${calendarCtx}\n\nUser question: ${query}`
      }
      
      if (locationResults && locationResults.length > 0) {
        const locationContext = locationResults
          .map(place => `${place.name} - ${place.address} (${place.distance}, ${place.duration}) Rating: ${place.rating}/5`)
          .join('\n')
        
        contextualMessage += `\n\nNearby places:\n${locationContext}`
      }
      
      if (driveResults && driveResults.length > 0) {
        const driveContextText = driveResults
          .map(r => `Document: ${r.fileName}\nContent: ${r.content.substring(0, 300)}...`)
          .join('\n\n')
        
        contextualMessage += `\n\nRelevant documents:\n${driveContextText}`
      }
      
      // Send to AI with all context
      await sendMessage(contextualMessage, undefined, driveResults || undefined, calendarCtx)
    } catch (error) {
      console.error('Error in integrated search:', error)
      await sendMessage(query)
      setLastQueryWasLocation(false)
      setPlaces([])
    }
  }

  // Load cleanup candidates
  const loadCleanupCandidates = async () => {
    if (!window.electronAPI?.db || !user) return
    
    try {
      const result = await window.electronAPI.db.getCleanupCandidates(50)
      if (result.success) {
        setCleanupCandidates(result.candidates || [])
      }
    } catch (error) {
      console.error('Error loading cleanup candidates:', error)
    }
  }

  // Delete files
  const handleDeleteFiles = async (fileIds: string[]) => {
    if (!window.electronAPI?.drive || !user) return
    
    try {
      const result = await window.electronAPI.drive.deleteFiles(fileIds)
      if (result.success) {
        console.log('Delete completed:', result.summary)
        
        // Remove deleted files from candidates
        setCleanupCandidates(prev => 
          prev.filter(candidate => !fileIds.includes(candidate.id))
        )
      }
    } catch (error) {
      console.error('Error deleting files:', error)
    }
  }

  // Analyze for organization
  const analyzeForOrganization = async () => {
    if (!window.electronAPI?.drive || !user) return
    
    setIsAnalyzing(true)
    try {
      const result = await window.electronAPI.drive.analyzeForOrganization({
        method: 'hybrid',
        maxClusters: 6,
        minClusterSize: 3
      })
      
      if (result.success) {
        setOrganizationClusters(result.analysis?.clusters || [])
      }
    } catch (error) {
      console.error('Error analyzing for organization:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Calendar helper functions
  const isCalendarQuery = (query: string): boolean => {
    const calendarKeywords = [
      'calendar', 'schedule', 'meeting', 'appointment', 'event',
      'today', 'tomorrow', 'this week', 'next week', 'coming up',
      'busy', 'free', 'available', 'when am i', 'what\'s next',
      'upcoming', 'agenda', 'plans', 'booked'
    ]
    
    const lowerQuery = query.toLowerCase()
    return calendarKeywords.some(keyword => lowerQuery.includes(keyword))
  }

  const isLocationQuery = (query: string): boolean => {
    const locationKeywords = [
      'near me', 'nearby', 'closest', 'nearest', 'around here', 'close to me',
      'restaurant', 'coffee', 'cafe', 'gas station', 'hospital', 'pharmacy',
      'store', 'shop', 'bank', 'atm', 'hotel', 'parking', 'grocery',
      'directions to', 'how to get to', 'drive to', 'walk to', 'navigate to',
      'find a', 'where is the', 'location of', 'address of'
    ]
    
    const lowerQuery = query.toLowerCase()
    
    // Must contain a location keyword AND not be asking about documents/calendar
    const hasLocationKeyword = locationKeywords.some(keyword => lowerQuery.includes(keyword))
    const isNotDocumentQuery = !lowerQuery.includes('document') && !lowerQuery.includes('file') && !lowerQuery.includes('drive')
    const isNotCalendarQuery = !lowerQuery.includes('meeting') && !lowerQuery.includes('schedule') && !lowerQuery.includes('calendar')
    
    return hasLocationKeyword && isNotDocumentQuery && isNotCalendarQuery
  }

  const getCalendarContextForAI = async (query: string): Promise<string> => {
    if (!window.electronAPI?.calendar || !user) return ''
    
    try {
      const result = await window.electronAPI.calendar.getContext(query)
      if (result.success && result.context) {
        return result.context
      }
    } catch (error) {
      console.error('Error getting calendar context:', error)
    }
    
    return ''
  }

  // Format time helper
  const formatEventTime = (event: CalendarEvent): string => {
    if (event.start.date) {
      return 'All day'
    }
    
    const start = new Date(event.start.dateTime!)
    const end = new Date(event.end.dateTime!)
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
    
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  // Location permission helper
  const requestLocationPermission = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      console.log('🌍 Requesting location permission...')
      
      // First check if geolocation is supported
      if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported')
        alert('Geolocation is not supported by this browser')
        return null
      }
      
      // Check current permission state if available
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' })
          console.log('📍 Current location permission state:', permission.state)
          
          if (permission.state === 'denied') {
            alert('Location access is blocked. Please enable it in your browser settings and refresh the page.')
            return null
          }
        } catch (permError) {
          console.warn('Could not check permission state:', permError)
        }
      }
      
      // Request location
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Location request timed out'))
        }, 15000)
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId)
            console.log('✅ Location obtained:', {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            })
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          },
          (error) => {
            clearTimeout(timeoutId)
            console.error('❌ Location error:', error)
            
            let message = 'Failed to get your location: '
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message += 'Permission denied. Please allow location access and try again.'
                break
              case error.POSITION_UNAVAILABLE:
                message += 'Location unavailable. Please check your GPS or internet connection.'
                break
              case error.TIMEOUT:
                message += 'Request timed out. Please try again.'
                break
              default:
                message += error.message || 'Unknown error occurred'
            }
            
            alert(message)
            reject(new Error(message))
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000 // 5 minutes
          }
        )
      })
    } catch (error) {
      console.error('❌ Location permission error:', error)
      return null
    }
  }

  // Add smart suggestions based on calendar context
  const getSmartSuggestions = (): string[] => {
    const currentHour = new Date().getHours()
    const suggestions = []
    
    if (currentHour < 12) {
      suggestions.push("What's on my agenda today?")
      suggestions.push("Do I need to prepare for any meetings?")
    } else {
      suggestions.push("How does tomorrow look?")
      suggestions.push("What's coming up this week?")
    }
    
    suggestions.push("When am I free for focused work?")
    suggestions.push("Show me my busiest days")
    
    return suggestions
  }

  // Send message with Drive context - FIXED
  const sendMessage = async (
    userMessage: string, 
    screenshotDataUrl?: string, 
    driveContext?: any[], 
    calendarContext?: string
  ) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      hasScreenshot: !!screenshotDataUrl,
      screenshotUrl: screenshotDataUrl,
      driveContext
    }

    setCurrentResponse(null)
    setStreamingText('')
    setIsLoading(true)
    setIsStreaming(true)
    setInputValue('')

    try {
      const openai = getOpenAI()
      
      // Build enhanced system prompt with calendar awareness
      const systemPrompt = `You are Wingman, a helpful AI assistant with access to Google Drive documents and Google Calendar. 

Key capabilities:
- Access to user's calendar events, schedule analysis, and meeting insights
- Access to user's Google Drive documents for context
- Provide scheduling advice, meeting preparation tips, and time management suggestions
- Help identify conflicts, busy periods, and free time slots
- Suggest optimal timing for tasks based on calendar availability

When calendar information is provided, use it to give specific, actionable advice about time management, scheduling, and productivity. Consider travel time, meeting preparation needs, and workload distribution.

Be conversational, helpful, and proactive in offering scheduling and productivity insights.`
      
      if (screenshotDataUrl) {
        // Use vision API with calendar context
        let fullResponse = ''
        await openai.analyzeScreenshotStream(
          screenshotDataUrl,
          (chunk: string) => {
            fullResponse += chunk
            setStreamingText(fullResponse)
            requestAnimationFrame(() => updateDimensions())
          },
          userMessage
        )
        
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
          driveContext
        }

        setCurrentResponse(assistantMsg)
      } else {
        // Regular text chat with enhanced context
        const chatMessages: ChatMessage[] = [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
        
        let fullResponse = ''
        await openai.sendMessageStream(chatMessages, (chunk: string) => {
          fullResponse += chunk
          setStreamingText(fullResponse)
          requestAnimationFrame(() => updateDimensions())
        })
        
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
          driveContext,
          calendarContext // Add calendar context to message
        }

        setCurrentResponse(assistantMsg)
      }
      
      setStreamingText('')
      setIsStreaming(false)
      
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setCurrentResponse(errorMsg)
      setStreamingText('')
      setIsStreaming(false)
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        inputRef.current?.focus()
        updateDimensions()
      }, 200)
    }
  }

  // Handle input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = inputValue.trim()
    if (!query || isLoading || isStreaming) return

    // If we have Google connection, search Drive first
    if (googleConnection.isConnected && currentMode === 'chat') {
      await handleDriveSearch(query)
    } else {
      await sendMessage(query)
    }
  }

  useEffect(() => {
    console.log('Setting up Drive mode toggle listener...')
    
    if (window.electronAPI?.onToggleDriveMode) {
      const handleToggleDriveMode = () => {
        console.log('🎯 Drive mode toggle received from main process')
        setCurrentMode('drive')
        
        // Ensure window is visible and focused
        if (window.electronAPI?.showWindow) {
          window.electronAPI.showWindow()
        }
      }
      
      window.electronAPI.onToggleDriveMode(handleToggleDriveMode)
      console.log('✅ Drive mode toggle listener set up successfully')
      
      return () => {
        console.log('Cleaning up Drive mode toggle listener')
      }
    } else {
      console.log('❌ window.electronAPI?.onToggleDriveMode not available')
    }
  }, [])

  // Keep your keyboard shortcut handler as is:
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+D for Drive mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        console.log('Cmd+Shift+D pressed in React component')
        e.preventDefault()
        setCurrentMode('drive')
        
        if (window.electronAPI?.showWindow) {
          window.electronAPI.showWindow()
        }
      }
      
      // Cmd+Shift+C for Calendar mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        setCurrentMode('calendar')
        
        // Load calendar events when switching to calendar mode
        if (user && googleConnection.isConnected) {
          loadCalendarEvents(selectedCalendarRange)
        }
        
        if (window.electronAPI?.showWindow) {
          window.electronAPI.showWindow()
        }
      }
      
      // Cmd+Shift+P for Profile mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setCurrentMode('profile')
        
        if (window.electronAPI?.showWindow) {
          window.electronAPI.showWindow()
        }
      }
      
      // Cmd+Enter to cycle through modes (only if authenticated)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (user && googleConnection.isConnected) {
          setCurrentMode(prev => {
            const modes: AppMode[] = ['chat', 'drive', 'calendar', 'profile', 'cleanup', 'organize']
            const currentIndex = modes.indexOf(prev)
            const nextMode = modes[(currentIndex + 1) % modes.length]
            
            // Load calendar events when switching to calendar mode
            if (nextMode === 'calendar') {
              loadCalendarEvents(selectedCalendarRange)
            }
            
            return nextMode
          })
        } else {
          setCurrentMode('drive')
        }
      }
      
      // Escape to return to chat
      if (e.key === 'Escape') {
        setCurrentMode('chat')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [user, googleConnection, selectedCalendarRange])

  // Debug: Add this useEffect to log mode changes
  useEffect(() => {
    console.log('🔄 Mode changed to:', currentMode)
    
    // Load calendar events when switching to calendar mode
    if (currentMode === 'calendar' && user && googleConnection.isConnected && calendarEvents.length === 0 && !isLoadingCalendar) {
      loadCalendarEvents(selectedCalendarRange)
    }
  }, [currentMode, user, googleConnection.isConnected])

  // Render mode content
  const renderModeContent = () => {
    if (!user) {
      return (
        <div className="p-6 text-center">
          <h3 className="text-white text-lg mb-4">Sign in to access Google Drive & Calendar</h3>
          <AuthButton
            user={user}
            googleConnection={googleConnection}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            className="mx-auto"
          />
        </div>
      )
    }

    switch (currentMode) {
      case 'drive':
        return (
          <div className="p-4" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Drive Management</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleQuickSync}
                    disabled={isSyncing || !googleConnection.isConnected}
                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded transition-colors disabled:opacity-50"
                    title="Sync 5 new files"
                  >
                    {isSyncing ? 'Syncing...' : 'Quick'}
                  </button>
                  <button
                    onClick={handleDeepSync}
                    disabled={isSyncing || !googleConnection.isConnected}
                    className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs rounded transition-colors disabled:opacity-50"
                    title="Sync 20 new files"
                  >
                    Deep
                  </button>
                  <button
                    onClick={handleForceSync}
                    disabled={isSyncing || !googleConnection.isConnected}
                    className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs rounded transition-colors disabled:opacity-50"
                    title="Force reindex 10 files"
                  >
                    Force
                  </button>
                </div>
              </div>

              {/* Connection Status */}
              <div className={`text-xs px-3 py-2 rounded-lg border ${
                googleConnection.isConnected 
                  ? 'bg-green-500/10 border-green-400/20 text-green-300'
                  : 'bg-red-500/10 border-red-400/20 text-red-300'
              }`}>
                {googleConnection.isConnected ? '✅ Drive Connected' : '❌ Drive Disconnected'}
              </div>

              {/* Sync Stats */}
              {syncStats && (
                <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
                  <div className="text-white/80 text-sm mb-2">📊 Sync Statistics</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-white/60">
                      📄 Documents: <span className="text-white">{syncStats.totalDocuments}</span>
                    </div>
                    <div className="text-white/60">
                      🧠 Indexed: <span className="text-white">{syncStats.indexedFiles}</span>
                    </div>
                    <div className="text-white/60">
                      🔗 Embeddings: <span className="text-white">{syncStats.totalEmbeddings}</span>
                    </div>
                    <div className="text-white/60">
                      📈 Avg/File: <span className="text-white">{syncStats.averageEmbeddingsPerFile?.toFixed(1) || '0'}</span>
                    </div>
                  </div>
                  {syncStats.lastSyncTime && (
                    <div className="text-white/60 text-xs mt-2">
                      🕒 Last sync: {new Date(syncStats.lastSyncTime).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
              
              {syncProgress && (
                <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
                  <div className="text-white/80 text-sm mb-2">
                    Processing: {syncProgress.currentFile}
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(syncProgress.processedFiles / syncProgress.totalFiles) * 100}%` }}
                    />
                  </div>
                  <div className="text-white/60 text-xs mt-1">
                    {syncProgress.processedFiles}/{syncProgress.totalFiles} files • {syncProgress.embeddingsCreated} indexed • {syncProgress.skipped} skipped
                  </div>
                  {syncProgress.errors > 0 && (
                    <div className="text-red-300 text-xs mt-1">
                      ⚠️ {syncProgress.errors} errors
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCurrentMode('cleanup')}
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 rounded-lg text-white/80 text-sm transition-colors"
                >
                  🗑️ Cleanup
                </button>
                <button
                  onClick={() => setCurrentMode('organize')}
                  className="p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-400/30 rounded-lg text-white/80 text-sm transition-colors"
                >
                  📁 Organize
                </button>
              </div>

              {/* Sync Strategy Explanation */}
              <div className="text-xs text-white/40 space-y-1">
                <div>💡 <strong>Quick:</strong> 5 newest unprocessed files</div>
                <div>🔍 <strong>Deep:</strong> 20 newest unprocessed files</div>
                <div>🔄 <strong>Force:</strong> Reprocess 10 recent files</div>
              </div>
            </div>
          </div>
        )

      case 'cleanup':
        return (
          <div className="p-4" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Drive Cleanup</h3>
                <button
                  onClick={loadCleanupCandidates}
                  disabled={!googleConnection.isConnected}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded text-sm text-white transition-colors disabled:opacity-50"
                >
                  Scan
                </button>
              </div>
              
              {cleanupCandidates.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cleanupCandidates.slice(0, 10).map((candidate) => (
                    <div
                      key={candidate.id}
                      className="bg-red-500/10 border border-red-400/20 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-white/90 text-sm font-medium truncate">
                            {candidate.name}
                          </div>
                          <div className="text-red-300 text-xs mt-1">
                            {candidate.reason} • {candidate.confidence} confidence
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFiles([candidate.id])}
                          className="ml-2 px-2 py-1 bg-red-500/30 hover:bg-red-500/50 rounded text-xs text-white transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {cleanupCandidates.length > 10 && (
                    <div className="text-center">
                      <button
                        onClick={() => {
                          const selectedIds = cleanupCandidates
                            .filter(c => c.confidence === 'high')
                            .map(c => c.id)
                          handleDeleteFiles(selectedIds)
                        }}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded text-sm text-white transition-colors"
                      >
                        Delete All High Confidence ({cleanupCandidates.filter(c => c.confidence === 'high').length})
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {cleanupCandidates.length === 0 && (
                <div className="text-center text-white/60 py-8">
                  No cleanup candidates found.<br />
                  Click "Scan" to analyze your Drive.
                </div>
              )}
            </div>
          </div>
        )

      case 'organize':
        return (
          <div className="p-4" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">File Organization</h3>
                <button
                  onClick={analyzeForOrganization}
                  disabled={isAnalyzing || !googleConnection.isConnected}
                  className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded text-sm text-white transition-colors disabled:opacity-50"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
              
              {organizationClusters.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {organizationClusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="bg-green-500/10 border border-green-400/20 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-white/90 text-sm font-medium">
                            {cluster.name}
                          </div>
                          <div className="text-green-300 text-xs mt-1">
                            {cluster.files.length} files • {cluster.category}
                          </div>
                          <div className="text-white/60 text-xs mt-1">
                            → {cluster.suggestedFolderName}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const result = await window.electronAPI.drive.organizeFiles({
                                clusters: [cluster]
                              })
                              if (result.success) {
                                console.log('Organization completed for cluster:', cluster.name)
                              }
                            } catch (error) {
                              console.error('Error organizing cluster:', error)
                            }
                          }}
                          className="ml-2 px-2 py-1 bg-green-500/30 hover:bg-green-500/50 rounded text-xs text-white transition-colors"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center">
                    <button
                      onClick={async () => {
                        try {
                          const result = await window.electronAPI.drive.organizeFiles({
                            clusters: organizationClusters
                          })
                          if (result.success) {
                            console.log('Organization completed for all clusters')
                            setOrganizationClusters([])
                          }
                        } catch (error) {
                          console.error('Error organizing all clusters:', error)
                        }
                      }}
                      className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded text-sm text-white transition-colors"
                    >
                      Organize All ({organizationClusters.length} folders)
                    </button>
                  </div>
                </div>
              )}
              
              {organizationClusters.length === 0 && !isAnalyzing && (
                <div className="text-center text-white/60 py-8">
                  No organization suggestions.<br />
                  Click "Analyze" to get smart folder suggestions.
                </div>
              )}
            </div>
          </div>
        )

      case 'calendar':
        return (
          <div className="p-4" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Calendar</h3>
                <div className="flex gap-1">
                  {(['today', 'week', 'next-week'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => handleCalendarRangeChange(range)}
                      disabled={isLoadingCalendar || !googleConnection.isConnected}
                      className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
                        selectedCalendarRange === range
                          ? 'bg-purple-500/30 border border-purple-400/50 text-white'
                          : 'bg-purple-500/10 border border-purple-400/20 text-white/70 hover:bg-purple-500/20'
                      }`}
                    >
                      {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'Next Week'}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Loading state */}
              {isLoadingCalendar && (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                    </div>
                    <span className="text-purple-300 text-sm">Loading events...</span>
                  </div>
                </div>
              )}
              
              {/* Calendar Events */}
              {!isLoadingCalendar && calendarEvents.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  <div className="text-white/60 text-xs mb-2">
                    {calendarEvents.length} event{calendarEvents.length !== 1 ? 's' : ''} found
                  </div>
                  {calendarEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-white/90 text-sm font-medium truncate">
                            {event.summary}
                          </div>
                          <div className="text-purple-300 text-xs mt-1">
                            {formatEventTime(event)}
                          </div>
                          {event.location && (
                            <div className="text-white/60 text-xs mt-1 truncate">
                              📍 {event.location}
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 1 && (
                            <div className="text-white/60 text-xs mt-1">
                              👥 {event.attendees.length} attendees
                            </div>
                          )}
                        </div>
                        {event.htmlLink && (
                          <button
                            onClick={() => {
                              // Open in external browser via Electron
                              console.log('Opening event in browser:', event.htmlLink)
                            }}
                            className="ml-2 px-2 py-1 bg-purple-500/30 hover:bg-purple-500/50 rounded text-xs text-white transition-colors"
                          >
                            Open
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* No events */}
              {!isLoadingCalendar && calendarEvents.length === 0 && (
                <div className="text-center text-white/60 py-8">
                  <div className="text-4xl mb-3">📅</div>
                  <div>No events found for {selectedCalendarRange === 'today' ? 'today' : selectedCalendarRange === 'week' ? 'this week' : 'next week'}</div>
                  <div className="text-sm mt-2">Your schedule is clear!</div>
                </div>
              )}
              
              <div className="pt-2 border-t border-purple-500/10">
                <button
                  onClick={() => setCurrentMode('chat')}
                  className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded text-sm text-white transition-colors"
                >
                  💬 Ask about your schedule
                </button>
              </div>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="space-y-4">
              {/* User Info Section */}
              <div className="space-y-3">
                <h3 className="text-white font-medium">User Profile</h3>
                
                <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    {user?.photoURL && (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName}
                        className="w-16 h-16 rounded-full border-2 border-blue-400/30"
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-white font-medium text-lg">{user?.displayName}</div>
                      <div className="text-white/70 text-sm">{user?.email}</div>
                      <div className="text-blue-300 text-xs mt-1 font-mono">
                        ID: {user?.uid}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services Status Section */}
              <div className="space-y-3">
                <h4 className="text-white/80 font-medium text-sm">Connected Services</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-400/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${googleConnection.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <div>
                        <div className="text-white/90 text-sm font-medium">Google Drive</div>
                        <div className="text-white/60 text-xs">File storage and search</div>
                      </div>
                    </div>
                    <div className="text-xs text-white/60">
                      {googleConnection.isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-400/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${googleConnection.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <div>
                        <div className="text-white/90 text-sm font-medium">Google Calendar</div>
                        <div className="text-white/60 text-xs">Schedule and events</div>
                      </div>
                    </div>
                    <div className="text-xs text-white/60">
                      {googleConnection.isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Status Section */}
              {googleConnection.isConnected && (
                <div className="space-y-3">
                  <h4 className="text-white/80 font-medium text-sm">Sync Status</h4>
                  
                  <div className="bg-gray-500/10 border border-gray-400/20 rounded-lg p-3">
                    <div className="space-y-2 text-xs">
                      {googleConnection.lastDriveSyncAt && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Last Drive sync:</span>
                          <span className="text-white/80">
                            {new Date(googleConnection.lastDriveSyncAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {googleConnection.lastCalendarSyncAt && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Last Calendar sync:</span>
                          <span className="text-white/80">
                            {new Date(googleConnection.lastCalendarSyncAt).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {googleConnection.connectedAt && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Connected since:</span>
                          <span className="text-white/80">
                            {new Date(googleConnection.connectedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Today's Schedule Preview */}
              {calendarEvents.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-white/80 font-medium text-sm">Today's Schedule</h4>
                  
                  <div className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-3">
                    <div className="text-xs text-purple-300 mb-2">
                      {calendarEvents.length} event{calendarEvents.length !== 1 ? 's' : ''} scheduled
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                      {calendarEvents.slice(0, 5).map((event, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                          <div className="text-xs text-white/70 truncate flex-1">
                            {formatEventTime(event)} - {event.summary}
                          </div>
                        </div>
                      ))}
                      {calendarEvents.length > 5 && (
                        <div className="text-xs text-white/50 pl-3">
                          +{calendarEvents.length - 5} more events...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sign Out */}
              <div className="pt-3 border-t border-blue-500/10">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg text-white text-sm transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>

              {/* Location Test */}
              <div className="pt-3 border-t border-green-500/10">
                <button
                  onClick={async () => {
                    const location = await requestLocationPermission()
                    if (location) {
                      console.log('✅ Location test successful:', location)
                      alert(`Location: ${location.lat}, ${location.lng}`)
                    } else {
                      console.log('❌ Location test failed')
                      alert('Location test failed')
                    }
                  }}
                  className="w-full px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded-lg text-white text-sm transition-colors font-medium"
                >
                  🌍 Test Location
                </button>
              </div>
            </div>
          </div>
        )

      case 'maps':
        return (
          <div className="space-y-4" style={{ WebkitAppRegion: 'no-drag' }}>
            {/* Maps Header */}
            <div className="px-4 pt-4 pb-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium">Maps & Locations</h3>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const location = await requestLocationPermission()
                      if (location) {
                        setUserLocation(location)
                      }
                    }}
                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded transition-colors"
                    title="Update location"
                  >
                    📍 Locate
                  </button>
                  <button
                    onClick={() => setCurrentMode('chat')}
                    className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs rounded transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Location Status */}
              <div className={`text-xs px-3 py-2 rounded-lg border mb-3 ${
                userLocation 
                  ? 'bg-green-500/10 border-green-400/20 text-green-300'
                  : 'bg-yellow-500/10 border-yellow-400/20 text-yellow-300'
              }`}>
                {userLocation 
                  ? `📍 Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                  : '📍 Location access needed for accurate results'
                }
              </div>
            </div>

            {/* Map Visualization */}
            <div className="px-4">
              <MapVisualization
                places={places}
                isSearching={isSearchingMaps}
                userLocation={userLocation || undefined}
                className="mb-4"
              />
            </div>

            {/* Compact Places List */}
            <div className="px-4 pb-4">
              <PlacesList
                places={places}
                onPlaceSelect={(place: Place) => {
                  setSelectedPlace(place)
                  // Optionally switch to chat mode to ask about this place
                  console.log('Selected place:', place.name)
                }}
              />
              
              {places.length === 0 && !isSearchingMaps && (
                <div className="text-center text-white/60 py-8">
                  <div className="text-4xl mb-3">🗺️</div>
                  <div>No places found</div>
                  <div className="text-sm mt-2">
                    Try asking "coffee shops near me" in chat mode
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setInputValue("restaurants near me")
                    setCurrentMode('chat')
                  }}
                  className="p-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-400/30 rounded-lg text-white/80 text-sm transition-colors"
                >
                  🍽️ Restaurants
                </button>
                <button
                  onClick={() => {
                    setInputValue("coffee shops near me")
                    setCurrentMode('chat')
                  }}
                  className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 rounded-lg text-white/80 text-sm transition-colors"
                >
                  ☕ Coffee
                </button>
                <button
                  onClick={() => {
                    setInputValue("gas stations near me")
                    setCurrentMode('chat')
                  }}
                  className="p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/30 rounded-lg text-white/80 text-sm transition-colors"
                >
                  ⛽ Gas
                </button>
                <button
                  onClick={() => {
                    setInputValue("pharmacies near me")
                    setCurrentMode('chat')
                  }}
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 rounded-lg text-white/80 text-sm transition-colors"
                >
                  💊 Pharmacy
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="px-4 pb-4">
              <div className="text-xs text-white/40 space-y-1">
                <div>💡 <strong>Click markers</strong> on the map for details</div>
                <div>🔍 <strong>Search in chat:</strong> "coffee shops near me"</div>
                <div>📍 <strong>Enable location</strong> for accurate distances</div>
              </div>
            </div>
          </div>
        )

      default: // chat mode
        return null
    }
  }

  // Initialize app
  useEffect(() => {
    // Initialize OpenAI service
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (apiKey) {
      initializeOpenAI(apiKey)
    }

    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(version => {
        setAppVersion(version)
        setIsInitialized(true)
        setTimeout(updateDimensions, 150)
      })
    } else {
      setIsInitialized(true)
    }

    const initialTimeout = setTimeout(updateDimensions, 200)
    return () => clearTimeout(initialTimeout)
  }, [updateDimensions])

  // Drag handlers (simplified for brevity)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || 
        target.closest('button') || target.closest('input')) {
      return
    }
    
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  return (
    <div 
      ref={contentRef}
      className={`bg-black/85 backdrop-blur-lg rounded-xl border border-blue-500/20 shadow-lg relative overflow-hidden transition-all duration-300 ${
        isDragging ? 'scale-105 shadow-xl' : ''
      } ${!isInitialized ? 'opacity-0' : 'opacity-100'}`}
      style={{ 
        width: 'fit-content', 
        height: 'fit-content',
        minWidth: currentMode === 'chat' ? '480px' : '500px',
        maxWidth: '700px',
        transformOrigin: 'center center'
      }}
    >
      {/* Debug API Key Component */}
      <DebugAPIKey />

      {/* Header */}
      <div 
        className={`px-4 py-3 bg-black/95 backdrop-blur-lg cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-2.5 h-2.5 rounded-full ${
                isSyncing ? 'bg-orange-400' : 
                isStreaming ? 'bg-blue-400' : 
                isLoadingCalendar ? 'bg-purple-400' :
                'bg-green-400'
              } animate-pulse`}></div>
            </div>
            
            <div>
              <h1 className="text-white font-medium text-sm">
                Wingman {user && googleConnection.isConnected && `• ${currentMode}`}
              </h1>
              <p className="text-white/50 text-xs">
                {user ? `${user.displayName} • ${googleConnection.isConnected ? 'Google Services Connected' : 'Google Services Disconnected'}` : 'Not signed in'}
                {currentMode === 'calendar' && calendarEvents.length > 0 && ` • ${calendarEvents.length} events`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
            {user && (
              <>
                <button
                  onClick={() => setCurrentMode('drive')}
                  className={`p-2 border rounded-lg text-sm transition-colors ${
                    currentMode === 'drive' 
                      ? 'bg-blue-500/30 border-blue-400/50' 
                      : 'bg-blue-500/10 border-blue-400/20 hover:bg-blue-500/20'
                  }`}
                  title="Drive mode (⌘⇧D)"
                >
                  💾
                </button>
                <button
                  onClick={() => {
                    setCurrentMode('calendar')
                    if (googleConnection.isConnected) {
                      loadCalendarEvents(selectedCalendarRange)
                    }
                  }}
                  className={`p-2 border rounded-lg text-sm transition-colors ${
                    currentMode === 'calendar' 
                      ? 'bg-purple-500/30 border-purple-400/50' 
                      : 'bg-purple-500/10 border-purple-400/20 hover:bg-purple-500/20'
                  }`}
                  title="Calendar mode (⌘⇧C)"
                >
                  📅
                </button>
                <button
                  onClick={() => setCurrentMode('maps')}
                  className={`p-2 border rounded-lg text-sm transition-colors ${
                    currentMode === 'maps' 
                      ? 'bg-green-500/30 border-green-400/50' 
                      : 'bg-green-500/10 border-green-400/20 hover:bg-green-500/20'
                  }`}
                  title="Maps mode"
                >
                  🗺️
                </button>
                <button
                  onClick={() => setCurrentMode('profile')}
                  className={`p-2 border rounded-lg text-sm transition-colors ${
                    currentMode === 'profile' 
                      ? 'bg-green-500/30 border-green-400/50' 
                      : 'bg-green-500/10 border-green-400/20 hover:bg-green-500/20'
                  }`}
                  title="Profile (⌘⇧P)"
                >
                  👤
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chat Input */}
        {currentMode === 'chat' && (
          <div className="relative" style={{ WebkitAppRegion: 'no-drag' }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit(e))}
              placeholder={googleConnection.isConnected ? "Ask about your Drive, calendar, or anything..." : "Type a message..."}
              className="w-full bg-blue-500/10 border border-blue-400/20 rounded-lg px-4 py-3 pr-20 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-colors text-sm"
              disabled={isLoading || isStreaming}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading || isStreaming}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs transition-colors"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        )}

        {/* Mode shortcuts */}
        <div className="mt-2 text-center">
          <span className="text-white/30 text-xs">
            {user ? '⌘↵ Switch • ⌘⇧D Drive • ⌘⇧C Calendar • 🗺️ Maps • ⌘⇧P Profile • ⎋ Chat' : '⌘⇧S Screenshot • ⎋ Close'}
          </span>
        </div>
      </div>

      {/* Mode Content */}
      {currentMode !== 'chat' && renderModeContent()}

      {/* Chat Messages */}
      {currentMode === 'chat' && (streamingText || isStreaming || currentResponse || places.length > 0) && (
        <div className="px-6 py-4 bg-black/20 border-t border-blue-500/10 max-h-96 overflow-y-auto custom-scrollbar">
          {(streamingText || isStreaming) && (
            <div className="bg-blue-500/5 border border-blue-400/10 rounded-lg px-6 py-4">
              <div className="text-sm leading-relaxed space-y-3 text-white/90">
                {streamingText || (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                    </div>
                    <span className="text-blue-300 text-sm font-medium">
                      {googleConnection.isConnected ? 'Searching Drive & Calendar & analyzing...' : 'Analyzing...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {currentResponse && !isStreaming && (
            <div className="bg-blue-500/5 border border-blue-400/10 rounded-lg px-6 py-4">
              <div className="text-sm leading-relaxed space-y-3 text-white/90">
                {currentResponse.content}
              </div>
              
              {/* Show Calendar context if available */}
              {currentResponse.calendarContext && (
                <div className="mt-4 pt-3 border-t border-purple-400/10">
                  <div className="text-xs text-purple-300 mb-2">📅 Calendar Analysis:</div>
                  <div className="text-xs text-white/70 bg-purple-500/5 border border-purple-400/10 rounded p-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {currentResponse.calendarContext.split('\n').map((line, idx) => (
                      <div key={idx} className="mb-1">{line}</div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Show Drive context if available */}
              {currentResponse.driveContext && currentResponse.driveContext.length > 0 && (
                <div className="mt-4 pt-3 border-t border-blue-400/10">
                  <div className="text-xs text-blue-300 mb-2">📄 Referenced Documents:</div>
                  <div className="space-y-1">
                    {currentResponse.driveContext.map((doc, idx) => (
                      <div key={idx} className="text-xs text-white/60 truncate">
                        • {doc.fileName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Always show MapVisualization and PlacesList if places exist */}
          {places.length > 0 && (
            <div className="mt-6">
              <MapVisualization
                places={places}
                isSearching={isSearchingMaps}
                userLocation={userLocation || undefined}
                className="mb-4"
              />
              <PlacesList
                places={places}
                onPlaceSelect={(place: Place) => {
                  setSelectedPlace(place)
                  // Optionally, you could set inputValue and switch to chat for more info
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Welcome content for chat mode */}
      {currentMode === 'chat' && !currentResponse && !streamingText && !isStreaming && (
        <div className="p-5 bg-black/30">
          <div className="text-center">
            <h2 className="text-white text-lg mb-2">
              {user ? `Welcome back, ${user.displayName?.split(' ')[0]}!` : 'Ready to help'}
            </h2>
            <p className="text-white/50 text-sm mb-4">
              {googleConnection.isConnected 
                ? 'I can search your Drive, check your calendar, and help with scheduling and productivity'
                : 'Type above, press ⌘⇧S to capture screen, or sign in for Drive & Calendar access'
              }
            </p>
            
            {/* Smart Suggestions */}
            {user && googleConnection.isConnected && (
              <div className="mb-4">
                <div className="text-white/40 text-xs mb-2">Try asking:</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {getSmartSuggestions().slice(0, 3).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputValue(suggestion)
                        inputRef.current?.focus()
                      }}
                      className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/20 rounded-full text-xs text-white/70 hover:text-white transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {appVersion && (
              <div className="pt-3 border-t border-blue-500/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/30">v{appVersion}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span className="text-white/30">
                      {googleConnection.isConnected ? 'Drive + Calendar + Vision Ready' : 'Vision Ready'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App